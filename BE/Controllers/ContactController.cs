using Microsoft.AspNetCore.Mvc;
using BE.Data;
using BE.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace BE.Controllers
{
    [Route("api/contact")]
    [ApiController]
    public class ContactController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public ContactController(ShopDbContext context)
        {
            _context = context;
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
            // Lấy tất cả tin nhắn, sắp xếp cái nào mới nhất lên đầu
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
    }
}