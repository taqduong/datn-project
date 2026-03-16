"use client";

import { useEffect, useState } from "react";
import { 
  FileText, Calendar, ShoppingCart, User, 
  MapPin, Phone, Mail, ChevronDown, ChevronUp, Trash2, PackageOpen,
  Download
} from "lucide-react";
import { fetchAdminOrders, deleteOrder, updateOrderStatus, type OrderDto } from "@/services/api";
import * as XLSX from "xlsx";

// Hàm xử lý link ảnh sản phẩm
const resolveImgUrl = (url?: string) => {
  if (!url) return "https://placehold.co/100x100?text=No+Image";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
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

  const toggleExpand = (orderId: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) newExpanded.delete(orderId);
    else newExpanded.add(orderId);
    setExpandedOrders(newExpanded);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    if (!window.confirm("⚠️ XÁC NHẬN: Xoá vĩnh viễn đơn hàng này?")) return;
    try {
      await deleteOrder(id);
      alert("Đã xoá đơn hàng thành công!");
      loadOrders();
    } catch (error) {
      alert("Có lỗi xảy ra khi xoá.");
    }
  };

  // Hàm xử lý duyệt đơn
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, orderId: number) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    try {
      await updateOrderStatus(orderId, newStatus);
      loadOrders(); 
    } catch (error) {
      alert("Cập nhật trạng thái thất bại!");
    }
  };
  
  // ==================== BẮT ĐẦU CODE EXCEL ====================
  const handleExportExcel = () => {
    if (!orders || orders.length === 0) {
      alert("Không có dữ liệu đơn hàng để xuất!");
      return;
    }

    const exportData = orders.map((order, index) => {
      const addressParts = [order.address, order.ward, order.city].filter(p => p && p.trim() !== "");
      const displayAddress = addressParts.length > 0 ? addressParts.join(", ") : "Chưa có địa chỉ";

      return {
        "STT": index + 1,
        "Mã ĐH": `#${order.orderId}`,
        "Ngày đặt": new Date(order.orderDate).toLocaleString("vi-VN"),
        "Tên khách hàng": order.fullName,
        "Số điện thoại": order.phone,
        "Địa chỉ": displayAddress,
        "Tổng tiền (VNĐ)": order.totalAmount,
        "Trạng thái": order.status,
        "Ghi chú": order.note || "Không có"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const columnWidths = [
      { wch: 5 }, { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, 
      { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
    ];
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_Sach_Don_Hang");
    XLSX.writeFile(workbook, `ThongKeDonHang_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  // ==================== KẾT THÚC CODE EXCEL ====================
  
  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        
        {/* THAY THẾ KHU VỰC HEADER NÀY */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-200">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Quản lý Đơn hàng</h2>
              <p className="text-slate-500 mt-1">Hệ thống ghi nhận {orders.length} đơn hàng</p>
            </div>
          </div>
          
          {/* NÚT XUẤT EXCEL */}
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Xuất file Excel</span>
            <span className="sm:hidden">Xuất Excel</span>
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-16 text-center">
            <PackageOpen className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Chưa có đơn hàng nào</h2>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.orderId);
              // Lọc địa chỉ sạch sẽ (Xóa district)
              const addressParts = [order.address, order.ward, order.city]
                .filter(p => p && p.trim() !== "");
              const displayAddress = addressParts.length > 0 ? addressParts.join(", ") : "Chưa có địa chỉ";

              return (
                <div key={order.orderId} className={`bg-white rounded-2xl border transition-all ${isExpanded ? "shadow-md border-blue-200" : "shadow-sm border-slate-200"}`}>
                  {/* Header */}
                  <div onClick={() => toggleExpand(order.orderId)} className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:flex flex-col items-center justify-center bg-slate-100 rounded-xl w-16 h-16 shrink-0">
                        <ShoppingCart className="w-6 h-6 text-blue-600 mb-1" />
                        <span className="text-xs font-bold text-slate-500">#{order.orderId}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-slate-900">{order.fullName}</h3>
                          
                          {/* Dropdown Duyệt đơn */}
                            <select
                                value={order.status}
                                onChange={(e) => handleStatusChange(e, order.orderId)}
                                onClick={(e) => e.stopPropagation()}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border outline-none cursor-pointer hover:shadow-sm transition-all appearance-none ${
                                    order.status.toLowerCase() === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                    order.status.toLowerCase() === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    order.status.toLowerCase() === 'shipped' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    ['completed', 'delivered'].includes(order.status.toLowerCase()) ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                }`}
                                style={{ textAlignLast: 'left' }}
                                >
                                <option value="Pending">Chờ duyệt</option>
                                <option value="Processing">Đang xử lý</option>
                                <option value="Shipped">Đang giao hàng</option>
                                <option value="Completed">Hoàn thành</option>
                                <option value="Cancelled">Đã hủy đơn</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><Phone size={14}/> {order.phone}</span>
                          <span className="flex items-center gap-1"><Calendar size={14}/> {formatDate(order.orderDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-400 uppercase">Tổng tiền</p>
                        <p className="text-xl font-bold text-red-600">{formatVND(order.totalAmount)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* NÚT XÓA CHỈ HIỆN KHI ĐƠN ĐÃ BỊ HỦY */}
                        {['cancelled', 'đã hủy', 'đã hủy đơn'].includes(order.status.toLowerCase()) && (
                          <button 
                            onClick={(e) => handleDelete(e, order.orderId)} 
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 size={20}/>
                          </button>
                        )}
                        <div className="p-2 text-slate-400">{isExpanded ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}</div>
                      </div>
                    </div>
                  </div>

                  {/* Detail Content */}
                  {isExpanded && (
                    <div className="p-6 bg-slate-50/50 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-top-2 duration-300">
                      <div className="lg:col-span-1 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><MapPin size={16} className="text-blue-600"/> Giao hàng đến</h4>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                          <p className="font-semibold text-slate-900">{order.fullName}</p>
                          <p className="text-slate-600">{order.phone}</p>
                          <p className="text-slate-700 leading-relaxed font-medium">{displayAddress}</p>
                        </div>
                      </div>
                      <div className="lg:col-span-2">
                        <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase">Chi tiết sản phẩm</h4>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b text-slate-600">
                              <tr>
                                <th className="px-4 py-3">Sản phẩm</th>
                                <th className="px-4 py-3 text-center">SL</th>
                                <th className="px-4 py-3 text-right">Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {order.orderDetails.map((detail, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 flex items-center gap-3">
                                    <img 
                                      src={resolveImgUrl(detail.imageUrl)} 
                                      alt={detail.productName} 
                                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 bg-white"
                                      onError={(e) => (e.currentTarget.src = "https://placehold.co/100x100?text=No+Image")}
                                    />
                                    <span className="font-bold text-slate-800 line-clamp-1">{detail.productName}</span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center justify-center min-w-9 px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-900 shadow-sm">
                                      {detail.quantity}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-blue-600">{formatVND(detail.price * detail.quantity)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}