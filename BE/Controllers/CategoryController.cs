using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;
using OfficeOpenXml;
using System.IO.Compression;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/categories")]
    public class CategoryController : ControllerBase
    {
        private readonly ShopDbContext _context;
        private readonly IWebHostEnvironment _env;

        public CategoryController(ShopDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // =========================================================================
        // DTO PHỤC VỤ XEM TRƯỚC (PREVIEW)
        // =========================================================================
        public class PreviewCategoryRowDto
        {
            public int Row { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public string ImageFileName { get; set; } = string.Empty;
            public bool IsValid { get; set; }
            public List<string> Errors { get; set; } = new List<string>();
        }

        // =========================================================================
        // BƯỚC 1: API ĐỌC NHÁP EXCEL (PREVIEW LỖI)
        // =========================================================================
        [HttpPost("preview-import")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> PreviewImport([FromForm] CategoryImportRequest request)
        {
            var excelFile = request.excelFile;

            if (excelFile == null || excelFile.Length == 0) return BadRequest(new { message = "Vui lòng chọn file Excel hợp lệ." });
            if (Path.GetExtension(excelFile.FileName).ToLower() != ".xlsx") return BadRequest(new { message = "Chỉ hỗ trợ file Excel .xlsx." });

            var previewList = new List<PreviewCategoryRowDto>();

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
                            var description = worksheet.Cells[row, 2].Value?.ToString()?.Trim() ?? "";
                            var imageFileName = worksheet.Cells[row, 3].Value?.ToString()?.Trim() ?? "";

                            var previewRow = new PreviewCategoryRowDto
                            {
                                Row = row,
                                Name = name,
                                Description = description,
                                ImageFileName = imageFileName, 
                                IsValid = true
                            };

                            if (string.IsNullOrEmpty(name))
                            {
                                previewRow.IsValid = false;
                                previewRow.Errors.Add("Tên danh mục trống");
                            }
                            else if (await _context.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower()))
                            {
                                previewRow.IsValid = false;
                                previewRow.Errors.Add("Tên danh mục đã tồn tại");
                            }

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
        // BƯỚC 2: API IMPORT THẬT (LƯU DB VÀ GIỮ NGUYÊN TÊN ẢNH)
        // =========================================================================
        [HttpPost("import")]
        [Consumes("multipart/form-data")] 
        public async Task<IActionResult> ImportCategories([FromForm] CategoryImportRequest request)
        {
            var excelFile = request.excelFile;
            var zipFile = request.zipFile; 

            if (excelFile == null || excelFile.Length == 0) return BadRequest(new { message = "Vui lòng chọn file Excel." });

            var importedCategories = new List<Category>();
            int successCount = 0, skipCount = 0;
            var extractedImages = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            try
            {
                if (zipFile != null && zipFile.Length > 0)
                {
                    if (Path.GetExtension(zipFile.FileName).ToLower() != ".zip")
                        return BadRequest(new { message = "Chỉ hỗ trợ file nén định dạng .zip" });

                    var webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    var uploadPath = Path.Combine(webRootPath, "uploads", "categories");
                    if (!Directory.Exists(uploadPath)) Directory.CreateDirectory(uploadPath);

                    using var archive = new System.IO.Compression.ZipArchive(zipFile.OpenReadStream());
                    foreach (var entry in archive.Entries)
                    {
                        if (string.IsNullOrEmpty(entry.Name)) continue; 
                        var ext = Path.GetExtension(entry.Name).ToLower();
                        if (new[] { ".jpg", ".jpeg", ".png", ".webp" }.Contains(ext))
                        {
                            // SỬA Ở ĐÂY: Dùng nguyên xi tên file từ Excel/Zip (giống ProductController)
                            var destinationPath = Path.Combine(uploadPath, entry.Name);
                            entry.ExtractToFile(destinationPath, true); // Ghi đè nếu đã tồn tại
                            
                            extractedImages[entry.Name] = $"/uploads/categories/{entry.Name}"; 
                        }
                    }
                }

                using (var stream = new MemoryStream())
                {
                    await excelFile.CopyToAsync(stream);
                    stream.Position = 0;
                    using (var package = new ExcelPackage(stream))
                    {
                        var worksheet = package.Workbook.Worksheets.FirstOrDefault();
                        if (worksheet == null || worksheet.Dimension == null) return BadRequest(new { message = "File trống." });

                        int rowCount = worksheet.Dimension.Rows;
                        for (int row = 2; row <= rowCount; row++)
                        {
                            var name = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                            var description = worksheet.Cells[row, 2].Value?.ToString()?.Trim();
                            var imageFileName = worksheet.Cells[row, 3].Value?.ToString()?.Trim(); 

                            if (string.IsNullOrEmpty(name)) { skipCount++; continue; }
                            
                            var isExist = await _context.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower());
                            if (isExist) { skipCount++; continue; }

                            string? finalImageUrl = null;
                            if (!string.IsNullOrEmpty(imageFileName) && extractedImages.TryGetValue(imageFileName, out var savedUrl))
                            {
                                finalImageUrl = savedUrl;
                            }

                            importedCategories.Add(new Category {
                                Name = name,
                                Description = description,
                                ImageUrl = finalImageUrl, 
                                CreatedAt = DateTime.Now
                            });
                            successCount++;
                        }
                    }
                }

                if (importedCategories.Any())
                {
                    await _context.Categories.AddRangeAsync(importedCategories);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { message = $"Import hoàn tất! Thêm {successCount} danh mục. Bỏ qua {skipCount} dòng lỗi hoặc đã tồn tại." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi hệ thống: {ex.Message}" });
            }
        }


        [HttpGet]
        public async Task<ActionResult<IEnumerable<Category>>> GetAllCategories() => await _context.Categories.ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<Category>> GetCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            return category == null ? NotFound() : Ok(category);
        }

        [HttpPost("create-manual")]
        public async Task<ActionResult<Category>> CreateCategory([FromBody] CategoryRequest request)
        {
            var category = new Category { 
                Name = request.Name, 
                Description = request.Description, 
                ImageUrl = request.ImageUrl, 
                CreatedAt = DateTime.Now 
            };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] CategoryRequest request)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound();
            
            category.Name = request.Name;
            category.Description = request.Description;

            // DỌN RÁC KHI SỬA ẢNH: Nếu đổi ảnh mới thì xóa ảnh cũ trên ổ cứng đi
            if (category.ImageUrl != request.ImageUrl)
            {
                if (!string.IsNullOrEmpty(category.ImageUrl))
                {
                    var oldFileName = Path.GetFileName(category.ImageUrl);
                    var oldFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "categories", oldFileName);
                    if (System.IO.File.Exists(oldFilePath)) System.IO.File.Delete(oldFilePath);
                }
                category.ImageUrl = request.ImageUrl; 
            }
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật thành công." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.Include(c => c.Products).FirstOrDefaultAsync(c => c.Id == id);
            if (category == null) return NotFound();
            if (category.Products.Any()) return BadRequest(new { message = "Danh mục đang có sản phẩm, không thể xóa!" });

            // SỬA Ở ĐÂY: DỌN RÁC Ổ CỨNG KHI XÓA DANH MỤC
            if (!string.IsNullOrEmpty(category.ImageUrl))
            {
                var fileName = Path.GetFileName(category.ImageUrl);
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "categories", fileName);
                if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
            }

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Xóa thành công." });
        }
    }

    public class CategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class CategoryImportRequest
    {
        public IFormFile excelFile { get; set; } = null!;
        public IFormFile? zipFile { get; set; }
    }
}