using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/recommendations")]
    public class RecommendationController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public RecommendationController(ShopDbContext context)
        {
            _context = context;
        }

        // =================================================================
        // 1. GỢI Ý "DÀNH CHO BẠN" (Dùng ở Trang chủ - Dựa trên điểm số)
        // =================================================================
        [HttpGet("for-you")]
        [Authorize] // Bắt buộc phải có Token (đăng nhập) mới được gọi API này
        public async Task<IActionResult> GetForYou()
        {
            var userIdClaim = User.FindFirst("Id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return Unauthorized(new { message = "Vui lòng đăng nhập!" });

            // BƯỚC 1: Thuật toán nảy số (Group by Category & Tính tổng điểm)
            var topCategories = await _context.UserActivities
                .Where(x => x.UserId == userId)
                .GroupBy(x => x.CategoryId)
                .Select(g => new { 
                    CategoryId = g.Key, 
                    TotalScore = g.Sum(x => x.Score) // Cộng dồn điểm View(1) + Wishlist(2) + Cart(3)...
                })
                .OrderByDescending(x => x.TotalScore) // Xếp hạng từ cao xuống thấp
                .Take(2) // Lấy 2 Danh mục mà User đang "vã" nhất
                .Select(x => x.CategoryId)
                .ToListAsync();

            // LƯỚI AN TOÀN: Nếu user mới toanh chưa bấm xem gì -> Gợi ý 8 sản phẩm mới nhất của shop
            if (!topCategories.Any())
            {
                var fallbackProducts = await _context.Products
                    .Include(p => p.ProductVariants)
                    .OrderByDescending(p => p.Id) 
                    .Take(8)
                    .ToListAsync();
                return Ok(fallbackProducts);
            }

            // BƯỚC 2: Tìm những món khách ĐÃ MUA để loại trừ ra (Đã mua bếp nướng rồi thì thôi không mồi chài nữa)
            var boughtProductIds = await _context.UserActivities
                .Where(x => x.UserId == userId && x.ActionType == "Purchase")
                .Select(x => x.ProductId)
                .Distinct()
                .ToListAsync();

            // BƯỚC 3: Móc 8 sản phẩm thuộc 2 danh mục top ra (Trừ những món đã mua)
            var recommendedProducts = await _context.Products
                .Include(p => p.ProductVariants)
                .Where(p => topCategories.Contains(p.CategoryId) && !boughtProductIds.Contains(p.Id))
                .OrderByDescending(p => p.Id) // Ưu tiên hàng mới
                .Take(8)
                .ToListAsync();

            return Ok(recommendedProducts);
        }


        // =================================================================
        // 2. GỢI Ý "SẢN PHẨM TƯƠNG TỰ" (Dùng ở Trang Chi tiết sản phẩm)
        // =================================================================
        [HttpGet("similar/{productId}")]
        public async Task<IActionResult> GetSimilar(int productId)
        {
            // Tìm xem cái sản phẩm khách đang xem nó là cái gì
            var product = await _context.Products.FindAsync(productId);
            if (product == null) return NotFound(new { message = "Không tìm thấy sản phẩm" });

            // Lấy 4 sản phẩm cùng Category, nhưng phải khác cái ID hiện tại
            var similarProducts = await _context.Products
                .Include(p => p.ProductVariants)
                .Where(p => p.CategoryId == product.CategoryId && p.Id != productId)
                .OrderByDescending(p => p.Id)
                .Take(4)
                .ToListAsync();

            return Ok(similarProducts);
        }

        // =================================================================
        // 3. SẢN PHẨM BẠN VỪA XEM (Recently Viewed)
        // =================================================================
        [HttpGet("recently-viewed")]
        [Authorize]
        public async Task<IActionResult> GetRecentlyViewed()
        {
            var userIdClaim = User.FindFirst("Id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return Unauthorized(new { message = "Vui lòng đăng nhập!" });

            // 1. Lấy ra 5 ID sản phẩm khách vừa bấm xem (không lấy trùng, ưu tiên mới nhất)
            var recentProductIds = await _context.UserActivities
                .Where(x => x.UserId == userId && x.ActionType == "View")
                .GroupBy(x => x.ProductId)
                .Select(g => new {
                    ProductId = g.Key,
                    LastViewedId = g.Max(x => x.Id) // Lấy hành động View cuối cùng của sản phẩm đó
                })
                .OrderByDescending(x => x.LastViewedId)
                .Take(5)
                .Select(x => x.ProductId)
                .ToListAsync();

            if (!recentProductIds.Any())
                return Ok(new List<Product>());

            // 2. Móc thông tin sản phẩm (nhớ đính kèm Variants để khỏi bị lỗi giá 0đ)
            var products = await _context.Products
                .Include(p => p.ProductVariants)
                .Where(p => recentProductIds.Contains(p.Id))
                .ToListAsync();

            // 3. Sắp xếp lại đúng thứ tự vừa xem (Vì hàm Contains ở trên nó trộn lộn xộn)
            var sortedProducts = recentProductIds
                .Select(id => products.FirstOrDefault(p => p.Id == id))
                .Where(p => p != null)
                .ToList();

            return Ok(sortedProducts);
        }
    }
}