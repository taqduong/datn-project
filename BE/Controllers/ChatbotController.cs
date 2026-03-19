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
                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    return StatusCode(500, new { success = false, answer = "Chưa cấu hình API Key cho AI." });
                }

                var model = _configuration["GeminiAI:Model"]?.Trim();
                if (string.IsNullOrWhiteSpace(model))
                {
                    model = "gemini-2.5-flash";
                }

                var products = await _context.Products
                    .Where(p => p.Stock > 0)
                    .Select(p => new { p.Id, p.Name, p.Price, p.Discount, p.Stock })
                    .Take(50)
                    .ToListAsync();

                if (!products.Any())
                {
                    return Ok(new { success = true, answer = "Hiện shop đang chưa có sản phẩm nào còn hàng để tư vấn 😥" });
                }

                var productLines = products.Select(p =>
                {
                    var finalPrice = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price;

                    return $"- ID: {p.Id} | Tên: {p.Name} | Giá gốc: {p.Price:N0} VNĐ | Giá bán: {finalPrice:N0} VNĐ | Tồn kho: {p.Stock}";
                });

                var productContext = string.Join("\n", productLines);

                // 🚀 BƯỚC MỚI: Lấy thông tin khách hàng nếu họ đã đăng nhập
                var currentUser = request.userId.HasValue ? await _context.Users.FindAsync(request.userId.Value) : null;
                
                string userInfoContext = currentUser != null 
                    ? $"THÔNG TIN KHÁCH HÀNG ĐÃ ĐĂNG NHẬP: Tên là '{currentUser.FullName}', SĐT là '{currentUser.Phone}'. BẠN TUYỆT ĐỐI KHÔNG HỎI LẠI TÊN VÀ SĐT NỮA. ĐỂ LÊN ĐƠN, CHỈ CẦN HỎI: Số lượng (nếu chưa nói) và Địa chỉ nhận hàng."
                    : "TÌNH TRẠNG HIỆN TẠI: KHÁCH CHƯA ĐĂNG NHẬP. NẾU KHÁCH MUỐN MUA HÀNG (CHỐT ĐƠN), BẠN KHÔNG ĐƯỢC PHÉP HỎI THÔNG TIN. BẮT BUỘC PHẢI TRẢ LỜI LÀ: 'Dạ, để HomeMart có thể lên đơn hàng cho bạn, bạn vui lòng **Đăng nhập** tài khoản ở góc trên màn hình giúp mình nhé! 😊' và TUYỆT ĐỐI KHÔNG TẠO mã [ORDER_INFO].";

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
- Ưu tiên nêu tên sản phẩm (in đậm) và giá bán.
- 🚀 KỸ NĂNG SALE (RẤT QUAN TRỌNG): Nếu khách hỏi thăm sản phẩm và shop có hàng, BẮT BUỘC chủ động hỏi mồi khách để chốt đơn (Ví dụ: Bạn muốn mua bao nhiêu cái để shop lên đơn? Ship về địa chỉ nào ạ?).

QUY TẮC TỰ ĐỘNG LÊN ĐƠN HÀNG (QUAN TRỌNG NHẤT):
Nếu khách hàng đã chốt mua và cung cấp đủ thông tin bao gồm: Sản phẩm, Số lượng, và Địa chỉ (Tên và SĐT lấy từ THÔNG TIN KHÁCH HÀNG ở trên nếu có).
Hãy trả lời xác nhận lịch sự với khách, và BẮT BUỘC chèn thêm một đoạn mã JSON chứa thông tin đơn hàng ở cuối cùng của câu trả lời theo đúng định dạng sau:
[ORDER_INFO: {{ ""productId"": 1, ""quantity"": 1, ""customerName"": ""Nguyễn Văn A"", ""phone"": ""0912345678"", ""address"": ""Hà Nội"" }}]

Lưu ý: 
- Khách đã đăng nhập thì tự động điền customerName và phone của họ vào JSON, không cần hỏi lại.
- Tự động lấy 'productId' tương ứng với sản phẩm khách chọn trong danh sách.
- CHỈ tạo mã [ORDER_INFO] khi đã có ĐỦ ĐỊA CHỈ. Nếu thiếu địa chỉ, hãy lịch sự xin thêm.
".Trim();

                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

                var contentsList = new List<object>();

                if (request.history != null && request.history.Any())
                {
                    foreach (var msg in request.history)
                    {
                        contentsList.Add(new
                        {
                            role = msg.sender == "bot" ? "model" : "user",
                            parts = new[] { new { text = msg.text } }
                        });
                    }
                }

                contentsList.Add(new
                {
                    role = "user",
                    parts = new[] { new { text = prompt } }
                });

                var payload = new { contents = contentsList };
                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    // Nếu dính lỗi 429 (Quá tải API do spam chat quá nhanh)
                    if ((int)response.StatusCode == 429)
                    {
                        return Ok(new { 
                            success = false, 
                            answer = "Hệ thống AI của HomeMart đang quá tải do có quá nhiều người truy cập. Bạn vui lòng đợi khoảng 1 phút rồi chat lại với mình nhé! ⏳" 
                        });
                    }
                    
                    // Các lỗi khác của Google
                    return Ok(new { 
                        success = false, 
                        answer = "Hiện tại mình đang gặp chút sự cố kết nối. Bạn vui lòng thử lại sau nhé! 😥" 
                    });
                }

                string aiText = ExtractGeminiText(responseString);

                if (string.IsNullOrWhiteSpace(aiText))
                {
                    return Ok(new { success = false, answer = "AI không trả về nội dung hợp lệ." });
                }

                // ==========================================
                // 🚀 XỬ LÝ LÊN ĐƠN HÀNG TỰ ĐỘNG
                // ==========================================
                var orderMatch = System.Text.RegularExpressions.Regex.Match(aiText, @"\[ORDER_INFO:\s*(\{.*?\})\s*\]");
                if (orderMatch.Success)
                {
                    var jsonString = orderMatch.Groups[1].Value;
                    try
                    {
                        // KIỂM TRA ĐĂNG NHẬP
                        if (request.userId == null || request.userId <= 0)
                        {
                            aiText = aiText.Replace(orderMatch.Value, "").Trim();
                            aiText += "\n\n⚠️ **Lưu ý nhỏ:** Mình thấy bạn chưa đăng nhập. Bạn vui lòng **Đăng nhập** tài khoản trên HomeMart để mình có thể tạo đơn hàng thành công cho bạn nhé! 😊";
                        }
                        else
                        {
                            var orderData = JsonSerializer.Deserialize<OrderPayload>(jsonString);
                            if (orderData != null && orderData.productId > 0)
                            {
                                var product = await _context.Products.FindAsync(orderData.productId);
                                if (product != null)
                                {
                                    decimal unitPrice = product.Discount.HasValue
                                        ? Math.Round(product.Price * (1 - (decimal)product.Discount.Value / 100), 0)
                                        : product.Price;

                                    // Tìm user hiện tại để lấy tên/sđt dự phòng
                                    var fallbackUser = await _context.Users.FindAsync(request.userId.Value);

                                    var newOrder = new BE.Models.Order
                                    {
                                        UserId = request.userId.Value, 
                                        // 🚀 Lấy từ AI, nếu AI quên thì lấy từ DB
                                        FullName = !string.IsNullOrEmpty(orderData.customerName) ? orderData.customerName : (fallbackUser?.FullName ?? "Khách hàng"),
                                        Phone = !string.IsNullOrEmpty(orderData.phone) ? orderData.phone : (fallbackUser?.Phone ?? ""),
                                        Address = orderData.address ?? "",
                                        TotalAmount = unitPrice * orderData.quantity,
                                        Status = "Pending", 
                                        OrderDate = DateTime.Now
                                    };
                                    
                                    _context.Orders.Add(newOrder);
                                    await _context.SaveChangesAsync();

                                    var newOrderDetail = new BE.Models.OrderDetail
                                    {
                                        OrderId = newOrder.OrderId,
                                        ProductId = product.Id,
                                        Quantity = orderData.quantity,
                                        UnitPrice = unitPrice
                                    };
                                    
                                    _context.OrderDetails.Add(newOrderDetail);
                                    await _context.SaveChangesAsync();

                                    aiText = aiText.Replace(orderMatch.Value, "").Trim();
                                    aiText += $"\n\n🎉 **Hệ thống đã tự động lên đơn thành công!** Mã đơn hàng của bạn là **#{newOrder.OrderId}**. Tổng thanh toán: **{newOrder.TotalAmount:N0}đ**. Cảm ơn bạn đã mua sắm tại HomeMart!";
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("Lỗi tạo đơn từ AI: " + ex.Message);
                        aiText = aiText.Replace(orderMatch.Value, "").Trim();
                    }
                }

                // Trả về kết quả cuối cùng cho Frontend
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

                // Format phổ biến của Gemini
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

                // Nếu Gemini trả lỗi JSON
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

    //THÊM CLASS NÀY ĐỂ ĐỌC JSON CỦA AI
    public class OrderPayload
    {
        public int productId { get; set; }
        public int quantity { get; set; }
        public string? customerName { get; set; }
        public string? phone { get; set; }
        public string? address { get; set; }
    }
}