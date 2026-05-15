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
using BE.Services;

namespace BE.Controllers
{
    [Route("api/Order")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly ShopDbContext _context;
        private readonly IEmailService _emailService;

        public OrderController(ShopDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        private int? GetUserIdFromToken()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            return int.TryParse(id, out var uid) ? uid : (int?)null;
        }

        // ================== USER: THANH TOÁN & CHỐT ĐƠN (ĐÃ FIX GIÁ) ==================
        [HttpPost("checkout")]
        [Authorize]
        public async Task<IActionResult> Checkout([FromBody] CheckoutRequestDto request)
        {
            var userId = GetUserIdFromToken();
            if (userId == null) return Unauthorized("Vui lòng đăng nhập.");

            decimal totalAmount = 0;
            var orderDetails = new List<OrderDetail>();

            // Luồng xử lý 1: Khách hàng đặt mua sản phẩm trực tiếp (Ân "Mua ngay" từ trang chi tiết sản phẩm)
            if (request.BuyNowProductId.HasValue && request.BuyNowQuantity.HasValue)
            {
                var product = await _context.Products.FindAsync(request.BuyNowProductId.Value);
                if (product == null) return BadRequest(new { message = "Sản phẩm không tồn tại." });

                decimal basePrice = product.Price;
                double? activeDiscount = product.Discount; // Mặc định lấy giảm giá mẹ

                // NẾU CÓ BIẾN THỂ (MÀU/SIZE)
                if (request.BuyNowVariantId.HasValue)
                {
                    var variant = await _context.ProductVariants.FindAsync(request.BuyNowVariantId.Value);
                    if (variant == null) return BadRequest(new { message = "Phân loại sản phẩm không tồn tại." });

                    if (variant.Stock < request.BuyNowQuantity.Value)
                        return BadRequest(new { message = $"Phân loại {variant.VariantName} không đủ số lượng." });

                    variant.Stock -= request.BuyNowQuantity.Value;
                    basePrice = variant.Price;
                    // ƯU TIÊN LẤY GIẢM GIÁ BIẾN THỂ (Nếu có), KHÔNG THÌ MỚI LẤY CỦA MẸ
                    activeDiscount = variant.Discount ?? product.Discount; 
                }
                else
                {
                    if (product.Stock < request.BuyNowQuantity.Value)
                        return BadRequest(new { message = $"Sản phẩm không đủ số lượng." });

                    product.Stock -= request.BuyNowQuantity.Value;
                }

                // TÍNH GIÁ CUỐI CÙNG DỰA TRÊN CHIẾT KHẤU ĐÃ XÁC ĐỊNH
                decimal finalPrice = (activeDiscount.HasValue && activeDiscount.Value > 0)
                    ? Math.Round(basePrice * (1 - (decimal)activeDiscount.Value / 100), 0)
                    : basePrice;
                    
                totalAmount = finalPrice * request.BuyNowQuantity.Value;

                orderDetails.Add(new OrderDetail
                {
                    ProductId = product.Id,
                    VariantId = request.BuyNowVariantId,
                    Quantity = request.BuyNowQuantity.Value,
                    UnitPrice = finalPrice
                });
            }
            // Luồng xử lý 2: Khách hàng đặt đơn từ giỏ hàng
            else
            {
                // 1. Tạo query trước (Không dùng 'var cartItems' ở đây nữa)
                var query = _context.Carts
                    .Include(c => c.Product)
                    .Include(c => c.ProductVariant)
                    .Where(c => c.UserId == userId.Value); // userId đã check null ở đầu hàm nên .Value an toàn

                // 2. Lọc theo danh sách ID nếu có
                if (request.SelectedCartItemIds != null && request.SelectedCartItemIds.Any())
                {
                    query = query.Where(c => request.SelectedCartItemIds.Contains(c.CartItemId));
                }

                // 3. Bây giờ mới thực thi query và gán vào biến cartItems (CHỈ KHAI BÁO 1 LẦN)
                var cartItems = await query.ToListAsync();

                if (cartItems == null || !cartItems.Any()) 
                    return BadRequest(new { message = "Giỏ hàng trống hoặc chưa chọn sản phẩm." });

                foreach (var item in cartItems)
                {
                    decimal basePrice = item.Product.Price;
                    double? activeDiscount = item.Product.Discount;

                    if (item.VariantId.HasValue && item.ProductVariant != null)
                    {
                        if (item.ProductVariant.Stock < item.Quantity)
                            return BadRequest(new { message = $"Phân loại {item.ProductVariant.VariantName} không đủ số lượng." });

                        item.ProductVariant.Stock -= item.Quantity;
                        basePrice = item.ProductVariant.Price;
                        // ƯU TIÊN LẤY GIẢM GIÁ BIẾN THỂ
                        activeDiscount = item.ProductVariant.Discount ?? item.Product.Discount;
                    }
                    else
                    {
                        if (item.Product.Stock < item.Quantity)
                            return BadRequest(new { message = $"Sản phẩm {item.Product.Name} không đủ." });

                        item.Product.Stock -= item.Quantity;
                    }

                    decimal finalPrice = (activeDiscount.HasValue && activeDiscount.Value > 0)
                        ? Math.Round(basePrice * (1 - (decimal)activeDiscount.Value / 100), 0) 
                        : basePrice;

                    totalAmount += finalPrice * item.Quantity;

                    orderDetails.Add(new OrderDetail
                    {
                        ProductId = item.ProductId,
                        VariantId = item.VariantId,
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
                TotalAmount = Math.Max(0, totalAmount + request.ShippingFee - request.DiscountAmount),
                Status = "Pending", 
                PaymentMethod = request.PaymentMethod,
                FullName = request.FullName,
                Phone = request.Phone,
                Address = request.Address,
                Email = request.Email,
                City = request.City,
                Ward = request.Ward,
                Note = request.Note,
                DiscountAmount = request.DiscountAmount,
                ShippingFee = request.ShippingFee,
                AppliedVoucherCode = request.AppliedVoucherCode,
                OrderDetails = orderDetails
            };

            // =========================================================================
            // CỘNG DỒN SỐ LƯỢNG VOUCHER ĐÃ SỬ DỤNG
            // =========================================================================
            if (!string.IsNullOrEmpty(request.AppliedVoucherCode))
            {
                // Xử lý phân tách chuỗi mã giảm giá (Hỗ trợ áp dụng nhiều mã khuyến mãi đồng thời)
                var appliedCodes = request.AppliedVoucherCode.Split(',')
                                          .Select(c => c.Trim().ToUpper())
                                          .ToList();

                foreach (var code in appliedCodes)
                {
                    var voucher = await _context.Vouchers.FirstOrDefaultAsync(v => v.Code.ToUpper() == code);
                    if (voucher != null)
                    {
                        voucher.UsedCount += 1; // Tăng biến đếm lên 1
                    }
                }
            }

            _context.Orders.Add(newOrder);
            await _context.SaveChangesAsync();
            // =========================================================================
            // Xử lý luồng thông báo: Chỉ gửi Email xác nhận ngay lập tức đối với phương thức thanh toán COD
            // Nếu là VNPay, hệ thống sẽ gửi mail sau khi khách thanh toán thành công (ở PaymentController)
            // =========================================================================
            if (!string.IsNullOrEmpty(newOrder.Email) && request.PaymentMethod.ToLower() == "cod")
            {
                try {
                    var fullOrder = await _context.Orders
                        .Include(o => o.OrderDetails).ThenInclude(od => od.Product)
                        .Include(o => o.OrderDetails).ThenInclude(od => od.ProductVariant)
                        .FirstOrDefaultAsync(o => o.OrderId == newOrder.OrderId);

                    if (fullOrder != null) {
                        string body = GetOrderEmailTemplate(fullOrder, "Xác nhận đặt hàng thành công", "Đơn hàng của bạn đã được tiếp nhận và đang chờ xử lý. Chúng tôi sẽ sớm giao hàng cho bạn.");
                        await _emailService.SendEmailAsync(fullOrder.Email, $"[HomeMart] Xác nhận đơn hàng thành công #{fullOrder.OrderId}", body);
                    }
                } catch { /* Bỏ qua lỗi nếu gửi mail thất bại */ }
            }
            
            return Ok(new { message = "Đặt hàng thành công!", orderId = newOrder.OrderId });
        }

        // ================== ADMIN: Lấy tất cả đơn hàng ==================
        [HttpGet("admin")]
        [Authorize(Roles = "admin,nhanvien")]
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
                    RefundStatus = o.RefundStatus ?? "None",
                    PaymentMethod = o.PaymentMethod,
                    FullName = o.FullName ?? "",
                    Phone = o.Phone ?? "",
                    Email = o.Email ?? "",
                    Address = o.Address ?? "", 
                    City = o.City ?? "",       
                    Ward = o.Ward ?? "",       
                    Note = o.Note ?? "",
                    DiscountAmount = o.DiscountAmount,
                    ShippingFee = o.ShippingFee,
                    AppliedVoucherCode = o.AppliedVoucherCode,
                    OrderDetails = o.OrderDetails.Select(od => new OrderDetailDto
                    {
                        ProductId = od.ProductId,
                        // BỔ SUNG: Truyền ID, Tên và Ảnh của Biến thể ra ngoài API
                        VariantId = od.VariantId, 
                        VariantName = od.ProductVariant != null ? od.ProductVariant.VariantName : null, 
                        VariantColor = od.ProductVariant != null ? od.ProductVariant.Color : null, // <--- GÁN COLOR VÀO ĐÂY Ở CẢ 2 API Nhé!
                        Quantity = od.Quantity,
                        Price = od.UnitPrice,
                        ProductName = od.Product.Name ?? "",
                        ImageUrl = (od.ProductVariant != null && !string.IsNullOrEmpty(od.ProductVariant.ImageUrl)) 
                                    ? od.ProductVariant.ImageUrl 
                                    : (od.Product.ImageUrl ?? ""), 
                        Product = new ProductMiniDto
                        {
                            Id = od.Product.Id,
                            Name = od.Product != null && od.Product.Name != null ? od.Product.Name : "",
                            ImageUrl = od.Product != null && od.Product.ImageUrl != null ? od.Product.ImageUrl : ""
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
                    RefundStatus = o.RefundStatus ?? "None",
                    PaymentMethod = o.PaymentMethod,
                    FullName = o.FullName ?? "",
                    Phone = o.Phone ?? "",
                    Email = o.Email ?? "",
                    Address = o.Address ?? "", 
                    City = o.City ?? "",
                    Ward = o.Ward ?? "",
                    Note = o.Note ?? "",
                    DiscountAmount = o.DiscountAmount,
                    ShippingFee = o.ShippingFee,
                    AppliedVoucherCode = o.AppliedVoucherCode,
                    OrderDetails = o.OrderDetails.Select(od => new OrderDetailDto
                    {
                        ProductId = od.ProductId,
                        // BỔ SUNG: Truyền dữ liệu Biến thể
                        VariantId = od.VariantId, 
                        VariantName = od.ProductVariant != null ? od.ProductVariant.VariantName : null, 
                        VariantColor = od.ProductVariant != null ? od.ProductVariant.Color : null, // <--- GÁN COLOR VÀO ĐÂY Ở CẢ 2 API Nhé!
                        Quantity = od.Quantity,
                        Price = od.UnitPrice,
                        ProductName = od.Product.Name ?? "",
                        ImageUrl = (od.ProductVariant != null && !string.IsNullOrEmpty(od.ProductVariant.ImageUrl)) 
                                    ? od.ProductVariant.ImageUrl 
                                    : (od.Product.ImageUrl ?? ""),
                        Product = new ProductMiniDto
                        {
                            Id = od.Product.Id,
                            Name = od.Product != null && od.Product.Name != null ? od.Product.Name : "",
                            ImageUrl = od.Product != null && od.Product.ImageUrl != null ? od.Product.ImageUrl : ""
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
                RefundStatus = order.RefundStatus ?? "None",
                PaymentMethod = order.PaymentMethod,
                FullName = order.FullName ?? "",
                Email = order.Email ?? "",
                Phone = order.Phone ?? "",
                Address = order.Address ?? "",
                City = order.City ?? "",
                Ward = order.Ward ?? "",
                Note = order.Note ?? "",
                DiscountAmount = order.DiscountAmount,
                ShippingFee = order.ShippingFee,
                AppliedVoucherCode = order.AppliedVoucherCode,
                OrderDetails = order.OrderDetails.Select(od => new OrderDetailDto
                {
                    ProductId = od.ProductId,
                    // BỔ SUNG: Truyền dữ liệu Biến thể ra Front-end
                    VariantId = od.VariantId,
                    VariantName = od.ProductVariant != null ? od.ProductVariant.VariantName : null,
                    VariantColor = od.ProductVariant != null ? od.ProductVariant.Color : null, // <--- BỔ SUNG LUÔN VÀO ĐÂY
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
                // Nếu khách mua biến thể -> Trả lại kho biến thể
                if (detail.VariantId.HasValue) 
                {
                    var variant = await _context.ProductVariants.FindAsync(detail.VariantId.Value);
                    if (variant != null) variant.Stock += detail.Quantity;
                }
                // Nếu khách mua áo gốc -> Trả lại kho áo gốc
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
                    .ThenInclude(od => od.Product)        
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.ProductVariant) 
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });
            if (order.UserId != userId.Value) return Forbid();

            var currentStatus = order.Status?.ToLower();
            if (currentStatus != "pending" && currentStatus != "processing")
                return BadRequest(new { message = "Không thể hủy đơn hàng đã được xử lý hoặc giao hàng." });

            order.Status = "Cancelled";

            // LOGIC ĐÁNH DẤU CHỜ HOÀN TIỀN CHO ĐƠN VNPAY ĐÃ TRẢ TIỀN
            if (order.PaymentMethod == "VNPay_Paid") 
            {
                 order.RefundStatus = "Pending";
            }
            
            // GỌI HÀM HOÀN KHO DÙNG CHUNG CHO GỌN
            await RestoreStockAsync(order); 

            await _context.SaveChangesAsync();
            if (!string.IsNullOrEmpty(order.Email))
            {
                try {
                    string body = GetOrderEmailTemplate(order, "Đơn hàng đã bị hủy", "Rất tiếc, đơn hàng của bạn đã bị hủy. Nếu có nhầm lẫn, vui lòng liên hệ hotline 1900 1080 để được hỗ trợ.");
                    await _emailService.SendEmailAsync(order.Email, $"[HomeMart] Thông báo hủy đơn hàng #{order.OrderId}", body);
                } catch { }
            }
            return Ok(new { message = "Đã hủy đơn hàng và hoàn lại số lượng vào kho." });
        }

        // ================== ADMIN: XÁC NHẬN ĐÃ HOÀN TIỀN ==================
        [HttpPut("{id:int}/confirm-refund")]
        [Authorize(Roles = "admin,nhanvien")]
        public async Task<IActionResult> ConfirmRefund(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });

            if (order.Status?.ToLower() != "cancelled" || order.RefundStatus?.ToLower() != "pending")
            {
                return BadRequest(new { message = "Đơn hàng không hợp lệ để hoàn tiền." });
            }

            order.RefundStatus = "Refunded";
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xác nhận đã hoàn tiền thành công!" });
        }

        // ================== ADMIN: DUYỆT/HỦY/CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG ==================
        [HttpPut("{id:int}/status")]
        [Authorize(Roles = "admin,nhanvien")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateStatusDto request)
        {
            var order = await _context.Orders
                .Include(o => o.OrderDetails).ThenInclude(od => od.Product)
                .Include(o => o.OrderDetails).ThenInclude(od => od.ProductVariant)
                .FirstOrDefaultAsync(o => o.OrderId == id);
                
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });

            if (request.Status == "Cancelled" && order.Status != "Cancelled")
            {
                await RestoreStockAsync(order); 
            }

            // 1. Nếu chuyển sang trạng thái Completed (và trước đó chưa phải Completed)
            if (request.Status == "Completed" && order.Status != "Completed")
            {
                foreach (var detail in order.OrderDetails)
                {
                    // Câu lệnh SQL "thần thánh": Nếu chưa có bản ghi trong ProductAnalytics thì Insert, có rồi thì Update cộng dồn
                    string sql = $@"
                        IF NOT EXISTS (SELECT 1 FROM ProductAnalytics WHERE ProductId = {detail.ProductId})
                        BEGIN
                            INSERT INTO ProductAnalytics(ProductId, Views, AddToCartCount, PurchaseCount, LastUpdated)
                            VALUES({detail.ProductId}, 0, 0, {detail.Quantity}, GETDATE());
                        END
                        ELSE
                        BEGIN
                            UPDATE ProductAnalytics 
                            SET PurchaseCount = PurchaseCount + {detail.Quantity}, LastUpdated = GETDATE() 
                            WHERE ProductId = {detail.ProductId};
                        END";

                    await _context.Database.ExecuteSqlRawAsync(sql);
                }
            }

            order.Status = request.Status;
            await _context.SaveChangesAsync();

            if (!string.IsNullOrEmpty(order.Email))
            {
                try {
                    string title = "";
                    string msg = "";

                    if (request.Status == "Processing") {
                        title = "Đơn hàng đang được chuẩn bị";
                        msg = "HomeMart đã xác nhận đơn hàng của bạn và đang tiến hành đóng gói. Shipper sẽ sớm đến lấy hàng!";
                    } 
                    else if (request.Status == "Shipping") {
                        title = "Đơn hàng đang được giao";
                        msg = "Đơn hàng của bạn đã được bàn giao cho đơn vị vận chuyển và đang trên đường tới chỗ bạn.";
                    } 
                    else if (request.Status == "Completed") {
                        title = "Giao hàng thành công";
                        msg = "Đơn hàng đã được giao thành công. Cảm ơn bạn đã tin dùng sản phẩm của HomeMart!";
                    }
                    else if (request.Status == "Cancelled") {
                        title = "Đơn hàng đã bị hủy";
                        msg = "Rất tiếc, đơn hàng của bạn đã bị hủy trên hệ thống. Nếu có nhầm lẫn, vui lòng liên hệ hotline để được hỗ trợ.";
                    }

                    if (!string.IsNullOrEmpty(title)) {
                        string body = GetOrderEmailTemplate(order, title, msg);
                        await _emailService.SendEmailAsync(order.Email, $"[HomeMart] Thông báo đơn hàng #{order.OrderId}: {title}", body);
                    }
                } catch { }
            }
            return Ok(new { message = "Cập nhật trạng thái thành công!" });
        }

        // ================== ADMIN: Xoá đơn hàng ==================
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "admin,nhanvien")]
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

        [NonAction]
        private string GetOrderEmailTemplate(Order order, string statusTitle, string statusMessage)
        {
            var sb = new System.Text.StringBuilder();

            // Xử lý ghi chú: Nếu trống thì hiển thị "Không có"
            string noteText = string.IsNullOrEmpty(order.Note) ? "Không có" : order.Note;

            sb.Append($@"
            <div style='font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;'>
                <div style='background-color: #2563eb; padding: 20px; text-align: center; color: white;'>
                    <h2 style='margin: 0; font-size: 24px;'>HomeMart Shop</h2>
                    <p style='margin: 5px 0 0 0; font-size: 16px;'>{statusTitle}</p>
                </div>
                <div style='padding: 20px; color: #333;'>
                    <p>Xin chào <strong>{order.FullName}</strong>,</p>
                    <p>{statusMessage}</p>
                    
                    <h3 style='border-bottom: 1px solid #eee; padding-bottom: 10px; color: #2563eb; margin-top: 30px;'>THÔNG TIN ĐƠN HÀNG #{order.OrderId}</h3>
                    <p style='margin: 5px 0;'><strong>Ngày đặt:</strong> {order.OrderDate:dd/MM/yyyy HH:mm}</p>
                    <p style='margin: 5px 0;'><strong>Người nhận:</strong> {order.FullName} - {order.Phone}</p>
                    <p style='margin: 5px 0;'><strong>Giao đến:</strong> {order.Address}, {order.Ward}, {order.City}</p>
                    <p style='margin: 5px 0;'><strong>Ghi chú:</strong> <span style='font-style: italic; color: #d97706;'>{noteText}</span></p>

                    <table width='100%' cellpadding='10' cellspacing='0' style='border-collapse: collapse; margin-top: 20px;'>
                        <thead style='background-color: #f8f9fa; text-align: left;'>
                            <tr>
                                <th>Sản phẩm</th>
                                <th width='60' style='text-align: center;'>SL</th>
                                <th width='100' style='text-align: right;'>Giá</th>
                            </tr>
                        </thead>
                        <tbody>");

            decimal totalItemsPrice = 0;

            // Vòng lặp in ra từng sản phẩm
            foreach (var detail in order.OrderDetails)
            {
                string productName = detail.Product?.Name ?? "Sản phẩm không xác định";
                string variantInfo = detail.ProductVariant != null ? $"Phân loại: {detail.ProductVariant.VariantName}" : "";
                
                decimal lineTotal = detail.UnitPrice * detail.Quantity;
                totalItemsPrice += lineTotal;

                sb.Append($@"
                            <tr style='border-bottom: 1px solid #eee;'>
                                <td>
                                    <div style='font-weight: bold; margin-bottom: 4px; color: #333;'>{productName}</div>
                                    {(string.IsNullOrEmpty(variantInfo) ? "" : $"<div style='font-size: 12px; color: #757575;'>{variantInfo}</div>")}
                                </td>
                                <td style='text-align: center; color: #555;'>x{detail.Quantity}</td>
                                <td style='text-align: right; color: #555;'>{detail.UnitPrice:N0} đ</td>
                            </tr>");
            }

            sb.Append($@"
                        </tbody>
                    </table>

                    <table width='100%' cellpadding='8' cellspacing='0' style='margin-top: 15px; font-size: 14px;'>
                        <tr>
                            <td colspan='2' style='text-align: right; color: #555;'>Tổng tiền hàng:</td>
                            <td width='120' style='text-align: right;'>{totalItemsPrice:N0} đ</td>
                        </tr>
                        <tr>
                            <td colspan='2' style='text-align: right; color: #555;'>Phí vận chuyển:</td>
                            <td style='text-align: right;'>{order.ShippingFee:N0} đ</td>
                        </tr>
                        <tr>
                            <td colspan='2' style='text-align: right; color: #555;'>Voucher giảm giá:</td>
                            <td style='text-align: right;'>- {order.DiscountAmount:N0} đ</td>
                        </tr>
                        <tr>
                            <td colspan='2' style='text-align: right; font-weight: bold; font-size: 16px;'>Tổng thanh toán:</td>
                            <td style='text-align: right; font-weight: bold; font-size: 18px; color: #2563eb;'>{order.TotalAmount:N0} đ</td>
                        </tr>
                    </table>

                    <div style='text-align: center; margin-top: 35px;'>
                        <a href='http://localhost:3000/orders' style='display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;'>XEM CHI TIẾT ĐƠN HÀNG</a>
                    </div>
                </div>
                <div style='background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;'>
                    © 2026 HomeMart - Hệ thống TMĐT Gia dụng thông minh<br/>
                    Email này được gửi tự động từ hệ thống, vui lòng không trả lời trực tiếp.
                </div>
            </div>");

            return sb.ToString();
        }
    }

    // ================== DTOs ==================
    public class CheckoutRequestDto
    {
        public string FullName { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Address { get; set; } = null!;
        public string? Email { get; set; }
        public string City { get; set; } = null!;
        public string Ward { get; set; } = null!;
        public string? Note { get; set; }
        public string PaymentMethod { get; set; } = "COD";
        public int? BuyNowProductId { get; set; }
        public int? BuyNowQuantity { get; set; }
        public int? BuyNowVariantId { get; set; }
        public decimal DiscountAmount { get; set; } = 0;
        public string? AppliedVoucherCode { get; set; } 
        public decimal ShippingFee { get; set; } = 30000;

        // THÊM DÒNG NÀY ĐỂ NHẬN DANH SÁCH CÁC MÓN KHÁCH ĐÃ TICK
        public List<int> SelectedCartItemIds { get; set; } = new List<int>();
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
        public string? VariantColor { get; set; }
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
        public string RefundStatus { get; set; } = "None";
        public List<OrderDetailDto> OrderDetails { get; set; } = new();
        public string PaymentMethod { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Address { get; set; } = "";
        public string City { get; set; } = "";
        public string Ward { get; set; } = "";
        public string Note { get; set; } = "";
        public decimal DiscountAmount { get; set; } = 0;
        public decimal ShippingFee { get; set; } = 0;
        public string? AppliedVoucherCode { get; set; }
    }
}