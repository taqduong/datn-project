using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;

namespace Controllers
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

        // ================== Tạo mới người dùng ==================
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
                Role = "nhanvien",
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

        // ================== Lấy tất cả user ==================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            var users = await _context.Users.ToListAsync();
            return Ok(users);
        }

        // ================== Lấy user theo ID ==================
        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            return Ok(user);
        }

        // ================== Cập nhật thông tin user ==================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            // Gán lại các giá trị mới (nếu có)
            user.FullName = request.FullName ?? user.FullName;
            user.Email = request.Email ?? user.Email;
            user.Phone = request.Phone ?? user.Phone;
            user.Gender = request.Gender ?? user.Gender;
            user.Age = request.Age ?? user.Age;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật thông tin thành công.",
                user
            });
        }

        // ================== Đăng ký ==================
        [HttpPost("register")]
        public async Task<IActionResult> Register(CreateUserRequest dto)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Username == dto.Username || u.Email == dto.Email);
            if (userExists)
                return BadRequest("Tên người dùng hoặc email đã tồn tại");

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

        // ================== Xóa người dùng ==================
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa người dùng thành công." });
        }
        // ================== Cập nhật Avatar ==================
        [HttpPut("{id}/avatar")]
        public async Task<IActionResult> UpdateAvatar(int id, [FromForm] IFormFile avatarFile)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng." });

            if (avatarFile != null)
            {
                // Lưu ảnh vào thư mục hoặc upload image logic
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "avatars", avatarFile.FileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await avatarFile.CopyToAsync(stream);
                }

                // Cập nhật đường dẫn avatar trong cơ sở dữ liệu
                user.Avatar = "/avatars/" + avatarFile.FileName;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Cập nhật avatar thành công.", avatarUrl = user.Avatar });
            }

            return BadRequest(new { message = "Không có tệp hình ảnh để tải lên." });
        }
    }

    // ================== DTOs ==================
    public class CreateUserRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string FullName { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string? Gender { get; set; }
        public int? Age { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Gender { get; set; }
        public int? Age { get; set; }
    }
}