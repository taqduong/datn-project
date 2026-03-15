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
    [Route("api/Order")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public OrderController(ShopDbContext context)
        {
            _context = context;
        }

        private int? GetUserIdFromToken()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            return int.TryParse(id, out var uid) ? uid : (int?)null;
        }

        // ================== USER: THANH TOÁN & CHỐT ĐƠN ==================
        [HttpPost("checkout")]
        [Authorize]
        public async Task<IActionResult> Checkout([FromBody] CheckoutRequestDto request)
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized("Vui lòng đăng nhập.");

            decimal totalAmount = 0;
            var orderDetails = new List<OrderDetail>();

            // ✅ RẼ NHÁNH 1: NẾU KHÁCH BẤM "MUA NGAY"
            if (request.BuyNowProductId.HasValue && request.BuyNowQuantity.HasValue)
            {
                // Lấy thông tin đúng 1 sản phẩm đó, KHÔNG đụng gì đến giỏ hàng
                var product = await _context.Products.FindAsync(request.BuyNowProductId.Value);
                if (product == null) return BadRequest(new { message = "Sản phẩm không tồn tại." });

                decimal finalPrice = product.Price; // Sửa thành product.PriceAfterDiscount nếu model sếp có
                totalAmount = finalPrice * request.BuyNowQuantity.Value;

                orderDetails.Add(new OrderDetail
                {
                    ProductId = product.Id,
                    Quantity = request.BuyNowQuantity.Value,
                    UnitPrice = finalPrice
                });
            }
            // ✅ RẼ NHÁNH 2: NẾU KHÁCH MUA TỪ GIỎ HÀNG
            else
            {
                var cartItems = await _context.Carts
                    .Include(c => c.Product)
                    .Where(c => c.UserId == userId.Value)
                    .ToListAsync();

                if (!cartItems.Any())
                    return BadRequest(new { message = "Giỏ hàng của bạn đang trống." });

                foreach (var item in cartItems)
                {
                    decimal finalPrice = item.Product.Price; // Sửa thành item.Product.PriceAfterDiscount nếu có
                    totalAmount += finalPrice * item.Quantity;

                    orderDetails.Add(new OrderDetail
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = finalPrice
                    });
                }

                // Nhớ xóa giỏ hàng sau khi chốt đơn thành công
                _context.Carts.RemoveRange(cartItems);
            }

            // ✅ TẠO ĐƠN HÀNG (Dùng chung cho cả 2 nhánh)
            var newOrder = new Order
            {
                UserId = userId.Value,
                OrderDate = DateTime.Now,
                TotalAmount = totalAmount,
                Status = "Pending", 
                FullName = request.FullName,
                Phone = request.Phone,
                Address = request.Address,
                Email = request.Email,
                City = request.City,
                Ward = request.Ward,
                Note = request.Note,
                OrderDetails = orderDetails
            };

            _context.Orders.Add(newOrder);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đặt hàng thành công!", orderId = newOrder.OrderId });
        }


        // ================== ADMIN: Lấy tất cả đơn hàng ==================
        [HttpGet("admin")]
        // [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAllOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.OrderDetails)
                .ThenInclude(od => od.Product)
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new OrderDto
                {
                    OrderId = o.OrderId,
                    OrderDate = o.OrderDate,
                    TotalAmount = o.TotalAmount,
                    Status = o.Status ?? "",
                    FullName = o.FullName ?? "",
                    Phone = o.Phone ?? "",
                    Email = o.Email ?? "",
                    Address = o.Address ?? "", 
                    City = o.City ?? "",       
                    Ward = o.Ward ?? "",       
                    Note = o.Note ?? "",
                    OrderDetails = o.OrderDetails.Select(od => new OrderDetailDto
                    {
                        ProductId = od.ProductId,
                        Quantity = od.Quantity,
                        Price = od.UnitPrice,
                        ProductName = od.Product.Name ?? "",
                        ImageUrl = od.Product.ImageUrl ?? "", // FIX: Gán ImageUrl cho DTO để Frontend hiển thị ảnh
                        Product = new ProductMiniDto
                        {
                            Id = od.Product.Id,
                            Name = od.Product.Name,
                            ImageUrl = od.Product.ImageUrl ?? ""
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

            var orders = await _context.Orders
                .Include(o => o.OrderDetails)
                .ThenInclude(od => od.Product)
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new OrderDto
                {
                    OrderId = o.OrderId,
                    OrderDate = o.OrderDate,
                    TotalAmount = o.TotalAmount,
                    Status = o.Status ?? "",
                    FullName = o.FullName ?? "",
                    Phone = o.Phone ?? "",
                    Email = o.Email ?? "",
                    Address = o.Address ?? "", 
                    City = o.City ?? "",
                    Ward = o.Ward ?? "",
                    Note = o.Note ?? "",
                    OrderDetails = o.OrderDetails.Select(od => new OrderDetailDto
                    {
                        ProductId = od.ProductId,
                        Quantity = od.Quantity,
                        Price = od.UnitPrice,
                        ProductName = od.Product.Name ?? "",
                        ImageUrl = od.Product.ImageUrl ?? "", // FIX: Bổ sung ImageUrl
                        Product = new ProductMiniDto
                        {
                            Id = od.Product.Id,
                            Name = od.Product.Name,
                            ImageUrl = od.Product.ImageUrl ?? ""
                        }
                    }).ToList()
                })
                .AsNoTracking()
                .ToListAsync();

            return Ok(orders);
        }

        // ================== USER/ADMIN: Lấy chi tiết 1 đơn hàng ==================
        [HttpGet("{orderId:int}")]
        [Authorize]
        public async Task<IActionResult> GetOrderById(int orderId)
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized();

            // Nếu bạn có phân quyền Admin, có thể bỏ check o.UserId == userId để Admin xem được chi tiết
            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                .ThenInclude(od => od.Product)
                .FirstOrDefaultAsync(o => o.OrderId == orderId); // Bỏ tạm check User để test linh hoạt

            if (order == null) return NotFound();

            var dto = new OrderDto
            {
                OrderId = order.OrderId,
                OrderDate = order.OrderDate,
                TotalAmount = order.TotalAmount,
                Status = order.Status ?? "",
                FullName = order.FullName ?? "",
                Email = order.Email ?? "",
                Phone = order.Phone ?? "",
                Address = order.Address ?? "",
                City = order.City ?? "",
                Ward = order.Ward ?? "",
                Note = order.Note ?? "",
                OrderDetails = order.OrderDetails.Select(od => new OrderDetailDto
                {
                    ProductId = od.ProductId,
                    ProductName = od.Product?.Name ?? "",
                    Quantity = od.Quantity,
                    Price = od.UnitPrice,
                    ImageUrl = od.Product?.ImageUrl ?? ""
                }).ToList()
            };

            return Ok(dto);
        }

        // ================== TÍNH NĂNG MỚI: ADMIN DUYỆT ĐƠN HÀNG ==================
        [HttpPut("{id:int}/status")]
        // [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateStatusDto request)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });

            order.Status = request.Status;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật trạng thái thành công!" });
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
        public string? Ward { get; set; }
        public string? Note { get; set; }
        public int? BuyNowProductId { get; set; }
        public int? BuyNowQuantity { get; set; }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = null!;
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
        public string Ward { get; set; } = "";
        public string Note { get; set; } = "";
    }
}