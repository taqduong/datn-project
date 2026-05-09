using Microsoft.AspNetCore.Mvc;
using BE.Models;
using BE.Services;
using BE.Data; 
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization; 
using System.Security.Claims;

namespace BE.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ShopDbContext _context; // 1. Thêm biến kết nối DB
        private readonly IEmailService _emailService; // Biến cho dịch vụ email (nếu cần gửi email thông báo sau thanh toán)

        // 2. Sửa Constructor để nạp cả Configuration và Context
        public List<OrderDetail> OrderDetails { get; set; } = new ();

        public PaymentController(IConfiguration configuration, ShopDbContext context, IEmailService emailService)
        {
            _configuration = configuration;
            _context = context;
            _emailService = emailService;
        }

        [HttpPost("create-payment-url")]
        public IActionResult CreatePaymentUrl([FromBody] PaymentInformationModel model)
        {
            var timeZoneById = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            var timeNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZoneById);
            var tick = DateTime.Now.Ticks.ToString();

            var pay = new VnPayLibrary();
            var urlCallBack = _configuration["VnPay:ReturnUrl"];

            pay.AddRequestData("vnp_Version", "2.1.0");
            pay.AddRequestData("vnp_Command", "pay");
            pay.AddRequestData("vnp_TmnCode", _configuration["VnPay:TmnCode"]?.Trim() ?? "");
            pay.AddRequestData("vnp_Amount", ((long)model.Amount * 100).ToString());
            pay.AddRequestData("vnp_CreateDate", timeNow.ToString("yyyyMMddHHmmss"));
            pay.AddRequestData("vnp_CurrCode", "VND");

            var ipAddr = Utils.GetIpAddress(HttpContext);
            if (ipAddr == "::1" || string.IsNullOrEmpty(ipAddr)) {
                ipAddr = "127.0.0.1";
            }
            pay.AddRequestData("vnp_IpAddr", ipAddr);
            pay.AddRequestData("vnp_Locale", "vn");
            
            // Lưu trữ OrderId vào tham chiếu TxnRef phục vụ tra cứu giao dịch khi nhận Callback từ VNPay
            pay.AddRequestData("vnp_OrderInfo", "ThanhToanDonHang_" + model.OrderId);
            pay.AddRequestData("vnp_OrderType", "other");
            pay.AddRequestData("vnp_ReturnUrl", urlCallBack ?? "");
            pay.AddRequestData("vnp_TxnRef", model.OrderId.ToString()); // Dùng OrderId làm mã tham chiếu

            var paymentUrl = pay.CreateRequestUrl(_configuration["VnPay:BaseUrl"] ?? "", _configuration["VnPay:HashSecret"]?.Trim() ?? "");

            return Ok(new { success = true, paymentUrl = paymentUrl });
        }



        [HttpGet("payment-callback")]
        public async Task<IActionResult> PaymentCallback()
        {
            var pay = new VnPayLibrary();
            var responseData = Request.Query;

            foreach (var (key, value) in responseData)
            {
                if (!string.IsNullOrEmpty(key) && key.StartsWith("vnp_"))
                {
                    pay.AddResponseData(key, value.ToString());
                }
            }

            // Lấy ID đơn hàng và mã phản hồi từ VNPay
            string orderIdStr = pay.GetResponseData("vnp_TxnRef");
            string vnp_ResponseCode = pay.GetResponseData("vnp_ResponseCode");
            string vnp_SecureHash = Request.Query["vnp_SecureHash"].ToString();
            string secretKey = _configuration["VnPay:HashSecret"]?.Trim() ?? "";

            // Kiểm tra chữ ký bảo mật
            bool checkSignature = pay.ValidateSignature(vnp_SecureHash, secretKey);

            if (checkSignature)
            {
                if (vnp_ResponseCode == "00") // Thanh toán thành công
                {
                    if (int.TryParse(orderIdStr, out int orderId))
                    {
                        // Sửa lại đoạn query này để lấy đủ thông tin in ra Email
                        var order = await _context.Orders
                            .Include(o => o.OrderDetails).ThenInclude(od => od.Product)
                            .Include(o => o.OrderDetails).ThenInclude(od => od.ProductVariant)
                            .FirstOrDefaultAsync(o => o.OrderId == orderId);

                        if (order != null)
                        {
                            order.PaymentMethod = "VNPay_Paid"; 
                            await _context.SaveChangesAsync();

                            // =======================================================
                            // GỬI EMAIL XÁC NHẬN SAU KHI VNPAY BÁO TRỪ TIỀN THÀNH CÔNG
                            // =======================================================
                            if (!string.IsNullOrEmpty(order.Email))
                            {
                                try 
                                {
                                    string body = GetOrderEmailTemplate(order, "Thanh toán VNPay thành công", "Đơn hàng của bạn đã được thanh toán và đang chờ xử lý. Chúng tôi sẽ sớm đóng gói giao cho bạn.");
                                    await _emailService.SendEmailAsync(order.Email, $"[HomeMart] Xác nhận thanh toán đơn hàng #{order.OrderId}", body);
                                } 
                                catch { /* Bỏ qua lỗi gửi mail */ }
                            }
                        }
                    }
                    return Ok(new { success = true, message = "Thanh toán thành công" });
                }
                return BadRequest(new { success = false, message = "Giao dịch thất bại tại VNPay" });
            }

            return BadRequest(new { success = false, message = "Chữ ký không hợp lệ" });
        }

        // Khởi tạo URL thanh toán VNPay mới cho các đơn hàng đang chờ xử lý (Hỗ trợ luồng thanh toán lại)
        [HttpGet("retry-payment/{orderId:int}")]
        [Authorize] // Phải đăng nhập mới được gọi
        public async Task<IActionResult> RetryPayment(int orderId)
        {
            // 1. Xác thực UserId từ Token để ngăn chặn hành vi thanh toán chéo trái phép
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (!int.TryParse(userIdClaim, out var userId)) return Unauthorized("Vui lòng đăng nhập.");

            // 2. Tìm đơn hàng trong DB, phải khớp OrderId và UserId
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId);

            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng hoặc đơn hàng không thuộc về bạn." });

            // // Xác thực các điều kiện bắt buộc để cấp phép thanh toán lại:
            // - Phương thức ban đầu là VNPay
            // - Trạng thái đơn vẫn là "Pending" (Chờ xử lý)
            if (order.PaymentMethod?.ToLower() != "vnpay") 
                return BadRequest(new { message = "Đơn hàng này không sử dụng phương thức VNPay." });

            if (order.Status?.ToLower() != "pending") 
                return BadRequest(new { message = "Đơn hàng này đã được xử lý, không thể thanh toán lại." });

            // 3. TÁI SỬ DỤNG LOGIC TẠO LINK VNPAY (Giống hàm CreatePaymentUrl)
            var timeZoneById = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            var timeNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZoneById);
            var tick = DateTime.Now.Ticks.ToString();

            var pay = new VnPayLibrary();
            var urlCallBack = _configuration["VnPay:ReturnUrl"];

            pay.AddRequestData("vnp_Version", "2.1.0");
            pay.AddRequestData("vnp_Command", "pay");
            pay.AddRequestData("vnp_TmnCode", _configuration["VnPay:TmnCode"]?.Trim() ?? "");
            pay.AddRequestData("vnp_Amount", ((long)order.TotalAmount * 100).ToString()); // Lấy số tiền từ đơn hàng cũ
            pay.AddRequestData("vnp_CreateDate", timeNow.ToString("yyyyMMddHHmmss"));
            pay.AddRequestData("vnp_CurrCode", "VND");

            // Trích xuất địa chỉ IP của Client (Cơ chế fallback: Sử dụng Loopback IP 127.0.0.1 cho môi trường Local)
            var ipAddr = Utils.GetIpAddress(HttpContext);
            if (ipAddr == "::1" || string.IsNullOrEmpty(ipAddr)) {
                ipAddr = "127.0.0.1";
            }
            pay.AddRequestData("vnp_IpAddr", ipAddr);
            pay.AddRequestData("vnp_Locale", "vn");
            
            pay.AddRequestData("vnp_OrderInfo", "ThanhToanLaiDonHang_" + order.OrderId);
            pay.AddRequestData("vnp_OrderType", "other");
            pay.AddRequestData("vnp_ReturnUrl", urlCallBack ?? "");
            
            // Quan trọng nhất: TxnRef vẫn phải là OrderId cũ để tí nữa Callback biết đường cập nhật
            pay.AddRequestData("vnp_TxnRef", order.OrderId.ToString()); 

            var secretKey = _configuration["VnPay:HashSecret"]?.Trim() ?? "";
            var baseUrl = _configuration["VnPay:BaseUrl"]?.Trim() ?? "";
            var paymentUrl = pay.CreateRequestUrl(baseUrl, secretKey);

            return Ok(new { success = true, paymentUrl = paymentUrl });
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
}