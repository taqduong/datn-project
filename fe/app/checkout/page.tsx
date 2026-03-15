"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchCart, checkoutOrder, type CartItem, trackProductPurchase, fetchProductById } from "@/services/api";
import { 
  MapPin, Phone, User, FileText, ShoppingBag, 
  ArrowRight, CheckCircle2, CreditCard, Mail, Wallet, Building2
} from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();

  // ✅ 1. LẤY DỮ LIỆU TỪ URL (NẾU CÓ)
  const searchParams = useSearchParams();
  const buyNowId = searchParams.get("buyNowId");
  const qty = searchParams.get("qty");
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // State lưu thông tin form
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    email: "",
    city: "",
    ward: "",
    note: "",
    paymentMethod: "cod" // Mặc định là COD
  });

  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoadingCart(true);
        // ✅ 2. THAY ĐOẠN FETCH GIỎ HÀNG BẰNG CỤM NÀY:
        if (buyNowId && qty) {
          // Nếu đang "Mua ngay" -> Chỉ fetch 1 món
          const res = await fetchProductById(buyNowId);
          const p = res.data;
          setCartItems([{
            cartItemId: 0, // ID ảo để giao diện không lỗi
            productId: p.id,
            quantity: Number(qty),
            product: { ...p, priceAfterDiscount: p.priceAfterDiscount || 0 }
          }]);
        } else {
          // Nếu vô từ Giỏ hàng -> Lấy data như bình thường
          const res = await fetchCart();
          const items = Array.isArray(res.data) ? res.data : [];
          setCartItems(items);
        }
        
        // Tự động điền thông tin user từ localStorage lên form
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setFormData(prev => ({
            ...prev,
            fullName: user.fullName || user.username || "",
            phone: user.phone || "",
            email: user.email || ""
          }));
        }
      } catch (error) {
        console.error("Lỗi tải giỏ hàng:", error);
      } finally {
        setLoadingCart(false);
      }
    };
    loadCart();
  }, [buyNowId, qty]);

  // Tính tổng tiền dựa trên giá sau khi giảm (priceAfterDiscount)
  const subtotal = cartItems.reduce((sum, item) => {
    const finalPrice = item.product.priceAfterDiscount > 0 ? item.product.priceAfterDiscount : item.product.price;
    return sum + finalPrice * item.quantity;
  }, 0);

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentMethodChange = (method: string) => {
    setFormData((prev) => ({ ...prev, paymentMethod: method }));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert("Giỏ hàng đang trống, không thể thanh toán!");
      router.push("/products");
      return;
    }
      try {
      setIsSubmitting(true);
      
      // ✅ 3. THAY LỆNH GỌI API CŨ BẰNG CỤC NÀY ĐỂ GỬI KÈM DỮ LIỆU MUA NGAY:
      const payload: any = { ...formData };
      if (buyNowId && qty) {
        payload.buyNowProductId = Number(buyNowId);
        payload.buyNowQuantity = Number(qty);
      }
      
      await checkoutOrder(payload);

      // =======================================================

      // =======================================================
      // ✅ GẮN CẢM BIẾN LƯỢT MUA Ở ĐÂY (Vừa chốt đơn xong)
      // Lặp qua từng món trong giỏ hàng để báo cáo số lượng đã bán
      // =======================================================
      cartItems.forEach(item => {
        trackProductPurchase(item.product.id, item.quantity)
          .catch(err => console.error("Lỗi tracking mua hàng:", err));
      });
      
      setIsSuccess(true);
      // Báo cho Navbar reset số đếm giỏ hàng
      window.dispatchEvent(new Event("cartUpdated")); 
      
      // Chuyển hướng về trang Lịch sử đơn hàng sau 2.5 giây
      setTimeout(() => {
        router.push("/orders");
      }, 2500);
      
    } catch (error: any) {
      console.error("Lỗi đặt hàng:", error);
      alert("Có lỗi xảy ra khi thanh toán. Vui lòng kiểm tra lại kết nối!");
      setIsSubmitting(false);
    }
  };

  // 1. MÀN HÌNH LOADING
  if (loadingCart) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Đang tải giỏ hàng của bạn...</p>
      </div>
    );
  }

  // 2. MÀN HÌNH THÀNH CÔNG (Popup)
  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center max-w-md w-full animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Chốt đơn thành công!</h2>
          <p className="text-slate-500 mb-8">Hệ thống đang xử lý đơn hàng của bạn. Cảm ơn bạn đã mua sắm!</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full animate-[pulse_2.5s_ease-in-out_infinite] w-full origin-left"></div>
          </div>
          <p className="text-sm text-slate-400 mt-4">Tự động chuyển đến lịch sử đơn hàng...</p>
        </div>
      </div>
    );
  }

  // 3. MÀN HÌNH GIỎ HÀNG TRỐNG
  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
          <ShoppingBag className="w-12 h-12 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Giỏ hàng trống</h2>
        <p className="text-slate-500 mb-8 text-center max-w-md">Bạn chưa chọn sản phẩm nào để thanh toán. Hãy dạo một vòng xem có gì ưng ý không nhé!</p>
        <button 
          onClick={() => router.push("/products")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95"
        >
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  // 4. MÀN HÌNH CHECKOUT CHÍNH (Single-page)
  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500 font-medium">
          <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-blue-600 transition">Giỏ hàng</Link>
          <span>/</span>
          <span className="text-slate-900">Thanh toán</span>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Thanh toán an toàn</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* CỘT TRÁI: FORM ĐIỀN THÔNG TIN & THANH TOÁN (2/3 chiều rộng) */}
          <div className="w-full lg:w-2/3 space-y-6">
            
            {/* Box 1: Thông tin giao hàng */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
                <MapPin className="text-blue-600" /> Thông tin nhận hàng
              </h2>
              
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Họ và tên *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input required name="fullName" value={formData.fullName} onChange={handleInputChange} type="text" className="pl-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nhập họ tên" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Số điện thoại *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input required name="phone" value={formData.phone} onChange={handleInputChange} type="tel" className="pl-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="09xxxxxxxxx" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email (Tùy chọn)</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input name="email" value={formData.email} onChange={handleInputChange} type="email" className="pl-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="example@gmail.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Địa chỉ cụ thể *</label>
                  <input required name="address" value={formData.address} onChange={handleInputChange} type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Số nhà, Tên đường..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tỉnh / Thành phố</label>
                    <input name="city" value={formData.city} onChange={handleInputChange} type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="VD: Hà Nội" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Phường / Xã</label>
                    <input name="ward" value={formData.ward} onChange={handleInputChange} type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="VD: Xuân Phương" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Ghi chú cho cửa hàng</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                    <textarea name="note" value={formData.note} onChange={handleInputChange} rows={3} className="pl-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" placeholder="Giao ngoài giờ hành chính..."></textarea>
                  </div>
                </div>
              </form>
            </div>

            {/* Box 2: Phương thức thanh toán (Radio Cards) */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
               <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
                <Wallet className="text-blue-600" /> Phương thức thanh toán
              </h2>
              
              <div className="space-y-4">
                {/* Option 1: COD */}
                <label className={`flex items-start p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  formData.paymentMethod === 'cod' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-blue-300 bg-white'
                }`}>
                  <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={() => handlePaymentMethodChange('cod')} className="mt-1 mr-4 w-5 h-5 accent-blue-600" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard size={20} className={formData.paymentMethod === 'cod' ? 'text-blue-600' : 'text-slate-500'} />
                      <span className="font-bold text-slate-900">Thanh toán khi nhận hàng (COD)</span>
                    </div>
                    <p className="text-sm text-slate-500 ml-7">Khách hàng thanh toán bằng tiền mặt cho nhân viên giao hàng.</p>
                  </div>
                </label>

                {/* Option 2: Chuyển khoản */}
                <label className={`flex items-start p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  formData.paymentMethod === 'banking' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-blue-300 bg-white'
                }`}>
                  <input type="radio" name="paymentMethod" value="banking" checked={formData.paymentMethod === 'banking'} onChange={() => handlePaymentMethodChange('banking')} className="mt-1 mr-4 w-5 h-5 accent-blue-600" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={20} className={formData.paymentMethod === 'banking' ? 'text-blue-600' : 'text-slate-500'} />
                      <span className="font-bold text-slate-900">Chuyển khoản ngân hàng</span>
                    </div>
                    <p className="text-sm text-slate-500 ml-7">Chuyển khoản trực tiếp vào tài khoản của cửa hàng.</p>
                  </div>
                </label>

              </div>
            </div>
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG (1/3 chiều rộng) */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 sticky top-24">
              <h2 className="text-xl font-bold text-slate-800 mb-4 pb-4 border-b border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2"><ShoppingBag className="text-blue-600" /> Đơn hàng</span>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold py-1 px-3 rounded-full">{cartItems.length} món</span>
              </h2>
              
              {/* Danh sách sản phẩm cuộn được */}
              <div className="space-y-5 max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item) => {
                  const finalPrice = item.product.priceAfterDiscount > 0 ? item.product.priceAfterDiscount : item.product.price;
                  const originalPrice = item.product.price;
                  const hasDiscount = item.product.priceAfterDiscount > 0 && item.product.priceAfterDiscount < item.product.price;

                  return (
                    <div key={item.cartItemId || item.productId} className="flex gap-4">
                      <img 
                        src={item.product.imageUrl || "https://placehold.co/100x100?text=No+Image"} 
                        alt={item.product.name} 
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 bg-white"
                      />
                      <div className="flex-1 flex flex-col justify-center">
                        <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight mb-1">{item.product.name}</h3>
                        <p className="text-xs text-slate-500 font-medium mb-1">SL: {item.quantity}</p>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-600">{formatVND(finalPrice)}</span>
                          {/* Tính năng từ file của bạn: Hiện giá gốc gạch ngang nếu có giảm giá */}
                          {hasDiscount && (
                            <span className="text-xs text-slate-400 line-through">{formatVND(originalPrice)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phần tính tiền */}
              <div className="mt-6 border-t border-slate-100 pt-5 space-y-3">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Tạm tính</span>
                  <span className="font-semibold text-slate-900">{formatVND(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-emerald-600">Miễn phí</span>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
                  <span className="text-lg font-bold text-slate-800">Tổng cộng</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-red-600 block">{formatVND(subtotal)}</span>
                    <span className="text-xs text-slate-400 font-medium">(Đã bao gồm VAT)</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  form="checkout-form" // Nối nút này với form bên trái
                  disabled={isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 py-4 mt-6 rounded-2xl font-bold text-white transition-all duration-300 ${
                    isSubmitting 
                    ? "bg-slate-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Đang xử lý...
                    </span>
                  ) : (
                    <>ĐẶT HÀNG NGAY <ArrowRight size={20} /></>
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}