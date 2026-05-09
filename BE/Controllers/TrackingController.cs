using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/tracking")]
    public class TrackingController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public TrackingController(ShopDbContext context)
        {
            _context = context;
        }

        [HttpPost("log")]
        [Authorize] // Khóa cổng: Bắt buộc phải có Token (đăng nhập) mới được gọi API này
        public async Task<IActionResult> LogActivity([FromBody] TrackingRequest request)
        {
            // Trích xuất UserId từ JWT Token của người dùng đang đăng nhập
            // Xử lý linh hoạt 2 trường hợp: Claim tự định nghĩa ("Id") và Claim tiêu chuẩn (NameIdentifier)
            var userIdClaim = User.FindFirst("Id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized(new { message = "Không xác định được danh tính. Vui lòng đăng nhập lại!" });
            }

            var product = await _context.Products.FindAsync(request.ProductId);
            if (product == null) return NotFound(new { message = "Không tìm thấy sản phẩm." });

            // Module xử lý logic chấm điểm sự kiện (Event Scoring Logic)
            int score = request.ActionType switch
            {
                "View" => 1,
                "AddToWishlist" => 2,
                "AddToCart" => 3,
                "Purchase" => 5,
                _ => 0
            };

            if (score == 0) return BadRequest(new { message = "Loại hành vi không hợp lệ. Chỉ nhận: View, AddToWishlist, AddToCart, Purchase." });

            // Lưu trữ bản ghi nhật ký tương tác (Tracking Log) vào CSDL
            var activity = new UserActivity
            {
                UserId = userId, // Lấy thẳng từ Token
                ProductId = product.Id,
                CategoryId = product.CategoryId, 
                ActionType = request.ActionType,
                Score = score,
                CreatedAt = DateTime.Now
            };

            _context.UserActivities.Add(activity);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Ghi nhận hành vi thành công!", action = request.ActionType, point = score });
        }
    }

    public class TrackingRequest
    {
        public int ProductId { get; set; }
        public string ActionType { get; set; } = string.Empty;
    }
}