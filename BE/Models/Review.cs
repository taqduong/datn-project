using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BE.Models
{
    [Index("CreatedAt", Name = "IX_Review_CreatedAt")]
    [Index("ProductId", Name = "IX_Review_ProductId")]
    [Index("UserId", "ProductId", Name = "IX_Review_User_Product_Unique", IsUnique = true)] // Chống spam: 1 user chỉ review 1 lần/sản phẩm
    public partial class Review
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProductId { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [Range(1, 5, ErrorMessage = "Đánh giá phải từ 1 đến 5 sao")]
        public int Rating { get; set; }

        [StringLength(1000)]
        public string Comment { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.Now; // Tự động lấy giờ hiện tại

        public DateTime? UpdatedAt { get; set; }

        public bool IsVerifiedPurchase { get; set; } // Tick xanh "Đã mua hàng"

        [ForeignKey("ProductId")]
        [InverseProperty("Reviews")]
        public virtual Product Product { get; set; } = null!;

        [ForeignKey("UserId")]
        [InverseProperty("Reviews")]
        public virtual User User { get; set; } = null!;
    }
}