using Microsoft.AspNetCore.Mvc;
using BE.Data;
using BE.Models;
using Microsoft.EntityFrameworkCore;
using BE.Services; 
using System;
using System.Threading.Tasks;

namespace BE.Controllers
{
    [Route("api/contact")]
    [ApiController]
    public class ContactController : ControllerBase
    {
        private readonly ShopDbContext _context;
        private readonly IEmailService _emailService; // Khai báo Email Service

        // Tiêm IEmailService vào Constructor
        public ContactController(ShopDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // POST: api/contact
        [HttpPost]
        public async Task<IActionResult> SubmitContactForm([FromBody] ContactMessage message)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest("Dữ liệu không hợp lệ");
            }

            _context.ContactMessages.Add(message);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã gửi tin nhắn thành công!" });
        }

        // GET: api/contact
        [HttpGet]
        public async Task<IActionResult> GetAllContacts()
        {
            var messages = await _context.ContactMessages
                                         .OrderByDescending(m => m.CreatedAt)
                                         .ToListAsync();
            return Ok(messages);
        }
    
        [HttpPut("{id:int}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var message = await _context.ContactMessages.FindAsync(id);
            if (message == null) return NotFound("Không tìm thấy tin nhắn.");

            message.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã đánh dấu là đã đọc." });
        }

        [HttpPost("{id:int}/reply")]
        public async Task<IActionResult> ReplyContact(int id, [FromBody] ReplyDto request)
        {
            var message = await _context.ContactMessages.FindAsync(id);
            if (message == null) return NotFound("Không tìm thấy tin nhắn.");

            try
            {
                // Format tiêu đề và nội dung Email (HTML)
                string subject = $"[HomeMart] Phản hồi yêu cầu: {message.Subject}";
                string body = $"<div style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>" +
                              $"<h3 style='color: #2563eb;'>Xin chào {message.FullName},</h3>" +
                              $"<p>Cảm ơn bạn đã liên hệ với HomeMart. Dưới đây là phản hồi cho yêu cầu của bạn:</p>" +
                              $"<div style='background-color: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;'>" +
                              $"{request.ReplyContent.Replace("\n", "<br/>")}" +
                              $"</div>" +
                              $"<p>Nếu cần hỗ trợ thêm, bạn vui lòng trả lời trực tiếp email này.</p>" +
                              $"<p>Trân trọng,<br/><strong>Đội ngũ HomeMart</strong></p>" +
                              $"</div>";

                // Gọi Service gửi mail của sếp
                await _emailService.SendEmailAsync(message.Email, subject, body);

                // Gửi xong thì tự động chuyển trạng thái thành "Đã đọc"
                message.IsRead = true;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Đã gửi email phản hồi thành công!" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi khi gửi email: {ex.Message}");
            }
        }
    }

    // Class chứa dữ liệu nội dung phản hồi từ Admin gửi lên
    public class ReplyDto
    {
        public string ReplyContent { get; set; }
    }
}