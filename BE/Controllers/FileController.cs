using Microsoft.AspNetCore.Mvc;
using BE.Data;

namespace BE.Controllers;

[ApiController]
[Route("api/files")]
public class FileController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ShopDbContext _context;

    public FileController(IWebHostEnvironment env, ShopDbContext context)
    {
        _env = env;
        _context = context;
    }

    [HttpPost("upload-avatar/{userId}")]
    [Consumes("multipart/form-data")] // Ép Swagger hiểu đây là form upload
    public async Task<IActionResult> UploadAvatar(int userId, [FromForm] AvatarUploadRequest request)
    {
        var avatarFile = request.AvatarFile;
        if (avatarFile == null || avatarFile.Length == 0)
            return BadRequest(new { message = "Không có tệp ảnh nào được tải lên." });

        var webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var avatarPath = Path.Combine(webRootPath, "avatars");

        if (!Directory.Exists(avatarPath)) Directory.CreateDirectory(avatarPath);

        var extension = Path.GetExtension(avatarFile.FileName).ToLower();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowedExtensions.Contains(extension))
            return BadRequest(new { message = "Định dạng tệp không hợp lệ." });

        var fileName = $"{userId}_{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(avatarPath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await avatarFile.CopyToAsync(stream);
        }

        var avatarUrl = $"{Request.Scheme}://{Request.Host}/avatars/{fileName}";

        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            user.Avatar = avatarUrl;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Cập nhật avatar thành công", avatarUrl });
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")] // Ép Swagger hiểu đây là form upload
    public async Task<IActionResult> UploadImages([FromForm] MultipleFilesUploadRequest request)
    {
        var files = request.Files;
        if (files == null || files.Count == 0)
            return BadRequest(new { message = "Không có tệp nào được tải lên." });

        var webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadPath = Path.Combine(webRootPath, "uploads");

        if (!Directory.Exists(uploadPath)) Directory.CreateDirectory(uploadPath);

        var uploadedFiles = new List<string>();

        foreach (var file in files)
        {
            if (file == null || file.Length == 0) continue;

            var extension = Path.GetExtension(file.FileName).ToLower();
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { message = $"File {file.FileName} không đúng định dạng." });

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

// ==========================================================
// ĐẶT CÁC CLASS REQUEST Ở NGOÀI CONTROLLER ĐỂ SWAGGER KO LỖI
// ==========================================================
public class AvatarUploadRequest
{
    public IFormFile AvatarFile { get; set; } = null!;
}

public class MultipleFilesUploadRequest
{
    // Dùng List thay vì Collection giúp Swagger tạo ra nút "Add Item" dễ hơn
    public List<IFormFile> Files { get; set; } = null!;
}