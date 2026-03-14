using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BE.Data;
using BE.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly ShopDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(ShopDbContext context, IConfiguration config)
        {
            _config = config;
            _context = context;
        }

        // API đăng nhập
        [HttpPost("login")]
        public async Task<ActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
                return Unauthorized(new { title = "Sai tên đăng nhập hoặc mật khẩu" });

            var token = GenerateJwtToken(user);

            return Ok(new
            {
                token,
                user = new
                {
                    user.Id,
                    user.Username,
                    user.FullName,
                    user.Role,
                    user.Email,
                    user.Phone,
                    user.IsActive
                }
            });
        }

        // API Đổi mật khẩu
        [Authorize]
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            // 1. Lấy User ID từ Token (Ánh xạ từ JwtRegisteredClaimNames.Sub)
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int userId))
            {
                return Unauthorized(new { success = false, message = "Không xác thực được người dùng." });
            }

            // 2. Tìm người dùng trong DB
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy người dùng." });
            }

            // 3. Kiểm tra mật khẩu cũ
            if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.Password))
            {
                return BadRequest(new { success = false, message = "Mật khẩu cũ không chính xác." });
            }

            // 4. Mã hóa mật khẩu mới và lưu lại
            user.Password = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Đổi mật khẩu thành công!" });
        }

        // Phương thức tạo token
        private string GenerateJwtToken(User user)
        {
            var jwtKey = _config["Jwt:Key"]
                ?? throw new InvalidOperationException("JWT key chưa được cấu hình");

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddMinutes(
                    Convert.ToDouble(_config["Jwt:ExpiryInMinutes"])
                ),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class ChangePasswordRequest
    {
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}