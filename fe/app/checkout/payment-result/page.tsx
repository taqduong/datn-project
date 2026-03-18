"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle2, XCircle, Home, ShoppingBag } from "lucide-react";
import Link from "next/link";

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Lấy các tham số VNPAY trả về trên URL
  const vnp_ResponseCode = searchParams.get("vnp_ResponseCode");
  const vnp_Amount = searchParams.get("vnp_Amount");
  const vnp_OrderInfo = searchParams.get("vnp_OrderInfo");
  const vnp_TransactionNo = searchParams.get("vnp_TransactionNo");

  const [isProcessing, setIsProcessing] = useState(true);

  // Mã '00' của VNPAY nghĩa là giao dịch thành công
  const isSuccess = vnp_ResponseCode === "00";

  useEffect(() => {
    // Giả lập thời gian xử lý dữ liệu 1.5 giây cho nó ngầu
    const timer = setTimeout(() => {
      setIsProcessing(false);
      
      // 💡 CHỖ NÀY DÀNH CHO BƯỚC TIẾP THEO:
      // Nếu isSuccess == true, mình sẽ gọi API gọi BE update trạng thái đơn hàng thành "Đã thanh toán"
      
    }, 1500);
    return () => clearTimeout(timer);
  }, [isSuccess]);

  const formatVND = (val: string | null) => {
    if (!val) return "0 ₫";
    // VNPAY nhân 100 số tiền, nên lúc hiển thị mình phải chia 100 lại
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val) / 100);
  };

  if (isProcessing) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Đang xác nhận kết quả giao dịch từ VNPAY...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="bg-white max-w-lg w-full rounded-3xl shadow-xl overflow-hidden animate-in zoom-in duration-300">
        {/* Header Section */}
        <div className={`p-8 text-center ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`}>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {isSuccess ? (
              <CheckCircle2 className="w-10 h-10 text-white" />
            ) : (
              <XCircle className="w-10 h-10 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isSuccess ? "Thanh toán thành công!" : "Giao dịch thất bại"}
          </h2>
          <p className="text-white/80">
            {isSuccess 
              ? "Cảm ơn bạn đã mua sắm tại HomeMart." 
              : "Có lỗi xảy ra trong quá trình thanh toán hoặc bạn đã hủy giao dịch."}
          </p>
        </div>

        {/* Details Section */}
        <div className="p-8">
          <h3 className="text-slate-800 font-bold mb-4 border-b pb-2">Chi tiết giao dịch</h3>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Mã giao dịch VNPAY:</span>
              <span className="font-semibold text-slate-800">{vnp_TransactionNo || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Nội dung:</span>
              <span className="font-semibold text-slate-800 text-right max-w-[60%] truncate">{vnp_OrderInfo || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-4 border-t border-slate-100">
              <span className="text-slate-500">Số tiền thanh toán:</span>
              <span className="text-xl font-bold text-blue-600">{formatVND(vnp_Amount)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => router.push('/orders')}
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} /> Xem lịch sử đơn hàng
            </button>
            <Link 
              href="/"
              className="w-full bg-white text-slate-600 border border-slate-200 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <Home size={18} /> Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Next.js yêu cầu bọc useSearchParams trong Suspense
export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}