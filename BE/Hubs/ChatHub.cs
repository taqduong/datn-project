using Microsoft.AspNetCore.SignalR;
using BE.Data;
using BE.Models;
using System;
using System.Threading.Tasks;

namespace BE.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ShopDbContext _context;

        public ChatHub(ShopDbContext context)
        {
            _context = context;
        }

        // ========================================================
        // Tích hợp logic phân luồng kết nối WebSocket theo cơ chế Rooms
        // ========================================================
        
        // Khởi tạo Room cho Khách hàng khi quá trình handshake WebSocket hoàn tất
        public async Task JoinUserRoom(int userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
        }

        // Admin gọi hàm này ngay khi kết nối SignalR thành công
        public async Task JoinAdminRoom()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
        }

        // ========================================================

        // 1. Khách gửi tin nhắn cho Admin
        public async Task SendMessageToAdmin(int userId, string message)
        {
            var chatMsg = new ChatMessage 
            { 
                UserId = userId, 
                Message = message, 
                IsFromAdmin = false, 
                CreatedAt = DateTime.Now 
            };
            _context.ChatMessages.Add(chatMsg);
            await _context.SaveChangesAsync();

            // Tối ưu hóa: Broadcast tin nhắn giới hạn trong Admin Group và User Room (Đồng bộ đa phiên)
            await Clients.Group("Admins").SendAsync("ReceiveMessage", chatMsg);
            await Clients.Group($"User_{userId}").SendAsync("ReceiveMessage", chatMsg);
        }

        // 2. Admin trả lời Khách
        public async Task SendMessageToUser(int userId, string message)
        {
            var chatMsg = new ChatMessage 
            { 
                UserId = userId, 
                Message = message, 
                IsFromAdmin = true, 
                CreatedAt = DateTime.Now 
            };
            _context.ChatMessages.Add(chatMsg);
            await _context.SaveChangesAsync();

            // Tối ưu hóa: Phân phối tin nhắn phản hồi tới User Room và đồng bộ trạng thái giữa các Admins
            await Clients.Group($"User_{userId}").SendAsync("ReceiveMessage", chatMsg);
            await Clients.Group("Admins").SendAsync("ReceiveMessage", chatMsg);
        }
    }
}