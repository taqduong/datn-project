using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;

namespace BE.Controllers
{
    [Route("api/products")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly ShopDbContext _context;
        private readonly IWebHostEnvironment _env;

        public ProductController(ShopDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // GET: api/products
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts()
        {
            var result = await _context.Products
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Price = p.Price,
                    Discount = p.Discount,
                    Description = p.Description,
                    ImageUrl = p.ImageUrl,
                    Stock = p.Stock,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category != null ? p.Category.Name : null,
                    CreatedAt = p.CreatedAt,
                    AdditionalImages = p.ProductImages.Select(pi => pi.ImageUrl).ToList(),
                    
                    // ✅ BƯỚC 2: CÔNG THỨC ĐẾM LƯỢT BÁN
                    SoldCount = p.OrderDetails
                        .Where(od => od.Order != null && od.Order.Status == "Completed")
                        .Sum(od => (int?)od.Quantity) ?? 0,
                    TotalReviews = p.Reviews.Count(),
                    AverageRating = p.Reviews.Any() ? Math.Round(p.Reviews.Average(r => (double)r.Rating), 1) : 0
                    
                })
                .ToListAsync();

            return Ok(result);
        }

        // GET: api/products/id
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var dto = await _context.Products
                .Where(p => p.Id == id)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Discount = p.Discount,
                    Price = p.Price,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    Stock = p.Stock,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt,
                    AdditionalImages = p.ProductImages.Select(pi => pi.ImageUrl).ToList(),
                    SoldCount = p.OrderDetails.Where(od => od.Order != null && od.Order.Status == "Completed").Sum(od => (int?)od.Quantity) ?? 0,
                    TotalReviews = p.Reviews.Count(),
                    AverageRating = p.Reviews.Any() ? Math.Round(p.Reviews.Average(r => (double)r.Rating), 1) : 0
                    
                })
                .FirstOrDefaultAsync();

            return dto is null ? NotFound() : Ok(dto);
        }

        // POST: api/products
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
            if (!categoryExists)
                return BadRequest(new { message = "CategoryId không hợp lệ." });

            var product = new Product
            {
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                Stock = dto.Stock,
                CategoryId = dto.CategoryId,
                Discount = dto.Discount,
                ImageUrl = dto.ImageUrl,
                CreatedAt = DateTime.Now
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            var result = await _context.Products
                .Where(p => p.Id == product.Id)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    Discount = p.Discount,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    Stock = p.Stock,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt,
                    // ✅ THÊM DÒNG NÀY (Vì tạo mới nên mảng rỗng):
                    AdditionalImages = new List<string>(),
                    SoldCount = 0,
                    TotalReviews = 0,
                    AverageRating = 0
                })
                .FirstAsync();

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        // PUT: api/products/id
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            // 🚀 Bổ sung Include(p => p.ProductImages) để lấy cả ảnh phụ
            var product = await _context.Products
                .Include(p => p.ProductImages) 
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null)
                return NotFound();

            if (dto.CategoryId.HasValue && dto.CategoryId.Value != product.CategoryId)
            {
                var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId.Value);
                if (!categoryExists)
                    return BadRequest(new { message = "CategoryId không hợp lệ." });

                product.CategoryId = dto.CategoryId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                product.Name = dto.Name;

            if (dto.Description != null)
                product.Description = dto.Description;

            if (dto.Price.HasValue)
                product.Price = dto.Price.Value;

            if (dto.Stock.HasValue)
                product.Stock = dto.Stock.Value;

            if (dto.Discount.HasValue)
                product.Discount = dto.Discount.Value;

            if (!string.IsNullOrWhiteSpace(dto.ImageUrl))
            {
                // ✅ Dọn dẹp: Nếu link có http://... thì chỉ lấy phần /uploads/...
                product.ImageUrl = dto.ImageUrl.Contains("/uploads/") 
                                ? "/uploads/" + dto.ImageUrl.Split("/uploads/")[1] 
                                : dto.ImageUrl;
            }

            // =========================================================
            // 🚀 LOGIC XÓA ẢNH PHỤ CŨ (NẾU REACT GỬI YÊU CẦU XÓA)
            // =========================================================
            if (dto.RetainedAdditionalImages != null)
            {
                // Lọc ra những ảnh ĐANG CÓ TRONG DB nhưng KHÔNG CÓ trong danh sách React gửi lên (tức là bị xóa)
                var imagesToDelete = product.ProductImages
                    .Where(img => !dto.RetainedAdditionalImages.Contains(img.ImageUrl))
                    .ToList();

                if (imagesToDelete.Any())
                {
                    _context.ProductImages.RemoveRange(imagesToDelete);
                }
            }

            await _context.SaveChangesAsync();

            var result = await _context.Products
                .Where(p => p.Id == id)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    Discount = p.Discount,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    Stock = p.Stock,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt,
                    AdditionalImages = p.ProductImages.Select(pi => pi.ImageUrl).ToList(),
                    SoldCount = p.OrderDetails.Where(od => od.Order != null && od.Order.Status == "Completed").Sum(od => (int?)od.Quantity) ?? 0,
                    TotalReviews = p.Reviews.Count(),
                    AverageRating = p.Reviews.Any() ? Math.Round(p.Reviews.Average(r => (double)r.Rating), 1) : 0
                })
                .AsNoTracking()
                .FirstAsync();

            return Ok(result);
        }

        // DELETE: api/products/id
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id);
            if (product == null)
                return NotFound();

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa sản phẩm thành công." });
        }

        // =========================================================================
        // ✅ API MỚI: UPLOAD NHIỀU ẢNH PHỤ
        // =========================================================================
        [HttpPost("{id}/upload-images")]
        public async Task<IActionResult> UploadImages(int id, [FromForm] List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
                return BadRequest(new { message = "Không có file nào được chọn." });

            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound(new { message = "Sản phẩm không tồn tại." });

            var uploadPath = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "products");
            if (!Directory.Exists(uploadPath)) Directory.CreateDirectory(uploadPath);

            var uploadedUrls = new List<string>();

            foreach (var file in files)
            {
                if (file.Length > 0)
                {
                    var extension = Path.GetExtension(file.FileName).ToLower();
                    if (!new[] { ".jpg", ".jpeg", ".png", ".webp" }.Contains(extension)) continue;

                    var fileName = $"{Guid.NewGuid()}{extension}";
                    var filePath = Path.Combine(uploadPath, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }

                    var dbUrl = $"/uploads/products/{fileName}"; 
                    uploadedUrls.Add(dbUrl);

                    _context.ProductImages.Add(new ProductImage
                    {
                        ProductId = id, ImageUrl = dbUrl, CreatedAt = DateTime.Now
                    });
                }
            }
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Tải lên thành công {uploadedUrls.Count} ảnh.", urls = uploadedUrls });
        }

        // GET: api/products/categories/id
        [HttpGet("categories/{id}")]
        public async Task<IActionResult> GetProductsByCategory(int id)
        {
            var products = await _context.Products
                .Include(p => p.ProductImages)
                .Where(p => p.CategoryId == id)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    Discount = p.Discount,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    Stock = p.Stock,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt,
                    AdditionalImages = p.ProductImages.Select(pi => pi.ImageUrl).ToList(),
                    SoldCount = p.OrderDetails.Where(od => od.Order != null && od.Order.Status == "Completed").Sum(od => (int?)od.Quantity) ?? 0,
                    TotalReviews = p.Reviews.Count(),
                    AverageRating = p.Reviews.Any() ? Math.Round(p.Reviews.Average(r => (double)r.Rating), 1) : 0
                })
                .ToListAsync();

            return Ok(products);
        }

        // GET: api/products/search?keyword=ao
        [HttpGet("search")]
        public async Task<IActionResult> Search(string keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword))
                return BadRequest(new { message = "Từ khóa không hợp lệ." });

            var results = await _context.Products
                .Include(p => p.ProductImages)
                .Where(p => p.Name.Contains(keyword))
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    Discount = p.Discount,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    Stock = p.Stock,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt,
                    AdditionalImages = p.ProductImages.Select(pi => pi.ImageUrl).ToList(),
                    SoldCount = p.OrderDetails.Where(od => od.Order != null && od.Order.Status == "Completed").Sum(od => (int?)od.Quantity) ?? 0,
                    TotalReviews = p.Reviews.Count(),
                    AverageRating = p.Reviews.Any() ? Math.Round(p.Reviews.Average(r => (double)r.Rating), 1) : 0
                })
                .ToListAsync();

            return Ok(results);
        }

        public class ProductDto
        {
            public int Id { get; set; }
            public required string Name { get; set; }
            public decimal Price { get; set; }
            public string? Description { get; set; }
            public string? ImageUrl { get; set; }
            public int Stock { get; set; }
            public int? Discount { get; set; }
            public decimal PriceAfterDiscount { get; set; }
            public int CategoryId { get; set; }
            public string? CategoryName { get; set; }
            public DateTime CreatedAt { get; set; }
            // ✅ THÊM DÒNG NÀY ĐỂ HỨNG MẢNG ẢNH TRẢ VỀ:
            public List<string> AdditionalImages { get; set; } = new List<string>();
            public int SoldCount { get; set; }
            public int TotalReviews { get; set; }
            public double AverageRating { get; set; }
        }

        public class ProductCreateDto
        {
            public required string Name { get; set; }
            public decimal Price { get; set; }
            public string? Description { get; set; }
            public string? ImageUrl { get; set; }
            public int Stock { get; set; }
            public int? Discount { get; set; }
            public int CategoryId { get; set; }
        }

        public class ProductUpdateDto
        {
            public string? Name { get; set; }
            public decimal? Price { get; set; }
            public string? Description { get; set; }
            public string? ImageUrl { get; set; }
            public int? Stock { get; set; }
            public int? Discount { get; set; }
            public int? CategoryId { get; set; }
            public List<string>? RetainedAdditionalImages { get; set; }
        }
    }
}