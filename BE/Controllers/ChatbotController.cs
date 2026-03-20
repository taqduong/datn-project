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
                if (string.IsNullOrWhiteSpace(model)) model = "gemini-2.5-flash-lite";

                // ==========================================
                // 🚀 1. TỐI ƯU HÓA: LỌC SẢN PHẨM THEO TỪ KHÓA CỦA KHÁCH
                // ==========================================
                var keyword = request.question.Trim().ToLower();
                
                var productsQuery = _context.Products.Where(p => p.Stock > 0);
                
                // Thử tìm sản phẩm khớp với câu hỏi trước
                var products = await productsQuery
                    .Where(p => p.Name.ToLower().Contains(keyword))
                    .Select(p => new { p.Id, p.Name, p.Price, p.Discount, p.Stock })
                    .Take(10)
                    .ToListAsync();

                // Nếu không tìm thấy từ khóa nào khớp, thì mới lấy ngẫu nhiên/nổi bật
                if (!products.Any())
                {
                    products = await productsQuery
                        .Select(p => new { p.Id, p.Name, p.Price, p.Discount, p.Stock })
                        .Take(10)
                        .ToListAsync();
                }

                if (!products.Any())
                {
                    return Ok(new { success = true, answer = "Hiện shop đang chưa có sản phẩm nào còn hàng để tư vấn 😥" });
                }

                var productLines = products.Select(p =>
                {
                    var finalPrice = p.Discount.HasValue ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0) : p.Price;
                    return $"- ID: {p.Id} | Tên: {p.Name} | Giá bán: {finalPrice:N0} VNĐ | Tồn kho: {p.Stock}";
                });
                var productContext = string.Join("\n", productLines);

                // ==========================================
                // 🚀 2. BẢO MẬT: LẤY ID TỪ JWT TOKEN
                // ==========================================
                int? secureUserId = null;
                if (User.Identity != null && User.Identity.IsAuthenticated)
                {
                    var claimId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                                  ?? User.FindFirst("id")?.Value ?? User.FindFirst("UserId")?.Value;
                    if (int.TryParse(claimId, out int parsedId)) secureUserId = parsedId;
                }

                // ==========================================
                // 🚀 3. CHẶN TỪ BACKEND NẾU CHƯA ĐĂNG NHẬP
                // ==========================================
                // Dùng hàm IsPurchaseIntent xịn xò ở bên dưới để kiểm tra
                if (secureUserId == null && IsPurchaseIntent(request.question))
                {
                    return Ok(new { success = true, answer = "Dạ, để HomeMart có thể lên đơn hàng cho bạn, bạn vui lòng **Đăng nhập** tài khoản ở góc trên màn hình giúp mình nhé! 😊" });
                }

                // ==========================================
                // 🚀 4. XỬ LÝ PROMPT THÔNG MINH
                // ==========================================
                string userInfoContext = "";
                string saleRules = "";

                if (secureUserId.HasValue)
                {
                    var currentUser = await _context.Users.FindAsync(secureUserId.Value);
                    userInfoContext = $"THÔNG TIN KHÁCH HÀNG: Tên '{currentUser?.FullName}', SĐT '{currentUser?.Phone}'. Không cần hỏi lại thông tin này.";
                    
                    saleRules = @"
- Bạn có quyền chủ động hỏi số lượng và địa chỉ để chốt đơn.
- NẾU KHÁCH ĐÃ CHỐT MUA (Cần ĐỦ Sản phẩm, Số lượng > 0, và Địa chỉ), BẮT BUỘC chèn đoạn mã JSON sau ở cuối:
[ORDER_INFO: { ""productId"": 1, ""quantity"": 1, ""customerName"": ""Nguyễn Văn A"", ""phone"": ""0912345678"", ""address"": ""Hà Nội"" }]";
                }
                else
                {
                    userInfoContext = "TÌNH TRẠNG: KHÁCH CHƯA ĐĂNG NHẬP.";
                    saleRules = "- BẠN CHỈ TƯ VẤN SẢN PHẨM. TUYỆT ĐỐI KHÔNG hỏi địa chỉ, không tạo mã [ORDER_INFO].";
                }

                var prompt = $@"
Bạn là nhân viên tư vấn bán hàng của HomeMart.

Danh sách sản phẩm gợi ý:
{productContext}

{userInfoContext}

QUY TẮC CỦA BẠN:
- Nếu khách dùng các từ 'cái đó', 'sản phẩm đấy', 'loại kia'... hãy hiểu là họ đang nói đến sản phẩm được nhắc đến gần nhất trong lịch sử hội thoại.
{saleRules}
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
                // 🚀 5. VALIDATE VÀ TẠO ĐƠN HÀNG VỚI TRANSACTION
                // ==========================================
                var orderMatch = System.Text.RegularExpressions.Regex.Match(aiText, @"\[ORDER_INFO:\s*(\{.*?\})\s*\]");
                if (orderMatch.Success && secureUserId.HasValue)
                {
                    var jsonString = orderMatch.Groups[1].Value;
                    aiText = aiText.Replace(orderMatch.Value, "").Trim(); // Xóa mã JSON khỏi text hiển thị

                    try
                    {
                        var orderData = JsonSerializer.Deserialize<OrderPayload>(jsonString);
                        
                        // VALIDATE: Chống AI tạo data ảo
                        if (orderData != null && orderData.productId > 0 && orderData.quantity > 0 && !string.IsNullOrWhiteSpace(orderData.address))
                        {
                            var product = await _context.Products.FindAsync(orderData.productId);
                            
                            // VALIDATE: Kiểm tra tồn kho
                            if (product != null && product.Stock >= orderData.quantity)
                            {
                                decimal unitPrice = product.Discount.HasValue ? Math.Round(product.Price * (1 - (decimal)product.Discount.Value / 100), 0) : product.Price;
                                var fallbackUser = await _context.Users.FindAsync(secureUserId.Value);

                                // MỞ TRANSACTION BẢO VỆ DATABASE
                                using var transaction = await _context.Database.BeginTransactionAsync();
                                try
                                {
                                    var newOrder = new BE.Models.Order
                                    {
                                        UserId = secureUserId.Value,
                                        FullName = !string.IsNullOrEmpty(orderData.customerName) ? orderData.customerName : (fallbackUser?.FullName ?? "Khách hàng"),
                                        Phone = !string.IsNullOrEmpty(orderData.phone) ? orderData.phone : (fallbackUser?.Phone ?? ""),
                                        Address = orderData.address,
                                        TotalAmount = unitPrice * orderData.quantity,
                                        Status = "Pending", 
                                        OrderDate = DateTime.Now
                                    };
                                    
                                    _context.Orders.Add(newOrder);
                                    await _context.SaveChangesAsync(); // Lưu Order lấy ID

                                    var newOrderDetail = new BE.Models.OrderDetail
                                    {
                                        OrderId = newOrder.OrderId,
                                        ProductId = product.Id,
                                        Quantity = orderData.quantity,
                                        UnitPrice = unitPrice
                                    };
                                    
                                    _context.OrderDetails.Add(newOrderDetail);
                                    
                                    // BỔ SUNG: Trừ tồn kho luôn cho thực tế
                                    product.Stock -= orderData.quantity;

                                    await _context.SaveChangesAsync(); // Lưu Detail & Stock
                                    
                                    await transaction.CommitAsync(); // XÁC NHẬN LƯU THÀNH CÔNG TẤT CẢ

                                    aiText += $"\n\n🎉 **Hệ thống đã tự động lên đơn thành công!** Mã đơn hàng: **#{newOrder.OrderId}**. Tổng: **{newOrder.TotalAmount:N0}đ**.";
                                }
                                catch (Exception ex)
                                {
                                    await transaction.RollbackAsync(); // NẾU LỖI THÌ QUAY XE, KHÔNG LƯU GÌ CẢ
                                    Console.WriteLine("Lỗi Database Transaction: " + ex.Message);
                                    aiText += "\n\n⚠️ Có lỗi xảy ra khi lưu đơn hàng vào hệ thống, bạn vui lòng thử lại sau nhé.";
                                }
                            }
                            else
                            {
                                aiText += "\n\n⚠️ Xin lỗi bạn, sản phẩm này hiện không đủ số lượng trong kho để lên đơn.";
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

                return Ok(new { success = true, answer = aiText });
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

        // 🚀 BẮT Ý ĐỊNH MUA HÀNG (Dùng cụm từ để tránh bắt nhầm câu hỏi bình thường)
        private static bool IsPurchaseIntent(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return false;

            var q = text.Trim().ToLower();

            // Chỉ bắt các CỤM TỪ rõ ràng mang tính hành động chốt đơn
            string[] keywords =
            {
                "đặt hàng", "chốt đơn", "lên đơn", "muốn mua 1", "muốn mua một", 
                "muốn đặt", "đặt giúp", "ship cho", "giao cho", "lấy 1", "lấy một"
            };

            return keywords.Any(k => q.Contains(k));
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
        public int quantity { get; set; }
        public string? customerName { get; set; }
        public string? phone { get; set; }
        public string? address { get; set; }
    }
}