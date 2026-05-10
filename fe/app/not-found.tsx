import Link from "next/link";
import { Home, ShoppingBag, Map } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center animate-in fade-in zoom-in duration-500">
        
        {/* Layout chính: Giao diện trang lỗi 404 (Not Found) */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <h1 className="text-[150px] font-black text-slate-200 leading-none select-none">
              404
            </h1>
            {/* Khu vực hiển thị Animation và Icon trạng thái trung tâm */}
            <Map className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 text-blue-600 animate-bounce" />
          </div>
        </div>

        {/* Tiêu đề & Lời nhắn */}
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Ối giời ơi! Lạc đường rồi! 🛸
        </h2>
        <p className="text-slate-500 mb-10 max-w-md mx-auto text-lg">
          Trang bạn đang tìm kiếm không tồn tại, đã bị đổi tên hoặc tạm thời bị ẩn. 
          Hãy kiểm tra lại đường dẫn nhé!
        </p>

        {/* 2 Nút điều hướng */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 w-full sm:w-auto"
          >
            <Home size={20} />
            Về Trang chủ
          </Link>
          
          <Link
            href="/products"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all active:scale-95 w-full sm:w-auto"
          >
            <ShoppingBag size={20} />
            Tiếp tục mua sắm
          </Link>
        </div>

      </div>
    </div>
  );
}