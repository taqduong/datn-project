using Microsoft.AspNetCore.Mvc;
using BE.Data; 
namespace BE.Controllers;

[ApiController]
[Route("api/files")]
public class FileController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ShopDbContext _context; // Thêm biến _context

 
    public FileController(IWebHostEnvironment env, ShopDbContext context)  // Thêm _context vào constructor
    {
        _env = env;
        _context = context;
    }

    // ================== Upload Avatar ==================
        [HttpPost("upload-avatar/{userId}")]
        public async Task<IActionResult> UploadAvatar(int userId, [FromForm] IFormFile avatarFile)
        {
            if (avatarFile == null || avatarFile.Length == 0)
                return BadRequest(new { message = "Không có tệp ảnh nào được tải lên." });

            // Lấy đường dẫn thư mục lưu trữ hình ảnh
            var webRootPath = _env.WebRootPath;
            if (string.IsNullOrEmpty(webRootPath))
            {
                webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            }

            var avatarPath = Path.Combine(webRootPath, "avatars");

            if (!Directory.Exists(avatarPath))
            {
                Directory.CreateDirectory(avatarPath);
            }

            // Kiểm tra định dạng ảnh hợp lệ
            var extension = Path.GetExtension(avatarFile.FileName).ToLower();
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { message = "Định dạng tệp không hợp lệ. Chỉ hỗ trợ .jpg, .jpeg, .png và .webp." });

            // Đặt tên file avatar với GUID để tránh trùng
            var fileName = $"{userId}_{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(avatarPath, fileName);

            // Lưu tệp ảnh vào thư mục
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await avatarFile.CopyToAsync(stream);
            }

            // Trả về URL ảnh đã tải lên
            var avatarUrl = $"{Request.Scheme}://{Request.Host}/avatars/{fileName}";

            // Cập nhật thông tin avatar cho người dùng (giả sử bạn có phương thức updateUser trong controller của User)
            var user = await _context.Users.FindAsync(userId);  // Cập nhật đường dẫn avatar trong DB
            if (user != null)
            {
                user.Avatar = avatarUrl;
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Cập nhật avatar thành công", avatarUrl });
        }

    // ================== Upload Images ==================
    [HttpPost("upload")]
    public async Task<IActionResult> UploadImages([FromForm] List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
            return BadRequest(new { message = "Không có tệp nào được tải lên." });

        var webRootPath = _env.WebRootPath;

        if (string.IsNullOrEmpty(webRootPath))
        {
            webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        var uploadPath = Path.Combine(webRootPath, "uploads");

        if (!Directory.Exists(uploadPath))
        {
            Directory.CreateDirectory(uploadPath);
        }

        var uploadedFiles = new List<string>();

        foreach (var file in files)
        {
            if (file == null || file.Length == 0)
                continue;

            var extension = Path.GetExtension(file.FileName).ToLower();

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { message = $"File {file.FileName} không đúng định dạng ảnh." });

            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var fileUrl = $"{Request.Scheme}://{Request.Host}/uploads/{fileName}";
            uploadedFiles.Add(fileUrl);
        }

        return Ok(new { imageUrls = uploadedFiles });
    }
}