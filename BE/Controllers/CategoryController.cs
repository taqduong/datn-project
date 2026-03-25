using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;
using OfficeOpenXml;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/categories")]
    public class CategoryController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public CategoryController(ShopDbContext context)
        {
            _context = context;
        }

        // =========================================================================
        // DTO PHỤC VỤ XEM TRƯỚC (PREVIEW)
        // =========================================================================
        public class PreviewCategoryRowDto
        {
            public int Row { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public bool IsValid { get; set; }
            public List<string> Errors { get; set; } = new List<string>();
        }

        // =========================================================================
        // BƯỚC 1: API ĐỌC NHÁP EXCEL (PREVIEW LỖI)
        // =========================================================================
        [HttpPost("preview-import")]
        public async Task<IActionResult> PreviewImport(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { message = "Vui lòng chọn file hợp lệ." });
            if (Path.GetExtension(file.FileName).ToLower() != ".xlsx") return BadRequest(new { message = "Chỉ hỗ trợ file Excel .xlsx." });

            var previewList = new List<PreviewCategoryRowDto>();

            try
            {
                using (var stream = new MemoryStream())
                {
                    await file.CopyToAsync(stream);
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

                            var previewRow = new PreviewCategoryRowDto
                            {
                                Row = row,
                                Name = name,
                                Description = description,
                                IsValid = true
                            };

                            // Check lỗi rỗng
                            if (string.IsNullOrEmpty(name))
                            {
                                previewRow.IsValid = false;
                                previewRow.Errors.Add("Tên danh mục trống");
                            }
                            // Check trùng tên trong Database
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
        // BƯỚC 2: API IMPORT THẬT (CHẶN DÒNG LỖI)
        // =========================================================================
        [HttpPost("import")]
        public async Task<IActionResult> ImportCategories(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { message = "Vui lòng chọn file." });

            var importedCategories = new List<Category>();
            int successCount = 0, skipCount = 0;

            try
            {
                using (var stream = new MemoryStream())
                {
                    await file.CopyToAsync(stream);
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

                            // Bảo vệ Database: Tên trống hoặc trùng thì SKIP
                            if (string.IsNullOrEmpty(name)) { skipCount++; continue; }
                            
                            var isExist = await _context.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower());
                            if (isExist) { skipCount++; continue; }

                            importedCategories.Add(new Category {
                                Name = name,
                                Description = description,
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

        // --- CÁC API CRUD CƠ BẢN GIỮ NGUYÊN CHO SẾP ---

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Category>>> GetAllCategories() => await _context.Categories.ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<Category>> GetCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            return category == null ? NotFound() : Ok(category);
        }

        [HttpPost("create-manual")] // Đổi tên để tránh trùng route với CreateCategory cũ
        public async Task<ActionResult<Category>> CreateCategory([FromBody] CategoryRequest request)
        {
            var category = new Category { Name = request.Name, Description = request.Description, CreatedAt = DateTime.Now };
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
            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật thành công." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.Include(c => c.Products).FirstOrDefaultAsync(c => c.Id == id);
            if (category == null) return NotFound();
            if (category.Products.Any()) return BadRequest(new { message = "Danh mục đang có sản phẩm, không thể xóa!" });
            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Xóa thành công." });
        }
    }

    public class CategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}