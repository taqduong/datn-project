using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;
using System.ComponentModel.DataAnnotations;
using BE.Services;
using System.Security.Claims;

namespace BE.Controllers
{
    [ApiController]
    [Route("api/users")]
    public class UserController : ControllerBase
    {
        private readonly ShopDbContext _context;
        private readonly IEmailService _emailService;

        public UserController(ShopDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpPost]
        public async Task<ActionResult<User>> CreateUser([FromBody] CreateUserRequest request)
        {
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });

            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                return BadRequest(new { message = "Email này đã được sử dụng cho một tài khoản khác." });

            // CHẶN TRÙNG SĐT 
            if (await _context.Users.AnyAsync(u => u.Phone == request.Phone))
                return BadRequest(new { message = "Số điện thoại này đã được sử dụng cho một tài khoản khác." });

            string newRole = !string.IsNullOrWhiteSpace(request.Role) ? request.Role.ToLower() : "nguoimua";
            
            // 1. Phân quyền: Chỉ Admin mới được tạo Admin/Nhân viên
            if (newRole == "admin" || newRole switch { "nhanvien" => true, _ => false })
            {
                var currentUserRole = User.FindFirstValue(ClaimTypes.Role);
                if (currentUserRole == null || currentUserRole.ToLower() != "admin")
                {
                    return StatusCode(403, new { message = "Lỗi bảo mật: Chỉ Quản trị viên mới được phép tạo tài khoản nội bộ!" });
                }
            }

            // 2. Chuẩn bị Token kích hoạt (Dùng chung logic với Quên mật khẩu)
            var activationToken = Guid.NewGuid().ToString("N");
            
            // 3. Xử lý mật khẩu: 
            // Nếu là Người mua: Tự sinh mật khẩu ngẫu nhiên (Admin không biết)
            // Nếu là Nhân sự: Dùng mật khẩu Admin nhập vào form
            string rawPassword = (newRole == "nguoimua") 
                ? Guid.NewGuid().ToString("P").Substring(0, 12) // Tạo chuỗi ngẫu nhiên 12 ký tự
                : request.Password;

            var user = new User
            {
                Username = request.Username,
                Password = BCrypt.Net.BCrypt.HashPassword(rawPassword),
                FullName = request.FullName,
                Role = newRole,
                Phone = request.Phone,
                Email = request.Email,
                IsActive = true,
                Gender = request.Gender,
                Age = request.Age,
                CreatedAt = DateTime.Now,
                // Gán token để khách hàng có thể dùng link Reset Password đặt lại mật khẩu
                ResetPasswordToken = (newRole == "nguoimua") ? activationToken : null,
                ResetTokenExpires = (newRole == "nguoimua") ? DateTime.Now.AddDays(1) : null
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 4. Gửi Email kích hoạt cho Khách hàng
            if (newRole == "nguoimua")
            {
                var activationLink = $"http://localhost:3000/reset-password?token={activationToken}";
                var emailBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px;'>
                        <h2 style='color: #2563eb; text-align: center;'>Chào mừng bạn đến với HomeMart!</h2>
                        <p>Xin chào <strong>{user.FullName}</strong>,</p>
                        <p>Tài khoản của bạn đã được quản trị viên khởi tạo trên hệ thống của chúng tôi.</p>
                        <p>Để bắt đầu mua sắm, vui lòng nhấn vào nút bên dưới để <strong>thiết lập mật khẩu</strong> cho tài khoản của mình:</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{activationLink}' style='background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Thiết lập mật khẩu ngay</a>
                        </div>
                        <p style='font-size: 13px; color: #6b7280;'>Tên đăng nhập của bạn là: <strong>{user.Username}</strong></p>
                        <p style='font-size: 12px; color: #ef4444;'>* Liên kết này có hiệu lực trong vòng 24 giờ.</p>
                        <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;' />
                        <p style='font-size: 11px; color: #9ca3af; text-align: center;'>Đây là email tự động, vui lòng không trả lời.</p>
                    </div>";

                try {
                    await _emailService.SendEmailAsync(user.Email, "Kích hoạt tài khoản HomeMart", emailBody);
                } catch (Exception ex) {
                    // Log lỗi nếu cần: Console.WriteLine(ex.Message);
                }
            }

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

            var currentUserRole = User.FindFirstValue(ClaimTypes.Role)?.ToLower();
            if (currentUserRole == "nhanvien" && user.Role.ToLower() != "nguoimua")
            {
                return StatusCode(403, new { message = "Lỗi bảo mật: Nhân viên không có quyền chỉnh sửa tài khoản nội bộ!" });
            }

            // THÊM MỚI: Kiểm tra xem Email muốn đổi sang đã có ai dùng chưa
            if (!string.IsNullOrEmpty(request.Email) && request.Email != user.Email)
            {
                if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                    return BadRequest(new { message = "Email này đã được sử dụng bởi người khác." });
            }

            if (!string.IsNullOrEmpty(request.Phone) && request.Phone != user.Phone)
            {
                if (await _context.Users.AnyAsync(u => u.Phone == request.Phone))
                    return BadRequest(new { message = "Số điện thoại này đã được sử dụng bởi người khác." });
            }

            user.FullName = request.FullName ?? user.FullName;
            user.Email = request.Email ?? user.Email;
            user.Phone = request.Phone ?? user.Phone;
            user.Gender = request.Gender ?? user.Gender;
            user.Age = request.Age ?? user.Age;

            // LOGIC PHÂN QUYỀN MỚI: Khóa chặn 2 chiều
            if (!string.IsNullOrWhiteSpace(request.Role)) 
            {
                // 1. Chặn thăng cấp Khách hàng
                if (user.Role.ToLower() == "nguoimua" && request.Role.ToLower() != "nguoimua")
                {
                    return BadRequest(new { message = "Lỗi bảo mật: Không thể thăng cấp Khách hàng thành Nhân sự." });
                }
                // 2. Chặn giáng cấp Nhân sự xuống Khách hàng
                else if (user.Role.ToLower() != "nguoimua" && request.Role.ToLower() == "nguoimua")
                {
                    return BadRequest(new { message = "Lỗi bảo mật: Không thể chuyển Nhân sự xuống làm Khách hàng." });
                }
                // 3. Hợp lệ (Nội bộ đổi cho nhau, hoặc Khách hàng giữ nguyên)
                else
                {
                    user.Role = request.Role;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật thông tin thành công.", user });
        }

        // API Khóa / Mở khóa tài khoản
        [HttpPut("{id}/toggle-status")]
        public async Task<IActionResult> ToggleUserStatus(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

            var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (int.TryParse(currentUserIdStr, out int currentUserId) && currentUserId == id)
            {
                return BadRequest(new { message = "Bạn không thể tự khóa tài khoản của chính mình!" });
            }

            // ====================================================
            // THÊM ĐOẠN NÀY: CHẶN NHÂN VIÊN KHÓA ADMIN / NHÂN VIÊN
            // ====================================================
            var currentUserRole = User.FindFirstValue(ClaimTypes.Role)?.ToLower();
            if (currentUserRole == "nhanvien" && user.Role.ToLower() != "nguoimua")
            {
                return StatusCode(403, new { message = "Lỗi bảo mật: Nhân viên chỉ được phép khóa tài khoản Khách hàng!" });
            }

            user.IsActive = !user.IsActive;
            await _context.SaveChangesAsync();

            string statusMsg = user.IsActive ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.";
            return Ok(new { message = statusMsg, isActive = user.IsActive });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(CreateUserRequest dto)
        {
            // THÊM MỚI: Tách riêng báo lỗi Username và báo lỗi Email (dành cho khách hàng)
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });

            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "Email này đã được sử dụng cho một tài khoản khác." });

            if (await _context.Users.AnyAsync(u => u.Phone == dto.Phone))
                return BadRequest(new { message = "Số điện thoại này đã được sử dụng cho một tài khoản khác." });

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

        // ================== Cập nhật Avatar ==================
        [HttpPut("{id}/avatar")]
        [Consumes("multipart/form-data")] // Ép kiểu để Swagger nhận diện file
        public async Task<IActionResult> UpdateAvatar(int id, [FromForm] UserAvatarUploadRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

            var avatarFile = request.AvatarFile;
            if (avatarFile != null && avatarFile.Length > 0)
            {
                // Đã trả lại đường dẫn lưu vật lý về thư mục cũ: wwwroot/avatars
                var avatarsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "avatars");
                if (!Directory.Exists(avatarsFolder)) Directory.CreateDirectory(avatarsFolder);

                var fileName = Guid.NewGuid().ToString() + Path.GetExtension(avatarFile.FileName);
                var filePath = Path.Combine(avatarsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await avatarFile.CopyToAsync(stream);
                }

                // Sửa định dạng lưu DB: Bỏ http://localhost, chỉ giữ lại /avatars/...
                user.Avatar = "/avatars/" + fileName;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Cập nhật avatar thành công.", avatarUrl = user.Avatar });
            }

            return BadRequest(new { message = "Không có tệp hình ảnh để tải lên." });
        }

        // API Yêu cầu Quên mật khẩu
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            // 1. Tìm người dùng theo email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            
            if (user == null)
            {
                // Báo lỗi thẳng tay để Frontend bắt được và hiển thị Toast đỏ
                return NotFound(new { message = "Email này chưa được đăng ký trong hệ thống." });
            }

            // 2. Tạo mã Token ngẫu nhiên (dạng chuỗi 32 ký tự)
            var token = Guid.NewGuid().ToString("N");

            // 3. Lưu Token và thời hạn (15 phút) vào cơ sở dữ liệu
            user.ResetPasswordToken = token;
            user.ResetTokenExpires = DateTime.Now.AddMinutes(15);
            await _context.SaveChangesAsync();

            // 4. Tạo đường dẫn đặt lại mật khẩu (Frontend URL)
            var resetLink = $"http://localhost:3000/reset-password?token={token}";

            // 5. Chuẩn bị nội dung Email bằng HTML
            var emailBody = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;'>
                    <h2 style='color: #2563eb; text-align: center;'>Đặt lại mật khẩu tài khoản</h2>
                    <p>Xin chào <strong>{user.FullName}</strong>,</p>
                    <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại HomeMart.</p>
                    <p>Vui lòng nhấn vào nút bên dưới để thiết lập mật khẩu mới (Liên kết này có hiệu lực trong vòng <strong>15 phút</strong>):</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{resetLink}' style='background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Đặt lại mật khẩu</a>
                    </div>
                    <p style='color: #ef4444; font-size: 14px;'>* Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
                    <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;' />
                    <p style='font-size: 12px; color: #6b7280; text-align: center;'>Đây là email tự động, vui lòng không trả lời.</p>
                </div>";

            // 6. Thực thi gửi Email
            try
            {
                await _emailService.SendEmailAsync(user.Email, "Yêu cầu đặt lại mật khẩu - HomeMart", emailBody);
                return Ok(new { message = "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi gửi email.", error = ex.Message });
            }
        }

        // API Thực hiện đặt lại mật khẩu mới
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            // 1. Tìm người dùng có token khớp và thời hạn còn hiệu lực
            var user = await _context.Users.FirstOrDefaultAsync(u => 
                u.ResetPasswordToken == request.Token && 
                u.ResetTokenExpires > DateTime.Now);

            if (user == null)
            {
                return BadRequest(new { message = "Liên kết đã hết hạn hoặc mã xác thực không hợp lệ." });
            }

            // 2. Mã hóa mật khẩu mới bằng BCrypt và cập nhật
            user.Password = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            // 3. Xóa token sau khi sử dụng để đảm bảo an toàn (Token chỉ dùng 1 lần)
            user.ResetPasswordToken = null;
            user.ResetTokenExpires = null;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
        }
    }

    // ================== DTOs (FIX WARNING CS8618) ==================
    public class CreateUserRequest
    {
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$", 
            ErrorMessage = "Mật khẩu phải từ 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt.")]
        public string Password { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập số điện thoại.")]
        [RegularExpression(@"^(0[3|5|7|8|9])+([0-9]{8})$", 
            ErrorMessage = "Số điện thoại không hợp lệ (phải 10 số và đúng đầu số VN).")]
        public string Phone { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập email.")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
        public string Email { get; set; } = string.Empty;

        [RegularExpression("^(male|female)$", ErrorMessage = "Giới tính không hợp lệ (chỉ nhận male hoặc female).")]
        public string? Gender { get; set; }

        [Range(1, 120, ErrorMessage = "Tuổi phải nằm trong khoảng từ 1 đến 120.")]
        public int? Age { get; set; }
        public string? Role { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? FullName { get; set; }

        [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
        public string? Email { get; set; }

        [RegularExpression(@"^(0[3|5|7|8|9])+([0-9]{8})$", 
            ErrorMessage = "Số điện thoại không hợp lệ (phải 10 số và đúng đầu số VN).")]
        public string? Phone { get; set; }

        [RegularExpression("^(male|female)$", ErrorMessage = "Giới tính không hợp lệ (chỉ nhận male hoặc female).")]
        public string? Gender { get; set; }
        
        [Range(1, 120, ErrorMessage = "Tuổi phải nằm trong khoảng từ 1 đến 120.")]
        public int? Age { get; set; }
        // Bổ sung trường Role để C# nhận được data khi Admin đổi quyền
        public string? Role { get; set; }
    }

    public class UserAvatarUploadRequest
    {
        public IFormFile AvatarFile { get; set; } = null!;
    }

    public class ForgotPasswordRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập email.")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
        public string Email { get; set; } = null!;
    }

    public class ResetPasswordRequest
    {
        [Required]
        public string Token { get; set; } = null!;

        [Required(ErrorMessage = "Vui lòng nhập mật khẩu mới.")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$", 
            ErrorMessage = "Mật khẩu mới phải từ 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt.")]
        public string NewPassword { get; set; } = null!;
    }
}