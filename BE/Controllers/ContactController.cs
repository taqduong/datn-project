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
                // Format tiêu đề Email
                string subject = $"[HomeMart] Phản hồi yêu cầu: {message.Subject}";
                
                // Format nội dung Email (HTML) - Đã đính kèm phần Trích dẫn câu hỏi gốc
                string body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;'>
                    <h2 style='color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;'>Phản hồi từ HomeMart</h2>
                    
                    <p>Xin chào <strong>{message.FullName}</strong>,</p>
                    <p>Cảm ơn bạn đã liên hệ với HomeMart. Dưới đây là phản hồi cho yêu cầu của bạn:</p>
                    
                    <div style='background-color: #f8fafc; padding: 20px; border-radius: 8px; font-size: 15px; line-height: 1.6; margin: 25px 0;'>
                        {request.ReplyContent.Replace("\n", "<br/>")}
                    </div>

                    <div style='margin-top: 30px; padding: 15px 20px; border-left: 4px solid #cbd5e1; background-color: #f1f5f9; color: #64748b; font-style: italic; font-size: 14px;'>
                        <p style='margin-top: 0; margin-bottom: 8px; font-weight: bold; color: #475569;'>Yêu cầu ban đầu của bạn:</p>
                        <p style='margin: 0; line-height: 1.5;'>""{message.Content.Replace("\n", "<br/>")}""</p>
                    </div>

                    <p style='margin-top: 30px;'>Nếu cần hỗ trợ thêm, bạn vui lòng trả lời trực tiếp email này.</p>
                    
                    <p>Trân trọng,<br/><strong>Đội ngũ HomeMart</strong></p>
                    
                    <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 30px 0 20px 0;' />
                    <p style='font-size: 12px; color: #9ca3af; text-align: center;'>Đây là email tự động, vui lòng không trả lời.</p>
                </div>";

                // Gọi Service gửi mail 
                await _emailService.SendEmailAsync(message.Email, subject, body);

                // Tự động cập nhật trạng thái "Đã đọc" sau khi truyền tải Email thành công
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