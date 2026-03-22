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

            // RẼ NHÁNH 1: NẾU KHÁCH BẤM "MUA NGAY"
            if (request.BuyNowProductId.HasValue && request.BuyNowQuantity.HasValue)
            {
                var product = await _context.Products.FindAsync(request.BuyNowProductId.Value);
                if (product == null) return BadRequest(new { message = "Sản phẩm không tồn tại." });

                decimal basePrice = product.Price;

                // NẾU CÓ BIẾN THỂ (MÀU/SIZE)
                if (request.BuyNowVariantId.HasValue)
                {
                    var variant = await _context.ProductVariants.FindAsync(request.BuyNowVariantId.Value);
                    if (variant == null) return BadRequest(new { message = "Phân loại sản phẩm không tồn tại." });

                    if (variant.Stock < request.BuyNowQuantity.Value)
                        return BadRequest(new { message = $"Phân loại {variant.VariantName} không đủ số lượng." });

                    variant.Stock -= request.BuyNowQuantity.Value; // Trừ kho biến thể
                    basePrice = variant.Price; // Lấy giá của biến thể
                }
                else // NẾU LÀ SẢN PHẨM GỐC
                {
                    if (product.Stock < request.BuyNowQuantity.Value)
                        return BadRequest(new { message = $"Sản phẩm không đủ số lượng." });

                    product.Stock -= request.BuyNowQuantity.Value;
                }

                decimal finalPrice = product.Discount.HasValue 
                    ? Math.Round(basePrice * (1 - (decimal)product.Discount.Value / 100), 0) 
                    : basePrice;
                    
                totalAmount = finalPrice * request.BuyNowQuantity.Value;

                orderDetails.Add(new OrderDetail
                {
                    ProductId = product.Id,
                    VariantId = request.BuyNowVariantId, // Lưu ID biến thể
                    Quantity = request.BuyNowQuantity.Value,
                    UnitPrice = finalPrice
                });
            }
            // RẼ NHÁNH 2: NẾU KHÁCH MUA TỪ GIỎ HÀNG
            else
            {
                var cartItems = await _context.Carts
                    .Include(c => c.Product)
                    .Include(c => c.ProductVariant) // Lấy thêm thông tin Biến thể
                    .Where(c => c.UserId == userId.Value)
                    .ToListAsync();

                if (!cartItems.Any()) return BadRequest(new { message = "Giỏ hàng trống." });

                foreach (var item in cartItems)
                {
                    decimal basePrice = item.Product.Price;

                    // 🛑 NẾU LÀ SẢN PHẨM CÓ BIẾN THỂ
                    if (item.VariantId.HasValue && item.ProductVariant != null)
                    {
                        if (item.ProductVariant.Stock < item.Quantity)
                            return BadRequest(new { message = $"Phân loại {item.ProductVariant.VariantName} không đủ số lượng." });

                        item.ProductVariant.Stock -= item.Quantity;
                        basePrice = item.ProductVariant.Price;
                    }
                    else
                    {
                        if (item.Product.Stock < item.Quantity)
                            return BadRequest(new { message = $"Sản phẩm {item.Product.Name} không đủ." });

                        item.Product.Stock -= item.Quantity;
                    }

                    decimal finalPrice = item.Product.Discount.HasValue 
                        ? Math.Round(basePrice * (1 - (decimal)item.Product.Discount.Value / 100), 0) 
                        : basePrice;

                    totalAmount += finalPrice * item.Quantity;

                    orderDetails.Add(new OrderDetail
                    {
                        ProductId = item.ProductId,
                        VariantId = item.VariantId, // Lưu ID biến thể
                        Quantity = item.Quantity,
                        UnitPrice = finalPrice
                    });
                }
                _context.Carts.RemoveRange(cartItems);
            }

            var newOrder = new Order
            {
                UserId = userId.Value,
                OrderDate = DateTime.Now,
                TotalAmount = totalAmount,
                Status = "Pending", 
                PaymentMethod = request.PaymentMethod,
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
                // BỔ SUNG: Nối thêm bảng ProductVariant để lấy màu/size
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.ProductVariant) 
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new OrderDto
                {
                    OrderId = o.OrderId,
                    OrderDate = o.OrderDate,
                    TotalAmount = o.TotalAmount,
                    Status = o.Status ?? "",
                    PaymentMethod = o.PaymentMethod,
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
                        // BỔ SUNG: Truyền ID, Tên và Ảnh của Biến thể ra ngoài API
                        VariantId = od.VariantId, 
                        VariantName = od.ProductVariant != null ? od.ProductVariant.VariantName : null, 
                        Quantity = od.Quantity,
                        Price = od.UnitPrice,
                        ProductName = od.Product.Name ?? "",
                        ImageUrl = (od.ProductVariant != null && !string.IsNullOrEmpty(od.ProductVariant.ImageUrl)) 
                                    ? od.ProductVariant.ImageUrl 
                                    : (od.Product.ImageUrl ?? ""), 
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
                // BỔ SUNG: Nối thêm bảng ProductVariant
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.ProductVariant) 
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.OrderDate)
                .Select(o => new OrderDto
                {
                    OrderId = o.OrderId,
                    OrderDate = o.OrderDate,
                    TotalAmount = o.TotalAmount,
                    Status = o.Status ?? "",
                    PaymentMethod = o.PaymentMethod,
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
                        // BỔ SUNG: Truyền dữ liệu Biến thể
                        VariantId = od.VariantId,
                        VariantName = od.ProductVariant != null ? od.ProductVariant.VariantName : null,
                        Quantity = od.Quantity,
                        Price = od.UnitPrice,
                        ProductName = od.Product.Name ?? "",
                        ImageUrl = (od.ProductVariant != null && !string.IsNullOrEmpty(od.ProductVariant.ImageUrl)) 
                                    ? od.ProductVariant.ImageUrl 
                                    : (od.Product.ImageUrl ?? ""),
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

            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Product)
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.ProductVariant) 
                .FirstOrDefaultAsync(o => o.OrderId == orderId); 

            if (order == null) return NotFound();

            var dto = new OrderDto
            {
                OrderId = order.OrderId,
                OrderDate = order.OrderDate,
                TotalAmount = order.TotalAmount,
                Status = order.Status ?? "",
                PaymentMethod = order.PaymentMethod,
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
                    // BỔ SUNG: Truyền dữ liệu Biến thể ra Front-end
                    VariantId = od.VariantId,
                    VariantName = od.ProductVariant != null ? od.ProductVariant.VariantName : null,
                    ProductName = od.Product?.Name ?? "",
                    Quantity = od.Quantity,
                    Price = od.UnitPrice,
                    ImageUrl = (od.ProductVariant != null && !string.IsNullOrEmpty(od.ProductVariant.ImageUrl)) 
                                    ? od.ProductVariant.ImageUrl 
                                    : (od.Product?.ImageUrl ?? "")
                }).ToList()
            };

            return Ok(dto);
        }

        // ================== HOÀN TỒN KHO KHI HỦY/XÓA ĐƠN ==================
        private async Task RestoreStockAsync(Order order)
        {
            foreach (var detail in order.OrderDetails)
            {
                // ✅ Nếu khách mua biến thể -> Trả lại kho biến thể
                if (detail.VariantId.HasValue) 
                {
                    var variant = await _context.ProductVariants.FindAsync(detail.VariantId.Value);
                    if (variant != null) variant.Stock += detail.Quantity;
                }
                // ✅ Nếu khách mua áo gốc -> Trả lại kho áo gốc
                else 
                {
                    var product = await _context.Products.FindAsync(detail.ProductId);
                    if (product != null) product.Stock += detail.Quantity;
                }
            }
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
            if (order.UserId != userId.Value) return Forbid();

            var currentStatus = order.Status?.ToLower();
            if (currentStatus != "pending" && currentStatus != "processing")
                return BadRequest(new { message = "Không thể hủy đơn hàng đã được xử lý hoặc giao hàng." });

            order.Status = "Cancelled";
            
            // GỌI HÀM HOÀN KHO DÙNG CHUNG CHO GỌN
            await RestoreStockAsync(order); 

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã hủy đơn hàng và hoàn lại số lượng vào kho." });
        }

        // ================== ADMIN: DUYỆT/HỦY ĐƠN HÀNG ==================
        [HttpPut("{id:int}/status")]
        // [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateStatusDto request)
        {
            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                .FirstOrDefaultAsync(o => o.OrderId == id);
                
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });

            if (request.Status == "Cancelled" && order.Status != "Cancelled")
            {
                // GỌI HÀM HOÀN KHO DÙNG CHUNG
                await RestoreStockAsync(order); 
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
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null)
                return NotFound(new { message = "Không tìm thấy đơn hàng." });

            if (order.Status != "Cancelled")
            {
                // GỌI HÀM HOÀN KHO DÙNG CHUNG
                await RestoreStockAsync(order); 
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
        public string PaymentMethod { get; set; } = "COD";
        public int? BuyNowProductId { get; set; }
        public int? BuyNowQuantity { get; set; }
        public int? BuyNowVariantId { get; set; }
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
        public int? VariantId { get; set; } //Truyền lên Frontend
        public string? VariantName { get; set; }
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
        public string PaymentMethod { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Address { get; set; } = "";
        public string City { get; set; } = "";
        public string Ward { get; set; } = "";
        public string Note { get; set; } = "";
    }
}