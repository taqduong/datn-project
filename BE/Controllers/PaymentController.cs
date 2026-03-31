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
        private readonly ShopDbContext _context; // ✅ 1. Thêm biến kết nối DB

        // 2. Sửa Constructor để nạp cả Configuration và Context
        public List<OrderDetail> OrderDetails { get; set; } = new ();

        public PaymentController(IConfiguration configuration, ShopDbContext context)
        {
            _configuration = configuration;
            _context = context;
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
            
            // ✅ Quan trọng: Lưu OrderId vào TxnRef để tí nữa Callback lấy ra tìm đơn hàng
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
                        // Tìm đơn hàng trong Database
                        var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId);
                        if (order != null)
                        {
                            // KHÔNG ĐỔI STATUS NỮA, GIỮ NGUYÊN PENDING ĐỂ CHỜ ADMIN DUYỆT
                            // order.Status = "Paid"; // <- Bỏ dòng này

                            // Chỉ cập nhật phương thức để đánh dấu là đã quẹt thẻ thành công
                            order.PaymentMethod = "VNPay_Paid"; // Đánh dấu đặc biệt
                            
                            await _context.SaveChangesAsync();
                        }
                    }
                    return Ok(new { success = true, message = "Thanh toán thành công" });
                }
                return BadRequest(new { success = false, message = "Giao dịch thất bại tại VNPay" });
            }

            return BadRequest(new { success = false, message = "Chữ ký không hợp lệ" });
        }

        // Hàm kiểm tra đơn hàng cũ và tạo ra một link VNPay mới để thanh toán lại (dành cho trường hợp khách muốn thanh toán lại đơn đã tạo nhưng chưa thanh toán)
        [HttpGet("retry-payment/{orderId:int}")]
        [Authorize] // Phải đăng nhập mới được gọi
        public async Task<IActionResult> RetryPayment(int orderId)
        {
            // 1. Lấy UserId từ Token để đảm bảo an toàn (chống user này thanh toán cho đơn user khác)
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (!int.TryParse(userIdClaim, out var userId)) return Unauthorized("Vui lòng đăng nhập.");

            // 2. Tìm đơn hàng trong DB, phải khớp OrderId và UserId
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == userId);

            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng hoặc đơn hàng không thuộc về bạn." });

            // 🛑 CHỈ CHO PHÉP THANH TOÁN LẠI KHI:
            // - Phương thức ban đầu là VNPay
            // - Trạng thái đơn vẫn là "Pending" (Chờ xử lý) - Theo đúng Shopee
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

            // Lấy IP, nếu sập IP Localhost thì gắn cứng 127.0.0.1
            var ipAddr = Utils.GetIpAddress(HttpContext);
            if (ipAddr == "::1" || string.IsNullOrEmpty(ipAddr)) {
                ipAddr = "127.0.0.1";
            }
            pay.AddRequestData("vnp_IpAddr", ipAddr);
            pay.AddRequestData("vnp_Locale", "vn");
            
            pay.AddRequestData("vnp_OrderInfo", "ThanhToanLaiDonHang_" + order.OrderId);
            pay.AddRequestData("vnp_OrderType", "other");
            pay.AddRequestData("vnp_ReturnUrl", urlCallBack ?? "");
            
            // ✅ Quan trọng nhất: TxnRef vẫn phải là OrderId cũ để tí nữa Callback biết đường cập nhật
            pay.AddRequestData("vnp_TxnRef", order.OrderId.ToString()); 

            var secretKey = _configuration["VnPay:HashSecret"]?.Trim() ?? "";
            var baseUrl = _configuration["VnPay:BaseUrl"]?.Trim() ?? "";
            var paymentUrl = pay.CreateRequestUrl(baseUrl, secretKey);

            return Ok(new { success = true, paymentUrl = paymentUrl });
        }
    }
}