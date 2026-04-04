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

        // 1. Khách gửi tin nhắn cho Admin
        public async Task SendMessageToAdmin(int userId, string message)
        {
            // Lưu vào Database
            var chatMsg = new ChatMessage 
            { 
                UserId = userId, 
                Message = message, 
                IsFromAdmin = false, 
                CreatedAt = DateTime.Now 
            };
            _context.ChatMessages.Add(chatMsg);
            await _context.SaveChangesAsync();

            // Phát sóng tin nhắn cho TẤT CẢ mọi người đang kết nối (FE sẽ tự lọc)
            await Clients.All.SendAsync("ReceiveMessage", chatMsg);
        }

        // 2. Admin trả lời Khách
        public async Task SendMessageToUser(int userId, string message)
        {
            // Lưu vào Database
            var chatMsg = new ChatMessage 
            { 
                UserId = userId, 
                Message = message, 
                IsFromAdmin = true, 
                CreatedAt = DateTime.Now 
            };
            _context.ChatMessages.Add(chatMsg);
            await _context.SaveChangesAsync();

            // Phát sóng tin nhắn mới
            await Clients.All.SendAsync("ReceiveMessage", chatMsg);
        }
    }
}