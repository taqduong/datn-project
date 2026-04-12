"use client";

import { useState, useEffect } from "react";
import { Ticket, Plus, Search, Edit, Trash2, Loader2, Truck, XCircle, Clock } from "lucide-react";
import { voucherAPI, type VoucherDto } from "@/services/api";

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // 1. THÊM HÀM TRỊ MÚI GIỜ (Chuyển thẳng về giờ Việt Nam)
  const getLocalDatetimeLocal = (dateInput?: string | Date | number) => {
    const d = dateInput ? new Date(dateInput) : new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // Bù trừ độ lệch múi giờ
    return d.toISOString().slice(0, 16);
  };

  // 2. CẬP NHẬT LẠI STATE MẶC ĐỊNH
  const [currentVoucher, setCurrentVoucher] = useState<Partial<VoucherDto | any>>({
    code: "", title: "", description: "", isFreeship: false, minOrderValue: 0,
    usageLimit: 100, maxUsagePerUser: 1, resetInterval: "None", isActive: true, 
    startDate: getLocalDatetimeLocal(),
    expiryDate: getLocalDatetimeLocal(new Date().setMonth(new Date().getMonth() + 1))
  });

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const res = await voucherAPI.getAllAdmin();
      setVouchers(res.data);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tải danh sách Voucher");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVouchers(); }, []);

  const handleOpenModal = (voucher?: VoucherDto | any) => {
    if (voucher) {
      setIsEditing(true);
      setCurrentVoucher({ 
        ...voucher, 
        maxUsagePerUser: voucher.maxUsagePerUser > 0 ? voucher.maxUsagePerUser : 1, 
        resetInterval: voucher.resetInterval || "None", 
        isHidden: voucher.isHidden || false,
        // Gọi hàm trị múi giờ ở đây:
        startDate: voucher.startDate ? getLocalDatetimeLocal(voucher.startDate) : getLocalDatetimeLocal(),
        expiryDate: voucher.expiryDate ? getLocalDatetimeLocal(voucher.expiryDate) : getLocalDatetimeLocal()
      });
    } else {
      setIsEditing(false);
      setCurrentVoucher({
        code: "", title: "", description: "", isFreeship: false, minOrderValue: 0,
        usageLimit: 100, maxUsagePerUser: 1, resetInterval: "None", isActive: true, isHidden: false, discountValue: 0, discountPercent: 0, maxDiscountAmount: 0,
        startDate: getLocalDatetimeLocal(),
        expiryDate: getLocalDatetimeLocal(new Date().setMonth(new Date().getMonth() + 1))
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<VoucherDto> = { 
        ...currentVoucher, 
        discountValue: currentVoucher.discountValue ? Number(currentVoucher.discountValue) : undefined,
        discountPercent: currentVoucher.discountPercent ? Number(currentVoucher.discountPercent) : undefined,
        maxDiscountAmount: currentVoucher.maxDiscountAmount ? Number(currentVoucher.maxDiscountAmount) : undefined,
      };

      if (isEditing && currentVoucher.id) {
        await voucherAPI.update(currentVoucher.id, payload);
        alert("Cập nhật thành công!");
      } else {
        await voucherAPI.create(payload);
        alert("Thêm mã thành công!");
      }
      setShowModal(false);
      loadVouchers();
    } catch (err: any) {
      alert(err.response?.data?.message || "Có lỗi xảy ra khi lưu Voucher");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa mã ưu đãi này?")) return;
    try {
      await voucherAPI.delete(id);
      loadVouchers();
    } catch (err) {
      alert("Xóa thất bại!");
    }
  };

  // ==========================================
  // HÀM BẬT TẮT TRẠNG THÁI 
  // ==========================================
  const toggleActive = async (v: any) => {
    try {
      // Tối ưu UX: Cập nhật state nội bộ ngay lập tức để UI thay đổi mượt mà
      setVouchers(prev => prev.map(item => item.id === v.id ? { ...item, isActive: !v.isActive } : item));
      
      // Gọi API ngầm dưới nền
      await voucherAPI.update(v.id, { ...v, isActive: !v.isActive });
    } catch (err) {
      // Nếu API lỗi thì rollback lại state cũ
      loadVouchers();
      alert("Cập nhật trạng thái thất bại");
    }
  };

  const formatVND = (val: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const filteredVouchers = vouchers.filter(v => v.code.toLowerCase().includes(search.toLowerCase()) || v.title.toLowerCase().includes(search.toLowerCase()));

  const getIntervalText = (interval: string) => {
    if (interval === "10s") return "Test 10 giây";
    if (interval === "Daily") return "Hồi mỗi ngày";
    if (interval === "Hourly") return "Hồi mỗi giờ";
    return "Dùng 1 lần";
  };

  // Helper hàm để in ra ngày giờ đẹp hơn
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Ticket className="text-blue-600" /> Quản lý Mã ưu đãi
          </h1>
          <p className="text-sm text-slate-500 mt-1">Tạo và quản lý các chiến dịch giảm giá, freeship.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm">
          <Plus size={18} /> Thêm mã mới
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Search className="text-slate-400 w-5 h-5" />
          <input type="text" placeholder="Tìm theo mã code hoặc tên..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent outline-none font-medium text-slate-700" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Mã Code</th>
                <th className="px-6 py-4">Chi tiết giảm</th>
                <th className="px-6 py-4">Đơn tối thiểu</th>
                <th className="px-6 py-4">Thời gian áp dụng</th>
                <th className="px-6 py-4">Đã dùng</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Đang tải dữ liệu...</td></tr>
              ) : filteredVouchers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500">Chưa có mã ưu đãi nào.</td></tr>
              ) : (
                filteredVouchers.map((v: any) => {
                  const isExpired = new Date(v.expiryDate) < new Date();
                  const isNotStartedYet = new Date(v.startDate) > new Date();
                  
                  return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded tracking-widest">{v.code}</span>
                        {v.isHidden && <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">Mã Ẩn</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{v.title}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {v.isFreeship ? <span className="text-emerald-600 flex items-center gap-1"><Truck size={14}/> Freeship</span> : v.discountValue ? <span className="text-orange-600">-{formatVND(v.discountValue)}</span> : <span className="text-orange-600">-{v.discountPercent! * 100}%</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{formatVND(v.minOrderValue)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                           <span className="font-medium text-slate-400 w-6">Từ:</span> 
                           <span className={isNotStartedYet ? "text-amber-600 font-bold" : "text-slate-700"}>{formatDateTime(v.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <span className="font-medium text-slate-400 w-6">Đến:</span> 
                           <span className={isExpired ? "text-red-600 font-bold" : "text-slate-700"}>{formatDateTime(v.expiryDate)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold">
                      {v.usedCount} / {v.usageLimit}
                      <p className="text-[10px] font-normal mt-1 text-rose-500">
                        Tối đa {v.maxUsagePerUser}/khách ({getIntervalText(v.resetInterval)})
                      </p>
                    </td>

                    {/* ========================================== */}
                    {/* THAY ĐỔI GIAO DIỆN NÚT TRẠNG THÁI THÀNH TOGGLE SWITCH */}
                    {/* ========================================== */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleActive(v)} 
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${v.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${v.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className={`text-xs font-bold ${v.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {v.isActive ? 'Đang bật' : 'Đã tắt'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(v)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Sửa Mã Ưu Đãi' : 'Thêm Mã Ưu Đãi Mới'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Mã Code (VD: SUMMER24)</label>
                  <input required value={currentVoucher.code} onChange={e => setCurrentVoucher({...currentVoucher, code: e.target.value.toUpperCase()})} className="w-full border border-slate-300 px-4 py-2.5 rounded-xl uppercase font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tên chương trình</label>
                  <input required value={currentVoucher.title} onChange={e => setCurrentVoucher({...currentVoucher, title: e.target.value})} className="w-full border border-slate-300 px-4 py-2.5 rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Mô tả ngắn</label>
                <input required value={currentVoucher.description} onChange={e => setCurrentVoucher({...currentVoucher, description: e.target.value})} className="w-full border border-slate-300 px-4 py-2.5 rounded-xl" />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                {/* THÊM flex gap-6 ĐỂ 2 CHECKBOX NẰM CẠNH NHAU */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={currentVoucher.isFreeship} onChange={e => setCurrentVoucher({...currentVoucher, isFreeship: e.target.checked, discountValue: 0, discountPercent: 0})} className="w-5 h-5 rounded border-slate-300 accent-blue-600" />
                    <span className="font-bold text-slate-800">Là mã Miễn phí vận chuyển</span>
                  </label>

                  {/* CHECKBOX MỚI CHO VỤ ẨN MÃ */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={currentVoucher.isHidden} onChange={e => setCurrentVoucher({...currentVoucher, isHidden: e.target.checked})} className="w-5 h-5 rounded border-slate-300 accent-rose-600" />
                    <span className="font-bold text-rose-600 italic">Mã Bí Mật (Không hiện lên danh sách)</span>
                  </label>
                </div>

                {!currentVoucher.isFreeship && (
                  <div className="grid grid-cols-2 gap-5 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Giảm theo số tiền (VNĐ)</label>
                      <input type="number" value={currentVoucher.discountValue || ""} onChange={e => setCurrentVoucher({...currentVoucher, discountValue: Number(e.target.value), discountPercent: 0})} className="w-full border border-slate-300 px-4 py-2.5 rounded-xl" placeholder="VD: 50000" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Hoặc Giảm theo %</label>
                      <input type="number" step="0.01" value={currentVoucher.discountPercent || ""} onChange={e => setCurrentVoucher({...currentVoucher, discountPercent: Number(e.target.value), discountValue: 0})} className="w-full border border-slate-300 px-4 py-2.5 rounded-xl" placeholder="VD: 0.15 (Giảm 15%)" />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Đơn tối thiểu (VNĐ)</label>
                  <input type="number" required value={currentVoucher.minOrderValue} onChange={e => setCurrentVoucher({...currentVoucher, minOrderValue: Number(e.target.value)})} className="w-full border border-slate-300 px-4 py-2.5 rounded-xl" />
                </div>
                {!currentVoucher.isFreeship && currentVoucher.discountPercent! > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Giảm tối đa (VNĐ)</label>
                    <input type="number" value={currentVoucher.maxDiscountAmount || ""} onChange={e => setCurrentVoucher({...currentVoucher, maxDiscountAmount: Number(e.target.value)})} className="w-full border border-slate-300 px-4 py-2.5 rounded-xl" />
                  </div>
                )}
              </div>

              {/* KHỐI THỜI GIAN */}
              <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 border-b border-blue-100 pb-2">
                  <Clock size={16} /> Cài đặt Thời gian & Số lượng
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian BẮT ĐẦU</label>
                    <input type="datetime-local" required value={currentVoucher.startDate} onChange={e => setCurrentVoucher({...currentVoucher, startDate: e.target.value})} className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian KẾT THÚC</label>
                    <input type="datetime-local" required value={currentVoucher.expiryDate} onChange={e => setCurrentVoucher({...currentVoucher, expiryDate: e.target.value})} className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tổng lượt dùng</label>
                    <input type="number" required value={currentVoucher.usageLimit} onChange={e => setCurrentVoucher({...currentVoucher, usageLimit: Number(e.target.value)})} className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-rose-600 mb-1">Tối đa/Khách</label>
                    <input type="number" required value={currentVoucher.maxUsagePerUser} onChange={e => setCurrentVoucher({...currentVoucher, maxUsagePerUser: Number(e.target.value)})} className="w-full border border-rose-200 px-3 py-2 rounded-lg text-sm focus:border-rose-500 focus:ring-rose-500" min="1" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chu kỳ hồi mã</label>
                    <select value={currentVoucher.resetInterval} onChange={e => setCurrentVoucher({...currentVoucher, resetInterval: e.target.value})} className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                      <option value="None">Không hồi</option>
                      <option value="10s">Test 10s</option>
                      <option value="Hourly">Mỗi giờ</option>
                      <option value="Daily">Mỗi ngày</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Hủy</button>
                <button type="submit" className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md">Lưu Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}