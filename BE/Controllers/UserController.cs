using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;
using System.ComponentModel.DataAnnotations;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/users")]
    public class UserController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public UserController(ShopDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult<User>> CreateUser([FromBody] CreateUserRequest request)
        {
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
                return BadRequest("Username đã tồn tại.");

            var user = new User
            {
                Username = request.Username,
                Password = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FullName = request.FullName,
                // Role = "nhanvien",
                Role = !string.IsNullOrWhiteSpace(request.Role) ? request.Role : "nhanvien",
                Phone = request.Phone,
                Email = request.Email,
                IsActive = true,
                Gender = request.Gender,
                Age = request.Age,
                CreatedAt = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });
            return Ok(user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

            user.FullName = request.FullName ?? user.FullName;
            user.Email = request.Email ?? user.Email;
            user.Phone = request.Phone ?? user.Phone;
            user.Gender = request.Gender ?? user.Gender;
            user.Age = request.Age ?? user.Age;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật thông tin thành công.", user });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(CreateUserRequest dto)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Username == dto.Username || u.Email == dto.Email);
            if (userExists) return BadRequest("Tên người dùng hoặc email đã tồn tại");

            var user = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                FullName = dto.FullName,
                Phone = dto.Phone,
                Role = "nguoimua",
                IsActive = true,
                Gender = dto.Gender,
                Age = dto.Age,
                CreatedAt = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đăng ký thành công" });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Xóa người dùng thành công." });
        }

        // ================== Cập nhật Avatar (ĐÃ FIX LỖI SWAGGER) ==================
        [HttpPut("{id}/avatar")]
        [Consumes("multipart/form-data")] // Ép kiểu để Swagger nhận diện file
        public async Task<IActionResult> UpdateAvatar(int id, [FromForm] UserAvatarUploadRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

            var avatarFile = request.AvatarFile;
            if (avatarFile != null && avatarFile.Length > 0)
            {
                var avatarsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "avatars");
                if (!Directory.Exists(avatarsFolder)) Directory.CreateDirectory(avatarsFolder);

                var fileName = Guid.NewGuid().ToString() + Path.GetExtension(avatarFile.FileName);
                var filePath = Path.Combine(avatarsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await avatarFile.CopyToAsync(stream);
                }

                user.Avatar = "/avatars/" + fileName;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Cập nhật avatar thành công.", avatarUrl = user.Avatar });
            }

            return BadRequest(new { message = "Không có tệp hình ảnh để tải lên." });
        }
    }

    // ================== DTOs (FIX WARNING CS8618) ==================
    public class CreateUserRequest
    {
        public string Username { get; set; } = string.Empty;

        // ĐIỀU KIỆN MẬT KHẨU: Tối thiểu 8 ký tự, có hoa, thường, số, ký tự đặc biệt
        [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$", 
            ErrorMessage = "Mật khẩu phải từ 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt.")]
        public string Password { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        // ĐIỀU KIỆN SĐT: 10 số, bắt đầu bằng các đầu số mạng VN (03,05,07,08,09)
        [Required(ErrorMessage = "Vui lòng nhập số điện thoại.")]
        [RegularExpression(@"^(0[3|5|7|8|9])+([0-9]{8})$", 
            ErrorMessage = "Số điện thoại không hợp lệ (phải 10 số và đúng đầu số VN).")]
        public string Phone { get; set; } = string.Empty;

        // ĐIỀU KIỆN EMAIL: Phải đúng chuẩn @domain.com
        [Required(ErrorMessage = "Vui lòng nhập email.")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
        public string Email { get; set; } = string.Empty;

        [RegularExpression("^(male|female)$", ErrorMessage = "Giới tính không hợp lệ (chỉ nhận male hoặc female).")]
        public string? Gender { get; set; }
        public int? Age { get; set; }
        public string? Role { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? FullName { get; set; }

        // Tương tự như CreateUserRequest nhưng không bắt buộc phải nhập lại nếu không muốn đổi
        [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
        public string? Email { get; set; }

        [RegularExpression(@"^(0[3|5|7|8|9])+([0-9]{8})$", 
            ErrorMessage = "Số điện thoại không hợp lệ (phải 10 số và đúng đầu số VN).")]
        public string? Phone { get; set; }

        [RegularExpression("^(male|female)$", ErrorMessage = "Giới tính không hợp lệ (chỉ nhận male hoặc female).")]
        public string? Gender { get; set; }
        public int? Age { get; set; }
    }

    // Class bọc File để Swagger không bị Crash
    public class UserAvatarUploadRequest
    {
        public IFormFile AvatarFile { get; set; } = null!;
    }
}