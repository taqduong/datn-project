using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BE.Models;

[Table("Wishlist")]
[Index(nameof(UserId), Name = "IX_Wishlist_UserId")]
[Index(nameof(ProductId), Name = "IX_Wishlist_ProductId")]
// 1 USER CHỈ ĐƯỢC THÍCH 1 SẢN PHẨM 1 LẦN
[Index(nameof(UserId), nameof(ProductId), IsUnique = true, Name = "IX_Wishlist_User_Product_Unique")]
public partial class Wishlist
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public int ProductId { get; set; }

    // Tự động lấy giờ hệ thống lúc User bấm yêu thích
    public DateTime CreatedAt { get; set; } = DateTime.Now; 

    // --- Liên kết khóa ngoại (Foreign Keys) ---

    [ForeignKey(nameof(ProductId))]
    [InverseProperty("Wishlists")]
    public virtual Product Product { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    [InverseProperty("Wishlists")]
    public virtual User User { get; set; } = null!;
}