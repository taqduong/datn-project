using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Data;
using BE.Models;

namespace BE.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public OrderController(ShopDbContext context)
        {
            _context = context;
        }

        // Lấy userId từ token
        private int? GetUserIdFromToken()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            return int.TryParse(id, out var uid) ? uid : (int?)null;
        }

        // ================== USER: THANH TOÁN & CHỐT ĐƠN ==================
        /// <summary>Lấy toàn bộ đồ trong Giỏ hàng để tạo thành Đơn hàng</summary>
        [HttpPost("checkout")]
        [Authorize]
        public async Task<IActionResult> Checkout([FromBody] CheckoutRequestDto request)
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized("Vui lòng đăng nhập.");

            // 1. Lấy toàn bộ giỏ hàng của user
            var cartItems = await _context.Carts
                .Include(c => c.Product)
                .Where(c => c.UserId == userId.Value)
                .ToListAsync();

            if (!cartItems.Any())
                return BadRequest(new { message = "Giỏ hàng của bạn đang trống." });

            // 2. Tính tổng tiền và chuẩn bị danh sách Chi tiết đơn hàng
            decimal totalAmount = 0;
            var orderDetails = new List<OrderDetail>();

            foreach (var item in cartItems)
            {
                // Giả định bảng Product của bạn có PriceAfterDiscount, nếu không thì dùng Price
                // Mình tính giá cuối cùng tại thời điểm chốt đơn
                // decimal finalPrice = item.Product.PriceAfterDiscount > 0 ? item.Product.PriceAfterDiscount : item.Product.Price;
                decimal finalPrice = item.Product.Price; // Sửa lại dòng này nếu DB bạn có PriceAfterDiscount

                totalAmount += finalPrice * item.Quantity;

                orderDetails.Add(new OrderDetail
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = finalPrice
                });

                // (Tuỳ chọn) Trừ tồn kho sản phẩm: 
                // item.Product.Stock -= item.Quantity;
            }

            // 3. Tạo Đơn hàng mới
            var newOrder = new Order
            {
                UserId = userId.Value,
                OrderDate = DateTime.Now,
                TotalAmount = totalAmount,
                Status = "Pending", // Đơn hàng mới chờ duyệt
                FullName = request.FullName,
                Phone = request.Phone,
                Address = request.Address,
                Email = request.Email,
                City = request.City,
                District = request.District,
                Ward = request.Ward,
                Note = request.Note,
                OrderDetails = orderDetails
            };

            _context.Orders.Add(newOrder);

            // 4. Xoá giỏ hàng sau khi đã chốt đơn thành công
            _context.Carts.RemoveRange(cartItems);

            // 5. Lưu tất cả vào Database cùng 1 lúc (Transaction)
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đặt hàng thành công!", orderId = newOrder.OrderId });
        }


        // ================== ADMIN: Lấy tất cả đơn hàng ==================
        [HttpGet("admin")]
        // [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAllOrders()
        {
            var root = $"{Request.Scheme}://{Request.Host}/";

            var orders = await _context.Orders
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new OrderDto
                {
                    OrderId = o.OrderId,
                    OrderDate = o.OrderDate,
                    TotalAmount = o.TotalAmount,
                    Status = o.Status,
                    FullName = o.FullName,
                    Phone = o.Phone,
                    OrderDetails = o.OrderDetails.Select(od => new OrderDetailDto
                    {
                        ProductId = od.ProductId,
                        Quantity = od.Quantity,
                        Price = od.UnitPrice,
                        ProductName = od.Product.Name,
                        Product = new ProductMiniDto
                        {
                            Id = od.Product.Id,
                            Name = od.Product.Name,
                            ImageUrl = string.IsNullOrEmpty(od.Product.ImageUrl)
                                ? ""
                                : (od.Product.ImageUrl.StartsWith("http")
                                    ? od.Product.ImageUrl
                                    : root + (od.Product.ImageUrl.StartsWith("/")
                                        ? od.Product.ImageUrl.Substring(1)
                                        : od.Product.ImageUrl))
                        }
                    }).ToList()
                })
                .AsNoTracking()
                .ToListAsync();

            return Ok(orders);
        }

        // ================== USER: Lấy danh sách đơn hàng của chính user ==================
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetOrders()
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized("Không tìm thấy người dùng.");

            var root = $"{Request.Scheme}://{Request.Host}/";

            var orders = await _context.Orders
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new OrderDto
                {
                    OrderId = o.OrderId,
                    OrderDate = o.OrderDate,
                    TotalAmount = o.TotalAmount,
                    Status = o.Status,
                    OrderDetails = o.OrderDetails.Select(od => new OrderDetailDto
                    {
                        ProductId = od.ProductId,
                        Quantity = od.Quantity,
                        Price = od.UnitPrice,
                        ProductName = od.Product.Name,
                        Product = new ProductMiniDto
                        {
                            Id = od.Product.Id,
                            Name = od.Product.Name,
                            ImageUrl = string.IsNullOrEmpty(od.Product.ImageUrl)
                                ? ""
                                : (od.Product.ImageUrl.StartsWith("http")
                                    ? od.Product.ImageUrl
                                    : root + (od.Product.ImageUrl.StartsWith("/")
                                        ? od.Product.ImageUrl.Substring(1)
                                        : od.Product.ImageUrl))
                        }
                    }).ToList()
                })
                .AsNoTracking()
                .ToListAsync();

            return Ok(orders);
        }

        // ================== USER: Lấy chi tiết 1 đơn hàng ==================
        [HttpGet("{orderId:int}")]
        [Authorize]
        public async Task<IActionResult> GetOrderById(int orderId)
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized();

            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                .ThenInclude(od => od.Product)
                .FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId.Value);

            if (order == null) return NotFound();

            var dto = new OrderDto
            {
                OrderId = order.OrderId,
                OrderDate = order.OrderDate,
                TotalAmount = order.TotalAmount,
                Status = order.Status ?? string.Empty,
                FullName = order.FullName ?? string.Empty,
                Email = order.Email ?? string.Empty,
                Phone = order.Phone ?? string.Empty,
                Address = order.Address ?? string.Empty,
                City = order.City ?? string.Empty,
                District = order.District ?? string.Empty,
                Ward = order.Ward ?? string.Empty,
                Note = order.Note ?? string.Empty,
                OrderDetails = order.OrderDetails.Select(od => new OrderDetailDto
                {
                    ProductId = od.ProductId,
                    ProductName = od.Product?.Name ?? string.Empty,
                    Quantity = od.Quantity,
                    Price = od.UnitPrice,
                    ImageUrl = od.Product?.ImageUrl ?? string.Empty
                }).ToList()
            };

            return Ok(dto);
        }

        // ================== ADMIN: Xoá đơn hàng ==================
        [HttpDelete("{id:int}")]
        // [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null)
                return NotFound(new { message = "Không tìm thấy đơn hàng." });

            _context.OrderDetails.RemoveRange(order.OrderDetails);
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã xoá đơn hàng thành công." });
        }
    }

    // ================== DTOs ==================
    public class CheckoutRequestDto
    {
        public string FullName { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string? Email { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? Ward { get; set; }
        public string? Note { get; set; }
    }

    public class ProductMiniDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";

        [JsonPropertyName("imageUrl")]
        public string ImageUrl { get; set; } = "";
    }

    public class OrderDetailDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = "";
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public string ImageUrl { get; set; } = "";
        public ProductMiniDto Product { get; set; } = new();
    }

    public class OrderDto
    {
        public int OrderId { get; set; }
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "";
        public List<OrderDetailDto> OrderDetails { get; set; } = new();
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Address { get; set; } = "";
        public string City { get; set; } = "";
        public string District { get; set; } = "";
        public string Ward { get; set; } = "";
        public string Note { get; set; } = "";
    }
}