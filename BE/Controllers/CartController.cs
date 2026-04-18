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
            c => c.UserId == userId && c.ProductId == request.ProductId && c.VariantId == request.VariantId); 

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
                    VariantId = request.VariantId,
                    Quantity = request.Quantity,
                    CreatedAt = DateTime.Now
                };
                _context.Carts.Add(cart);
            }

            await _context.SaveChangesAsync();
            

            return Ok(new { message = "Thêm hàng vào giỏ hàng thành công." });
        }

        // ================== Lấy giỏ hàng (CẬP NHẬT TÍNH TOÁN BIẾN THỂ) ==================
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
                .Include(c => c.ProductVariant)
                .ToListAsync();

            if (!cartItems.Any())
                return Ok(new List<object>());

            var result = cartItems.Select(c =>
            {
                var p = c.Product;
                var v = c.ProductVariant; 

                // Lấy thông tin giá trị gốc (Của SP Mẹ)
                var basePrice = p.Price;
                var baseDiscount = p.Discount;
                var baseImageUrl = p.ImageUrl;

                // Tính giá trị của Biến thể (nếu có), nếu biến thể ko có giảm giá thì lấy của Mẹ
                var vPrice = v != null ? v.Price : (decimal?)null;
                var vDiscount = v != null ? v.Discount : (double?)null;
                var vImageUrl = v != null ? v.ImageUrl : null;

                // Tính giá sau cùng để hiển thị nhanh nếu cần (ưu tiên biến thể > mẹ)
                var activePrice = v != null ? v.Price : p.Price;
                var activeDiscount = v?.Discount ?? p.Discount ?? 0;
                var priceAfterDiscount = Math.Round(activePrice * (1 - (decimal)activeDiscount / 100), 0);

                return new
                {
                    cartItemId = c.CartItemId,
                    productId = c.ProductId,
                    variantId = c.VariantId, 
                    variantName = v != null ? v.VariantName : null, 
                    variantColor = v != null ? v.Color : null, // <--- THÊM DÒNG NÀY VÀO ĐÂY
                    quantity = c.Quantity,
                    
                    // 3 TRƯỜNG DỮ LIỆU MỚI CHO FRONTEND
                    variantPrice = vPrice,
                    variantDiscount = vDiscount,
                    variantImage = vImageUrl,

                    product = new
                    {
                        id = p.Id,
                        name = p.Name,
                        price = basePrice, 
                        discount = baseDiscount,
                        priceAfterDiscount = priceAfterDiscount,
                        imageUrl = baseImageUrl 
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
            c => c.UserId == userId && c.ProductId == request.ProductId && c.VariantId == request.VariantId);

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
        public async Task<IActionResult> RemoveFromCart(int productId, [FromQuery] int? variantId)
        {
            var userId = GetUserIdFromToken();
            if (userId == null)
                return Unauthorized("Không tìm thấy người dùng.");

            var cartItem = await _context.Carts.FirstOrDefaultAsync(
                c => c.UserId == userId && c.ProductId == productId && c.VariantId == variantId);

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
            public int? VariantId { get; set; }
        }

        // NOTE: Checkout hiện tại chưa code vì bạn cần làm xong bảng Order/OrderDetail trước
    }
}