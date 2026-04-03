"use client";

import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { useState } from "react";
import { submitContactForm } from "@/services/api";

export default function ContactPage() {
  // 1. Tạo state để hứng dữ liệu người dùng nhập
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    content: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Hàm bắt sự kiện khi người dùng gõ phím
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 3. Hàm gọi API khi ấn Gửi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Gọi API từ file api.ts
      await submitContactForm(formData);
      
      alert("Cảm ơn bạn đã liên hệ! HomeMart đã nhận được tin nhắn và sẽ phản hồi bạn trong thời gian sớm nhất.");
      // Gửi xong thì xóa trắng các ô input
      setFormData({ fullName: "", email: "", subject: "", content: "" });
      
    } catch (error) {
      console.error("Lỗi khi gửi form:", error);
      alert("Ối giời ơi, lỗi rồi! Sếp check lại Backend xem bật chưa nhé.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Liên hệ với chúng tôi</h1>
          <p className="text-lg text-slate-600">
            Bạn có câu hỏi, góp ý hay cần hỗ trợ? Đừng ngần ngại để lại lời nhắn, đội ngũ HomeMart luôn sẵn lòng lắng nghe bạn!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Info (Trái) - Giữ nguyên */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Thông tin liên hệ</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Địa chỉ</h4>
                    <p className="text-slate-600 mt-1">Trường Đại học Công nghiệp Hà Nội, Đường Cầu Diễn, Phường Minh Khai, Bắc Từ Liêm, Hà Nội</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Điện thoại</h4>
                    <p className="text-slate-600 mt-1">1900 1080 <br/> 0123 456 789</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Email</h4>
                    <p className="text-slate-600 mt-1">homemartcskh@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Giờ làm việc</h4>
                    <p className="text-slate-600 mt-1">Thứ 2 - Thứ 6: 08:00 - 20:00 <br/> Thứ 7 - CN: 09:00 - 18:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form (Phải) - Đã gắn State và onChange */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Gửi lời nhắn cho HomeMart</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Họ và tên *</label>
                    <input 
                      type="text" 
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      placeholder="Nhập họ tên của bạn" 
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Email *</label>
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Nhập địa chỉ email" 
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Chủ đề</label>
                  <input 
                    type="text" 
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Bạn cần hỗ trợ về vấn đề gì?" 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nội dung *</label>
                  <textarea 
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Nhập nội dung chi tiết..." 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl px-8 py-3.5 text-base font-semibold text-white transition ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <Send size={20} />
                  {isSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
                </button>

              </form>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}