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
    [Consumes("multipart/form-data")] 
    public async Task<IActionResult> UploadAvatar(int userId, [FromForm] AvatarUploadRequest request)
    {
        // 1. Xác thực sự tồn tại của người dùng trước khi tiến hành xử lý tệp
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

        var avatarFile = request.AvatarFile;
        if (avatarFile == null || avatarFile.Length == 0)
            return BadRequest(new { message = "Không có tệp ảnh nào được tải lên." });

        var webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var avatarPath = Path.Combine(webRootPath, "avatars");

        if (!Directory.Exists(avatarPath)) Directory.CreateDirectory(avatarPath);

        // ==========================================
        // ĐÃ THÊM: LOGIC XÓA AVATAR CŨ CHO GỌN
        // ==========================================
        if (!string.IsNullOrEmpty(user.Avatar))
        {
            // Trích xuất tên tệp (Filename) từ URL hoặc đường dẫn tương đối
            var oldFileName = user.Avatar.Split('/').LastOrDefault();
            
            if (!string.IsNullOrEmpty(oldFileName))
            {
                var oldFilePath = Path.Combine(avatarPath, oldFileName);
                // Xóa tệp vật lý khỏi hệ thống lưu trữ nếu tồn tại
                if (System.IO.File.Exists(oldFilePath))
                {
                    System.IO.File.Delete(oldFilePath);
                }
            }
        }

        // ==========================================
        // TIẾP TỤC LƯU AVATAR MỚI
        // ==========================================
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

        // Lưu đường dẫn gọn gàng vào DB
        var avatarUrl = $"/avatars/{fileName}";
        user.Avatar = avatarUrl;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Cập nhật avatar thành công", avatarUrl });
    }

    [HttpPost("upload/{folder}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImages(string folder, [FromForm] MultipleFilesUploadRequest request)
    {
        // BẢO MẬT: Chỉ cho phép tên thư mục gồm chữ cái, số, gạch ngang, gạch dưới.
        // Chặn đứng hoàn toàn việc hacker gõ "../" để phá Server.
        if (!System.Text.RegularExpressions.Regex.IsMatch(folder, "^[a-zA-Z0-9_-]+$"))
        {
            return BadRequest(new { message = "Tên thư mục không hợp lệ." });
        }

        var files = request.Files;
        if (files == null || files.Count == 0)
            return BadRequest(new { message = "Không có tệp nào được tải lên." });

        var webRootPath = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        
        // Động hóa thư mục lưu bằng biến 'folder'
        var uploadPath = Path.Combine(webRootPath, "uploads", folder.ToLower());

        if (!Directory.Exists(uploadPath)) Directory.CreateDirectory(uploadPath);

        var uploadedFiles = new List<string>();

        foreach (var file in files)
        {
            if (file == null || file.Length == 0) continue;

            var extension = Path.GetExtension(file.FileName).ToLower();
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { message = $"File {file.FileName} không đúng định dạng." });

            var originalName = Path.GetFileNameWithoutExtension(file.FileName);
            var fileName = $"{originalName}{extension}";
            var filePath = Path.Combine(uploadPath, fileName);

            int count = 1;
            while (System.IO.File.Exists(filePath))
            {
                fileName = $"{originalName}_{count}{extension}";
                filePath = Path.Combine(uploadPath, fileName);
                count++;
            }

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Động hóa URL trả về bằng biến 'folder'
            var fileUrl = $"/uploads/{folder.ToLower()}/{fileName}";
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