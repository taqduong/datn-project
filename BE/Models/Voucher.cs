using System;
using System.ComponentModel.DataAnnotations;

namespace BE.Models
{
    public class Voucher
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = null!; // VD: "GIAM100", "FREESHIP"

        public string Title { get; set; } = "";
        public string Description { get; set; } = "";

        // 1. Phân loại giảm giá
        public bool IsFreeship { get; set; } = false; // Là mã Freeship hay mã giảm tiền?
        
        // 2. Giá trị giảm
        public decimal? DiscountPercent { get; set; } // Giảm theo % (0.12 = 12%)
        public decimal? DiscountValue { get; set; }   // Giảm thẳng tiền mặt (100.000)

        // 3. Điều kiện áp dụng
        public decimal? MaxDiscountAmount { get; set; } // Giảm tối đa (áp dụng cho giảm %)
        public decimal MinOrderValue { get; set; } = 0; // Giá trị đơn hàng tối thiểu để dùng

        // 4. Quản lý số lượng & Thời gian
        public DateTime StartDate { get; set; } = DateTime.Now; // Ngày bắt đầu có hiệu lực
        public DateTime ExpiryDate { get; set; } // Ngày hết hạn
        public int UsageLimit { get; set; } = 100; // Tổng số lượt được dùng
        public int UsedCount { get; set; } = 0;    // Đã có bao nhiêu người dùng rồi

        public int MaxUsagePerUser { get; set; } = 1; // Mỗi người dùng chỉ được dùng tối đa bao nhiêu lần (0 = không giới hạn)

        // Chu kỳ reset (None, Hourly, Daily)
        public string ResetInterval { get; set; } = "None";

        public bool IsActive { get; set; } = true; // Bật/Tắt mã thủ công

        public bool IsHidden { get; set; } = false; // Mặc định là hiện (false)
    }
}