"use client";

import { useEffect, useState } from "react";
import { 
  FileText, Calendar, ShoppingCart, User, 
  MapPin, Phone, Mail, ChevronDown, ChevronUp, Trash2, PackageOpen
} from "lucide-react";
import { fetchAdminOrders, deleteOrder, type OrderDto } from "@/services/api";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State lưu danh sách ID các đơn hàng đang được mở rộng (Expand)
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetchAdminOrders();
      setOrders(res.data);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Xử lý gập/mở thẻ đơn hàng
  const toggleExpand = (orderId: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  // Xử lý xoá đơn hàng
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra thẻ cha (tránh tự động mở/gập thẻ)
    if (!window.confirm("⚠️ XÁC NHẬN: Xoá vĩnh viễn đơn hàng này?")) return;
    
    try {
      await deleteOrder(id);
      alert("Đã xoá đơn hàng thành công!");
      loadOrders();
    } catch (error) {
      console.error("Lỗi xoá đơn hàng:", error);
      alert("Có lỗi xảy ra khi xoá.");
    }
  };

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': 
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold uppercase tracking-wider">Chờ duyệt</span>;
      case 'processing': 
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">Đang xử lý</span>;
      case 'shipped': 
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider">Đang giao</span>;
      case 'delivered': 
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Đã giao</span>;
      case 'cancelled': 
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider">Đã huỷ</span>;
      default: 
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
        <p className="text-slate-500 font-medium">Đang tải dữ liệu đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-200">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Quản lý Đơn hàng</h2>
              <p className="text-slate-500 mt-1">Hệ thống ghi nhận {orders.length} đơn hàng</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-16 text-center">
            <PackageOpen className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Chưa có đơn hàng nào</h2>
            <p className="text-slate-500">Hãy kiên nhẫn, khách hàng sẽ sớm chốt đơn thôi!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Danh sách đơn hàng */}
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.orderId);

              return (
                <div 
                  key={order.orderId} 
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded ? "shadow-md border-blue-200" : "shadow-sm border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {/* Dòng Header tóm tắt (Click để mở) */}
                  <div 
                    onClick={() => toggleExpand(order.orderId)}
                    className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer select-none bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:flex flex-col items-center justify-center bg-slate-100 rounded-xl w-16 h-16">
                        <ShoppingCart className="w-6 h-6 text-blue-600 mb-1" />
                        <span className="text-xs font-bold text-slate-500">#{order.orderId}</span>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-slate-900">{order.fullName}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><Phone size={14}/> {order.phone}</span>
                          <span className="flex items-center gap-1"><Calendar size={14}/> {formatDate(order.orderDate)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 md:mt-0 flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tổng tiền</p>
                        <p className="text-xl font-bold text-red-600">{formatVND(order.totalAmount)}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => handleDelete(e, order.orderId)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Xoá đơn"
                        >
                          <Trash2 size={20} />
                        </button>
                        <div className="p-2 text-slate-400">
                          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phần chi tiết sổ xuống (Chỉ hiện khi isExpanded = true) */}
                  <div 
                    className={`grid transition-all duration-300 ease-in-out ${
                      isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="p-6 bg-slate-50/50 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Cột thông tin giao hàng */}
                        <div className="lg:col-span-1 space-y-4">
                          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={16} className="text-blue-600"/> Giao hàng đến
                          </h4>
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm space-y-3">
                            <p className="flex items-start gap-2 text-slate-700">
                              <User size={16} className="text-slate-400 shrink-0 mt-0.5"/> 
                              <span className="font-semibold">{order.fullName}</span>
                            </p>
                            <p className="flex items-start gap-2 text-slate-700">
                              <Phone size={16} className="text-slate-400 shrink-0 mt-0.5"/> 
                              <span>{order.phone}</span>
                            </p>
                            {order.email && (
                              <p className="flex items-start gap-2 text-slate-700">
                                <Mail size={16} className="text-slate-400 shrink-0 mt-0.5"/> 
                                <span>{order.email}</span>
                              </p>
                            )}
                            <p className="flex items-start gap-2 text-slate-700">
                              <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5"/> 
                              <span className="leading-relaxed">
                                {order.address}, {order.ward}, {order.district}, {order.city}
                              </span>
                            </p>
                            {order.note && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 mb-1">Ghi chú của khách:</p>
                                <p className="italic text-slate-700 bg-yellow-50 p-2 rounded-lg">{order.note}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cột chi tiết sản phẩm */}
                        <div className="lg:col-span-2">
                          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Chi tiết sản phẩm</h4>
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-3">Sản phẩm</th>
                                  <th className="px-4 py-3 text-center">SL</th>
                                  <th className="px-4 py-3 text-right">Đơn giá</th>
                                  <th className="px-4 py-3 text-right">Thành tiền</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {order.orderDetails.map((detail, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        <img 
                                          src={detail.imageUrl || "https://placehold.co/100x100?text=No+Image"} 
                                          alt={detail.productName} 
                                          className="w-10 h-10 object-cover rounded-md border border-slate-200"
                                        />
                                        <span className="font-semibold text-slate-800 line-clamp-2">{detail.productName}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-medium text-slate-700">{detail.quantity}</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{formatVND(detail.price)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                      {formatVND(detail.price * detail.quantity)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    </div>
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