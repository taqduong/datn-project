using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;
using OfficeOpenXml;
using System.IO.Compression;

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
                .Include(p => p.ProductVariants)
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

                    Variants = p.ProductVariants.Select(v => new ProductVariantDto
                    {
                        Id = v.Id, VariantName = v.VariantName, Color = v.Color,
                        Price = v.Price, Stock = v.Stock, ImageUrl = v.ImageUrl
                    }).ToList(),
                    
                    // BƯỚC 2: CÔNG THỨC ĐẾM LƯỢT BÁN
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
                .Include(p => p.ProductVariants)
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

                    Variants = p.ProductVariants.Select(v => new ProductVariantDto
                    {
                        Id = v.Id, VariantName = v.VariantName, Color = v.Color,
                        Price = v.Price, Stock = v.Stock, ImageUrl = v.ImageUrl
                    }).ToList(),

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

            if (dto.Variants != null && dto.Variants.Any())
            {
                foreach (var v in dto.Variants)
                {
                    _context.ProductVariants.Add(new ProductVariant
                    {
                        ProductId = product.Id, // Nối ID Mẹ vào
                        VariantName = v.VariantName,
                        Color = v.Color,
                        Price = v.Price,
                        Stock = v.Stock,
                        ImageUrl = v.ImageUrl
                    });
                }
                await _context.SaveChangesAsync(); 
            }

            var result = await _context.Products
                .Include(p => p.ProductVariants)
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
                    // THÊM DÒNG NÀY (Vì tạo mới nên mảng rỗng):
                    AdditionalImages = new List<string>(),

                    Variants = p.ProductVariants.Select(v => new ProductVariantDto
                    {
                        Id = v.Id,
                        VariantName = v.VariantName,
                        Color = v.Color,
                        Price = v.Price,
                        Stock = v.Stock,
                        ImageUrl = v.ImageUrl
                    }).ToList(),

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
                // Dọn dẹp: Nếu link có http://... thì chỉ lấy phần /uploads/...
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

            // LOGIC CẬP NHẬT BIẾN THỂ (DÁN VÀO SAU KHI LƯU PRODUCT MẸ)
            if (dto.Variants != null)
            {
                // 1. Xóa sạch biến thể cũ của sản phẩm này để ghi đè cái mới (Cách đơn giản nhất)
                var oldVariants = _context.ProductVariants.Where(v => v.ProductId == id);
                _context.ProductVariants.RemoveRange(oldVariants);

                // 2. Thêm lại danh sách biến thể mới từ React gửi lên
                foreach (var v in dto.Variants)
                {
                    _context.ProductVariants.Add(new ProductVariant
                    {
                        ProductId = id,
                        VariantName = v.VariantName,
                        Color = v.Color,
                        Price = v.Price,
                        Stock = v.Stock,
                        ImageUrl = v.ImageUrl
                    });
                }
                await _context.SaveChangesAsync();
            }

            var result = await _context.Products
                .Include(p => p.ProductVariants)
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

                    Variants = p.ProductVariants.Select(v => new ProductVariantDto
                    {
                        Id = v.Id,
                        VariantName = v.VariantName,
                        Color = v.Color,
                        Price = v.Price,
                        Stock = v.Stock,
                        ImageUrl = v.ImageUrl
                    }).ToList(),

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
        // API MỚI: UPLOAD NHIỀU ẢNH PHỤ
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
                .Include(p => p.ProductVariants)
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

                    Variants = p.ProductVariants.Select(v => new ProductVariantDto
                    {
                        Id = v.Id, VariantName = v.VariantName, Color = v.Color,
                        Price = v.Price, Stock = v.Stock, ImageUrl = v.ImageUrl
                    }).ToList(),
                    
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
                .Include(p => p.ProductVariants)
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

                    Variants = p.ProductVariants.Select(v => new ProductVariantDto
                    {
                        Id = v.Id, VariantName = v.VariantName, Color = v.Color,
                        Price = v.Price, Stock = v.Stock, ImageUrl = v.ImageUrl
                    }).ToList(),

                    SoldCount = p.OrderDetails.Where(od => od.Order != null && od.Order.Status == "Completed").Sum(od => (int?)od.Quantity) ?? 0,
                    TotalReviews = p.Reviews.Count(),
                    AverageRating = p.Reviews.Any() ? Math.Round(p.Reviews.Average(r => (double)r.Rating), 1) : 0
                })
                .ToListAsync();

            return Ok(results);
        }

        // DTO dùng riêng cho vụ Preview
        public class PreviewImportRowDto
        {
            public int Row { get; set; }
            public string Name { get; set; } = string.Empty;
            public string CategoryName { get; set; } = string.Empty;
            public decimal? Price { get; set; }
            public int? Stock { get; set; }
            public int Discount { get; set; }
            public string ImageUrl { get; set; } = string.Empty;
            public string AdditionalImages { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public string Variants { get; set; } = string.Empty;
            public bool IsValid { get; set; }
            public List<string> Errors { get; set; } = new List<string>();
        }

        // =========================================================================
        // BƯỚC 1: API ĐỌC NHÁP EXCEL 
        // =========================================================================
        [HttpPost("preview-import")]
        public async Task<IActionResult> PreviewImport(IFormFile excelFile)
        {
            if (excelFile == null || excelFile.Length == 0) return BadRequest(new { message = "Vui lòng chọn file Excel." });
            if (Path.GetExtension(excelFile.FileName).ToLower() != ".xlsx") return BadRequest(new { message = "Chỉ hỗ trợ file Excel .xlsx." });

            var previewList = new List<PreviewImportRowDto>();

            try
            {
                using (var stream = new MemoryStream())
                {
                    await excelFile.CopyToAsync(stream);
                    stream.Position = 0;

                    using (var package = new ExcelPackage(stream))
                    {
                        var worksheet = package.Workbook.Worksheets.FirstOrDefault();
                        if (worksheet == null || worksheet.Dimension == null) return BadRequest(new { message = "File Excel trống." });

                        int rowCount = worksheet.Dimension.Rows;

                        for (int row = 2; row <= rowCount; row++)
                        {
                            var name = worksheet.Cells[row, 1].Value?.ToString()?.Trim() ?? "";
                            var categoryName = worksheet.Cells[row, 2].Value?.ToString()?.Trim() ?? "";
                            var priceStr = worksheet.Cells[row, 3].Value?.ToString()?.Trim(); // Cho phép null
                            var stockStr = worksheet.Cells[row, 4].Value?.ToString()?.Trim(); // Cho phép null
                            var discountStr = worksheet.Cells[row, 5].Value?.ToString()?.Trim() ?? "0";
                            var coverImg = worksheet.Cells[row, 6].Value?.ToString()?.Trim() ?? "";
                            var additionalImgs = worksheet.Cells[row, 7].Value?.ToString()?.Trim() ?? "";
                            var description = worksheet.Cells[row, 8].Value?.ToString()?.Trim() ?? "";
                            var variantsStr = worksheet.Cells[row, 9].Value?.ToString()?.Trim() ?? "";
                            
                            var previewRow = new PreviewImportRowDto
                            {
                                Row = row,
                                Name = name,
                                CategoryName = categoryName,
                                ImageUrl = coverImg,
                                AdditionalImages = additionalImgs,
                                Description = description,
                                Variants = variantsStr,
                                IsValid = true
                            };

                            if (string.IsNullOrEmpty(name)) 
                            {
                                previewRow.IsValid = false;
                                previewRow.Errors.Add("Tên SP trống");
                            }
                            else if (await _context.Products.AnyAsync(p => p.Name.ToLower() == name.ToLower()))
                            {
                                previewRow.IsValid = false;
                                previewRow.Errors.Add("Tên SP đã tồn tại");
                            }

                            if (string.IsNullOrEmpty(categoryName))
                            {
                                previewRow.IsValid = false;
                                previewRow.Errors.Add("Danh mục trống");
                            }
                            else if (!await _context.Categories.AnyAsync(c => c.Name.ToLower() == categoryName.ToLower()))
                            {
                                previewRow.IsValid = false;
                                previewRow.Errors.Add("Danh mục không tồn tại");
                            }

                            // Xử lý Giá (Trống -> Null | Chữ -> Báo lỗi)
                            if (string.IsNullOrEmpty(priceStr)) previewRow.Price = null;
                            else if (decimal.TryParse(priceStr, out decimal parsedPrice)) previewRow.Price = parsedPrice;
                            else { previewRow.IsValid = false; previewRow.Errors.Add("Giá lỗi"); }

                            // Xử lý Kho (Trống -> Null | Chữ -> Báo lỗi)
                            if (string.IsNullOrEmpty(stockStr)) previewRow.Stock = null;
                            else if (int.TryParse(stockStr, out int parsedStock)) previewRow.Stock = parsedStock;
                            else { previewRow.IsValid = false; previewRow.Errors.Add("Tồn kho lỗi"); }

                            // Xử lý Giảm giá (Giữ nguyên mặc định là 0)
                            if (int.TryParse(discountStr, out int parsedDiscount)) previewRow.Discount = parsedDiscount;
                            else { previewRow.IsValid = false; previewRow.Errors.Add("Giảm giá lỗi"); }

                            previewList.Add(previewRow);
                        }
                    }
                }
                return Ok(previewList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi đọc file: {ex.Message}" });
            }
        }

        // =========================================================================
        //  BƯỚC 2: API IMPORT THẬT (LƯU DB & XẢ NÉN ZIP)
        // =========================================================================
        [HttpPost("import")]
        public async Task<IActionResult> ImportProducts(IFormFile excelFile, IFormFile? zipFile)
        {
            if (excelFile == null || excelFile.Length == 0) return BadRequest(new { message = "Vui lòng chọn file Excel." });
            if (Path.GetExtension(excelFile.FileName).ToLower() != ".xlsx") return BadRequest(new { message = "Chỉ hỗ trợ file Excel .xlsx." });

            var uploadPath = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "products");
            if (!Directory.Exists(uploadPath)) Directory.CreateDirectory(uploadPath);

            // 1. NẾU CÓ FILE ZIP -> GIẢI NÉN TOÀN BỘ ẢNH VÀO FOLDER
            if (zipFile != null && zipFile.Length > 0)
            {
                if (Path.GetExtension(zipFile.FileName).ToLower() != ".zip") return BadRequest(new { message = "Chỉ hỗ trợ file ảnh nén .zip." });
                
                using (var stream = zipFile.OpenReadStream())
                using (var archive = new ZipArchive(stream))
                {
                    foreach (var entry in archive.Entries)
                    {
                        if (string.IsNullOrEmpty(entry.Name)) continue; // Bỏ qua folder rỗng
                        var destinationPath = Path.Combine(uploadPath, entry.Name);
                        entry.ExtractToFile(destinationPath, true); // Extract và ghi đè nếu trùng tên
                    }
                }
            }

            var importedProducts = new List<Product>();
            int successCount = 0, skipCount = 0;

            try
            {
                using (var stream = new MemoryStream())
                {
                    await excelFile.CopyToAsync(stream);
                    stream.Position = 0;

                    using (var package = new ExcelPackage(stream))
                    {
                        var worksheet = package.Workbook.Worksheets.FirstOrDefault();
                        if (worksheet == null || worksheet.Dimension == null) return BadRequest(new { message = "File Excel trống." });

                        int rowCount = worksheet.Dimension.Rows;

                        for (int row = 2; row <= rowCount; row++)
                        {
                            var name = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                            var categoryName = worksheet.Cells[row, 2].Value?.ToString()?.Trim();
                            var priceStr = worksheet.Cells[row, 3].Value?.ToString()?.Trim();
                            var stockStr = worksheet.Cells[row, 4].Value?.ToString()?.Trim();
                            var discountStr = worksheet.Cells[row, 5].Value?.ToString()?.Trim();
                            var coverImg = worksheet.Cells[row, 6].Value?.ToString()?.Trim();
                            var additionalImgs = worksheet.Cells[row, 7].Value?.ToString()?.Trim();
                            var description = worksheet.Cells[row, 8].Value?.ToString()?.Trim();
                            var variantsStr = worksheet.Cells[row, 9].Value?.ToString()?.Trim();

                            if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(categoryName)) continue;

                            if (await _context.Products.AnyAsync(p => p.Name.ToLower() == name.ToLower()))
                            { skipCount++; continue; }

                            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Name.ToLower() == categoryName.ToLower());
                            if (category == null) { skipCount++; continue; }

                            // Xử lý ô trống: Nếu để trống thì tự hiểu là 0 (Dành cho SP có biến thể)
                            if (string.IsNullOrWhiteSpace(priceStr)) priceStr = "0";
                            if (string.IsNullOrWhiteSpace(stockStr)) stockStr = "0";
                            if (string.IsNullOrWhiteSpace(discountStr)) discountStr = "0";

                            // BẮT LỖI ÉP KIỂU: Nếu cố tình nhập chữ (abc, xyz) thì đá văng luôn!
                            if (!decimal.TryParse(priceStr, out decimal basePrice) ||
                                !int.TryParse(stockStr, out int baseStock) ||
                                !int.TryParse(discountStr, out int discount))
                            {
                                skipCount++; // Tăng biến đếm số dòng bị bỏ qua
                                continue;    // Bỏ qua dòng này, không lưu vào DB
                            }

                            // Xử lý chuỗi biến thể (Tên:Màu:Giá:Kho:TênẢnh)
                            var variants = new List<ProductVariant>();
                            if (!string.IsNullOrEmpty(variantsStr))
                            {
                                var variantParts = variantsStr.Split('|', StringSplitOptions.RemoveEmptyEntries);
                                foreach (var part in variantParts)
                                {
                                    var props = part.Split(':', StringSplitOptions.RemoveEmptyEntries);
                                    if (props.Length >= 4)
                                    {
                                        decimal.TryParse(props[2].Trim(), out decimal vPrice);
                                        int.TryParse(props[3].Trim(), out int vStock);
                                        var vImage = props.Length >= 5 && !string.IsNullOrWhiteSpace(props[4]) 
                                                     ? $"/uploads/products/{props[4].Trim()}" : null;

                                        variants.Add(new ProductVariant
                                        {
                                            VariantName = props[0].Trim(),
                                            Color = props[1].Trim(),
                                            Price = vPrice,
                                            Stock = vStock,
                                            ImageUrl = vImage
                                        });
                                    }
                                }
                            }

                            // Xử lý ảnh phụ
                            var productImages = new List<ProductImage>();
                            if (!string.IsNullOrEmpty(additionalImgs))
                            {
                                var imgNames = additionalImgs.Split(',', StringSplitOptions.RemoveEmptyEntries);
                                foreach (var img in imgNames)
                                {
                                    productImages.Add(new ProductImage { ImageUrl = $"/uploads/products/{img.Trim()}", CreatedAt = DateTime.Now });
                                }
                            }

                            importedProducts.Add(new Product
                            {
                                Name = name,
                                CategoryId = category.Id,
                                Price = variants.Any() ? 0 : basePrice,
                                Stock = variants.Any() ? 0 : baseStock,
                                Discount = discount,
                                ImageUrl = string.IsNullOrWhiteSpace(coverImg) ? null : $"/uploads/products/{coverImg}",
                                Description = description,
                                CreatedAt = DateTime.Now,
                                ProductVariants = variants,
                                ProductImages = productImages
                            });
                            successCount++;
                        }
                    }
                }

                if (importedProducts.Any())
                {
                    await _context.Products.AddRangeAsync(importedProducts);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { message = $"Import hoàn tất! Thêm {successCount} SP. Bỏ qua {skipCount} SP." });
            }
            catch (Exception ex)
            {
                Console.WriteLine("\n🚨 LỖI IMPORT EXCEL SẢN PHẨM: " + ex.ToString());
                return StatusCode(500, new { message = $"Lỗi đọc file: {ex.Message}" });
            }
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
            // THÊM DÒNG NÀY ĐỂ HỨNG MẢNG ẢNH TRẢ VỀ:
            public List<string> AdditionalImages { get; set; } = new List<string>();
            public int SoldCount { get; set; }
            public int TotalReviews { get; set; }
            public double AverageRating { get; set; }
            public List<ProductVariantDto> Variants { get; set; } = new List<ProductVariantDto>();
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
            public List<ProductVariantCreateDto> Variants { get; set; } = new List<ProductVariantCreateDto>();
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
            public List<ProductVariantCreateDto>? Variants { get; set; }
            public List<string>? RetainedAdditionalImages { get; set; }
        }

        public class ProductVariantDto
        {
            public int Id { get; set; }
            public string VariantName { get; set; } = string.Empty;
            public string? Color { get; set; }
            public decimal Price { get; set; }
            public int Stock { get; set; }
            public string? ImageUrl { get; set; }
        }

        public class ProductVariantCreateDto
        {
            public int? Id { get; set; }
            public string VariantName { get; set; } = string.Empty;
            public string? Color { get; set; }
            public decimal Price { get; set; }
            public int Stock { get; set; }
            public string? ImageUrl { get; set; }
        }
    }
}