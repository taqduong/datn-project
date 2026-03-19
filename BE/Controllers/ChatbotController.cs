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
                return BadRequest(new
                {
                    success = false,
                    answer = "Vui lòng nhập câu hỏi."
                });
            }

            try
            {
                var apiKey = _configuration["GeminiAI:ApiKey"]?.Trim();
                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    return StatusCode(500, new
                    {
                        success = false,
                        answer = "Chưa cấu hình API Key cho AI."
                    });
                }

                // Có thể đổi trong appsettings.json
                var model = _configuration["GeminiAI:Model"]?.Trim();
                if (string.IsNullOrWhiteSpace(model))
                {
                    model = "gemini-2.5-flash";
                }

                // Lấy dữ liệu sản phẩm
                var products = await _context.Products
                    .Where(p => p.Stock > 0)
                    .Select(p => new
                    {
                        p.Id,
                        p.Name,
                        p.Price,
                        p.Discount,
                        p.Stock
                    })
                    .Take(50)
                    .ToListAsync();

                if (!products.Any())
                {
                    return Ok(new
                    {
                        success = true,
                        answer = "Hiện shop đang chưa có sản phẩm nào còn hàng để tư vấn 😥"
                    });
                }

                var productLines = products.Select(p =>
                {
                    var finalPrice = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price;

                    return $"- ID: {p.Id} | Tên: {p.Name} | Giá gốc: {p.Price:N0} VNĐ | Giá bán: {finalPrice:N0} VNĐ | Tồn kho: {p.Stock}";
                });

                var productContext = string.Join("\n", productLines);

                var prompt = $@"
Bạn là nhân viên tư vấn bán hàng của HomeMart.
Nhiệm vụ của bạn là trả lời khách hàng bằng tiếng Việt, ngắn gọn, thân thiện, dễ hiểu.

Câu hỏi của khách:
{request.question}

Danh sách sản phẩm hiện có trong shop:
{productContext}

Quy tắc trả lời:
- Bạn là trợ lý AI thông minh của HomeMart. Bạn ĐƯỢC PHÉP trả lời mọi câu hỏi kiến thức chung, khoa học, ngày tháng, tâm sự... của khách hàng một cách vui vẻ, tự nhiên.
- TUY NHIÊN, khi khách hỏi về MUA SẮM, HÀNG HÓA: CHỈ tư vấn dựa trên danh sách sản phẩm ở trên. Tuyệt đối không bịa thêm sản phẩm, giá, tồn kho.
- Nếu khách hỏi mua sản phẩm không có trong danh sách, hãy xin lỗi và bẻ lái sang gợi ý sản phẩm của shop.
- Ưu tiên nêu tên sản phẩm (in đậm), giá bán và lý do gợi ý nếu đang tư vấn mua hàng.
- Có thể dùng emoji vừa phải để tạo sự thân thiện.
".Trim();

                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

                // BẮT ĐẦU ĐOẠN MỚI: Xử lý lịch sử chat
                var contentsList = new List<object>();

                // 1. Nhồi lịch sử chat cũ vào (nếu có)
                if (request.history != null && request.history.Any())
                {
                    foreach (var msg in request.history)
                    {
                        // Thằng Gemini quy định: bot là "model", user là "user"
                        contentsList.Add(new
                        {
                            role = msg.sender == "bot" ? "model" : "user",
                            parts = new[] { new { text = msg.text } }
                        });
                    }
                }

                // 2. Nhồi câu hỏi hiện tại kèm theo Prompt (Luôn ở cuối cùng)
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
                    return Ok(new
                    {
                        success = false,
                        answer = $"Lỗi từ Gemini (HTTP {(int)response.StatusCode}): {responseString}"
                    });
                }

                string aiText = ExtractGeminiText(responseString);

                if (string.IsNullOrWhiteSpace(aiText))
                {
                    return Ok(new
                    {
                        success = false,
                        answer = "AI không trả về nội dung hợp lệ."
                    });
                }

                return Ok(new
                {
                    success = true,
                    answer = aiText
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    answer = "Lỗi server: " + ex.Message
                });
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
        public string? question { get; set; }
        public List<ChatHistory>? history { get; set; }
    }

    public class ChatHistory
    {
        public string? sender { get; set; }
        public string? text { get; set; }
    }
}