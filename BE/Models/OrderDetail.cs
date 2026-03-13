using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BE.Models;

// Tạo Index giúp truy vấn dữ liệu nhanh hơn khi tìm kiếm theo OrderId hoặc ProductId
[Index("OrderId", Name = "IX_OrderDetails_OrderId")]
[Index("ProductId", Name = "IX_OrderDetails_ProductId")]
public partial class OrderDetail
{
    [Key]
    public int OrderDetailId { get; set; }

    public int OrderId { get; set; }

    public int ProductId { get; set; }

    public int Quantity { get; set; }

    // Lưu giá của sản phẩm ngay tại thời điểm khách bấm "Đặt hàng"
    [Column(TypeName = "decimal(18, 2)")]
    public decimal UnitPrice { get; set; }

    // ===== Các mối quan hệ (Foreign Keys) =====

    [ForeignKey("OrderId")]
    [InverseProperty("OrderDetails")]
    public virtual Order Order { get; set; } = null!;

    [ForeignKey("ProductId")]
    [InverseProperty("OrderDetails")]
    public virtual Product Product { get; set; } = null!;
}