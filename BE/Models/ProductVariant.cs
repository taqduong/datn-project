using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models 
{
    public class ProductVariant
    {
        [Key]
        public int Id { get; set; }

        public int ProductId { get; set; }

        [StringLength(150)]
        public string VariantName { get; set; } = string.Empty; // VD: "Trắng - 24cm"

        [StringLength(100)]
        public string? Color { get; set; } // Mã màu hoặc tên màu nếu cần lọc

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; } // Giá riêng của option này

        public int Stock { get; set; } // Tồn kho riêng

        [StringLength(500)]
        public string? ImageUrl { get; set; } // Ảnh riêng (khi bấm vào màu Trắng thì hiện ảnh Trắng)

        [ForeignKey(nameof(ProductId))]
        public virtual Product Product { get; set; } = null!;

        [InverseProperty("ProductVariant")]
        public virtual ICollection<Cart> Carts { get; set; } = new List<Cart>();

        [InverseProperty("ProductVariant")]
        public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
    }
}