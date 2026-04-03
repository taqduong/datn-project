using System;
using System.ComponentModel.DataAnnotations;

namespace BE.Models
{
    public class ContactMessage
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string FullName { get; set; }
        
        [Required]
        public string Email { get; set; }
        
        public string Subject { get; set; }
        
        [Required]
        public string Content { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        
        // Cờ đánh dấu Admin đã đọc hay chưa
        public bool IsRead { get; set; } = false; 
    }
}