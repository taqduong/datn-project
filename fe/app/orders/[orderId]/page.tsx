"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchOrderById, type OrderDto } from "@/services/api";
import {
  ArrowLeft, Calendar, Package, MapPin, Phone, 
  User, CheckCircle2, Clock, Truck, XCircle, ShoppingBag, 
  CreditCard, FileText, AlertCircle
} from "lucide-react";

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId?.toString();

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const getOrderDetail = async () => {
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
    };

    getOrderDetail();
  }, [orderId]);

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return { icon: <CheckCircle2 className="w-5 h-5" />, color: "bg-emerald-100 text-emerald-700 border-emerald-200", text: "Hoàn thành" };
      case 'pending':
        return { icon: <Clock className="w-5 h-5" />, color: "bg-amber-100 text-amber-700 border-amber-200", text: "Chờ xử lý" };
      case 'processing':
        return { icon: <Package className="w-5 h-5" />, color: "bg-blue-100 text-blue-700 border-blue-200", text: "Đang xử lý" };
      case 'shipped':
        return { icon: <Truck className="w-5 h-5" />, color: "bg-purple-100 text-purple-700 border-purple-200", text: "Đang giao hàng" };
      case 'cancelled':
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
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
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
  // Vì hiện tại chưa có bảng giảm giá, ta gán cứng = 0. Tạm tính = Tổng tiền.
  const subTotal = order.totalAmount; 

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
          
          <div className="flex flex-col items-end gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm ${statusConfig.color}`}>
              {statusConfig.icon} {statusConfig.text}
            </div>
          </div>
        </div>

        {/* Khung chia 2 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CỘT TRÁI: Sản phẩm & Thanh toán */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Box: Danh sách sản phẩm */}
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

          </div>

        </div>
      </div>
    </div>
  );
}