🛒 HomeMart - Hệ thống E-Commerce tích hợp AI
Đồ án tốt nghiệp Đại học Sinh viên thực hiện: Tạ Quý Dương Đề tài: Xây dựng website thương mại điện tử bán đồ gia dụng HOMEMART tích hợp AI hỗ trợ người dùng.
Giới thiệu tổng quan
HomeMart là một hệ thống thương mại điện tử chuyên cung cấp các thiết bị gia dụng và nội thất nhà thông minh. Điểm nổi bật của dự án là việc ứng dụng kiến trúc Microservices để nhúng Trí tuệ nhân tạo (AI) vào hệ thống, bao gồm hệ thống Gợi ý sản phẩm cá nhân hóa (Recommendation System) và Trợ lý ảo AI (Chatbot) hỗ trợ chốt đơn 24/7.
Các tính năng nổi bật
Phân hệ Khách hàng
•	Tìm kiếm, xem chi tiết và mua sắm các thiết bị gia dụng.
•	Quản lý giỏ hàng, áp dụng mã ưu đãi (Voucher).
•	Thanh toán trực tuyến an toàn qua VNPAY hoặc thanh toán khi nhận hàng (COD).
•	Theo dõi lộ trình đơn hàng và đánh giá sản phẩm.
•	Live Chat: Trò chuyện trực tiếp với nhân viên CSKH theo thời gian thực.
Phân hệ Quản trị (Admin/Nhân viên)
•	Dashboard: Thống kê doanh thu, tỷ lệ chuyển đổi, và xếp hạng sản phẩm bán chạy bằng biểu đồ trực quan.
•	Quản lý danh mục, sản phẩm, và biến thể (màu sắc, kích thước).
•	Kiểm duyệt đơn hàng, in phiếu giao hàng và xử lý hoàn tiền VNPAY.
•	Thiết lập các chiến dịch Khuyến mãi (Voucher) và quản lý người dùng.
Phân hệ AI & Smart Features
•	AI Chatbot: Tích hợp LLM (Google Gemini API & Groq API Fallback) giúp tư vấn nội thất, giải đáp thắc mắc và hỗ trợ tự động lên đơn hàng thông qua hội thoại tự nhiên.
•	Recommendation System: Phân tích trọng số hành vi người dùng (View, AddToCart, Purchase) bằng Python & Scikit-learn để tự động gợi ý sản phẩm phù hợp ở trang chủ.
Công nghệ sử dụng
Dự án được chia làm 3 phân hệ chính tương ứng với 3 thư mục trong mã nguồn:
•	Frontend (/fe): Next.js (React), Tailwind CSS, Recharts (Vẽ biểu đồ).
•	Backend (/BE): C#, ASP.NET Core Web API, Entity Framework Core, SQL Server, SignalR (WebSockets cho Real-time Chat).
•	AI Service (/ai_service): Python, Flask, Scikit-learn, Google Gemini API, Groq API.
📂 Cấu trúc thư mục
Plaintext
📦 datn-project
 ┣ 📂 BE              # Chứa mã nguồn Backend (ASP.NET Core Web API)
 ┣ 📂 fe              # Chứa mã nguồn Frontend (Next.js App Router)
 ┣ 📂 ai_service      # Chứa mã nguồn Microservice AI (Python Flask)
 ┗ 📜 README.md
⚙️ Hướng dẫn cài đặt và chạy dự án (Local)
1. Khởi chạy Database & Backend (C#)
Bash
cd BE
# Cập nhật cơ sở dữ liệu SQL Server
dotnet ef database update
# Chạy server Backend (Cổng mặc định: 5xxx/7xxx)
dotnet run
2. Khởi chạy Frontend (Next.js)
Bash
cd fe
# Cài đặt các gói thư viện
npm install
# Chạy giao diện người dùng (Cổng mặc định: 3000)
npm run dev
3. Khởi chạy AI Service (Python)
Bash
cd ai_service
# Cài đặt các thư viện cần thiết
pip install -r requirements.txt
# Chạy server AI (Cổng mặc định: 5000)
python app.py

