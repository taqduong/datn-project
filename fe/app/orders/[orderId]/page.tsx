"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchOrderById, cancelOrder, type OrderDto } from "@/services/api"; 
import {
  ArrowLeft, Calendar, Package, MapPin, Phone, 
  User, CheckCircle2, Clock, Truck, XCircle, ShoppingBag, 
  CreditCard, FileText, AlertCircle, Star, Download
} from "lucide-react";

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId?.toString();

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ STATE LƯU ĐƠN HÀNG ĐỂ XUẤT HÓA ĐƠN
  const [printOrder, setPrintOrder] = useState<OrderDto | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ==================== BẮT ĐẦU CODE XUẤT PDF ====================
  const handleExportPDF = async () => {
    if (!order) return;
    setIsExporting(true);
    setPrintOrder(order);
    
    // Đợi DOM render khuôn Hóa đơn ẩn
    setTimeout(async () => {
      try {
        const element = document.getElementById("invoice-template");
        if (!element) throw new Error("Không tìm thấy template hóa đơn");
        
        // Dynamic import để tránh lỗi SSR của Next.js
        const html2pdf = (await import("html2pdf.js")).default;
        
        const opt: any = {
          margin:       0.3, 
          filename:     `HoaDon_HomeMart_${order.orderId}.pdf`,
          image:        { type: 'jpeg', quality: 1 },
          html2canvas:  { scale: 2, useCORS: true, windowWidth: 1050 }, 
          jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' } 
        };

        await html2pdf().set(opt).from(element).save();
      } catch (err) {
        console.error("Lỗi khi xuất PDF:", err);
        alert("Có lỗi xảy ra khi tạo hóa đơn PDF.");
      } finally {
        setPrintOrder(null);
        setIsExporting(false);
      }
    }, 100);
  };
  // ==================== KẾT THÚC CODE XUẤT PDF ====================

  // ✅ Tách hàm load dữ liệu ra để gọi lại sau khi Hủy đơn
  const loadOrderDetail = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await fetchOrderById(orderId);
      setOrder(res.data);
    } catch (err: any) {
      console.error("Lỗi tải chi tiết đơn:", err);
      setError("Không thể tải thông tin đơn hàng hoặc đơn hàng không tồn tại.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  // ✅ Hàm xử lý Hủy đơn hàng
  const handleCancelOrder = async () => {
    if (!window.confirm("Sếp có chắc chắn muốn hủy đơn hàng này không? Quá trình này không thể hoàn tác.")) {
      return;
    }
    
    try {
      if (orderId) {
        await cancelOrder(orderId);
        alert("Hủy đơn hàng thành công! Số lượng đã được hoàn lại vào kho.");
        // Load lại dữ liệu để cập nhật trạng thái "Đã hủy"
        await loadOrderDetail(); 
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Có lỗi xảy ra, không thể hủy đơn.");
      console.error(error);
    }
  };

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return { icon: <CheckCircle2 className="w-5 h-5" />, color: "bg-emerald-100 text-emerald-700 border-emerald-200", text: "Hoàn thành" };
      case 'pending':
      case 'chờ xử lý': // ✅ Map thêm tiếng Việt nếu DB trả về tiếng Việt
        return { icon: <Clock className="w-5 h-5" />, color: "bg-amber-100 text-amber-700 border-amber-200", text: "Chờ xử lý" };
      case 'processing':
        return { icon: <Package className="w-5 h-5" />, color: "bg-blue-100 text-blue-700 border-blue-200", text: "Đang xử lý" };
      case 'shipped':
        return { icon: <Truck className="w-5 h-5" />, color: "bg-purple-100 text-purple-700 border-purple-200", text: "Đang giao hàng" };
      case 'cancelled':
      case 'đã hủy': // ✅ Map thêm tiếng Việt
        return { icon: <XCircle className="w-5 h-5" />, color: "bg-red-100 text-red-700 border-red-200", text: "Đã hủy" };
      default:
        return { icon: <Clock className="w-5 h-5" />, color: "bg-slate-100 text-slate-700 border-slate-200", text: status };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Đang tải thông tin chi tiết...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <AlertCircle className="w-20 h-20 text-red-50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Lỗi truy xuất</h2>
          <p className="text-slate-500 mb-8">{error || "Đơn hàng không tồn tại."}</p>
          <button 
            onClick={() => router.push('/orders')} 
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 transition"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const subTotal = order.totalAmount; 

  // ✅ Đã bổ sung thêm 'đang xử lý' và 'processing' để bắt đúng mọi thể loại ngôn ngữ
  const canCancel = 
    order.status.toLowerCase() === 'pending' ||
    order.status.toLowerCase() === 'processing';

  // LOGIC KIỂM TRA ĐƠN ĐÃ HOÀN THÀNH ĐỂ HIỆN NÚT ĐÁNH GIÁ
  const isCompleted = order.status.toLowerCase() === 'completed';

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header & Back Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium mb-4 transition-colors w-fit"
            >
              <ArrowLeft size={18} /> Quay lại
            </button>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              Chi tiết đơn hàng #{order.orderId}
            </h1>
            <p className="text-slate-500 mt-2 flex items-center gap-2">
              <Calendar size={16} /> Đặt lúc: {new Date(order.orderDate).toLocaleString('vi-VN')}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm ${statusConfig.color}`}>
              {statusConfig.icon} {statusConfig.text}
            </div>
            
            {/* ✅ NÚT XUẤT HÓA ĐƠN PDF */}
            {/* ✅ CHỈ XUẤT HÓA ĐƠN KHI ĐƠN ĐÃ HOÀN THÀNH */}
            {isCompleted && (
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all shadow-sm ${
                  isExporting ? "bg-slate-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                }`}
              >
                {isExporting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                {isExporting ? "Đang xuất..." : "Xuất Hóa Đơn PDF"}
              </button>
            )}
          </div>
        </div>

        {/* Khung chia 2 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CỘT TRÁI: Sản phẩm & Thanh toán */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                <ShoppingBag className="text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">Sản phẩm đã mua ({order.orderDetails.length})</h2>
              </div>
              
              <div className="divide-y divide-slate-100">
                {order.orderDetails.map((item, idx) => (
                  <div key={idx} className="p-6 flex gap-5 hover:bg-slate-50 transition-colors">
                    <img
                      src={item.imageUrl || "/default-image.png"}
                      alt={item.productName}
                      className="w-20 h-20 object-cover rounded-2xl border border-slate-200 bg-white"
                      onError={(e) => (e.currentTarget.src = "/default-image.png")}
                    />
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="font-bold text-slate-900 text-lg mb-1">{item.productName}</h3>
                      <p className="text-sm text-slate-500 mb-2">Mã SP: #{item.productId}</p>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <p className="text-slate-600 font-medium">
                          {formatVND(item.price)} <span className="text-slate-400 mx-2">x</span> {item.quantity}
                        </p>
                        <p className="font-bold text-blue-600 text-lg">
                          {formatVND(item.price * item.quantity)}
                        </p>
                      </div>

                     {/* 🔽 CHÈN NÚT ĐÁNH GIÁ BẮT ĐẦU TỪ ĐÂY 🔽 */}
                      {isCompleted && (
                        <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                          <button
                            onClick={() => router.push(`/review?productId=${item.productId}`)}
                            className="flex items-center gap-2 rounded-xl border border-orange-500 text-orange-600 px-5 py-2.5 text-sm font-semibold hover:bg-orange-50 hover:text-orange-700 transition-colors"
                          >
                            <Star size={16} fill="currentColor" /> Đánh giá
                          </button>
                        </div>
                      )}
                      {/* 🔼 KẾT THÚC CHÈN 🔼 */}

                    </div>
                  </div>
                ))}
              </div>

              {/* Box: Tổng kết tiền */}
              <div className="p-6 bg-slate-50/80 border-t border-slate-100">
                <div className="space-y-3 w-full md:w-1/2 ml-auto">
                  <div className="flex justify-between text-slate-600">
                    <span>Tạm tính</span>
                    <span className="font-medium">{formatVND(subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Phí vận chuyển</span>
                    <span className="font-medium text-emerald-600">Miễn phí</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-800">Tổng cộng</span>
                    <span className="text-3xl font-black text-red-600">{formatVND(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Thông tin khách & Giao hàng */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Box: Thông tin nhận hàng */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                <MapPin className="text-blue-600" /> Thông tin giao hàng
              </h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-slate-500 mb-0.5">Người nhận</p>
                    <p className="font-bold text-slate-900 text-base">{order.fullName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-slate-500 mb-0.5">Số điện thoại</p>
                    <p className="font-semibold text-slate-900">{order.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-slate-500 mb-0.5">Địa chỉ</p>
                    <p className="font-medium text-slate-900 leading-relaxed">
                      {order.address}, {order.ward}, {order.district}, {order.city}
                    </p>
                  </div>
                </div>

                {order.note && (
                  <div className="flex items-start gap-3 bg-amber-50 p-3 rounded-xl border border-amber-100 mt-4">
                    <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">Ghi chú</p>
                      <p className="text-amber-900 italic">{order.note}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Box: Phương thức thanh toán */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                <CreditCard className="text-blue-600" /> Phương thức thanh toán
              </h3>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                  <CreditCard className="text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Thanh toán khi nhận hàng</p>
                  <p className="text-sm text-slate-500">COD (Cash on Delivery)</p>
                </div>
              </div>
            </div>

            {/* ✅ NÚT HỦY ĐƠN ĐẶT Ở ĐÂY (CHỈ HIỂN THỊ KHI ĐƠN CHƯA DUYỆT) */}
            {canCancel && (
              <button 
                onClick={handleCancelOrder}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 font-semibold py-3.5 rounded-2xl shadow-sm transition hover:bg-red-50 hover:border-red-300"
              >
                <XCircle size={18} />
                Hủy đơn hàng này
              </button>
            )}

          </div>
        </div>
      </div>
      {/* ========================================================================= */}
      {/* KHU VỰC ẨN: GIAO DIỆN HÓA ĐƠN A4 (KHỔ NGANG - LANDSCAPE) */}
      {/* ========================================================================= */}
      {printOrder && (
        <div className="fixed top-0 left-0" style={{ opacity: 0, zIndex: -1000, pointerEvents: 'none' }}>
          <div id="invoice-template" style={{ width: '1050px', padding: '40px', backgroundColor: '#ffffff', color: '#1e293b', fontFamily: 'Arial, sans-serif' }}>
            
            {/* Header */}
            <table style={{ width: '100%', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top', width: '60%' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', margin: '0 0 5px 0' }}>HOMEMART</h1>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#64748b' }}>Hệ thống phân phối hàng đầu Việt Nam</p>
                    <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>SĐT: 1900 1080 | Email: support@hmstore.com</p>
                  </td>
                  <td style={{ verticalAlign: 'top', textAlign: 'right', width: '40%' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0', textTransform: 'uppercase' }}>HÓA ĐƠN BÁN HÀNG</h2>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Mã HĐ: <strong style={{ color: '#2563eb' }}>#{printOrder.orderId}</strong></p>
                    <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>Ngày in: {new Date().toLocaleDateString("vi-VN")}</p>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Thông tin khách */}
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 15px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px', textTransform: 'uppercase' }}>Thông tin khách hàng</h3>
              <table style={{ width: '100%', fontSize: '14px', lineHeight: '1.6' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '15%', color: '#64748b', fontWeight: 'bold' }}>Khách hàng:</td>
                    <td style={{ width: '35%', fontWeight: 'bold' }}>{printOrder.fullName}</td>
                    <td style={{ width: '15%', color: '#64748b', fontWeight: 'bold' }}>Ngày đặt:</td>
                    <td style={{ width: '35%' }}>{new Date(printOrder.orderDate).toLocaleString("vi-VN")}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b', fontWeight: 'bold' }}>Điện thoại:</td>
                    <td>{printOrder.phone}</td>
                    <td style={{ color: '#64748b', fontWeight: 'bold' }}>Địa chỉ:</td>
                    <td>{printOrder.address}, {printOrder.ward}, {printOrder.district}, {printOrder.city}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bảng sản phẩm */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#ffffff', fontSize: '14px' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderTopLeftRadius: '8px' }}>STT</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Tên sản phẩm</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>SL</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderTopRightRadius: '8px' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '14px' }}>
                {printOrder.orderDetails.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '15px 12px', color: '#64748b' }}>{index + 1}</td>
                    <td style={{ padding: '15px 12px', fontWeight: 'bold' }}>{item.productName}</td>
                    <td style={{ padding: '15px 12px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '15px 12px', textAlign: 'right', color: '#475569' }}>{formatVND(item.price)}</td>
                    <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>{formatVND(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tổng tiền */}
            <table style={{ width: '100%', marginBottom: '40px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '60%' }}></td>
                  <td style={{ width: '40%' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #cbd5e1', fontSize: '14px' }}>
                        <span style={{ color: '#64748b', fontWeight: 'bold' }}>Tạm tính:</span>
                        <span>{formatVND(printOrder.totalAmount)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                        <span>Tổng thanh toán:</span>
                        <span>{formatVND(printOrder.totalAmount)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Chữ ký (Đã chống cắt chữ và thêm khoảng trống) */}
            <div style={{ marginTop: '100px', pageBreakInside: 'avoid' }}>
              <table style={{ width: '100%', textAlign: 'center' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '50%', verticalAlign: 'top' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0' }}>Khách hàng</p>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '5px 0 0 0', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</p>
                    </td>
                    <td style={{ width: '50%', verticalAlign: 'top' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0' }}>Đại diện HomeMart</p>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '5px 0 0 0', fontStyle: 'italic' }}>(Ký, đóng dấu)</p>
                      <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#2563eb', margin: '80px 0 0 0' }}>Tạ Quý Dương</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}