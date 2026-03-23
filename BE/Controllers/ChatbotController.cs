using BE.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Data;
using System.Text.Json;
using System.Text;

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

                // ==========================================
                // TỐI ƯU HÓA: LỌC SẢN PHẨM THEO TỪ KHÓA + INCLUDE BIẾN THỂ
                // ==========================================
                var keyword = request.question.Trim().ToLower();
                
                var productsQuery = _context.Products
                    .Include(p => p.ProductVariants) // INCLUDE BIẾN THỂ VÀO ĐÂY
                    .AsQueryable();
                
                // Thử tìm sản phẩm khớp với câu hỏi trước
                var products = await productsQuery
                    .Where(p => p.Name.ToLower().Contains(keyword))
                    .Take(10)
                    .ToListAsync();

                // Nếu không tìm thấy từ khóa nào khớp, lấy ngẫu nhiên
                if (!products.Any())
                {
                    products = await productsQuery
                        .Take(10)
                        .ToListAsync();
                }

                if (!products.Any())
                {
                    return Ok(new { success = true, answer = "Hiện shop đang chưa có sản phẩm nào còn hàng để tư vấn 😥" });
                }

                // TẠO NGỮ CẢNH VỀ SẢN PHẨM (KÈM GIÁ BIẾN THỂ VÀ MÀU/SIZE) CHO AI HIỂU
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
                // GỢI Ý SẢN PHẨM TRỰC QUAN CHO FRONTEND
                // ==========================================
                var suggestions = products.Select(p => {
                    var hasVariants = p.ProductVariants != null && p.ProductVariants.Any();
                    decimal minPrice = p.Price;
                    decimal maxPrice = p.Price;

                    if (hasVariants)
                    {
                        // ✅ SỬA Ở ĐÂY: Thêm DefaultIfEmpty() để C# không sợ lỗi rỗng khi tìm Min/Max
                        minPrice = p.ProductVariants!.Select(v => v.Price).DefaultIfEmpty(p.Price).Min();
                        maxPrice = p.ProductVariants!.Select(v => v.Price).DefaultIfEmpty(p.Price).Max();
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
                //  BẢO MẬT & CHẶN ĐĂNG NHẬP
                // ==========================================
                int? secureUserId = null;
                if (User.Identity != null && User.Identity.IsAuthenticated)
                {
                    var claimId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                                  ?? User.FindFirst("id")?.Value ?? User.FindFirst("UserId")?.Value;
                    if (int.TryParse(claimId, out int parsedId)) secureUserId = parsedId;
                }

                if (secureUserId == null && IsPurchaseIntent(request.question))
                {
                    return Ok(new { success = true, answer = "Dạ, để HomeMart có thể lên đơn hàng cho bạn, bạn vui lòng **Đăng nhập** tài khoản ở góc trên màn hình giúp mình nhé! 😊", suggestions = suggestions });
                }

                // ==========================================
                // 🚀 XỬ LÝ PROMPT
                // ==========================================
                // 🚀 5. TẠO PROMPT "ULTIMATE" (ĐÃ CẬP NHẬT KỸ NĂNG SALE)
                var currentUser = secureUserId.HasValue ? await _context.Users.FindAsync(secureUserId.Value) : null;
                string userInfoContext = currentUser != null 
                    ? $"KHÁCH HÀNG: '{currentUser.FullName}', SĐT '{currentUser.Phone}'. KHÔNG HỎI LẠI TÊN VÀ SĐT."
                    : "TÌNH TRẠNG: KHÁCH CHƯA ĐĂNG NHẬP. NẾU KHÁCH CÓ BẤT KỲ Ý ĐỊNH MUA HOẶC ĐẶT HÀNG NÀO, BẠN BẮT BUỘC PHẢI TỪ CHỐI TƯ VẤN TIẾP VÀ TRẢ LỜI ĐÚNG CÂU NÀY: 'Dạ, để HomeMart có thể lên đơn, bạn vui lòng Đăng nhập tài khoản ở góc trên màn hình nhé! 😊'. TUYỆT ĐỐI KHÔNG TẠO MÃ ORDER_INFO NẾU CHƯA ĐĂNG NHẬP.";

                var prompt = $@"
Bạn là nhân viên tư vấn bán hàng xuất sắc và nhiệt tình của HomeMart.
Nhiệm vụ của bạn là trả lời khách hàng bằng tiếng Việt, ngắn gọn, thân thiện, tự nhiên như người thật.

Câu hỏi của khách:
{request.question}

Danh sách sản phẩm hiện có trong shop:
{productContext}

{userInfoContext}

QUY TẮC TƯ VẤN & CHỐT SALE:
- Bạn ĐƯỢC PHÉP trả lời mọi câu hỏi kiến thức chung, tâm sự... của khách hàng.
- Khi khách hỏi về HÀNG HÓA: CHỈ tư vấn dựa trên danh sách sản phẩm ở trên. Tuyệt đối không bịa thêm sản phẩm.
- Ưu tiên nêu tên sản phẩm (in đậm) và giá bán (nếu có khoảng giá thì báo từ min đến max).
- NẾU SẢN PHẨM CÓ PHÂN LOẠI (Màu sắc/Size): BẮT BUỘC liệt kê các phân loại đang có để khách chọn.
- 🚀 KỸ NĂNG SALE (RẤT QUAN TRỌNG): Nếu khách hỏi thăm sản phẩm và shop có hàng, BẮT BUỘC chủ động hỏi mồi khách để chốt đơn (Ví dụ: Bạn thích màu nào? Bạn muốn mua bao nhiêu cái? Ship về địa chỉ nào ạ?).

QUY TẮC TỰ ĐỘNG LÊN ĐƠN HÀNG (QUAN TRỌNG NHẤT):
Nếu khách hàng đã chốt mua và cung cấp đủ thông tin bao gồm: Sản phẩm, Phân loại (nếu sản phẩm đó có phân loại), Số lượng, và Địa chỉ.
Hãy trả lời xác nhận lịch sự với khách, và BẮT BUỘC chèn thêm một đoạn mã JSON chứa thông tin đơn hàng ở cuối cùng của câu trả lời theo đúng định dạng sau:
[ORDER_INFO: {{ ""productId"": 1, ""variantName"": ""Màu Đỏ"", ""quantity"": 1, ""address"": ""Hà Nội"" }}]

Lưu ý: 
- Khách đã đăng nhập thì tự động điền Tên và SĐT của họ vào phần ẩn, bạn không cần hỏi lại.
- Tự động lấy 'productId' tương ứng với sản phẩm khách chọn trong danh sách.
- NẾU SẢN PHẨM KHÔNG CÓ PHÂN LOẠI: Hãy để trống trường này: ""variantName"": """"
- CHỈ tạo mã [ORDER_INFO] khi đã có ĐỦ ĐỊA CHỈ và PHÂN LOẠI. Nếu thiếu, hãy lịch sự xin thêm thông tin.
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

                if (!response.IsSuccessStatusCode)
                {
                    return Ok(new { success = false, answer = $"Lỗi từ Gemini (HTTP {(int)response.StatusCode}): {responseString}" });
                }
                
                string aiText = ExtractGeminiText(responseString);
                if (string.IsNullOrWhiteSpace(aiText)) return Ok(new { success = false, answer = "AI không trả về nội dung." });

                // ==========================================
                // 🚀 5. XỬ LÝ ĐƠN HÀNG (BỔ SUNG TÌM BIẾN THỂ)
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

                                // Nếu sản phẩm có biến thể, phải tìm đúng biến thể khách chọn
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
                                            VariantId = targetVariantId, // LƯU VARIANT ID VÀO ĐÂY
                                            Quantity = orderData.quantity,
                                            UnitPrice = finalPrice
                                        };
                                        
                                        _context.OrderDetails.Add(newOrderDetail);
                                        
                                        // TRỪ TỒN KHO THỰC TẾ (CỦA BIẾN THỂ NẾU CÓ, KO THÌ CỦA GỐC)
                                        if (targetVariantId.HasValue)
                                        {
                                            var variantToUpdate = product.ProductVariants!.First(v => v.Id == targetVariantId.Value);
                                            variantToUpdate.Stock -= orderData.quantity;
                                        }
                                        else
                                        {
                                            product.Stock -= orderData.quantity;
                                        }

                                        await _context.SaveChangesAsync(); 
                                        await transaction.CommitAsync(); 

                                        aiText += $"\n\n🎉 **Hệ thống đã tự động lên đơn thành công!** Mã đơn hàng: **#{newOrder.OrderId}**. Tổng: **{newOrder.TotalAmount:N0}đ**.";
                                        //  XÓA GỢI Ý SAU KHI MUA XONG 
                                        suggestions.Clear();
                                    }
                                    catch (Exception ex)
                                    {
                                        await transaction.RollbackAsync();
                                        Console.WriteLine("Lỗi Database: " + ex.Message);
                                        aiText += "\n\n⚠️ Có lỗi xảy ra khi lưu đơn hàng, bạn vui lòng thử lại sau nhé.";
                                    }
                                }
                                else
                                {
                                    aiText += "\n\n⚠️ Xin lỗi bạn, sản phẩm hoặc phân loại này hiện không đủ số lượng trong kho.";
                                }
                            }
                        }
                        else
                        {
                            aiText += "\n\n⚠️ Bạn vui lòng cung cấp đầy đủ số lượng và địa chỉ giao hàng để shop tạo đơn nhé.";
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("Lỗi Parse JSON từ AI: " + ex.Message);
                    }
                }

                // TRẢ VỀ CÂU TRẢ LỜI + DANH SÁCH GỢI Ý CÓ KÈM BIẾN THỂ
                return Ok(new { success = true, answer = aiText, suggestions = suggestions });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, answer = "Lỗi server: " + ex.Message });
            }
        }

        private static string ExtractGeminiText(string responseString)
        {
            try
            {
                using var jsonDoc = JsonDocument.Parse(responseString);
                var root = jsonDoc.RootElement;

                if (root.TryGetProperty("candidates", out var candidates) &&
                    candidates.ValueKind == JsonValueKind.Array &&
                    candidates.GetArrayLength() > 0)
                {
                    var firstCandidate = candidates[0];

                    if (firstCandidate.TryGetProperty("content", out var content) &&
                        content.TryGetProperty("parts", out var parts) &&
                        parts.ValueKind == JsonValueKind.Array &&
                        parts.GetArrayLength() > 0)
                    {
                        var texts = new List<string>();

                        foreach (var part in parts.EnumerateArray())
                        {
                            if (part.TryGetProperty("text", out var textProp))
                            {
                                var text = textProp.GetString();
                                if (!string.IsNullOrWhiteSpace(text))
                                {
                                    texts.Add(text);
                                }
                            }
                        }

                        return string.Join("\n", texts).Trim();
                    }
                }

                if (root.TryGetProperty("error", out var error))
                {
                    return error.ToString();
                }

                return string.Empty;
            }
            catch
            {
                return string.Empty;
            }
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