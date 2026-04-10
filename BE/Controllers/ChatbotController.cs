using BE.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Data;
using System.Text.Json;
using System.Text;
using System.Net.Http.Json; 

namespace BE.Controllers
{
    [ApiController]
    [Route("api/chatbot")]
    public class ChatbotController : ControllerBase
    {
        private readonly ShopDbContext _context;
        private readonly IConfiguration _configuration;

        private static readonly HttpClient _httpClient = new HttpClient();

        public ChatbotController(ShopDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost]
        public async Task<IActionResult> GetChatbotAdvice([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.question))
            {
                return BadRequest(new { success = false, answer = "Vui lòng nhập câu hỏi." });
            }

            try
            {
                var apiKey = _configuration["GeminiAI:ApiKey"]?.Trim();
                if (string.IsNullOrWhiteSpace(apiKey)) return StatusCode(500, new { success = false, answer = "Chưa cấu hình API Key." });

                var model = _configuration["GeminiAI:Model"]?.Trim();
                if (string.IsNullOrWhiteSpace(model)) model = "gemini-2.5-flash";

                var keyword = request.question.Trim().ToLower();

                // ==========================================
                // BẢO MẬT & CHẶN ĐĂNG NHẬP TRƯỚC TIÊN
                // ==========================================
                int? secureUserId = null;
                if (User.Identity != null && User.Identity.IsAuthenticated)
                {
                    var claimId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                                  ?? User.FindFirst("id")?.Value ?? User.FindFirst("UserId")?.Value;
                    if (int.TryParse(claimId, out int parsedId)) secureUserId = parsedId;
                }
                
                // Hỗ trợ cả trường hợp ID truyền từ FE (phòng hờ token có vấn đề)
                if (secureUserId == null && request.userId.HasValue) secureUserId = request.userId;

                if (secureUserId == null && IsPurchaseIntent(request.question))
                {
                    return Ok(new { success = true, answer = "Dạ, để HomeMart có thể lên đơn hàng cho bạn, bạn vui lòng Đăng nhập tài khoản ở góc trên màn hình giúp mình nhé!" });
                }

                // =========================================================================
                // TÍNH NĂNG MỚI 1: TRA CỨU ĐƠN HÀNG (ORDER TRACKING)
                // =========================================================================
                string orderContext = "";
                bool isAskingAboutOrder = keyword.Contains("đơn hàng") || keyword.Contains("mã đơn") || keyword.Contains("đơn của tôi");
                
                if (isAskingAboutOrder && secureUserId.HasValue)
                {
                    // Lấy 3 đơn hàng gần nhất
                    var recentOrders = await _context.Orders
                        .Where(o => o.UserId == secureUserId.Value)
                        .OrderByDescending(o => o.OrderDate)
                        .Take(3)
                        .ToListAsync();

                    if (recentOrders.Any())
                    {
                        var orderLines = recentOrders.Select(o => $"- Mã đơn: #{o.OrderId} | Ngày đặt: {o.OrderDate:dd/MM/yyyy} | Tổng tiền: {o.TotalAmount:N0}đ | Trạng thái: {TranslateStatus(o.Status)}");
                        orderContext = "THÔNG TIN ĐƠN HÀNG CỦA KHÁCH: \n" + string.Join("\n", orderLines) + "\n(Hãy dùng thông tin này để trả lời nếu khách hỏi về đơn hàng của họ).";
                    }
                    else
                    {
                        orderContext = "THÔNG TIN ĐƠN HÀNG CỦA KHÁCH: Khách chưa có đơn hàng nào trên hệ thống.";
                    }
                }

                // =========================================================================
                // TÍNH NĂNG MỚI 2: GỢI Ý CÁ NHÂN HÓA BẰNG PYTHON AI
                // =========================================================================
                List<int> aiRecommendedIds = new List<int>();
                bool isAskingForRecommendation = keyword.Contains("gợi ý") || keyword.Contains("hợp với tôi") || keyword.Contains("tư vấn cho tôi");

                if (isAskingForRecommendation && secureUserId.HasValue)
                {
                    // 1. Gom điểm sở thích (như trang Chủ)
                    var userPreferences = await _context.UserActivities
                        .Where(x => x.UserId == secureUserId.Value)
                        .GroupBy(x => x.ProductId)
                        .Select(g => new { id = g.Key, score = g.Sum(x => x.Score) })
                        .ToListAsync();

                    if (userPreferences.Any())
                    {
                        var allProductsForAi = await _context.Products.Select(p => new { id = p.Id, name = p.Name, description = p.Description, categoryName = p.Category != null ? p.Category.Name : "" }).ToListAsync();

                        using var aiClient = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
                        var aiRequestData = new { history_prefs = userPreferences, all_products = allProductsForAi };
                        var aiContent = new StringContent(JsonSerializer.Serialize(aiRequestData), Encoding.UTF8, "application/json");

                        try
                        {
                            var aiResponse = await aiClient.PostAsync("http://127.0.0.1:5000/predict_foryou", aiContent);
                            if (aiResponse.IsSuccessStatusCode)
                            {
                                var ids = await aiResponse.Content.ReadFromJsonAsync<List<int>>();
                                if (ids != null) aiRecommendedIds = ids;
                            }
                        }
                        catch { /* Bỏ qua lỗi AI, rớt xuống query logic cũ */ }
                    }
                }

                // ==========================================
                // LỌC SẢN PHẨM (DÙNG CHO TẤT CẢ TRƯỜNG HỢP)
                // ==========================================
                var productsQuery = _context.Products.Include(p => p.ProductVariants).AsQueryable();
                List<Product> products = new List<Product>();
                
                // Nếu là yêu cầu gợi ý và AI có kết quả
                if (aiRecommendedIds.Any())
                {
                    products = await productsQuery.Where(p => aiRecommendedIds.Contains(p.Id)).ToListAsync();
                    // Xếp lại đúng thứ tự AI chỉ định và loại bỏ cảnh báo null
                    products = aiRecommendedIds
                        .Select(id => products.FirstOrDefault(p => p.Id == id))
                        .Where(p => p != null)
                        .Select(p => p!)
                        .ToList();
                }
                else
                {
                    string searchContext = keyword;
                    if (request.history != null && request.history.Any())
                    {
                        var lastUserMsgs = request.history.Where(h => h.sender != "bot").Select(h => h.text).TakeLast(2);
                        searchContext += " " + string.Join(" ", lastUserMsgs).ToLower(); 
                    }

                    var ignoreWords = new List<string> { "cho", "tôi", "mua", "con", "cái", "này", "kia", "nhé", "ạ", "với", "xem", "lấy", "đặt", "hàng", "shop", "tư", "vấn", "mình", "xin", "giá", "có", "chốt", "luôn", "mã", "áp", "dụng", "ưu", "đãi", "thêm", "đó", "đây", "ok", "oke", "ừ" };
                    
                    var words = searchContext.Split(new[] { ' ', ',', '.', '?' }, StringSplitOptions.RemoveEmptyEntries)
                                       .Where(w => w.Length >= 2 && !ignoreWords.Contains(w))
                                       .Distinct()
                                       .ToList();

                    if (words.Any())
                    {
                        var tempProducts = await productsQuery.ToListAsync();
                        products = tempProducts
                            .Select(p => new 
                            { 
                                Product = p, 
                                MatchScore = words.Count(w => p.Name.ToLower().Contains(w)) 
                            })
                            .Where(x => x.MatchScore > 0)
                            .OrderByDescending(x => x.MatchScore)
                            .Select(x => x.Product)
                            .Take(20)
                            .ToList();
                    }

                    if (!products.Any()) 
                    {
                        products = await productsQuery.OrderByDescending(p => p.Id).Take(10).ToListAsync();
                    }
                }

                if (!products.Any())
                {
                    return Ok(new { success = true, answer = "Hiện shop đang chưa có sản phẩm nào còn hàng để tư vấn." });
                }

                // =================================================================================
                //  TẠO NGỮ CẢNH SẢN PHẨM & TÍNH GIÁ CHUẨN XÁC THEO GIẢM GIÁ TỪNG BIẾN THỂ
                // =================================================================================
                var productLines = products.Select(p =>
                {
                    var hasVariants = p.ProductVariants != null && p.ProductVariants.Any();
                    string priceInfo = "";
                    string variantInfo = "";
                    int totalStock = p.Stock;

                    if (hasVariants)
                    {
                        var pricesAfterDiscount = p.ProductVariants!.Select(v => 
                        {
                            decimal vDiscount = (decimal)(v.Discount ?? p.Discount ?? 0);
                            return Math.Round((decimal)v.Price * (1 - vDiscount / 100m), 0);
                        }).ToList();

                        var minPrice = pricesAfterDiscount.Min();
                        var maxPrice = pricesAfterDiscount.Max();
                        priceInfo = minPrice == maxPrice ? $"{minPrice:N0} VNĐ" : $"{minPrice:N0} - {maxPrice:N0} VNĐ";
                        totalStock = p.ProductVariants!.Sum(v => v.Stock);
                        var variantNames = p.ProductVariants!.Select(v => $"{v.Color} - {v.VariantName}").ToList();
                        variantInfo = $" | Phân loại có sẵn: {string.Join(", ", variantNames)}";
                    }
                    else
                    {
                        var discountRate = (decimal)(p.Discount ?? 0) / 100m;
                        var finalPrice = Math.Round((decimal)p.Price * (1 - discountRate), 0);
                        priceInfo = $"{finalPrice:N0} VNĐ";
                    }
                    return $"- ID: {p.Id} | Tên: {p.Name} | Giá bán: {priceInfo} | Tổng tồn kho: {totalStock}{variantInfo}";
                });
                var productContext = string.Join("\n", productLines);

                // ==========================================
                // GỢI Ý TRỰC QUAN CHO FRONTEND
                // ==========================================
                var suggestions = products.Select(p => {
                    var hasVariants = p.ProductVariants != null && p.ProductVariants.Any();
                    decimal minPrice = (decimal)p.Price;
                    decimal maxPrice = (decimal)p.Price;

                    if (hasVariants)
                    {
                        var discountedPrices = p.ProductVariants!.Select(v => 
                        {
                            // THÊM p.Discount VÀO ĐÂY NỮA
                            decimal vDiscount = (decimal)(v.Discount ?? p.Discount ?? 0);
                            return Math.Round((decimal)v.Price * (1 - vDiscount / 100m), 0);
                        }).ToList();
                        minPrice = discountedPrices.Min();
                        maxPrice = discountedPrices.Max();
                    }
                    else
                    {
                        var discountRate = (decimal)(p.Discount ?? 0) / 100m;
                        minPrice = Math.Round((decimal)p.Price * (1 - discountRate), 0);
                        maxPrice = minPrice;
                    }

                    return new {
                        id = p.Id,
                        name = p.Name,
                        price = minPrice,
                        discount = p.Discount ?? 0,
                        imageUrl = p.ImageUrl,
                        stock = hasVariants ? p.ProductVariants!.Sum(v => v.Stock) : p.Stock,
                        hasVariants = hasVariants,
                        maxPrice = maxPrice
                    };
                }).ToList();

                // ==========================================
                // TẠO PROMPT GỬI GEMINI VÀ LẤY VOUCHER TỪ DB
                // ==========================================
                var currentUser = secureUserId.HasValue ? await _context.Users.FindAsync(secureUserId.Value) : null;
                string userInfoContext = currentUser != null
                    ? $"KHÁCH HÀNG ĐANG CHAT: Tên: '{currentUser.FullName}', SĐT: '{currentUser.Phone}', Email: '{currentUser.Email}'. Khi khách muốn đặt hàng, HÃY CHỦ ĐỘNG hỏi xem khách có muốn dùng Tên, SĐT và Email này để nhận thông báo đơn hàng không, hay muốn dùng thông tin khác."
                    : "TÌNH TRẠNG: KHÁCH CHƯA ĐĂNG NHẬP. NẾU KHÁCH CÓ BẤT KỲ Ý ĐỊNH MUA HOẶC ĐẶT HÀNG NÀO, BẮT BUỘC TRẢ LỜI ĐÚNG CÂU NÀY: 'Dạ, để HomeMart có thể lên đơn, bạn vui lòng Đăng nhập tài khoản ở góc trên màn hình nhé!'. TUYỆT ĐỐI KHÔNG TẠO MÃ ORDER_INFO NẾU CHƯA ĐĂNG NHẬP.";

                var activeVouchers = await _context.Vouchers
                .Where(v => v.IsActive && !v.IsHidden && v.StartDate <= DateTime.Now && v.ExpiryDate > DateTime.Now && v.UsedCount < v.UsageLimit)
                .ToListAsync();

                string couponContext = "MÃ ƯU ĐÃI ĐANG CÓ SẴN: Hiện tại shop không có mã ưu đãi nào.";
                if (activeVouchers.Any())
                {
                    var voucherLines = activeVouchers.Select(v => {
                        string desc = v.IsFreeship ? "Miễn phí vận chuyển" :
                                      v.DiscountValue.HasValue ? $"Giảm {v.DiscountValue.Value:N0}đ" :
                                      v.DiscountPercent.HasValue ? $"Giảm {v.DiscountPercent.Value * 100}% (tối đa {v.MaxDiscountAmount ?? 0:N0}đ)" : 
                                      "Ưu đãi đặc biệt";
                                      
                        return $"'{v.Code}' ({desc}, Đơn tối thiểu {v.MinOrderValue:N0}đ)";
                    });
                    couponContext = "MÃ ƯU ĐÃI ĐANG CÓ SẴN (Hãy chủ động giới thiệu cho khách): " + string.Join("; ", voucherLines);
                }

                var prompt = $@"
Bạn là nhân viên tư vấn bán hàng xuất sắc và cực kỳ giỏi chốt sale của HomeMart.
Nhiệm vụ của bạn là trả lời khách hàng bằng tiếng Việt, ngắn gọn, thân thiện, tự nhiên như người thật.

Câu hỏi của khách:
{request.question}

Danh sách sản phẩm hiện có trong shop:
{productContext}

{couponContext}

{userInfoContext}

{orderContext}

QUY TẮC TƯ VẤN & CHỐT SALE:
- NẾU KHÁCH HỎI VỀ ĐƠN HÀNG: Dùng thông tin 'THÔNG TIN ĐƠN HÀNG CỦA KHÁCH' để trả lời.
- Khi khách hỏi về HÀNG HÓA: CHỈ tư vấn dựa trên danh sách sản phẩm ở trên. Tuyệt đối không bịa thêm sản phẩm.
- NẾU SẢN PHẨM CÓ PHÂN LOẠI: BẮT BUỘC liệt kê các phân loại đang có để khách chọn.
- KỸ NĂNG CHỐT SALE (RẤT QUAN TRỌNG): Sau khi giới thiệu sản phẩm xong, TUYỆT ĐỐI KHÔNG được im lặng. BẮT BUỘC phải đặt câu hỏi mồi để giục khách mua hàng. (Ví dụ: 'Bạn ưng màu nào để shop lên đơn ạ?', 'Bạn có muốn chốt luôn mã này để shop báo kho đóng gói không ạ?').

QUY TẮC TỰ ĐỘNG LÊN ĐƠN HÀNG (QUAN TRỌNG NHẤT):
Khi khách hàng ngỏ ý muốn mua/đặt hàng, bạn PHẢI thu thập ĐỦ 7 thông tin sau:
1. Sản phẩm (và Phân loại nếu có)
2. Số lượng
3. Địa chỉ nhận hàng (Tuyệt đối KHÔNG tự bịa địa chỉ. Nếu khách chưa cho địa chỉ cụ thể thì BẮT BUỘC phải hỏi khách).
4. Tên người nhận (Phải hỏi xác nhận có dùng tên '{currentUser?.FullName}' không hay đổi tên khác)
5. Số điện thoại (Phải hỏi xác nhận có dùng SĐT '{currentUser?.Phone}' không hay đổi số khác)
6. Email nhận thông báo (Phải hỏi xác nhận có dùng Email '{currentUser?.Email}' không hay dùng Email khác)
7. Mã giảm giá (BẮT BUỘC liệt kê ĐẦY ĐỦ TẤT CẢ các mã ưu đãi đang có trong danh sách để khách biết. ĐẶC BIỆT: Nếu khách chủ động cung cấp một mã ưu đãi bất kỳ, BẠN PHẢI CHẤP NHẬN MÃ ĐÓ và điền vào JSON, tuyệt đối không từ chối dù mã đó không có trong danh sách của bạn. QUAN TRỌNG: Khách ĐƯỢC PHÉP áp dụng cùng lúc 2 mã là 1 mã Miễn phí vận chuyển và 1 mã Giảm tiền. Nếu khách dùng 2 mã, hãy nối chúng bằng dấu phẩy. Nếu không dùng thì để trống).
Nếu thiếu 1 trong 7 thông tin trên, hãy chủ động hỏi lại khách một cách khéo léo.
Khi ĐÃ ĐỦ thông tin và khách CHỐT MUA, hãy cảm ơn và BẮT BUỘC chèn đoạn mã JSON sau ở cuối câu:
[ORDER_INFO: {{ ""productId"": 1, ""variantName"": ""Màu Đỏ"", ""quantity"": 1, ""address"": ""Hà Nội"", ""fullName"": ""Tên người nhận"", ""phone"": ""SĐT người nhận"", ""email"": ""Email người nhận"", ""couponCode"": ""FREESHIP, SIEUSALE"" }}]
Lưu ý: Không tạo mã ORDER_INFO nếu thiếu thông tin hoặc khách chưa chốt. Nếu sản phẩm ko có phân loại hoặc khách ko dùng mã, điền """".
".Trim();

                // GỌI API GEMINI
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var contentsList = new List<object>();
                if (request.history != null && request.history.Any())
                {
                    foreach (var msg in request.history)
                    {
                        contentsList.Add(new { role = msg.sender == "bot" ? "model" : "user", parts = new[] { new { text = msg.text } } });
                    }
                }
                contentsList.Add(new { role = "user", parts = new[] { new { text = prompt } } });

                var payload = new { contents = contentsList };
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(url, content);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode) return Ok(new { success = false, answer = $"Lỗi từ dịch vụ AI: {responseString}" });

                string aiText = ExtractGeminiText(responseString);
                if (string.IsNullOrWhiteSpace(aiText)) return Ok(new { success = false, answer = "Hệ thống AI không phản hồi nội dung." });

                // ==========================================
                // XỬ LÝ LÊN ĐƠN HÀNG [ORDER_INFO] 
                // ==========================================
                var orderMatch = System.Text.RegularExpressions.Regex.Match(aiText, @"\[ORDER_INFO:\s*(\{.*?\})\s*\]", System.Text.RegularExpressions.RegexOptions.Singleline);
                if (orderMatch.Success && secureUserId.HasValue)
                {
                    var jsonString = orderMatch.Groups[1].Value;
                    aiText = aiText.Replace(orderMatch.Value, "").Trim();

                    // VÁ LỖI 1: Xóa bỏ các thẻ Markdown do AI tự ý vẽ thêm
                    jsonString = jsonString.Replace("```json", "").Replace("```", "").Trim();

                    try
                    {
                        // VÁ LỖI 2: Dạy C# đọc JSON "dễ dãi" hơn
                        var jsonOptions = new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true,
                            AllowTrailingCommas = true,
                            NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
                        };
                        var orderData = JsonSerializer.Deserialize<OrderPayload>(jsonString, jsonOptions);
                        
                        if (orderData != null && orderData.productId > 0 && orderData.quantity > 0 && !string.IsNullOrWhiteSpace(orderData.address))
                        {
                            var product = await _context.Products.Include(p => p.ProductVariants).FirstOrDefaultAsync(p => p.Id == orderData.productId);
                            if (product != null)
                            {
                                int? targetVariantId = null;
                                int availableStock = product.Stock;
                                
                                // ĐÃ ÉP KIỂU TẠI ĐÂY THÀNH DECIMAL
                                decimal finalPrice = (decimal)product.Price;

                                //  TÍNH TIỀN THEO PHÂN LOẠI
                                if (product.ProductVariants != null && product.ProductVariants.Any())
                                {
                                    if (string.IsNullOrWhiteSpace(orderData.variantName))
                                    {
                                        aiText += "\n\n[Lưu ý] Vui lòng cho shop biết bạn muốn lấy Phân loại (Màu/Size) nào nhé!";
                                        return Ok(new { success = true, answer = aiText, suggestions = suggestions });
                                    }

                                    var variant = product.ProductVariants.FirstOrDefault(v => v.VariantName.ToLower().Contains(orderData.variantName.ToLower()));
                                    if (variant == null)
                                    {
                                        aiText += $"\n\n[Lưu ý] Xin lỗi, shop không tìm thấy phân loại '{orderData.variantName}'. Vui lòng chọn lại nhé.";
                                        return Ok(new { success = true, answer = aiText, suggestions = suggestions });
                                    }

                                    targetVariantId = variant.Id;
                                    availableStock = variant.Stock;
                                    
                                    // THÊM product.Discount VÀO ĐÂY ĐỂ LÊN ĐƠN KHÔNG BỊ SAI TIỀN
                                    decimal vDiscount = (decimal)(variant.Discount ?? product.Discount ?? 0);
                                    finalPrice = Math.Round((decimal)variant.Price * (1 - vDiscount / 100m), 0);
                                }
                                else
                                {
                                    // ĐÃ ÉP KIỂU TẠI ĐÂY THÀNH DECIMAL
                                    decimal pDiscount = (decimal)(product.Discount ?? 0);
                                    finalPrice = Math.Round((decimal)product.Price * (1 - pDiscount / 100m), 0);
                                }

                                if (availableStock >= orderData.quantity)
                                {
                                    var fallbackUser = await _context.Users.FindAsync(secureUserId.Value);

                                    // --- BẮT ĐẦU XỬ LÝ VOUCHER & TÍNH TIỀN ---
                                    decimal subTotal = finalPrice * orderData.quantity;
                                    decimal shippingFee = 30000;
                                    decimal discountAmount = 0;
                                    string appliedCouponMessage = "";
                                    List<string> appliedVoucherCodes = new List<string>(); 

                                    bool hasAppliedFreeship = false;
                                    bool hasAppliedDiscount = false;

                                    var inputCodes = orderData.couponCode.Split(new[] { ',', ' ' }, StringSplitOptions.RemoveEmptyEntries); 

                                    foreach (var code in inputCodes)
                                    {
                                        // 1. Lấy mã ra kiểm tra IsActive trước
                                        var validVoucher = await _context.Vouchers.FirstOrDefaultAsync(v => 
                                            v.Code.ToLower() == code.ToLower() && v.IsActive);

                                        if (validVoucher != null)
                                        {
                                            // 2. Kiểm tra thời gian và số lượng
                                            if (validVoucher.StartDate > DateTime.Now) {
                                                appliedCouponMessage += $"\n[Lưu ý] Mã '{code}' chưa mở. Vui lòng quay lại lúc {validVoucher.StartDate:HH:mm dd/MM} nhé!";
                                                continue;
                                            }
                                            if (validVoucher.ExpiryDate < DateTime.Now || validVoucher.UsedCount >= validVoucher.UsageLimit) {
                                                appliedCouponMessage += $"\n[Lưu ý] Mã '{code}' đã hết hạn hoặc hết lượt dùng.";
                                                continue;
                                            }
                                            if (subTotal < (decimal)validVoucher.MinOrderValue) {
                                                appliedCouponMessage += $"\n[Lưu ý] Bỏ qua mã '{code}' vì đơn cần tối thiểu {validVoucher.MinOrderValue:N0}đ.";
                                                continue;
                                            }

                                            // 3. KIỂM TRA THỜI GIAN HỒI MÃ (RESET INTERVAL)
                                            if (validVoucher.MaxUsagePerUser > 0)
                                            {
                                                DateTime startTime = DateTime.MinValue;
                                                if (validVoucher.ResetInterval == "10s") startTime = DateTime.Now.AddSeconds(-10);
                                                else if (validVoucher.ResetInterval == "Hourly") startTime = DateTime.Now.AddHours(-1);
                                                else if (validVoucher.ResetInterval == "Daily") startTime = DateTime.Today;

                                                var userUsedCount = await _context.Orders
                                                    .Where(o => o.UserId == secureUserId.Value 
                                                            && o.AppliedVoucherCode != null 
                                                            && o.AppliedVoucherCode.ToUpper().Contains(validVoucher.Code.ToUpper()) 
                                                            && o.Status != "Cancelled"
                                                            && o.OrderDate >= startTime)
                                                    .CountAsync();

                                                if (userUsedCount >= validVoucher.MaxUsagePerUser)
                                                {
                                                    string intervalMsg = validVoucher.ResetInterval switch {
                                                        "10s" => "Bạn vừa dùng mã này, vui lòng đợi 10 giây.",
                                                        "Hourly" => "Bạn đã hết lượt dùng mã này trong giờ này.",
                                                        "Daily" => "Bạn đã dùng hết lượt mã này trong hôm nay.",
                                                        _ => $"Bạn đã dùng tối đa {validVoucher.MaxUsagePerUser} lần."
                                                    };
                                                    appliedCouponMessage += $"\n[Lưu ý] Mã '{code}' không áp dụng được: {intervalMsg}";
                                                    continue; // Dừng, không cho áp mã này nữa
                                                }
                                            }

                                            // 4. KIỂM TRA CHỐNG TRÙNG LỌC VÀ TRỪ TIỀN (Giữ nguyên logic cũ của sếp)
                                            if (validVoucher.IsFreeship && hasAppliedFreeship)
                                            {
                                                appliedCouponMessage += $"\n[Lưu ý] Bỏ qua mã '{code}' vì bạn đã áp dụng 1 mã Miễn phí vận chuyển rồi.";
                                                continue;
                                            }
                                            if (!validVoucher.IsFreeship && hasAppliedDiscount)
                                            {
                                                appliedCouponMessage += $"\n[Lưu ý] Bỏ qua mã '{code}' vì bạn đã áp dụng 1 mã Giảm giá rồi.";
                                                continue;
                                            }

                                            appliedVoucherCodes.Add(validVoucher.Code); 

                                            if (validVoucher.IsFreeship) 
                                            {
                                                shippingFee = 0; 
                                                hasAppliedFreeship = true; 
                                                appliedCouponMessage += $"\n[Ưu đãi] Đã áp dụng mã: **{validVoucher.Code}** (Miễn phí vận chuyển)";
                                            }
                                            else 
                                            {
                                                hasAppliedDiscount = true; 
                                                decimal currentDiscount = 0;
                                        
                                                if (validVoucher.DiscountValue.HasValue) 
                                                    currentDiscount = (decimal)validVoucher.DiscountValue.Value;
                                                else if (validVoucher.DiscountPercent.HasValue)
                                                {
                                                    currentDiscount = subTotal * (decimal)validVoucher.DiscountPercent.Value;
                                                    if (validVoucher.MaxDiscountAmount.HasValue && currentDiscount > (decimal)validVoucher.MaxDiscountAmount.Value)
                                                        currentDiscount = (decimal)validVoucher.MaxDiscountAmount.Value;
                                                }
                                        
                                                discountAmount += currentDiscount; 
                                                appliedCouponMessage += $"\n[Ưu đãi] Đã áp dụng mã: **{validVoucher.Code}** (Giảm {currentDiscount:N0}đ)";
                                            }
                                            
                                            validVoucher.UsedCount += 1; 
                                        }
                                        else 
                                        {
                                            appliedCouponMessage += $"\n[Lưu ý] Mã '{code}' không tồn tại hoặc đã bị khóa.";
                                        }
                                    }

                                    string? finalAppliedVoucherCode = appliedVoucherCodes.Any() ? string.Join(", ", appliedVoucherCodes) : null;

                                    decimal totalAmount = subTotal + shippingFee - discountAmount;
                                    if (totalAmount < 0) totalAmount = 0; // Chống âm tiền
                                    
                                    using var transaction = await _context.Database.BeginTransactionAsync();
                                    try
                                    {
                                        var newOrder = new BE.Models.Order
                                        {
                                            UserId = secureUserId.Value,
                                            FullName = !string.IsNullOrWhiteSpace(orderData.fullName) ? orderData.fullName : (fallbackUser?.FullName ?? "Khách hàng"),
                                            Phone = !string.IsNullOrWhiteSpace(orderData.phone) ? orderData.phone : (fallbackUser?.Phone ?? ""),
                                            Email = !string.IsNullOrWhiteSpace(orderData.email) ? orderData.email : (fallbackUser?.Email ?? ""),
                                            Address = orderData.address,
                                            Status = "Pending",
                                            OrderDate = DateTime.Now,
                                            TotalAmount = totalAmount, 
                                            AppliedVoucherCode = finalAppliedVoucherCode, 
                                            DiscountAmount = discountAmount,
                                            ShippingFee = shippingFee
                                        };
                                        _context.Orders.Add(newOrder);
                                        await _context.SaveChangesAsync();

                                        var newOrderDetail = new BE.Models.OrderDetail
                                        {
                                            OrderId = newOrder.OrderId,
                                            ProductId = product.Id,
                                            VariantId = targetVariantId,
                                            Quantity = orderData.quantity,
                                            UnitPrice = finalPrice
                                        };
                                        _context.OrderDetails.Add(newOrderDetail);

                                        if (targetVariantId.HasValue)
                                            product.ProductVariants!.First(v => v.Id == targetVariantId.Value).Stock -= orderData.quantity;
                                        else
                                            product.Stock -= orderData.quantity;

                                        await _context.SaveChangesAsync();
                                        await transaction.CommitAsync();

                                        aiText += $"\n\n[Thành công] **Hệ thống đã tự động lên đơn!** Mã đơn hàng: **#{newOrder.OrderId}**. Tổng thanh toán: **{newOrder.TotalAmount:N0}đ**.{appliedCouponMessage}";
                                        suggestions.Clear(); 
                                    }
                                    catch (Exception)
                                    {
                                        await transaction.RollbackAsync();
                                        aiText += "\n\n[Lỗi hệ thống] Có lỗi xảy ra khi lưu đơn hàng, bạn vui lòng thử lại sau nhé.";
                                    }
                                }
                                else aiText += "\n\n[Lưu ý] Xin lỗi bạn, sản phẩm hoặc phân loại này hiện không đủ số lượng trong kho.";
                            }
                        }
                        else aiText += "\n\n[Lưu ý] Bạn vui lòng cung cấp đầy đủ số lượng và địa chỉ giao hàng để shop tạo đơn nhé.";
                    }
                    catch (Exception ex)
                    {
                        // VÁ LỖI 3: Bắn lỗi ra màn hình nếu JSON bị vỡ
                        aiText += $"\n\n[Lỗi hệ thống] Không thể lên đơn, do AI phản hồi sai định dạng dữ liệu: {ex.Message}";
                    }
                }

                return Ok(new { success = true, answer = aiText, suggestions = suggestions });
            }
            catch (Exception ex)
            {
                return Ok(new { 
                    success = false, 
                    answer = "LỖI HỆ THỐNG BACKEND: " + ex.Message
                });
            }
        }

        private static string TranslateStatus(string status)
        {
            return status.ToLower() switch
            {
                "pending" => "Đang chờ duyệt",
                "processing" => "Đang đóng gói",
                "shipped" => "Đang giao hàng",
                "delivered" => "Đã giao thành công",
                "cancelled" => "Đã hủy",
                _ => status
            };
        }

        private static string ExtractGeminiText(string responseString)
        {
            try
            {
                using var jsonDoc = JsonDocument.Parse(responseString);
                var root = jsonDoc.RootElement;
                if (root.TryGetProperty("candidates", out var candidates) && candidates.ValueKind == JsonValueKind.Array && candidates.GetArrayLength() > 0)
                {
                    var firstCandidate = candidates[0];
                    if (firstCandidate.TryGetProperty("content", out var content) && content.TryGetProperty("parts", out var parts) && parts.ValueKind == JsonValueKind.Array && parts.GetArrayLength() > 0)
                    {
                        var texts = new List<string>();
                        foreach (var part in parts.EnumerateArray())
                        {
                            if (part.TryGetProperty("text", out var textProp))
                            {
                                var text = textProp.GetString();
                                if (!string.IsNullOrWhiteSpace(text)) texts.Add(text);
                            }
                        }
                        return string.Join("\n", texts).Trim();
                    }
                }
                return string.Empty;
            }
            catch { return string.Empty; }
        }

        private static bool IsPurchaseIntent(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return false;
            var q = text.Trim().ToLower();
            string[] kw = { "đặt hàng", "chốt đơn", "lên đơn", "muốn mua", "muốn đặt", "ship cho", "lấy 1", "lấy cho", "đặt cho", "mua 1", "giao cho" };
            return kw.Any(q.Contains);
        }
    }

    public class ChatRequest
    {
        public int? userId { get; set; }
        public string? question { get; set; }
        public List<ChatHistory>? history { get; set; }
    }

    public class ChatHistory
    {
        public string? sender { get; set; }
        public string? text { get; set; }
    }

    public class OrderPayload
    {
        public int productId { get; set; }
        public string? variantName { get; set; }
        public int quantity { get; set; }
        public string? address { get; set; }
        public string? fullName { get; set; } 
        public string? phone { get; set; } 
        public string? email { get; set; }
        public string? couponCode { get; set; }
    }
}