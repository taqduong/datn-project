using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Data;
using BE.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace BE.Controllers
{
    [Route("api/reviews")]
    [ApiController]
    public class ReviewController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public ReviewController(ShopDbContext context)
        {
            _context = context;
        }

        // =======================================================
        // 1. LẤY DANH SÁCH ĐÁNH GIÁ CỦA 1 SẢN PHẨM (Ai cũng xem được)
        // =======================================================
        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetReviewsByProduct(int productId)
        {
            var reviews = await _context.Reviews
                .Include(r => r.User)
                .Where(r => r.ProductId == productId)
                .OrderByDescending(r => r.CreatedAt) // Mới nhất lên đầu
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    ProductId = r.ProductId,
                    UserId = r.UserId,
                    UserName = r.User != null ? (r.User.FullName ?? r.User.Username) : "Khách ẩn danh",
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt,
                    IsVerifiedPurchase = r.IsVerifiedPurchase
                })
                .ToListAsync();

            // Tính toán thêm 1 chút thống kê (Số sao trung bình) để Frontend dễ hiển thị
            var totalReviews = reviews.Count;
            var averageRating = totalReviews > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0;

            return Ok(new 
            { 
                TotalReviews = totalReviews, 
                AverageRating = averageRating, 
                Reviews = reviews 
            });
        }

        // =======================================================
        // 2. THÊM ĐÁNH GIÁ MỚI (Bắt buộc phải Đăng nhập VÀ Đã mua hàng)
        // =======================================================
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> AddReview([FromBody] CreateReviewDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // 1. Lấy ID của User đang đăng nhập từ Token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("id");
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            // 2. Chặn Spam: Kiểm tra xem User này đã review Sản phẩm này chưa
            var existingReview = await _context.Reviews
                .FirstOrDefaultAsync(r => r.UserId == userId && r.ProductId == dto.ProductId);
            
            if (existingReview != null)
                return BadRequest(new { message = "Bạn đã đánh giá sản phẩm này rồi!" });

            // 3. LOGIC VIP Ở ĐÂY: BẮT BUỘC ĐÃ MUA HÀNG THÀNH CÔNG MỚI CHO REVIEW
            bool hasBought = await _context.OrderDetails
                .Include(od => od.Order)
                .AnyAsync(od => 
                    od.Order != null && 
                    od.Order.UserId == userId && 
                    od.ProductId == dto.ProductId && 
                    (od.Order.Status == "Completed" || od.Order.Status == "Hoàn thành")
                );

            // NẾU CHƯA MUA -> ĐÁNH BẬT RA LUÔN (Bảo vệ API khỏi tool Postman/Swagger spam)
            if (!hasBought)
                return BadRequest(new { message = "Bạn phải mua và nhận hàng thành công mới được đánh giá sản phẩm này!" });

            // 4. Tạo Review mới và lưu vào DB
            var review = new Review
            {
                ProductId = dto.ProductId,
                UserId = userId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                CreatedAt = DateTime.Now,
                IsVerifiedPurchase = true // Đã lọt qua được cửa bảo vệ số 3 thì 100% là khách hàng thật, cho luôn tick xanh!
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đánh giá thành công!", isVerifiedPurchase = true });
        }

        // =======================================================
        // 3. KIỂM TRA ĐIỀU KIỆN ĐÁNH GIÁ (Dùng để ẩn/hiện form Review trên Frontend)
        // =======================================================
        [HttpGet("can-review/{productId}")]
        [Authorize]
        public async Task<IActionResult> CanReview(int productId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("id");
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
                return Unauthorized();

            // 1. Đã review rồi thì không cho review nữa
            bool hasReviewed = await _context.Reviews.AnyAsync(r => r.UserId == userId && r.ProductId == productId);
            if (hasReviewed) return Ok(new { canReview = false, reason = "Đã đánh giá" });

            // 2. BẮT BUỘC PHẢI MUA HÀNG THÀNH CÔNG MỚI ĐƯỢC REVIEW
            bool hasBought = await _context.OrderDetails
                .Include(od => od.Order)
                .AnyAsync(od => od.Order != null && od.Order.UserId == userId && od.ProductId == productId && (od.Order.Status == "Completed" || od.Order.Status == "Hoàn thành"));
            
            if (!hasBought) return Ok(new { canReview = false, reason = "Chưa mua hàng" });

            return Ok(new { canReview = true });
        }

        // =======================================================
        // CÁC LỚP DTO (Data Transfer Object)
        // =======================================================
        public class ReviewDto
        {
            public int Id { get; set; }
            public int ProductId { get; set; }
            public int UserId { get; set; }
            public string UserName { get; set; } = null!;
            public int Rating { get; set; }
            public string Comment { get; set; } = null!;
            public DateTime CreatedAt { get; set; }
            public bool IsVerifiedPurchase { get; set; }
        }

        public class CreateReviewDto
        {
            public int ProductId { get; set; }
            public int Rating { get; set; }
            public string Comment { get; set; } = null!;
        }
    }
}