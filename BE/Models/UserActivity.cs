using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace BE.Models
{
    public class UserActivity
    {
        [Key]
        public int Id { get; set; }

        public int UserId { get; set; }

        public int ProductId { get; set; }

        // Lưu danh mục để query cho nhanh
        public int CategoryId { get; set; } 

        // Các loại hành vi: "View", "AddToWishlist", "AddToCart", "Purchase"
        [Required]
        [StringLength(20)]
        [Unicode(false)]
        public string ActionType { get; set; } = null!;

        // Điểm: 1, 2, 3, 5
        public int Score { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // --- LIÊN KẾT BẢNG  ---
        [ForeignKey("UserId")]
        [InverseProperty("UserActivities")]
        [JsonIgnore]
        public virtual User User { get; set; } = null!;

        [ForeignKey("ProductId")]
        [InverseProperty("UserActivities")] 
        [JsonIgnore]
        public virtual Product Product { get; set; } = null!;
    }
}