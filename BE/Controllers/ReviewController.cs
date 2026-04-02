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
        // 1. LẤY DANH SÁCH ĐÁNH GIÁ CỦA 1 SẢN PHẨM (Kèm Phân loại)
        // =======================================================
        [HttpGet("product/{productId}")]
        public async Task<IActionResult> GetReviewsByProduct(int productId)
        {
            var reviews = await _context.Reviews
                .Include(r => r.User)
                .Include(r => r.OrderDetail)
                    .ThenInclude(od => od.ProductVariant)
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
                    IsVerifiedPurchase = r.IsVerifiedPurchase,
                    VariantName = r.OrderDetail.ProductVariant != null ? r.OrderDetail.ProductVariant.VariantName : null
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

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("id");
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
                return Unauthorized(new { message = "Không xác định được người dùng." });

            var orderDetail = await _context.OrderDetails
                .Include(od => od.Order)
                .FirstOrDefaultAsync(od => 
                    od.OrderId == dto.OrderId && 
                    od.ProductId == dto.ProductId && 
                    od.Order.UserId == userId && 
                    (od.Order.Status == "Completed")
                );

            if (orderDetail == null)
                return BadRequest(new { message = "Bạn phải mua và nhận hàng thành công mới được đánh giá sản phẩm này!" });

            var existingReview = await _context.Reviews
                .FirstOrDefaultAsync(r => r.UserId == userId && r.OrderDetailId == orderDetail.OrderDetailId);
            
            if (existingReview != null)
                return BadRequest(new { message = "Bạn đã đánh giá phân loại này rồi!" });

            var review = new Review
            {
                ProductId = dto.ProductId,
                OrderDetailId = orderDetail.OrderDetailId, 
                UserId = userId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                CreatedAt = DateTime.Now,
                IsVerifiedPurchase = true 
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đánh giá thành công!", isVerifiedPurchase = true });
        }

        // =======================================================
        // 3. KIỂM TRA ĐIỀU KIỆN ĐÁNH GIÁ 
        // =======================================================
        [HttpGet("can-review/{productId}")]
        [Authorize]
        public async Task<IActionResult> CanReview(int productId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("id");
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
                return Unauthorized();

            var boughtDetails = await _context.OrderDetails
                .Include(od => od.Order)
                .Where(od => od.Order != null && od.Order.UserId == userId && od.ProductId == productId && (od.Order.Status == "Completed"))
                .ToListAsync();

            if (!boughtDetails.Any()) return Ok(new { canReview = false, reason = "Chưa mua hàng" });

            var boughtDetailIds = boughtDetails.Select(od => od.OrderDetailId).ToList();
            var reviewedCount = await _context.Reviews.CountAsync(r => r.UserId == userId && boughtDetailIds.Contains(r.OrderDetailId));

            if (reviewedCount >= boughtDetails.Count) 
                return Ok(new { canReview = false, reason = "Đã đánh giá hết các phân loại đã mua" });

            return Ok(new { canReview = true });
        }

        // =======================================================
        // CÁC LỚP DTO 
        // =======================================================
        public class ReviewDto
        {
            public int Id { get; set; }
            public int ProductId { get; set; }
            public int UserId { get; set; }
            public string UserName { get; set; } = null!;
            public int Rating { get; set; }
            public string? Comment { get; set; }
            public DateTime CreatedAt { get; set; }
            public bool IsVerifiedPurchase { get; set; }
            public string? VariantName { get; set; } 
        }

        public class CreateReviewDto
        {
            public int ProductId { get; set; }
            public int Rating { get; set; }
            public string? Comment { get; set; }
            public int OrderId { get; set; } 
        }
    }
}