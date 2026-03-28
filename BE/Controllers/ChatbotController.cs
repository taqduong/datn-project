using BE.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Data;
using System.Text.Json;
using System.Text;
using System.Net.Http.Json; // Bắt buộc thêm để dùng ReadFromJsonAsync

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
                    return Ok(new { success = true, answer = "Dạ, để HomeMart có thể lên đơn hàng cho bạn, bạn vui lòng **Đăng nhập** tài khoản ở góc trên màn hình giúp mình nhé! 😊" });
                }

                // =========================================================================
                // 🚀 TÍNH NĂNG MỚI 1: TRA CỨU ĐƠN HÀNG (ORDER TRACKING)
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
                // 🚀 TÍNH NĂNG MỚI 2: GỢI Ý CÁ NHÂN HÓA BẰNG PYTHON AI
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
                        .Select(p => p!) // Dấu '!' này sẽ ép kiểu Product? thành Product
                        .ToList();
                }
                else
                {
                    // Tìm theo từ khóa thông thường
                    products = await productsQuery.Where(p => p.Name.ToLower().Contains(keyword)).Take(10).ToListAsync();
                    if (!products.Any()) products = await productsQuery.Take(10).ToListAsync();
                }

                if (!products.Any())
                {
                    return Ok(new { success = true, answer = "Hiện shop đang chưa có sản phẩm nào còn hàng để tư vấn 😥" });
                }

                // TẠO NGỮ CẢNH SẢN PHẨM
                var productLines = products.Select(p =>
                {
                    var discountRate = (decimal)(p.Discount ?? 0) / 100;
                    var hasVariants = p.ProductVariants != null && p.ProductVariants.Any();
                    string priceInfo = "";
                    string variantInfo = "";
                    int totalStock = p.Stock;

                    if (hasVariants)
                    {
                        var prices = p.ProductVariants!.Select(v => v.Price).ToList();
                        var minPrice = Math.Round(prices.Min() * (1 - discountRate), 0);
                        var maxPrice = Math.Round(prices.Max() * (1 - discountRate), 0);
                        priceInfo = minPrice == maxPrice ? $"{minPrice:N0} VNĐ" : $"{minPrice:N0} - {maxPrice:N0} VNĐ";
                        totalStock = p.ProductVariants!.Sum(v => v.Stock);
                        var variantNames = p.ProductVariants!.Select(v => v.VariantName).ToList();
                        variantInfo = $" | Phân loại có sẵn: {string.Join(", ", variantNames)}";
                    }
                    else
                    {
                        var finalPrice = Math.Round(p.Price * (1 - discountRate), 0);
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
                    decimal minPrice = p.ProductVariants?.Select(v => v.Price).DefaultIfEmpty(p.Price).Min() ?? p.Price;
                    decimal maxPrice = p.ProductVariants?.Select(v => v.Price).DefaultIfEmpty(p.Price).Max() ?? p.Price;

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
                // TẠO PROMPT GỬI GEMINI
                // ==========================================
                var currentUser = secureUserId.HasValue ? await _context.Users.FindAsync(secureUserId.Value) : null;
                string userInfoContext = currentUser != null
                    ? $"KHÁCH HÀNG ĐANG CHAT: '{currentUser.FullName}', SĐT '{currentUser.Phone}'. Nếu là câu hỏi mang tính gợi ý, hãy xưng hô bằng tên khách hàng cho thân thiện."
                    : "TÌNH TRẠNG: KHÁCH CHƯA ĐĂNG NHẬP. NẾU KHÁCH CÓ BẤT KỲ Ý ĐỊNH MUA HOẶC ĐẶT HÀNG NÀO, BẮT BUỘC TRẢ LỜI ĐÚNG CÂU NÀY: 'Dạ, để HomeMart có thể lên đơn, bạn vui lòng Đăng nhập tài khoản ở góc trên màn hình nhé! 😊'. TUYỆT ĐỐI KHÔNG TẠO MÃ ORDER_INFO NẾU CHƯA ĐĂNG NHẬP.";

                var prompt = $@"
Bạn là nhân viên tư vấn bán hàng xuất sắc và nhiệt tình của HomeMart.
Nhiệm vụ của bạn là trả lời khách hàng bằng tiếng Việt, ngắn gọn, thân thiện, tự nhiên như người thật.

Câu hỏi của khách:
{request.question}

Danh sách sản phẩm hiện có trong shop:
{productContext}

{userInfoContext}

{orderContext}

QUY TẮC TƯ VẤN & CHỐT SALE:
- Bạn ĐƯỢC PHÉP trả lời mọi câu hỏi kiến thức chung, tâm sự... của khách hàng.
- NẾU KHÁCH HỎI VỀ ĐƠN HÀNG: Dùng thông tin 'THÔNG TIN ĐƠN HÀNG CỦA KHÁCH' để trả lời chính xác tình trạng đơn hàng của họ.
- Khi khách hỏi về HÀNG HÓA/GỢI Ý: CHỈ tư vấn dựa trên danh sách sản phẩm ở trên. Tuyệt đối không bịa thêm sản phẩm.
- NẾU SẢN PHẨM CÓ PHÂN LOẠI (Màu sắc/Size): BẮT BUỘC liệt kê các phân loại đang có để khách chọn.
- Kỹ năng Sale: Chủ động hỏi mồi khách để chốt đơn (Ví dụ: Bạn thích màu nào? Mua số lượng bao nhiêu ạ?).

QUY TẮC TỰ ĐỘNG LÊN ĐƠN HÀNG (QUAN TRỌNG NHẤT):
Nếu khách hàng đã chốt mua và cung cấp đủ thông tin bao gồm: Sản phẩm, Phân loại (nếu có), Số lượng, và Địa chỉ.
Hãy trả lời xác nhận lịch sự, và BẮT BUỘC chèn đoạn mã JSON sau ở cuối câu:
[ORDER_INFO: {{ ""productId"": 1, ""variantName"": ""Màu Đỏ"", ""quantity"": 1, ""address"": ""Hà Nội"" }}]
Lưu ý: Không tạo mã này nếu thiếu thông tin, hãy hỏi thêm. Nếu ko có phân loại, điền """".
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

                if (!response.IsSuccessStatusCode) return Ok(new { success = false, answer = $"Lỗi từ Gemini: {responseString}" });

                string aiText = ExtractGeminiText(responseString);
                if (string.IsNullOrWhiteSpace(aiText)) return Ok(new { success = false, answer = "AI không trả về nội dung." });

                // ==========================================
                // XỬ LÝ LÊN ĐƠN HÀNG [ORDER_INFO] 
                // ==========================================
                var orderMatch = System.Text.RegularExpressions.Regex.Match(aiText, @"\[ORDER_INFO:\s*(\{.*?\})\s*\]");
                if (orderMatch.Success && secureUserId.HasValue)
                {
                    var jsonString = orderMatch.Groups[1].Value;
                    aiText = aiText.Replace(orderMatch.Value, "").Trim();

                    try
                    {
                        var orderData = JsonSerializer.Deserialize<OrderPayload>(jsonString);
                        if (orderData != null && orderData.productId > 0 && orderData.quantity > 0 && !string.IsNullOrWhiteSpace(orderData.address))
                        {
                            var product = await _context.Products.Include(p => p.ProductVariants).FirstOrDefaultAsync(p => p.Id == orderData.productId);
                            if (product != null)
                            {
                                int? targetVariantId = null;
                                decimal unitPrice = product.Price;
                                int availableStock = product.Stock;

                                if (product.ProductVariants != null && product.ProductVariants.Any())
                                {
                                    if (string.IsNullOrWhiteSpace(orderData.variantName))
                                    {
                                        aiText += "\n\n⚠️ Vui lòng cho shop biết bạn muốn lấy Phân loại (Màu/Size) nào nhé!";
                                        return Ok(new { success = true, answer = aiText, suggestions = suggestions });
                                    }

                                    var variant = product.ProductVariants.FirstOrDefault(v => v.VariantName.ToLower().Contains(orderData.variantName.ToLower()));
                                    if (variant == null)
                                    {
                                        aiText += $"\n\n⚠️ Xin lỗi, shop không tìm thấy phân loại '{orderData.variantName}'. Vui lòng chọn lại nhé.";
                                        return Ok(new { success = true, answer = aiText, suggestions = suggestions });
                                    }

                                    targetVariantId = variant.Id;
                                    unitPrice = variant.Price;
                                    availableStock = variant.Stock;
                                }

                                if (availableStock >= orderData.quantity)
                                {
                                    decimal finalPrice = product.Discount.HasValue ? Math.Round(unitPrice * (1 - (decimal)product.Discount.Value / 100), 0) : unitPrice;
                                    var fallbackUser = await _context.Users.FindAsync(secureUserId.Value);

                                    using var transaction = await _context.Database.BeginTransactionAsync();
                                    try
                                    {
                                        var newOrder = new BE.Models.Order
                                        {
                                            UserId = secureUserId.Value,
                                            FullName = fallbackUser?.FullName ?? "Khách hàng",
                                            Phone = fallbackUser?.Phone ?? "",
                                            Address = orderData.address,
                                            TotalAmount = finalPrice * orderData.quantity,
                                            Status = "Pending",
                                            OrderDate = DateTime.Now
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

                                        aiText += $"\n\n🎉 **Hệ thống đã tự động lên đơn thành công!** Mã đơn hàng: **#{newOrder.OrderId}**. Tổng: **{newOrder.TotalAmount:N0}đ**.";
                                        suggestions.Clear(); // Xóa gợi ý khi mua xong
                                    }
                                    catch (Exception)
                                    {
                                        await transaction.RollbackAsync();
                                        aiText += "\n\n⚠️ Có lỗi xảy ra khi lưu đơn hàng, bạn vui lòng thử lại sau nhé.";
                                    }
                                }
                                else aiText += "\n\n⚠️ Xin lỗi bạn, sản phẩm hoặc phân loại này hiện không đủ số lượng trong kho.";
                            }
                        }
                        else aiText += "\n\n⚠️ Bạn vui lòng cung cấp đầy đủ số lượng và địa chỉ giao hàng để shop tạo đơn nhé.";
                    }
                    catch { }
                }

                return Ok(new { success = true, answer = aiText, suggestions = suggestions });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, answer = "Lỗi server: " + ex.Message });
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
    }
}