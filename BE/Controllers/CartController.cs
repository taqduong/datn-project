using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using BE.Models;
using BE.Data;

namespace BE.Controllers
{
    [Route("api/cart")]
    [ApiController]
    public class CartController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public CartController(ShopDbContext context)
        {
            _context = context;
        }

        // ================== Helpers ==================

        private static decimal CalcPriceAfterDiscount(decimal price, int? discount)
        {
            if (!discount.HasValue || discount.Value <= 0) return price;
            return Math.Round(price * (1 - (decimal)discount.Value / 100), 0);
        }

        private async Task IncrementAnalyticsAsync(int productId, string field, int delta = 1)
        {
            // field chỉ cho phép 3 cột này để tránh SQL injection
            string col = field switch
            {
                "Views" => "Views",
                "AddToCartCount" => "AddToCartCount",
                "PurchaseCount" => "PurchaseCount",
                _ => throw new ArgumentOutOfRangeException(nameof(field))
            };

            // Lưu ý: Đảm bảo bạn có bảng ProductAnalytics trong DB trước khi chạy hàm này
            try 
            {
                string sql = $@"
                    IF NOT EXISTS (SELECT 1 FROM ProductAnalytics WHERE ProductId = @p0)
                    BEGIN
                        INSERT INTO ProductAnalytics(ProductId, Views, AddToCartCount, PurchaseCount)
                        VALUES(@p0, 0, 0, 0);
                    END
                    UPDATE ProductAnalytics SET {col} = {col} + @p1 WHERE ProductId = @p0;";

                await _context.Database.ExecuteSqlRawAsync(sql, productId, delta);
            }
            catch (Exception ex)
            {
                // Tạm thời log lỗi hoặc bỏ qua nếu chưa có bảng Analytics
                Console.WriteLine("Analytics Error: " + ex.Message);
            }
        }

        private int? GetUserIdFromToken()
        {
            // Lấy NameIdentifier từ Claim (Sửa lại claim type phổ biến cho JWT)
            var userIdClaim = User.Claims.FirstOrDefault(c =>
                c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" ||
                c.Type == "sub"
            );

            return userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;
        }

        // ================== Thêm sản phẩm vào giỏ hàng ==================
        [HttpPost("add")]
        [Authorize]
        public async Task<IActionResult> AddToCart([FromBody] CartRequest request)
        {
            var userId = GetUserIdFromToken();
            if (userId == null)
                return Unauthorized("Không tìm thấy người dùng.");

            var product = await _context.Products.FindAsync(request.ProductId);
            if (product == null)
                return NotFound("Không tìm thấy sản phẩm.");

            var existingCart = await _context.Carts.FirstOrDefaultAsync(
                c => c.UserId == userId && c.ProductId == request.ProductId);

            if (existingCart != null)
            {
                existingCart.Quantity += request.Quantity;
                _context.Carts.Update(existingCart);
            }
            else
            {
                var cart = new Cart
                {
                    UserId = (int)userId,
                    ProductId = request.ProductId,
                    Quantity = request.Quantity,
                    CreatedAt = DateTime.Now
                };
                _context.Carts.Add(cart);
            }

            await _context.SaveChangesAsync();
            
            // Cập nhật thống kê (Nếu chưa có bảng ProductAnalytics thì hàm này sẽ bị catch lỗi)
            await IncrementAnalyticsAsync(request.ProductId, "AddToCartCount", 1);

            return Ok(new { message = "Thêm hàng vào giỏ hàng thành công." });
        }

        // ================== Lấy giỏ hàng (TRẢ GIÁ SAU GIẢM) ==================
        [HttpGet("get")]
        [Authorize]
        public async Task<IActionResult> GetCart()
        {
            var userId = GetUserIdFromToken();
            if (userId == null)
                return Unauthorized("Không tìm thấy người dùng.");

            var cartItems = await _context.Carts
                .Where(c => c.UserId == userId)
                .Include(c => c.Product)
                .ToListAsync();

            if (!cartItems.Any())
                return Ok(new List<object>());

            var result = cartItems.Select(c =>
            {
                var p = c.Product;
                var priceAfterDiscount = CalcPriceAfterDiscount(p.Price, p.Discount);

                return new
                {
                    cartItemId = c.CartItemId,
                    productId = c.ProductId,
                    quantity = c.Quantity,
                    product = new
                    {
                        id = p.Id,
                        name = p.Name,
                        price = p.Price,
                        discount = p.Discount,
                        priceAfterDiscount = priceAfterDiscount,
                        imageUrl = p.ImageUrl // Sửa lại đúng tên thuộc tính trong Product.cs của bạn
                    }
                };
            });

            return Ok(result);
        }

        // ================== Cập nhật số lượng ==================
        [HttpPut("update-quantity")]
        [Authorize]
        public async Task<IActionResult> UpdateQuantity([FromBody] CartRequest request)
        {
            var userId = GetUserIdFromToken();
            if (userId == null)
                return Unauthorized("Không tìm thấy người dùng.");

            var cartItem = await _context.Carts.FirstOrDefaultAsync(
                c => c.UserId == userId && c.ProductId == request.ProductId);

            if (cartItem == null)
                return NotFound("Không tìm thấy sản phẩm trong giỏ hàng.");

            cartItem.Quantity = request.Quantity;
            _context.Carts.Update(cartItem);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật số lượng thành công." });
        }

        // ================== Xóa sản phẩm khỏi giỏ hàng ==================
        [HttpDelete("remove/{productId}")]
        [Authorize]
        public async Task<IActionResult> RemoveFromCart(int productId)
        {
            var userId = GetUserIdFromToken();
            if (userId == null)
                return Unauthorized("Không tìm thấy người dùng.");

            var cartItem = await _context.Carts.FirstOrDefaultAsync(
                c => c.UserId == userId && c.ProductId == productId);

            if (cartItem == null)
                return NotFound("Không tìm thấy sản phẩm trong giỏ hàng.");

            _context.Carts.Remove(cartItem);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa sản phẩm khỏi giỏ hàng thành công." });
        }

        // ================== DTOs ==================

        public class CartRequest
        {
            public int ProductId { get; set; }
            public int Quantity { get; set; }
        }

        // NOTE: Checkout hiện tại chưa code vì bạn cần làm xong bảng Order/OrderDetail trước
    }
}