using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BE.Models;

[Index("UserId", Name = "IX_Orders_UserId")]
public partial class Order
{
    [Key]
    public int OrderId { get; set; }

    public int UserId { get; set; }

    // Tự động lấy giờ hiện tại khi tạo đơn
    public DateTime OrderDate { get; set; } = DateTime.Now;

    [Column(TypeName = "decimal(18, 2)")]
    public decimal TotalAmount { get; set; }

    // ===== Thông tin giảm giá & Phí vận chuyển =====
    [StringLength(50)]
    public string? AppliedVoucherCode { get; set; } // Lưu lại mã Voucher khách đã nhập (VD: "FREESHIP")

    [Column(TypeName = "decimal(18, 2)")]
    public decimal DiscountAmount { get; set; } = 0; // Số tiền được giảm

    [Column(TypeName = "decimal(18, 2)")]
    public decimal ShippingFee { get; set; } = 30000; // Phí ship (Mặc định 30k, nếu freeship thì sẽ thành 0)

    [Required]
    [StringLength(50)]
    public string Status { get; set; } = "Pending";

    [StringLength(50)]
    public string PaymentMethod { get; set; } = "COD"; // Mặc định là COD

    // ===== Thông tin giao hàng =====
    // Mình để Required cho Tên, SĐT, Địa chỉ vì giao hàng thì bắt buộc phải có những cái này
    [Required]
    [StringLength(100)]
    public string FullName { get; set; } = null!;

    [StringLength(100)]
    public string? Email { get; set; } // Email có thể không cần thiết với một số khách

    [Required]
    [StringLength(20)]
    public string Phone { get; set; } = null!;

    [Required]
    [StringLength(255)]
    public string Address { get; set; } = null!;

    [StringLength(100)]
    public string? City { get; set; }

    // [StringLength(100)]
    // public string? District { get; set; }

    [StringLength(100)]
    public string? Ward { get; set; }

    public string? Note { get; set; }

    // ===== Các mối quan hệ =====
    [InverseProperty("Order")]
    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();

    [ForeignKey("UserId")]
    [InverseProperty("Orders")]
    public virtual User User { get; set; } = null!;
}