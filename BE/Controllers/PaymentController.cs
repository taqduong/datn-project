using Microsoft.AspNetCore.Mvc;
using BE.Models;
using BE.Services;
using BE.Data; // Nhớ thêm using này để nhận ShopDbContext
using Microsoft.EntityFrameworkCore;

namespace BE.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ShopDbContext _context; // ✅ 1. Thêm biến kết nối DB

        // ✅ 2. Sửa Constructor để nạp cả Configuration và Context
        public List<OrderDetail> OrderDetails { get; set; }

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

        // ✅ 3. ĐÂY LÀ HÀM MỚI SẾP CẦN THÊM VÀO
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
                            // 🚀 CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
                            order.Status = "Paid"; // Đổi thành "Paid" hoặc "Đã thanh toán" tùy sếp
                            order.PaymentMethod = "VNPay";
                            await _context.SaveChangesAsync();
                        }
                    }
                    return Ok(new { success = true, message = "Thanh toán thành công" });
                }
                return BadRequest(new { success = false, message = "Giao dịch thất bại tại VNPay" });
            }

            return BadRequest(new { success = false, message = "Chữ ký không hợp lệ" });
        }
    }
}