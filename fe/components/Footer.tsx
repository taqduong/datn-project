import Link from "next/link";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Store } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">

        {/* Về chúng tôi & Logo */}
          <div className="flex flex-col gap-5">
            {/* Logo Group */}
            <div className="flex items-center gap-3 group">
              <div className="flex items-center justify-center w-10 h-10 bg-linear-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/10 transition-transform duration-300 group-hover:scale-110">
                <Store className="text-white" size={22} strokeWidth={2} />
              </div>
              <span className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400 group-hover:from-blue-300 group-hover:to-indigo-300 transition-colors duration-300">
                   HomeMart
              </span>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed">
              Cửa hàng thương mại điện tử bán đồ gia dụng hàng đầu Việt Nam, cung cấp sản phẩm chất lượng với giá tốt nhất cho mọi gia đình.
            </p>

            {/* Social Icons - Làm nhỏ lại và tinh tế hơn */}
            <div className="flex gap-4">
              {[
                { Icon: Facebook, color: "hover:text-blue-500", href: "#" },
                { Icon: Instagram, color: "hover:text-pink-500", href: "#" },
                { Icon: Twitter, color: "hover:text-sky-400", href: "#" },
              ].map((social, index) => (
                <a 
                  key={index} 
                  href={social.href} 
                  className={`w-8 h-8 flex items-center justify-center rounded-full bg-gray-700/50 text-gray-400 ${social.color} hover:bg-white/10 transition-all duration-300`}
                >
                  <social.Icon size={18} />
                </a>
              ))}
            </div>
          </div>    

          {/* Liên kết nhanh */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-blue-400">Liên kết nhanh</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition">
                  Sản phẩm
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition">
                  Về chúng tôi
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          {/* Chính sách */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-blue-400">Chính sách</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="#" className="hover:text-white transition">
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition">
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition">
                  Chính sách vận chuyển
                </Link>
              </li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-blue-400">Liên hệ</h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start gap-2">
                <MapPin size={18} className="mt-1 shrink-0" />
                <span> Đường Cầu Diễn, quận Bắc Từ Liêm, Hà Nội</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={18} />
                <span>1900 1080</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={18} />
                <span>homemartcskh@gmail.com</span>                                             
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} HomeMart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}