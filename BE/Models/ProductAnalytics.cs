using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models
{
    public class ProductAnalytics
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProductId { get; set; }

        // Số lượt xem chi tiết sản phẩm
        public int Views { get; set; } = 0;

        // Số lượt bấm thêm vào giỏ hàng
        public int AddToCartCount { get; set; } = 0;

        // Số lượt mua thành công (tính theo số lượng sản phẩm đã bán)
        public int PurchaseCount { get; set; } = 0;

        // Cột này thêm vào để biết lần cuối cùng chỉ số được cập nhật là lúc nào
        public DateTime LastUpdated { get; set; } = DateTime.Now;

        // Navigation property liên kết ngược lại bảng Product
        [ForeignKey("ProductId")]
        public virtual Product? Product { get; set; }
    }
}