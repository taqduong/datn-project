using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Data;
using BE.Models;
using Microsoft.AspNetCore.Authorization;

namespace BE.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VoucherController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public VoucherController(ShopDbContext context)
        {
            _context = context;
        }

        // ================== GÓC CHO KHÁCH HÀNG (USER) ==================

        // 1. Lấy danh sách Voucher khả dụng để hiển thị
        [HttpGet]
        public async Task<IActionResult> GetActiveVouchers([FromQuery] int? userId)
        {
            // 1. Chỉ lọc: Còn hạn, Đang kích hoạt và Không bị ẩn (Dù hết lượt vẫn lấy lên)
            var allVouchers = await _context.Vouchers
                .Where(v => v.IsActive && !v.IsHidden && v.ExpiryDate > DateTime.Now)
                .OrderByDescending(v => v.IsFreeship)
                .ToListAsync();

            var result = new List<object>();

            foreach (var v in allVouchers)
            {
                int remainingForUser = v.MaxUsagePerUser;
                bool isSystemOut = v.UsedCount >= v.UsageLimit; // Hệ thống đã hết lượt chưa?

                if (userId.HasValue && userId.Value > 0 && v.MaxUsagePerUser > 0)
                {
                    // ... (Giữ nguyên logic tính startTime như cũ) ...
                    DateTime startTime = v.ResetInterval switch {
                        "10s" => DateTime.Now.AddSeconds(-10),
                        "Hourly" => DateTime.Now.AddHours(-1),
                        "Daily" => DateTime.Today,
                        _ => DateTime.MinValue
                    };

                    var userUsedCount = await _context.Orders
                        .Where(o => o.UserId == userId.Value 
                                && o.AppliedVoucherCode != null 
                                && o.AppliedVoucherCode.ToUpper().Contains(v.Code.ToUpper()) 
                                && o.Status != "Cancelled"
                                && o.OrderDate >= startTime)
                        .CountAsync();

                    remainingForUser = v.MaxUsagePerUser - userUsedCount;
                }

                result.Add(new {
                    id = v.Id, 
                    code = v.Code,
                    title = v.Title,
                    desc = v.Description,
                    isFreeship = v.IsFreeship,
                    minOrder = v.MinOrderValue,
                    discountValue = v.DiscountValue,
                    discountPercent = v.DiscountPercent,
                    maxDiscount = v.MaxDiscountAmount,
                    exp = $"Hết hạn: {v.ExpiryDate:dd/MM/yyyy HH:mm}", 
                    
                    usedCount = v.UsedCount,
                    usageLimit = v.UsageLimit,
                    remainingForUser = remainingForUser,
                    
                    // Cập nhật trạng thái phản hồi để Front-end xử lý
                    isSystemOut = isSystemOut, // Hết lượt tổng
                    isUserOut = remainingForUser <= 0 && v.MaxUsagePerUser > 0 // Mình đã dùng hết lượt
                });
            }

            return Ok(result);
        }

        // 2. Check mã khi khách bấm "Áp dụng"
        [HttpPost("check")]
        public async Task<IActionResult> CheckVoucher([FromBody] CheckVoucherRequest req)
        {
            try 
            {
                if (string.IsNullOrWhiteSpace(req.Code))
                    return BadRequest(new { message = "Vui lòng nhập mã ưu đãi!" });

                var voucher = await _context.Vouchers
                    .FirstOrDefaultAsync(v => v.Code.ToUpper() == req.Code.ToUpper());

                if (voucher == null) 
                    return BadRequest(new { message = "Mã ưu đãi không tồn tại!" });
                if (!voucher.IsActive) 
                    return BadRequest(new { message = "Mã ưu đãi đang tạm khóa!" });

                if (voucher.StartDate > DateTime.Now) 
                    return BadRequest(new { message = $"Mã này chưa mở. Vui lòng quay lại vào lúc {voucher.StartDate:HH:mm dd/MM/yyyy} nhé!" });

                if (voucher.ExpiryDate < DateTime.Now) 
                    return BadRequest(new { message = "Mã ưu đãi đã hết hạn!" });

                if (voucher.UsedCount >= voucher.UsageLimit) 
                    return BadRequest(new { message = "Mã ưu đãi đã hết số lượng sử dụng!" });
                if (req.OrderValue < voucher.MinOrderValue) 
                    return BadRequest(new { message = $"Đơn tối thiểu để dùng mã là {voucher.MinOrderValue:N0}đ!" });

                // =========================================================================
                // Cơ chế bảo mật chống Spam: Kiểm tra thời gian hồi khi áp dụng mã
                // =========================================================================
                if (req.UserId.HasValue && req.UserId.Value > 0 && voucher.MaxUsagePerUser > 0)
                {
                    DateTime startTime = DateTime.MinValue; // Mặc định không giới hạn thời gian

                    if (voucher.ResetInterval == "10s")
                    {
                        startTime = DateTime.Now.AddSeconds(-10); // Đếm trong 10 giây gần nhất
                    }
                    else if (voucher.ResetInterval == "Hourly")
                    {
                        startTime = DateTime.Now.AddHours(-1); // Đếm trong 1 giờ gần nhất
                    }
                    else if (voucher.ResetInterval == "Daily")
                    {
                        startTime = DateTime.Today; // Đếm từ 0h hôm nay
                    }

                    var userUsedCount = await _context.Orders
                        .Where(o => o.UserId == req.UserId.Value 
                                 && o.AppliedVoucherCode != null 
                                 && o.AppliedVoucherCode.ToUpper().Contains(voucher.Code.ToUpper()) 
                                 && o.Status != "Cancelled"
                                 && o.OrderDate >= startTime) 
                        .CountAsync();

                    if (userUsedCount >= voucher.MaxUsagePerUser)
                    {
                        string msg = voucher.ResetInterval switch {
                            "10s" => "Bạn vừa dùng mã này rồi. Vui lòng đợi 10 giây để test lại!",
                            "Hourly" => "Bạn đã hết lượt dùng mã này trong giờ này. Vui lòng thử lại sau!",
                            "Daily" => "Bạn đã dùng hết lượt mã này trong hôm nay. Mai quay lại nhé!",
                            _ => $"Bạn đã dùng hết lượt mã này (Tối đa {voucher.MaxUsagePerUser} lần/người)!"
                        };
                        return BadRequest(new { message = msg });
                    }
                }

                decimal calculatedDiscount = 0;
                if (voucher.IsFreeship)
                {
                    calculatedDiscount = 30000; 
                }
                else if (voucher.DiscountValue.HasValue)
                {
                    calculatedDiscount = voucher.DiscountValue.Value;
                }
                else if (voucher.DiscountPercent.HasValue)
                {
                    calculatedDiscount = req.OrderValue * voucher.DiscountPercent.Value;
                    if (voucher.MaxDiscountAmount.HasValue && calculatedDiscount > voucher.MaxDiscountAmount.Value)
                    {
                        calculatedDiscount = voucher.MaxDiscountAmount.Value;
                    }
                }

                return Ok(new {
                    success = true,
                    message = "Áp dụng mã thành công!",
                    voucher = voucher,
                    discountAmount = calculatedDiscount
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Lỗi hệ thống khi check mã: " + ex.Message });
            }
        }

        // ================== GÓC CHO ADMIN (QUẢN LÝ VOUCHER) ==================

        [HttpGet("admin")]
        [Authorize(Roles = "admin,nhanvien")]
        public async Task<IActionResult> GetAllForAdmin()
        {
            var vouchers = await _context.Vouchers.OrderByDescending(v => v.Id).ToListAsync();
            return Ok(vouchers);
        }

        [HttpPost]
        [Authorize(Roles = "admin,nhanvien")]
        public async Task<IActionResult> CreateVoucher([FromBody] Voucher voucher)
        {
            if (await _context.Vouchers.AnyAsync(v => v.Code.ToUpper() == voucher.Code.ToUpper()))
                return BadRequest(new { message = "Mã ưu đãi (Code) này đã tồn tại!" });

            voucher.Code = voucher.Code.ToUpper();
            _context.Vouchers.Add(voucher);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Thêm mã thành công!", data = voucher });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "admin,nhanvien")]
        public async Task<IActionResult> UpdateVoucher(int id, [FromBody] Voucher updateData)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher == null) return NotFound(new { message = "Không tìm thấy mã." });

            if (voucher.Code.ToUpper() != updateData.Code.ToUpper() && 
                await _context.Vouchers.AnyAsync(v => v.Code.ToUpper() == updateData.Code.ToUpper()))
                return BadRequest(new { message = "Mã ưu đãi (Code) mới đã bị trùng với mã khác!" });

            voucher.Code = updateData.Code.ToUpper();
            voucher.Title = updateData.Title;
            voucher.Description = updateData.Description;
            voucher.IsFreeship = updateData.IsFreeship;
            voucher.DiscountPercent = updateData.DiscountPercent;
            voucher.DiscountValue = updateData.DiscountValue;
            voucher.MaxDiscountAmount = updateData.MaxDiscountAmount;
            voucher.MinOrderValue = updateData.MinOrderValue;
            voucher.ExpiryDate = updateData.ExpiryDate;
            voucher.StartDate = updateData.StartDate;
            voucher.UsageLimit = updateData.UsageLimit;
            voucher.IsActive = updateData.IsActive;
            voucher.IsHidden = updateData.IsHidden;
            
            voucher.MaxUsagePerUser = updateData.MaxUsagePerUser; 
            voucher.ResetInterval = updateData.ResetInterval; // Lưu trữ cấu hình chu kỳ làm mới (Reset Interval)

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật thành công!" });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "admin,nhanvien")]
        public async Task<IActionResult> DeleteVoucher(int id)
        {
            var voucher = await _context.Vouchers.FindAsync(id);
            if (voucher == null) return NotFound();

            _context.Vouchers.Remove(voucher);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Xóa mã thành công!" });
        }
    }

    public class CheckVoucherRequest
    {
        public string Code { get; set; } = null!;
        public decimal OrderValue { get; set; } 
        public int? UserId { get; set; }
    }
}