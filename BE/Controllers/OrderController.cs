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
                var product = await _context.Products.FindAsync(request.BuyNowProductId.Value);
                if (product == null) return BadRequest(new { message = "Sản phẩm không tồn tại." });

                // 🛑 KIỂM TRA TỒN KHO
                if (product.Stock < request.BuyNowQuantity.Value)
                {
                    return BadRequest(new { message = $"Sản phẩm {product.Name} không đủ số lượng trong kho (Còn lại: {product.Stock})." });
                }

                // 📉 TRỪ TỒN KHO
                product.Stock -= request.BuyNowQuantity.Value;

                // 💰 TÍNH GIÁ ĐÃ GIẢM (Áp dụng công thức y hệt ProductDto)
                decimal finalPrice = product.Discount.HasValue 
                    ? Math.Round(product.Price * (1 - (decimal)product.Discount.Value / 100), 0) 
                    : product.Price;
                    
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
                    // 🛑 KIỂM TRA TỒN KHO TỪNG MÓN
                    if (item.Product.Stock < item.Quantity)
                    {
                        return BadRequest(new { message = $"Sản phẩm {item.Product.Name} không đủ số lượng trong kho." });
                    }

                    // 📉 TRỪ TỒN KHO
                    item.Product.Stock -= item.Quantity;

                    // 💰 TÍNH GIÁ ĐÃ GIẢM
                    decimal finalPrice = item.Product.Discount.HasValue 
                        ? Math.Round(item.Product.Price * (1 - (decimal)item.Product.Discount.Value / 100), 0) 
                        : item.Product.Price;

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

            // ✅ TẠO ĐƠN HÀNG
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

        // ================== USER: HỦY ĐƠN HÀNG ==================
        [HttpPut("{id:int}/cancel")]
        [Authorize]
        public async Task<IActionResult> CancelOrder(int id)
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized();

            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });

            // Kiểm tra xem đơn này có đúng là của user đang đăng nhập không
            if (order.UserId != userId.Value) return Forbid();

            // Chỉ cho phép hủy khi đơn còn đang "Pending" hoặc "Chờ xử lý" (check cả Anh lẫn Việt)
            var currentStatus = order.Status?.ToLower();
            if (currentStatus != "pending" && currentStatus != "chờ xử lý" && currentStatus != "processing" && currentStatus != "đang xử lý")
            {
                return BadRequest(new { message = "Không thể hủy đơn hàng đã được xử lý hoặc giao hàng." });
            }

            // ✅ GHI CHỮ "Cancelled" (Tiếng Anh) ĐỂ BÊN ADMIN ĐỌC ĐƯỢC CHUẨN MÀU VÀ HIỂN THỊ ĐÚNG DROPDOWN
            order.Status = "Cancelled";

            // ♻️ HOÀN LẠI TỒN KHO BẰNG FindAsync (Khắc phục lỗi EF không lưu)
            foreach (var detail in order.OrderDetails)
            {
                var productToUpdate = await _context.Products.FindAsync(detail.ProductId);
                if (productToUpdate != null)
                {
                    productToUpdate.Stock += detail.Quantity;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã hủy đơn hàng và hoàn lại số lượng vào kho." });
        }

        // ================== TÍNH NĂNG MỚI: ADMIN DUYỆT/HỦY ĐƠN HÀNG ==================
        [HttpPut("{id:int}/status")]
        // [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateStatusDto request)
        {
            // TẮT TRACKING ĐỂ TRÁNH LỖI CONFLICT CỦA ENTITY FRAMEWORK
            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                .ThenInclude(od => od.Product)
                .FirstOrDefaultAsync(o => o.OrderId == id);
                
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });

            // ♻️ NẾU ADMIN ĐỔI THÀNH "Đã hủy" HOẶC "Cancelled" -> HOÀN KHO
            if ((request.Status == "Đã hủy" || request.Status == "Cancelled") && order.Status != request.Status)
            {
                foreach (var detail in order.OrderDetails)
                {
                    if (detail.Product != null) 
                    {
                        // ✅ PHẢI TÌM LẠI PRODUCT TRONG DB RỒI MỚI TRỪ
                        var productToUpdate = await _context.Products.FindAsync(detail.ProductId);
                        if (productToUpdate != null)
                        {
                            productToUpdate.Stock += detail.Quantity;
                        }
                    }
                }
            }

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
                .ThenInclude(od => od.Product)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null)
                return NotFound(new { message = "Không tìm thấy đơn hàng." });

            // ♻️ TRƯỚC KHI XÓA: NẾU ĐƠN CHƯA BỊ HỦY -> HOÀN LẠI KHO ĐÃ RỒI MỚI XÓA
            if (order.Status != "Đã hủy" && order.Status != "Cancelled")
            {
                foreach (var detail in order.OrderDetails)
                {
                    if (detail.Product != null) 
                    {
                        // ✅ PHẢI TÌM LẠI PRODUCT TRONG DB RỒI MỚI TRỪ
                        var productToUpdate = await _context.Products.FindAsync(detail.ProductId);
                        if (productToUpdate != null)
                        {
                            productToUpdate.Stock += detail.Quantity;
                        }
                    }
                }
            }

            _context.OrderDetails.RemoveRange(order.OrderDetails);
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã xoá đơn hàng và hoàn trả tồn kho thành công." });
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