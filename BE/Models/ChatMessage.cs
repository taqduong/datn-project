using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models
{
    public class ChatMessage
    {
        [Key]
        public int Id { get; set; }

        public int UserId { get; set; } // ID của người dùng (Khách)

        [Required]
        public string Message { get; set; } = string.Empty;

        // Phân biệt ai gửi: true = Admin gửi, false = Khách gửi
        public bool IsFromAdmin { get; set; } = false; 

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public bool IsRead { get; set; } = false;

        // Mối quan hệ với bảng User (để biết tên khách)
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}