"use client";

import { useEffect, useState } from "react";
import { 
  FileText, Calendar, ShoppingCart, User, 
  MapPin, Phone, Mail, ChevronDown, ChevronUp, Trash2, PackageOpen,
  Download, Printer, CheckCircle2, AlertCircle 
} from "lucide-react";
import { fetchAdminOrders, deleteOrder, updateOrderStatus, type OrderDto, confirmRefundOrder } from "@/services/api";
import * as XLSX from "xlsx";

// Hàm xử lý link ảnh sản phẩm
const resolveImgUrl = (url?: string) => {
  if (!url) return "https://placehold.co/100x100?text=No+Image";
  
  // 1. Nếu link đã đầy đủ http thì trả về luôn
  if (url.startsWith("http")) return url;
  
  // 2. Nếu link thiếu localhost (dạng /uploads/...)
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
  
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${baseUrl}${cleanUrl}`;
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
  //  Cập nhật UI ngay lập tức (Optimistic Update)
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, orderId: number) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    
    // Khởi tạo Snapshot lưu trữ trạng thái trước biến đổi (Phục vụ Rollback)
    const previousOrders = [...orders];

    // Bước 1: Áp dụng Optimistic UI Update - Phản hồi giao diện tức thì để tối ưu hóa trải nghiệm
    setOrders(prevOrders => prevOrders.map(order => 
      order.orderId === orderId ? { ...order, status: newStatus } : order
    ));

    // BƯỚC 2: Gọi API ngầm phía sau
    try {
      await updateOrderStatus(orderId, newStatus);
      // Tối ưu hóa hiệu năng: Lược bỏ thao tác Re-fetch dữ liệu nhằm giảm tải Server
    } catch (error) {
      alert("Cập nhật trạng thái thất bại! Hệ thống sẽ quay về trạng thái cũ.");
      // Bước 3: Khôi phục trạng thái ban đầu của Component (Rollback State) nếu API trả về ngoại lệ
      setOrders(previousOrders);
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

  // Gom danh sách sản phẩm thành chuỗi (Ví dụ: - Áo thun (Màu Đỏ) x2)
  const productInfo = order.orderDetails
    .map(item => `- ${item.productName}${item.variantName ? ` (${item.variantName})` : ""} x${item.quantity}`)
    .join("\n"); // Tích hợp ký tự Line Break (\n) đảm bảo định dạng đa dòng trong Cell Excel

  return {
    "STT": index + 1,
    "Mã ĐH": `#${order.orderId}`,
    "Ngày đặt": new Date(order.orderDate).toLocaleString("vi-VN"),
    "Tên khách hàng": order.fullName,
    "Số điện thoại": order.phone,
    "Sản phẩm": productInfo, 
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

  // ==================== BẮT ĐẦU CODE IN PHIẾU GIAO HÀNG ====================
  const handlePrintLabel = (e: React.MouseEvent, order: OrderDto) => {
    e.stopPropagation();
    
    // Khởi tạo cửa sổ ẩn (Hidden Window) phục vụ tác vụ in ấn
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      alert("Vui lòng cho phép mở Popup trên trình duyệt để in đơn hàng.");
      return;
    }

    const addressParts = [order.address, order.ward, order.city].filter(p => p && p.trim() !== "");
    const displayAddress = addressParts.length > 0 ? addressParts.join(", ") : "Chưa cung cấp";
    
    const totalQty = order.orderDetails.reduce((sum, item) => sum + item.quantity, 0);
    const isPaid = order.paymentMethod?.toLowerCase().includes('vnpay');
    const codAmount = isPaid ? "0 VNĐ (ĐÃ THANH TOÁN)" : formatVND(order.totalAmount);

    let productsHtml = "";
    order.orderDetails.forEach((item, index) => {
      const variantText = item.variantName ? `(${item.variantColor ? item.variantColor + ' - ' : ''}${item.variantName})` : '';
      productsHtml += `
        <div style="margin-bottom: 10px; font-size: 16px; padding-bottom: 8px; border-bottom: 1px dotted #ccc;">
          <b>${index + 1}.</b> ${item.productName} ${variantText} <br/> 
          <span style="margin-left: 20px; color: #333;">Số lượng: <b>${item.quantity}</b></span>
        </div>`;
    });

    // Tạo vạch barcode giả bằng CSS
    const fakeBarcode = Array.from({length: 50}).map(() => {
      const width = Math.floor(Math.random() * 5) + 1;
      const margin = Math.floor(Math.random() * 3);
      return `<div style="width: ${width}px; margin-right: ${margin}px; background-color: black; height: 100%;"></div>`;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Mã Vận Đơn - #${order.orderId}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #000; }
          /* Tăng kích thước lên A5 để nhìn rõ hơn trên A4 */
          .label-box { width: 14.5cm; min-height: 20cm; border: 3px dashed #000; padding: 25px; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
          .logo { font-size: 32px; font-weight: 900; letter-spacing: -1px; display: flex; align-items: center; gap: 8px; }
          .logo span { background: #000; color: #fff; padding: 4px 8px; border-radius: 6px; font-size: 24px; }
          .barcode-section { display: flex; flex-direction: column; align-items: center; }
          .barcode-bars { display: flex; height: 55px; justify-content: center; }
          .info-row { display: flex; border-bottom: 3px solid #000; margin-bottom: 15px; }
          .info-col { width: 50%; padding-bottom: 15px; }
          .info-col.left { border-right: 3px solid #000; padding-right: 15px; }
          .info-col.right { padding-left: 15px; }
          .title { font-weight: bold; font-size: 16px; margin-bottom: 8px; }
          .text { font-size: 15px; line-height: 1.5; }
          .large-code { text-align: center; font-size: 36px; font-weight: 900; border-bottom: 3px dashed #000; padding-bottom: 15px; margin-bottom: 15px; letter-spacing: 3px; }
          .product-section { flex: 1; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; }
          .cod-title { font-size: 15px; margin-bottom: 5px; font-weight: bold;}
          .cod-amount { font-size: 28px; font-weight: 900; }
          .signature { border: 2px dashed #000; width: 170px; height: 80px; display: flex; justify-content: center; padding-top: 10px; font-size: 15px; font-weight: bold; background-color: #f9f9f9; }
          .warning { font-size: 13px; font-weight: bold; text-align: center; margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="label-box">
          <div class="header">
            <div class="logo"><span>H</span> HomeMart</div>
            <div class="barcode-section">
              <div class="barcode-bars">${fakeBarcode}</div>
              <div style="font-size: 13px; margin-top: 5px; font-family: monospace; font-weight: bold;">Mã đơn: HM${new Date().getFullYear()}${order.orderId}</div>
            </div>
          </div>
          
          <div class="info-row">
            <div class="info-col left">
              <div class="title">Từ: HomeMart Official</div>
              <div class="text">Đường Cầu Diễn, quận Bắc Từ Liêm, Hà Nội</div>
              <div class="text" style="margin-top: 5px;">SĐT: 1900 1080</div>
            </div>
            <div class="info-col right">
              <div class="title">Đến: ${order.fullName}</div>
              <div class="text">${displayAddress}</div>
              <div class="text" style="margin-top: 5px; font-weight: bold; font-size: 15px;">SĐT: ${order.phone}</div>
            </div>
          </div>
          
          <div class="large-code">HM-EXPRESS-${order.orderId}</div>
          
          <div class="product-section">
            <div class="title" style="margin-bottom: 12px; font-size: 17px;">Nội dung hàng (Tổng SL: ${totalQty})</div>
            ${productsHtml}
          </div>
          
          <div class="footer">
            <div>
              <div class="cod-title">Tiền thu Người nhận:</div>
              <div class="cod-amount">${codAmount}</div>
              <div style="font-size: 12px; margin-top: 8px; max-width: 250px; color: #555;">
                * Kiểm tra tên sản phẩm và đối chiếu mã vận đơn trước khi nhận hàng.
              </div>
            </div>
            <div class="signature">
              Chữ ký người nhận
            </div>
          </div>
          
          <div class="warning">
            Chỉ dẫn giao hàng: Không đồng kiểm; Chuyển hoàn sau 3 lần phát; Lưu kho tối đa 5 ngày.
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };
  
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
              // Tiền xử lý văn bản: Chuẩn hóa định dạng địa chỉ
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
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-slate-900">{order.fullName}</h3>
                          
                          {/* ========================================== */}
                          {/* ĐÃ CHUYỂN DROPDOWN DUYỆT ĐƠN LÊN TRƯỚC TAG */}
                          {/* ========================================== */}
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(e, order.orderId)}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border outline-none cursor-pointer hover:shadow-sm transition-all appearance-none ${
                              order.status.toLowerCase() === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                              order.status.toLowerCase() === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              order.status.toLowerCase() === 'shipping' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              order.status.toLowerCase() === 'completed'? 'bg-green-50 text-green-700 border-green-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}
                            style={{ textAlignLast: 'left' }}
                          >
                            <option value="Pending">Chờ xác nhận</option>
                            
                            {/* 🔒 CẤM CHỌN NẾU LÀ ĐƠN VNPAY CHƯA THANH TOÁN (Trạng thái đang là Pending) */}
                            <option 
                              value="Processing"
                              disabled={order.paymentMethod?.toLowerCase() === 'vnpay' && order.status.toLowerCase() === 'pending'}
                            >
                              Chờ lấy hàng
                            </option>
                            
                            <option 
                              value="Shipping"
                              disabled={order.paymentMethod?.toLowerCase() === 'vnpay' && order.status.toLowerCase() === 'pending'}
                            >
                              Đang giao hàng
                            </option>
                            
                            <option 
                              value="Completed"
                              disabled={order.paymentMethod?.toLowerCase() === 'vnpay' && order.status.toLowerCase() === 'pending'}
                            >
                              Đã giao
                            </option>
                            
                            {/* Riêng Hủy đơn thì lúc nào Admin cũng được phép */}
                            <option value="Cancelled">Đã hủy đơn</option>
                          </select>

                          {/* ========================================== */}
                          {/* TAG THANH TOÁN  */}
                          {/* ========================================== */}
                          
                          {/* TAG 1: ĐÃ THANH TOÁN (Màu xanh) */}
                          {order.paymentMethod === 'VNPay_Paid' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-bold shadow-sm">
                              <CheckCircle2 size={16} /> Đã thanh toán
                            </span>
                          )}

                          {/* TAG 2: CHƯA THANH TOÁN (Màu đỏ nhạt) */}
                          {order.paymentMethod?.toLowerCase() === 'vnpay' && order.status.toLowerCase() === 'pending' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm font-bold shadow-sm">
                              <AlertCircle size={16} /> Chưa thanh toán
                            </span>
                          )}

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
                        {/* ========================================== */}
                        {/* NÚT XÁC NHẬN HOÀN TIỀN CHO ADMIN */}
                        {order.status.toLowerCase() === 'cancelled' && order.refundStatus?.toLowerCase() === 'pending' && (
                          <button 
                            onClick={async (e) => {
                                e.stopPropagation();
                                if(window.confirm(`Xác nhận đã chuyển khoản hoàn tiền đơn #${order.orderId} cho khách?`)) {
                                    try {
                                        await confirmRefundOrder(order.orderId);
                                        alert("Đã cập nhật trạng thái Hoàn tiền thành công!");
                                        loadOrders();
                                    } catch(err) {
                                        alert("Có lỗi xảy ra khi xác nhận hoàn tiền.");
                                    }
                                }
                            }}
                            className="mr-3 px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-orange-600 hover:shadow-md transition-all active:scale-95 flex items-center gap-1"
                          >
                            <AlertCircle size={16}/> Xác nhận hoàn tiền
                          </button>
                        )}
                        
                        {/* Tag hiển thị khi đã hoàn */}
                        {order.status.toLowerCase() === 'cancelled' && order.refundStatus?.toLowerCase() === 'refunded' && (
                          <span className="mr-3 px-3 py-1.5 bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-bold uppercase flex items-center gap-1">
                             <CheckCircle2 size={14}/> Đã hoàn tiền
                          </span>
                        )}
                        {/* ========================================== */}

                        {/* THÊM MỚI: NÚT IN PHIẾU GIAO HÀNG (ẨN ĐI NẾU LÀ ĐƠN VNPAY BỊ LỖI/CHƯA THANH TOÁN) */}
                        {!(order.paymentMethod?.toLowerCase() === 'vnpay' && order.status.toLowerCase() === 'pending') && (
                          <button 
                            onClick={(e) => handlePrintLabel(e, order)} 
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            title="In mã vận đơn dán lên kiện hàng"
                          >
                            <Printer size={20}/>
                          </button>
                        )}

                        {/* NÚT XÓA CHỈ HIỆN KHI ĐƠN ĐÃ BỊ HỦY VÀ (Không cần hoàn tiền HOẶC Đã hoàn xong) */}
                        {['cancelled', 'đã hủy', 'đã hủy đơn'].includes(order.status.toLowerCase()) && 
                         (order.refundStatus?.toLowerCase() === 'none' || order.refundStatus?.toLowerCase() === 'refunded') && (
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
                          <p className="font-semibold text-slate-900 flex items-center gap-2">
                            <User size={14} className="text-slate-400" /> {order.fullName}
                          </p>
                          <p className="text-slate-600 flex items-center gap-2">
                            <Phone size={14} className="text-slate-400" /> {order.phone}
                          </p>
                          
                          {/* ĐOẠN HIỂN THỊ EMAIL*/}
                          {order.email && order.email.trim() !== "" && (
                            <p className="text-slate-600 flex items-center gap-2">
                              <Mail size={14} className="text-slate-400" /> {order.email}
                            </p>
                          )}
                          
                          <p className="text-slate-700 leading-relaxed font-medium mt-2 pt-2 border-t border-slate-100">
                            {displayAddress}
                          </p>
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
                                      className="w-12 h-12 shrink-0 object-cover rounded-lg border border-slate-200 bg-white"
                                      onError={(e) => (e.currentTarget.src = "https://placehold.co/100x100?text=No+Image")}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-800 line-clamp-1">{detail.productName}</span>
                                      
                                      {/*HIỂN THỊ BIẾN THỂ TẠI ĐÂY */}
                                      {detail.variantName && (
                                        <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-1 border border-blue-100">
                                          Phân loại: {detail.variantName}
                                        </span>
                                      )}
                                    </div>
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