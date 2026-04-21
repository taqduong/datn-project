using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BE.Models;

[Index("ProductId", Name = "IX_Carts_ProductId")]
[Index("UserId", Name = "IX_Carts_UserId")]
// CHỐNG TRÙNG LẶP GIỎ HÀNG: 1 USER CHỈ ĐƯỢC CÓ 1 SẢN PHẨM VỚI 1 BIẾN THỂ TRONG GIỎ HÀNG
[Index(nameof(UserId), nameof(ProductId), nameof(VariantId), IsUnique = true, Name = "IX_Carts_User_Product_Variant_Unique")]
public partial class Cart
{
    [Key]
    public int CartItemId { get; set; }

    public int UserId { get; set; }

    public int ProductId { get; set; }

    public int Quantity { get; set; }

    public DateTime CreatedAt { get; set; }

    public int? VariantId { get; set; } 
    
    [ForeignKey("VariantId")]
    [InverseProperty("Carts")]
    public virtual ProductVariant? ProductVariant { get; set; }

    [ForeignKey("ProductId")]
    [InverseProperty("Carts")]
    public virtual Product Product { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("Carts")]
    public virtual User User { get; set; } = null!;
}