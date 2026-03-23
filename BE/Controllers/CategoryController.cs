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

        // Tạo mới danh mục
        [HttpPost]
        public async Task<ActionResult<Category>> CreateCategory([FromBody] CategoryRequest request)
        {
            try
            {
                var category = new Category
                {
                    Name = request.Name,
                    Description = request.Description,
                    CreatedAt = DateTime.Now
                };

                _context.Categories.Add(category);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Lấy danh mục theo id
        [HttpGet("{id}")]
        public async Task<ActionResult<Category>> GetCategory(int id)
        {
            var category = await _context.Categories
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
                return NotFound(new { message = "Không tìm thấy danh mục." });

            return Ok(category);
        }

        // Lấy toàn bộ danh mục
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Category>>> GetAllCategories()
        {
            var categories = await _context.Categories.ToListAsync();
            return Ok(categories);
        }

        // Cập nhật danh mục
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] CategoryRequest request)
        {
            var category = await _context.Categories
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
                return NotFound(new { message = "Không tìm thấy danh mục." });

            category.Name = request.Name;
            category.Description = request.Description;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật Category thành công."
            });
        }

        // Xóa danh mục
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories
                .Include(c => c.Products)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
                return NotFound(new { message = "Không tìm thấy danh mục." });

            if (category.Products.Any())
            {
                return BadRequest(new
                {
                    message = "Không thể xóa danh mục vì vẫn còn sản phẩm thuộc danh mục này."
                });
            }

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa Category thành công."
            });
        }

        // API IMPORT EXCEL (THÊM HÀNG LOẠT DANH MỤC)
        [HttpPost("import")]
        public async Task<IActionResult> ImportCategories([FromForm] IFormFile file)
        {
            // 1. Kiểm tra file có rỗng hay sai định dạng không
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn file hợp lệ." });

            var extension = Path.GetExtension(file.FileName).ToLower();
            if (extension != ".xlsx")
                return BadRequest(new { message = "Chỉ hỗ trợ định dạng file Excel (.xlsx)." });

            var importedCategories = new List<Category>();
            int successCount = 0;
            int skipCount = 0;

            try
            {
                // Cấu hình bản quyền miễn phí cho EPPlus
                // ExcelPackage.LicenseContext = LicenseContext.NonCommercial; 

                using (var stream = new MemoryStream())
                {
                    await file.CopyToAsync(stream);
                    stream.Position = 0;
                    using (var package = new ExcelPackage(stream))
                    {
                        var worksheet = package.Workbook.Worksheets.FirstOrDefault();
                        if (worksheet == null) 
                            return BadRequest(new { message = "File Excel không có trang tính nào (sheet)." });

                        if (worksheet.Dimension == null)
                            return BadRequest(new { message = "File Excel trống, không có dữ liệu." });

                        // Đếm tổng số dòng
                        int rowCount = worksheet.Dimension.Rows;

                        // 2. Chạy vòng lặp từ dòng 2 (Bỏ qua dòng 1 là Header Tên Cột)
                        for (int row = 2; row <= rowCount; row++)
                        {
                            var name = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                            var description = worksheet.Cells[row, 2].Value?.ToString()?.Trim();

                            // Bỏ qua nếu cột Name bị trống
                            if (string.IsNullOrEmpty(name)) continue;

                            // 3. (Tuỳ chọn) Kiểm tra xem Tên danh mục này đã tồn tại trong DB chưa
                            var isExist = await _context.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower());
                            if (isExist)
                            {
                                skipCount++; // Bỏ qua không import để tránh trùng lặp
                                continue;
                            }

                            // 4. Đưa vào danh sách chờ thêm mới
                            importedCategories.Add(new Category
                            {
                                Name = name,
                                Description = description,
                                CreatedAt = DateTime.Now
                            });
                            successCount++;
                        }
                    }
                }

                // 5. Lưu 1 cục vào Database cho nhanh
                if (importedCategories.Any())
                {
                    await _context.Categories.AddRangeAsync(importedCategories);
                    await _context.SaveChangesAsync();
                }

                return Ok(new { 
                    message = $"Import hoàn tất! Thêm thành công {successCount} danh mục. Bỏ qua {skipCount} danh mục đã tồn tại." 
                });
            }
            catch (Exception ex)
            {
                // C# phải in lỗi ra màn hình đen (Terminal)
                Console.WriteLine("\n🚨🚨🚨 LỖI IMPORT EXCEL SẾP ƠI: " + ex.ToString() + "\n");
                
                return StatusCode(500, new { message = $"Đã xảy ra lỗi khi đọc file: {ex.Message}" });
            }
        }
    }

    public class CategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}