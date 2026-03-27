using System.Net;
using System.Net.Mail;

namespace BE.Services
{
    // Interface định nghĩa dịch vụ gửi email
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
    }

    // Lớp triển khai dịch vụ gửi email sử dụng SMTP
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            // Lấy thông tin cấu hình từ appsettings.json
            var emailSettings = _config.GetSection("EmailSettings");
            var senderEmail = emailSettings["SenderEmail"]!;
            var senderPassword = emailSettings["SenderPassword"]!;
            var senderName = emailSettings["SenderName"];
            var smtpServer = emailSettings["SmtpServer"]!;
            var smtpPort = int.Parse(emailSettings["SmtpPort"]!);

            // Khởi tạo SmtpClient với thông tin xác thực
            using var client = new SmtpClient(smtpServer, smtpPort)
            {
                Credentials = new NetworkCredential(senderEmail, senderPassword),
                EnableSsl = true,
            };

            // Khởi tạo nội dung email
            var mailMessage = new MailMessage
            {
                From = new MailAddress(senderEmail, senderName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true, // Cho phép nội dung HTML
            };
            mailMessage.To.Add(toEmail);

            // Thực thi gửi email bất đồng bộ
            await client.SendMailAsync(mailMessage);
        }
    }
}