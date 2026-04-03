"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchUserOrders, resolveImgUrl, type OrderDto } from "@/services/api";
import { 
  Clock, CheckCircle2, XCircle, ShoppingBag, ArrowRight, Truck, Package, 
  Search, Calendar, PackageOpen, AlertCircle
} from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const router = useRouter();

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const res = await fetchUserOrders();
        setOrders(res.data);
      } catch (err: any) {
        console.error("Lỗi khi tải đơn hàng:", err);
        setError("Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const getStepIndex = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'pending') return 0;
    if (s === 'processing') return 1;
    if (s === 'shipping') return 2;
    if (s === 'completed') return 3;
    return -1;
  };

  // Helper xử lý trạng thái hiển thị
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { icon: <CheckCircle2 className="w-5 h-5" />, color: "bg-emerald-100 text-emerald-700 border-emerald-200", text: "Đã giao" };
      case 'pending':
        return { icon: <Clock className="w-5 h-5" />, color: "bg-amber-100 text-amber-700 border-amber-200", text: "Chờ xác nhận" };
      case 'processing':
        return { icon: <Package className="w-5 h-5" />, color: "bg-blue-100 text-blue-700 border-blue-200", text: "Chờ lấy hàng" };
      case 'shipping':
        return { icon: <Truck className="w-5 h-5" />, color: "bg-purple-100 text-purple-700 border-purple-200", text: "Đang giao" };
      case 'cancelled':
        return { icon: <XCircle className="w-5 h-5" />, color: "bg-red-100 text-red-700 border-red-200", text: "Đã hủy" };
      default:
        return { icon: <Clock className="w-5 h-5" />, color: "bg-slate-100 text-slate-700 border-slate-200", text: status };
    }
  };

  // Logic lọc đơn hàng
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderId.toString().includes(searchTerm) ||
      order.orderDetails.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Đếm thống kê
  const stats = {
    all: orders.length,
    pending: orders.filter(o => o.status.toLowerCase() === 'pending').length,
    processing: orders.filter(o => o.status.toLowerCase() === 'processing').length,
    shipping: orders.filter(o => o.status.toLowerCase() === 'shipping').length,
    completed: orders.filter(o => o.status.toLowerCase() === 'completed').length,
    cancelled: orders.filter(o => o.status.toLowerCase() === 'cancelled').length,
  };

  // Màn hình loading (Skeleton)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-5xl mx-auto px-4 animate-pulse">
          <div className="h-10 bg-slate-200 rounded-xl w-64 mb-8"></div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl"></div>)}
          </div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-slate-200 rounded-3xl"></div>)}
          </div>
        </div>
      </div>
    );
  }

  // Màn hình lỗi
  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Đã xảy ra sự cố</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition">
            Thử lại ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-200">
                <ShoppingBag className="w-6 h-6" />
              </div>
              Đơn hàng của tôi
            </h1>
            <p className="text-slate-500 mt-2">Theo dõi và quản lý lịch sử mua sắm của bạn.</p>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Tất cả', count: stats.all, color: 'text-slate-900', bg: 'bg-white' },
            { label: 'Chờ xác nhận', count: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Chờ lấy hàng', count: stats.processing, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Đang giao', count: stats.shipping, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Đã giao', count: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Đã hủy', count: stats.cancelled, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((stat, idx) => (
            <div key={idx} className={`${stat.bg} rounded-2xl p-4 border border-slate-100 shadow-sm transition-transform hover:-translate-y-1`}>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.count}</div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Bộ lọc & Tìm kiếm */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn hoặc tên sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="processing">Chờ lấy hàng</option>
            <option value="shipping">Đang giao</option>
            <option value="completed">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        {/* Danh sách đơn hàng */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-16 text-center">
            <PackageOpen className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Chưa tìm thấy đơn hàng</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all' 
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái xem sao.' 
                : 'Bạn chưa có đơn hàng nào. Khám phá các sản phẩm nổi bật ngay!'}
            </p>
            <button onClick={() => router.push('/products')} className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg transition-all active:scale-95">
              Bắt đầu mua sắm
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              
              return (
                <div key={order.orderId} className="bg-white rounded-3xl shadow-sm hover:shadow-md border border-slate-200 overflow-hidden transition-all duration-300 group">
                  
                  {/* Header Đơn hàng */}
                  <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      
                      <div className="flex items-center gap-2">
                        {/* TAG 1: TRẠNG THÁI VẬN CHUYỂN */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-sm ${statusConfig.color}`}>
                          {statusConfig.icon} 
                          {order.status.toLowerCase() === 'pending' ? "Chờ xác nhận" : statusConfig.text}
                        </div>

                        {/* TAG 2: ĐÃ THANH TOÁN (Màu xanh) */}
                        {order.paymentMethod === 'VNPay_Paid' && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-sm bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> Đã thanh toán
                          </div>
                        )}

                        {/* TAG 3: CHƯA THANH TOÁN (Màu cam nhấp nháy - Dành cho đơn VNPay xịt) */}
                        {order.paymentMethod?.toLowerCase() === 'vnpay' && order.status.toLowerCase() === 'pending' && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-sm bg-red-50 text-red-700 border-red-200 shadow-sm">
                            <AlertCircle className="w-4 h-4" /> Chưa thanh toán
                          </div>
                        )}

                        {/* TAG 4: ĐANG CHỜ HOÀN TIỀN */}
                        {order.status.toLowerCase() === 'cancelled' && order.refundStatus?.toLowerCase() === 'pending' && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-sm bg-orange-50 text-orange-600 border-orange-200 shadow-sm">
                            <svg className="h-4 w-4 animate-spin text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Chờ hoàn tiền
                          </div>
                        )}

                        {/* TAG 5: ĐÃ HOÀN TIỀN */}
                        {order.status.toLowerCase() === 'cancelled' && order.refundStatus?.toLowerCase() === 'refunded' && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-sm bg-green-50 text-green-700 border-green-200 shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> Đã hoàn tiền
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-400">
                          ĐƠN #{order.orderId}
                        </span>
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {order.orderDetails.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 font-medium mb-1">Tổng thanh toán</p>
                      <p className="text-xl font-bold text-blue-600">{formatVND(order.totalAmount)}</p>
                      {/* HIỂN THỊ SỐ TIỀN VOUCHER ĐƯỢC GIẢM NẾU CÓ */}
                      {(order.discountAmount ?? 0) > 0 && (
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">
                          (Đã giảm {formatVND(order.discountAmount!)})
                        </p>
                      )}
                    </div>
                  </div>

                  {order.status.toLowerCase() !== 'cancelled' && (
                    <div className="px-5 sm:px-8 py-10 border-b border-slate-100 bg-white">
                      <div className="relative flex items-center justify-between w-full max-w-2xl mx-auto">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0"></div>
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full z-0 transition-all duration-700 ease-in-out"
                          style={{ width: `${(getStepIndex(order.status) / 3) * 100}%` }}
                        ></div>
                        {['Chờ xác nhận', 'Chờ lấy hàng', 'Đang giao', 'Đã giao'].map((step, index) => {
                          const currentStep = getStepIndex(order.status);
                          const isCompleted = index <= currentStep;
                          const isActive = index === currentStep;
                          return (
                            <div key={index} className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-500 ${
                                isCompleted ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'
                              }`}>
                                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                              </div>
                              <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-tight absolute -bottom-6 w-max ${
                                isActive ? 'text-blue-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                              }`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Body: Danh sách SP preview */}
                  <div className="p-5 sm:p-6">
                    <div className="space-y-4">
                      {order.orderDetails.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-center">
                          <img
                            src={resolveImgUrl(item.imageUrl)} 
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded-xl border border-slate-200 bg-white"
                          />
                          {/* ĐÃ ĐẨY CÁI DIV NÀY RA NGOÀI THẺ IMG CHO ĐÚNG CÚ PHÁP HTML */}
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm md:text-base line-clamp-1">{item.productName}</h4>
                            {(item.variantName || item.variantColor) && (
                                <p className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 w-fit px-2 py-0.5 rounded mt-0.5">
                                  Phân loại: {item.variantColor ? `${item.variantColor} - ` : ''}{item.variantName}
                                </p>
                            )}
                            <p className="text-sm text-slate-500 mt-1">
                              Số lượng: <span className="font-semibold">{item.quantity}</span> 
                              <span className="mx-2">•</span> 
                              Đơn giá: <span className="font-semibold text-slate-700">{formatVND(item.price)}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Hiển thị số sản phẩm còn lại bị ẩn */}
                    {order.orderDetails.length > 2 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                        <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full">
                          + {order.orderDetails.length - 2} sản phẩm khác
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer Đơn hàng */}
                  <div className="p-5 sm:p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      Ngày đặt: <span className="font-medium text-slate-700">{new Date(order.orderDate).toLocaleString('vi-VN')}</span>
                    </div>
                    <Link
                      href={`/orders/${order.orderId}`}
                      className="w-full sm:w-auto flex justify-center items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-600 transition-colors group/btn"
                    >
                      Xem chi tiết
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}