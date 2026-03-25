using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/recommendations")]
    public class RecommendationController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public RecommendationController(ShopDbContext context)
        {
            _context = context;
        }

        // =================================================================
        // 1. GỢI Ý "DÀNH CHO BẠN" (Dùng AI Python CÓ TRỌNG SỐ)
        // =================================================================
        [HttpGet("for-you")]
        [Authorize]
        public async Task<IActionResult> GetForYou()
        {
            var userIdClaim = User.FindFirst("Id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return Unauthorized(new { message = "Vui lòng đăng nhập!" });

            // 1. Lấy lịch sử CÓ TRỌNG SỐ (Cộng dồn điểm View, Cart, Mua)
            var userPreferences = await _context.UserActivities
                .Where(x => x.UserId == userId)
                .GroupBy(x => x.ProductId)
                .Select(g => new { 
                    id = g.Key, 
                    score = g.Sum(x => x.Score) // Tính tổng điểm để gửi sang Python làm trọng số
                })
                .ToListAsync();

            // LƯỚI AN TOÀN 1: Chưa có lịch sử -> Gợi ý đồ mới nhất
            if (!userPreferences.Any())
            {
                var fallbackProducts = await _context.Products
                    .Include(p => p.ProductVariants)
                    .OrderByDescending(p => p.Id)
                    .Take(8)
                    .ToListAsync();
                return Ok(fallbackProducts);
            }

            // 2. Móc toàn bộ data (Bỏ Include Category như cao nhân góp ý)
            var allProducts = await _context.Products
                .Select(p => new {
                    id = p.Id,
                    name = p.Name,
                    description = p.Description,
                    categoryName = p.Category != null ? p.Category.Name : ""
                })
                .ToListAsync();

            // 3. Gọi điện cho AI (Timeout 5 giây) - Gửi mảng history_prefs
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            var requestData = new { history_prefs = userPreferences, all_products = allProducts };
            var content = new StringContent(JsonSerializer.Serialize(requestData), Encoding.UTF8, "application/json");

            try
            {
                var response = await client.PostAsync("http://127.0.0.1:5000/predict_foryou", content);
                
                if (response.IsSuccessStatusCode)
                {
                    var recommendedIds = await response.Content.ReadFromJsonAsync<List<int>>();

                    if (recommendedIds != null && recommendedIds.Any())
                    {
                        var products = await _context.Products
                            .Include(p => p.ProductVariants)
                            .Where(p => recommendedIds.Contains(p.Id))
                            .ToListAsync();

                        var sortedProducts = recommendedIds
                            .Select(id => products.FirstOrDefault(p => p.Id == id))
                            .Where(p => p != null)
                            .ToList();

                        return Ok(sortedProducts);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CẢNH BÁO] AI For You lỗi: {ex.Message}");
            }

            // 4. LƯỚI AN TOÀN 2 (Fallback): Lỗi AI thì dùng logic cũ của C#
            var topCategories = await _context.UserActivities
                .Where(x => x.UserId == userId)
                .GroupBy(x => x.CategoryId)
                .Select(g => new { CategoryId = g.Key, TotalScore = g.Sum(x => x.Score) })
                .OrderByDescending(x => x.TotalScore)
                .Take(2)
                .Select(x => x.CategoryId)
                .ToListAsync();

            var boughtProductIds = await _context.UserActivities
                .Where(x => x.UserId == userId && x.ActionType == "Purchase")
                .Select(x => x.ProductId).Distinct().ToListAsync();

            var oldLogicProducts = await _context.Products
                .Include(p => p.ProductVariants)
                .Where(p => topCategories.Contains(p.CategoryId) && !boughtProductIds.Contains(p.Id))
                .OrderByDescending(p => p.Id)
                .Take(8)
                .ToListAsync();

            return Ok(oldLogicProducts);
        }

        // =================================================================
        // 2. GỢI Ý "SẢN PHẨM TƯƠNG TỰ" (Dùng AI Python)
        // =================================================================
        [HttpGet("similar/{productId}")]
        public async Task<IActionResult> GetSimilar(int productId)
        {
            var currentProduct = await _context.Products.FindAsync(productId);
            if (currentProduct == null) return NotFound(new { message = "Không tìm thấy sản phẩm" });

            // Bỏ Include Category cho nhẹ
            var allProducts = await _context.Products
                .Select(p => new { 
                    id = p.Id, 
                    name = p.Name, 
                    description = p.Description, 
                    categoryName = p.Category != null ? p.Category.Name : "" 
                })
                .ToListAsync();

            // THÊM TIMEOUT 5s
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            var requestData = new { current_id = productId, all_products = allProducts };
            var content = new StringContent(JsonSerializer.Serialize(requestData), Encoding.UTF8, "application/json");

            try
            {
                var response = await client.PostAsync("http://127.0.0.1:5000/predict", content);
                
                if (response.IsSuccessStatusCode)
                {
                    var recommendedIds = await response.Content.ReadFromJsonAsync<List<int>>();

                    if (recommendedIds != null && recommendedIds.Any())
                    {
                        var products = await _context.Products
                            .Include(p => p.ProductVariants)
                            .Where(p => recommendedIds.Contains(p.Id))
                            .ToListAsync();

                        var sortedProducts = recommendedIds
                            .Select(id => products.FirstOrDefault(p => p.Id == id))
                            .Where(p => p != null)
                            .ToList();

                        return Ok(sortedProducts);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CẢNH BÁO] AI Tương tự lỗi: {ex.Message}");
            }

            // LƯỚI AN TOÀN
            var fallbackProducts = await _context.Products
                .Include(p => p.ProductVariants)
                .Where(p => p.CategoryId == currentProduct.CategoryId && p.Id != productId)
                .OrderByDescending(p => p.Id)
                .Take(4)
                .ToListAsync();

            return Ok(fallbackProducts);
        }

        // =================================================================
        // 3. SẢN PHẨM BẠN VỪA XEM (Recently Viewed)
        // =================================================================
        [HttpGet("recently-viewed")]
        [Authorize]
        public async Task<IActionResult> GetRecentlyViewed()
        {
            var userIdClaim = User.FindFirst("Id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return Unauthorized(new { message = "Vui lòng đăng nhập!" });

            var recentProductIds = await _context.UserActivities
                .Where(x => x.UserId == userId && x.ActionType == "View")
                .GroupBy(x => x.ProductId)
                .Select(g => new {
                    ProductId = g.Key,
                    LastViewedId = g.Max(x => x.Id) 
                })
                .OrderByDescending(x => x.LastViewedId)
                .Take(10)
                .Select(x => x.ProductId)
                .ToListAsync();

            if (!recentProductIds.Any())
                return Ok(new List<Product>());

            var products = await _context.Products
                .Include(p => p.ProductVariants)
                .Where(p => recentProductIds.Contains(p.Id))
                .ToListAsync();

            var sortedProducts = recentProductIds
                .Select(id => products.FirstOrDefault(p => p.Id == id))
                .Where(p => p != null)
                .ToList();

            return Ok(sortedProducts);
        }
    }
}