using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Data;

namespace BE.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AnalyticsController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public AnalyticsController(ShopDbContext context)
        {
            _context = context;
        }

        // =======================================================
        // HÀM LÕI: Tự động cộng dồn số liệu an toàn tuyệt đối
        // =======================================================
        private async Task IncrementAsync(int productId, string field, int delta = 1)
        {
            // Kiểm tra cột hợp lệ để chống SQL Injection
            string col = field switch
            {
                "Views" => "Views",
                "AddToCartCount" => "AddToCartCount",
                "PurchaseCount" => "PurchaseCount",
                _ => throw new ArgumentOutOfRangeException(nameof(field), "Trường thống kê không hợp lệ")
            };

            // Câu lệnh SQL: Nếu chưa có thì tạo mới (Upsert), sau đó cộng dồn và cập nhật thời gian
            string sql = $@"
                IF NOT EXISTS (SELECT 1 FROM ProductAnalytics WHERE ProductId = @p0)
                BEGIN
                    INSERT INTO ProductAnalytics(ProductId, Views, AddToCartCount, PurchaseCount, LastUpdated)
                    VALUES(@p0, 0, 0, 0, GETDATE());
                END
                UPDATE ProductAnalytics 
                SET {col} = {col} + @p1, LastUpdated = GETDATE() 
                WHERE ProductId = @p0;";

            await _context.Database.ExecuteSqlRawAsync(sql, productId, delta);
        }

        // =======================================================
        // CÁC API THEO DÕI (TRACKING)
        // =======================================================

        // 1. Ghi nhận 1 lượt xem sản phẩm
        [HttpPost("view/{productId:int}")]
        public async Task<IActionResult> TrackView([FromRoute] int productId)
        {
            await IncrementAsync(productId, "Views", 1);
            return Ok(new { success = true, message = "Đã ghi nhận lượt xem." });
        }

        // 2. Ghi nhận 1 lượt thêm vào giỏ hàng
        [HttpPost("cart/{productId:int}")]
        public async Task<IActionResult> TrackAddToCart([FromRoute] int productId)
        {
            await IncrementAsync(productId, "AddToCartCount", 1);
            return Ok(new { success = true, message = "Đã ghi nhận lượt thêm giỏ hàng." });
        }

        // 3. Ghi nhận lượt mua (Số lượng sản phẩm bán ra)
        [HttpPost("purchase/{productId:int}")]
        public async Task<IActionResult> TrackPurchase([FromRoute] int productId, [FromBody] int quantity)
        {
            if (quantity <= 0) quantity = 1;
            await IncrementAsync(productId, "PurchaseCount", quantity);
            return Ok(new { success = true, message = $"Đã ghi nhận bán được {quantity} sản phẩm." });
        }

        // =======================================================
        // API LẤY BÁO CÁO (CHO ADMIN DASHBOARD)
        // =======================================================
        [HttpGet("summary")]
        public async Task<IActionResult> Summary()
        {
            var data = await _context.ProductAnalytics
                .Select(a => new {
                    a.ProductId,
                    ProductName = a.Product != null ? a.Product.Name : "Sản phẩm ẩn",
                    a.Views,
                    a.AddToCartCount,
                    
                    // ✅ THAY THẾ SỐ LIỆU CŨ BẰNG CÔNG THỨC ĐẾM ĐỘNG (KHỚP 100% VỚI PRODUCT CARD)
                    PurchaseCount = a.Product != null 
                        ? a.Product.OrderDetails
                            .Where(od => od.Order != null && od.Order.Status == "Completed")
                            .Sum(od => (int?)od.Quantity) ?? 0 
                        : 0,
                        
                    a.LastUpdated
                })
                .AsNoTracking() // Tối ưu tốc độ đọc
                .ToListAsync();

            return Ok(data);
        }
    }
}