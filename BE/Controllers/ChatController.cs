using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Data;
using BE.Models;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace BE.Controllers
{
    [Route("api/chat")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public ChatController(ShopDbContext context)
        {
            _context = context;
        }

        // ================== USER: Lấy lịch sử chat của mình ==================
        [HttpGet("history")]
        [Authorize]
        public async Task<IActionResult> GetUserHistory()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized("Vui lòng đăng nhập.");

            var messages = await _context.ChatMessages
                .Where(m => m.UserId == userId)
                .OrderBy(m => m.CreatedAt) // Sắp xếp từ cũ đến mới
                .Select(m => new {
                    m.Id,
                    m.Message,
                    m.IsFromAdmin,
                    m.CreatedAt
                })
                .ToListAsync();

            return Ok(messages);
        }

        // ================== ADMIN: Lấy danh sách Khách Hàng đã nhắn tin ==================
        [HttpGet("admin/users")]
        [Authorize(Roles = "admin,nhanvien")]
        public async Task<IActionResult> GetChatUsers()
        {
            // Lấy danh sách các UserId có nhắn tin (nhóm lại) kèm theo thông tin User
            var users = await _context.ChatMessages
                .Include(m => m.User)
                .GroupBy(m => m.UserId)
                .Select(g => new {
                    UserId = g.Key,
                    FullName = g.FirstOrDefault()!.User!.FullName ?? "Khách hàng " + g.Key,
                    LastMessage = g.OrderByDescending(m => m.CreatedAt).FirstOrDefault()!.Message,
                    LastMessageTime = g.OrderByDescending(m => m.CreatedAt).FirstOrDefault()!.CreatedAt,
                    UnreadCount = g.Count(m => !m.IsRead && !m.IsFromAdmin)
                })
                .OrderByDescending(x => x.LastMessageTime)
                .ToListAsync();

            return Ok(users);
        }

        // ================== ADMIN: Lấy lịch sử chat với 1 Khách Hàng cụ thể ==================
        [HttpGet("admin/history/{userId:int}")]
        [Authorize(Roles = "admin,nhanvien")]
        public async Task<IActionResult> GetHistoryWithUser(int userId)
        {
            var messages = await _context.ChatMessages
                .Where(m => m.UserId == userId)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new {
                    m.Id,
                    m.Message,
                    m.IsFromAdmin,
                    m.CreatedAt
                })
                .ToListAsync();

            return Ok(messages);
        }
        
        // ================== TÍNH NĂNG MỞ RỘNG: ĐÁNH DẤU ĐÃ ĐỌC ==================
        [HttpPut("admin/read/{userId:int}")]
        [Authorize(Roles = "admin,nhanvien")]
        public async Task<IActionResult> MarkAsRead(int userId)
        {
            var unreadMessages = await _context.ChatMessages
                .Where(m => m.UserId == userId && !m.IsFromAdmin && !m.IsRead)
                .ToListAsync();

            foreach(var msg in unreadMessages)
            {
                msg.IsRead = true;
            }
            
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}