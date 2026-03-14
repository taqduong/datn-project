using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using BE.Models;
using BE.Data; 

namespace BE.Controllers
{
    [ApiController]
    [Route("api/wishlist")]
    [Authorize] // Bắt buộc đăng nhập mới được gọi API này
    public class WishlistController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public WishlistController(ShopDbContext context)
        {
            _context = context;
        }

        // --- HÀM HỖ TRỢ: Lấy thẳng UserId từ Token bảo mật ---
        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                           ?? User.FindFirst("Id")?.Value;
                           
            if (int.TryParse(userIdClaim, out int userId))
                return userId;
                
            throw new Exception("Không xác thực được token.");
        }

        // 1. GET: api/wishlist
        // Frontend chỉ cần gọi GET /api/wishlist là tự lấy đúng danh sách của người đang đăng nhập
        [HttpGet]
        public async Task<ActionResult> GetMyWishlist()
        {
            var userId = GetUserId();
            
            var wishlist = await _context.Wishlists
                .Include(w => w.Product)
                .Where(w => w.UserId == userId)
                .OrderByDescending(w => w.CreatedAt) // Sắp xếp cái nào mới thả tim thì lên đầu
                .Select(w => new {
                    w.Id,
                    w.ProductId,
                    w.CreatedAt,
                    Product = new {
                        w.Product.Id,
                        w.Product.Name,
                        w.Product.Price,
                        w.Product.Discount,
                        w.Product.ImageUrl, // Dùng để hiển thị ảnh trên giao diện
                        w.Product.Stock
                    }
                })
                .ToListAsync();

            // Trả về kèm format success để Frontend dễ xử lý
            return Ok(new { success = true, data = wishlist });
        }

        // 2. POST: api/wishlist/{productId}
        // Frontend truyền luôn Id sản phẩm lên URL cho gọn, không cần class Dto nữa
        [HttpPost("{productId}")]
        public async Task<ActionResult> AddToWishlist(int productId)
        {
            var userId = GetUserId();

            // Kiểm tra xem sản phẩm đã có trong wishlist chưa
            var exists = await _context.Wishlists
                .AnyAsync(w => w.UserId == userId && w.ProductId == productId);
                
            if (exists)
                return BadRequest(new { success = false, message = "Sản phẩm đã có trong Wishlist." });

            var wishlist = new Wishlist
            {
                UserId = userId,
                ProductId = productId,
                CreatedAt = DateTime.Now
            };
            
            _context.Wishlists.Add(wishlist);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã thêm vào Wishlist." });
        }

        // 3. DELETE: api/wishlist/{productId}
        [HttpDelete("{productId}")]
        public async Task<ActionResult> RemoveFromWishlist(int productId)
        {
            var userId = GetUserId();

            var item = await _context.Wishlists
                .FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == productId);

            if (item == null)
                return NotFound(new { success = false, message = "Không tìm thấy sản phẩm trong Wishlist." });

            _context.Wishlists.Remove(item);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã xoá khỏi Wishlist." });
        }

        // 4. XÓA SẠCH DANH SÁCH YÊU THÍCH (DELETE: api/wishlist/clear)
        [HttpDelete("clear")]
        public async Task<ActionResult> ClearWishlist()
        {
            var userId = GetUserId();

            // Lấy tất cả sản phẩm trong wishlist của user này
            var items = await _context.Wishlists.Where(w => w.UserId == userId).ToListAsync();

            if (!items.Any())
                return Ok(new { success = true, message = "Danh sách yêu thích đã trống sẵn." });

            // Xóa một lúc tất cả (RemoveRange)
            _context.Wishlists.RemoveRange(items);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã xóa sạch danh sách yêu thích." });
        }
    }
}