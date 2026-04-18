"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api, { fetchCart, checkoutOrder, type CartItem, fetchProductById, resolveImgUrl, logUserActivity } from "@/services/api";
import { 
  MapPin, Phone, User, FileText, ShoppingBag, 
  ArrowRight, CheckCircle2, CreditCard, Mail, Wallet, Ticket
} from "lucide-react";
import Link from "next/link";

function CheckoutContent() {
  const router = useRouter();

  // 1. LẤY DỮ LIỆU TỪ URL
  const searchParams = useSearchParams();
  const buyNowId = searchParams.get("buyNowId");
  const qty = searchParams.get("qty");
  const variantId = searchParams.get("variantId"); 
  
  // Lấy danh sách cartItemId mà khách đã tick từ Giỏ hàng truyền sang
  const selectedCartItemsStr = searchParams.get("cartItems") 
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "", phone: "", address: "", email: "", city: "", ward: "", note: "", paymentMethod: "cod"
  });

  const [useRegisteredInfo, setUseRegisteredInfo] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  
  // STATE LƯU DANH SÁCH MÃ TỪ DATABASE
  const [vouchersList, setVouchersList] = useState<any[]>([]);

  const [appliedFreeshipVoucher, setAppliedFreeshipVoucher] = useState<any>(null);
  const [appliedDiscountVoucher, setAppliedDiscountVoucher] = useState<any>(null);

  const formatVND = (val: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  // 2. TẢI GIỎ HÀNG VÀ VOUCHER TỪ API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingCart(true);
        // Load Vouchers từ Database
        // Lấy ID khách hàng để gửi xuống C#
        let currentUserId = "";
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          currentUserId = JSON.parse(storedUser).id;
        }

        // Gọi API có kèm userId
        const voucherRes = await api.get(`/Voucher${currentUserId ? `?userId=${currentUserId}` : ''}`);
        setVouchersList(voucherRes.data);

        // TRƯỜNG HỢP 1: Mua ngay (Buy Now)
        if (buyNowId && qty) {
          const res = await fetchProductById(buyNowId);
          const p = res.data;
          
          let basePrice = p.price;
          let baseDiscount = p.discount || 0; 
          let variantName = undefined;
          let variantColor = undefined; 
          let variantImageUrl = undefined; 
          
          if (variantId && p.variants) {
             const selectedVariant = p.variants.find((v: any) => v.id === Number(variantId));
             if (selectedVariant) {
                 basePrice = selectedVariant.price; 
                 baseDiscount = selectedVariant.discount ?? p.discount ?? 0; 
                 variantName = selectedVariant.variantName;
                 variantColor = selectedVariant.color; 
                 variantImageUrl = selectedVariant.imageUrl;
             }
          }

          let priceToUse = basePrice; 
          if (baseDiscount > 0) {
              priceToUse = Math.round(basePrice * (1 - baseDiscount / 100));
          }

          setCartItems([{
            cartItemId: 0, 
            productId: p.id, 
            variantId: variantId ? Number(variantId) : undefined,
            variantName: variantName, 
            variantColor: variantColor, 
            
            variantPrice: variantId ? basePrice : undefined,
            variantDiscount: variantId ? baseDiscount : undefined,
            variantImage: variantImageUrl,

            quantity: Number(qty),
            product: { 
                id: p.id, 
                name: p.name, 
                price: p.price, 
                discount: p.discount, 
                priceAfterDiscount: priceToUse,
                imageUrl: p.imageUrl 
            }
          } as any]);
          
        } 
        // TRƯỜNG HỢP 2: Đi từ Giỏ hàng qua (Cart)
        else {
          const res = await fetchCart();
          let items = Array.isArray(res.data) ? res.data : [];
          
          // LỌC CHỈ LẤY NHỮNG MÓN ĐÃ ĐƯỢC TICK
          if (selectedCartItemsStr) {
            const selectedIds = selectedCartItemsStr.split(',').map(Number);
            items = items.filter((item: any) => selectedIds.includes(item.cartItemId));
          }
          // Nếu không truyền ID nào sang (có thể khách lách luật gõ URL), 
          // để an toàn ta đá họ về giỏ hàng (Tùy chọn) hoặc load hết. Ở đây ta cứ gán vào.
          
          setCartItems(items);
          
          // NẾU GIỎ HÀNG TRỐNG HOẶC FILTER XONG TRỐNG THÌ ĐÁ VỀ TRANG SẢN PHẨM HOẶC CART
          if (items.length === 0) {
            // router.push("/cart"); // Bỏ comment dòng này nếu muốn đá về
          }
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setLoadingCart(false);
      }
    };
    loadData();
  }, [buyNowId, qty, variantId, selectedCartItemsStr]);

  // 3. TÍNH TẠM TÍNH
  const subtotal = cartItems.reduce((sum, item) => {
    const finalPrice = item.product.priceAfterDiscount > 0 ? item.product.priceAfterDiscount : item.product.price;
    return sum + finalPrice * item.quantity;
  }, 0);

  // // 4. AUTO-TICK FREESHIP NẾU CÓ TRONG DANH SÁCH TỪ DB
  // useEffect(() => {
  //   if (subtotal >= 100000 && vouchersList.length > 0) {
  //     const fsVoucher = vouchersList.find(v => v.code === "FREESHIP" || v.isFreeship);
  //     if (fsVoucher) setAppliedFreeshipVoucher(fsVoucher);
  //   } else {
  //     setAppliedFreeshipVoucher(null);
  //   }
  // }, [subtotal, vouchersList]);

  // 5. TÍNH PHÍ SHIP & VOUCHER
  let shippingFee = 30000; 
  let discountAmount = 0;

  if (appliedFreeshipVoucher) shippingFee = 0; 

  if (appliedDiscountVoucher) {
    if (appliedDiscountVoucher.discountValue) {
      discountAmount = appliedDiscountVoucher.discountValue;
    } else if (appliedDiscountVoucher.discountPercent) {
      discountAmount = subtotal * appliedDiscountVoucher.discountPercent;
      if (appliedDiscountVoucher.maxDiscount && discountAmount > appliedDiscountVoucher.maxDiscount) {
        discountAmount = appliedDiscountVoucher.maxDiscount;
      }
    }
  }

  const finalTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  // 6. XỬ LÝ FORM
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (["fullName", "phone", "email"].includes(name) && useRegisteredInfo) setUseRegisteredInfo(false);
  };
  const handlePaymentMethodChange = (method: string) => setFormData((prev) => ({ ...prev, paymentMethod: method }));

  const handleToggleRegisteredInfo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setUseRegisteredInfo(isChecked);
    if (isChecked) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setFormData(prev => ({ ...prev, fullName: user.fullName || user.username || "", phone: user.phone || "", email: user.email || "" }));
      } else {
         alert("Bạn chưa đăng nhập hoặc chưa có thông tin đăng ký!");
         setUseRegisteredInfo(false);
      }
    } else {
      setFormData(prev => ({ ...prev, fullName: "", phone: "", email: "" }));
    }
  };

  // 7. HÀM CHECK MÃ BẰNG API THẬT
  const handleApplyVoucher = async (vCode: string, selectedVoucherFromList: any = null) => {
    if (!vCode) return;

    // Tính năng Hủy chọn mã (Click lại vào mã đang bật)
    if (appliedFreeshipVoucher?.code === vCode) { setAppliedFreeshipVoucher(null); return; }
    if (appliedDiscountVoucher?.code === vCode) { setAppliedDiscountVoucher(null); return; }

    try {
      // 1. Lấy thông tin user đang đăng nhập từ LocalStorage (Để C# biết ai đang dùng mã)
      let currentUserId = null;
      if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          currentUserId = userObj.id;
        }
      }

      // 2. Gọi API sang C# kèm theo cả userId
      const res = await api.post("/Voucher/check", { 
        code: vCode, 
        orderValue: subtotal,
        userId: currentUserId // <-- Gửi thêm ID khách hàng xuống Backend
      });
      
      if (res.data.success) {
        // Dùng dữ liệu từ list nếu có, không thì tự map từ API trả về (trường hợp nhập tay)
        const finalVoucher = selectedVoucherFromList || {
            code: res.data.voucher.code,
            title: res.data.voucher.title,
            desc: res.data.voucher.description,
            isFreeship: res.data.voucher.isFreeship,
            minOrder: res.data.voucher.minOrderValue,
            discountValue: res.data.voucher.discountValue,
            discountPercent: res.data.voucher.discountPercent,
            maxDiscount: res.data.voucher.maxDiscountAmount,
            exp: `Hết hạn: ${new Date(res.data.voucher.expiryDate).toLocaleString('vi-VN')}`
        };

        setVouchersList(prevList => {
            const isAlreadyInList = prevList.some(v => v.code === finalVoucher.code);
            if (!isAlreadyInList) {
                return [finalVoucher, ...prevList]; // Đẩy lên đầu danh sách
            }
            return prevList;
        });

        // xóa khối lệnh if alert đi
        if (finalVoucher.isFreeship) {
          // Bỏ cái alert chặn người dùng ở đây, chỉ cần set state bật lên là được
          setAppliedFreeshipVoucher(finalVoucher);
        } else {
          setAppliedDiscountVoucher(finalVoucher);
        }
        setVoucherCodeInput("");
      }
    } catch (error: any) {
      // API C# trả lỗi 400 kèm câu chửi thì FE in nguyên câu chửi đó ra màn hình
      alert(error.response?.data?.message || "Mã không hợp lệ hoặc đã hết hạn!");
    }
  };

  // 8. ĐẶT HÀNG
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) { alert("Giỏ hàng đang trống, không thể thanh toán!"); router.push("/products"); return; }
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.city.trim() || !formData.ward.trim()) {
      alert("⚠️ Vui lòng điền đầy đủ Họ tên, Số điện thoại, Địa chỉ, Tỉnh/Thành phố và Phường/Xã!"); return;
    }
    
    try {
      setIsSubmitting(true);

      // Nhét mã Voucher vào Payload để lưu vào Database C#
      let usedCodes = [];
      if (appliedFreeshipVoucher) usedCodes.push(appliedFreeshipVoucher.code);
      if (appliedDiscountVoucher) usedCodes.push(appliedDiscountVoucher.code);

      // Lấy danh sách ID đã tick từ URL (ví dụ: "1,5,8" -> [1, 5, 8])
      const selectedCartItemsStr = searchParams.get("cartItems");
      let selectedIds: number[] = [];
      if (selectedCartItemsStr) {
        selectedIds = selectedCartItemsStr.split(',').map(Number);
      }

      // Tạo Payload gửi xuống Backend
      const payload: any = { 
        ...formData,
        discountAmount: discountAmount,
        shippingFee: shippingFee, 
        appliedVoucherCode: usedCodes.join(", "),
        
        // DÒNG QUAN TRỌNG NHẤT: Gửi danh sách đã tick cho Backend
        selectedCartItemIds: selectedIds 
      };
      
      if (buyNowId && qty) {
        payload.buyNowProductId = Number(buyNowId);
        payload.buyNowQuantity = Number(qty);
        if (variantId) payload.buyNowVariantId = Number(variantId);
      }
      
      const orderRes = await checkoutOrder(payload);
      cartItems.forEach(item => { 
        // 1. Cộng doanh số cho Admin
        // trackProductPurchase(item.product.id, item.quantity).catch(err => console.error(err)); 
        // 2. Cộng 5 điểm cho AI
        logUserActivity({ productId: item.product.id, actionType: "Purchase" }).catch(err => console.error(err));
      });
      const newOrderId = orderRes?.data?.orderId || orderRes?.data?.id || Math.floor(Date.now() / 1000); 

      if (formData.paymentMethod === 'vnpay') {
        const token = localStorage.getItem("token");
        const vnpayPayload = { orderId: Number(newOrderId), amount: finalTotal, orderDescription: `Thanh toan don hang ${newOrderId}`, name: formData.fullName || "Khach hang" };
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api";
        const vnpRes = await fetch(`${baseUrl.replace('/api', '')}/api/Payment/create-payment-url`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify(vnpayPayload)
        });

        if (!vnpRes.ok) throw new Error(`Cổng VNPay tạm thời không phản hồi (Lỗi ${vnpRes.status}). Vui lòng chọn COD.`);
        const vnpData = await vnpRes.json();
        if (vnpData.success && vnpData.paymentUrl) {
          window.dispatchEvent(new Event("cartUpdated")); 
          window.location.href = vnpData.paymentUrl; return; 
        } else {
          alert("Có lỗi khi tạo link VNPay. Vui lòng thử lại!"); setIsSubmitting(false); return;
        }
      }

      setIsSuccess(true);
      window.dispatchEvent(new Event("cartUpdated")); 
      setTimeout(() => { router.push("/orders"); }, 2500);
      
    } catch (error: any) {
      console.error("Lỗi đặt hàng:", error);
      alert(error?.response?.data?.message || "Có lỗi xảy ra khi thanh toán. Vui lòng kiểm tra lại kết nối!");
      setIsSubmitting(false);
    }
  };

  if (loadingCart) return (<div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-slate-50"><div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div><p className="text-slate-500 font-medium">Đang tải giỏ hàng của bạn...</p></div>);
  if (isSuccess) return (<div className="min-h-[80vh] flex items-center justify-center bg-slate-50 px-4"><div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center max-w-md w-full animate-in zoom-in duration-300"><div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10 text-emerald-600" /></div><h2 className="text-2xl font-bold text-slate-900 mb-2">Chốt đơn thành công!</h2><p className="text-slate-500 mb-8">Hệ thống đang xử lý đơn hàng của bạn. Cảm ơn bạn đã mua sắm!</p><div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-600 h-full animate-[pulse_2.5s_ease-in-out_infinite] w-full origin-left"></div></div><p className="text-sm text-slate-400 mt-4">Tự động chuyển đến lịch sử đơn hàng...</p></div></div>);
  if (cartItems.length === 0) return (<div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-50 px-4"><div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6"><ShoppingBag className="w-12 h-12 text-slate-300" /></div><h2 className="text-2xl font-bold text-slate-800 mb-2">Giỏ hàng trống</h2><p className="text-slate-500 mb-8 text-center max-w-md">Bạn chưa chọn sản phẩm nào để thanh toán. Hãy dạo một vòng xem có gì ưng ý không nhé!</p><button onClick={() => router.push("/products")} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95">Tiếp tục mua sắm</button></div>);

  const hasAnyVoucher = appliedFreeshipVoucher || appliedDiscountVoucher;
  const isEligibleForFreeship = subtotal >= 100000 && !appliedFreeshipVoucher;

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500 font-medium">
          <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link><span>/</span><Link href="/cart" className="hover:text-blue-600 transition">Giỏ hàng</Link><span>/</span><span className="text-slate-900">Thanh toán</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Thanh toán an toàn</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* CỘT TRÁI */}
          <div className="w-full lg:w-2/3 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100 flex items-center justify-between"><span className="flex items-center gap-2"><MapPin className="text-blue-600" /> Thông tin nhận hàng</span></h2>
              <div className="mb-5 flex items-center gap-3">
                <input type="checkbox" id="useRegistered" checked={useRegisteredInfo} onChange={handleToggleRegisteredInfo} className="h-5 w-5 cursor-pointer rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-blue-600 transition-all"/>
                <label htmlFor="useRegistered" className="cursor-pointer text-base font-semibold text-slate-900 select-none hover:text-blue-700 transition-colors">Dùng thông tin cá nhân đã đăng ký</label>
              </div>
              <form id="checkout-form" onSubmit={handleCheckout} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-sm font-semibold text-slate-700 mb-2">Họ và tên *</label><div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input required name="fullName" value={formData.fullName} onChange={handleInputChange} type="text" className="pl-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nhập họ tên" /></div></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-2">Số điện thoại *</label><div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input required name="phone" value={formData.phone} onChange={handleInputChange} type="tel" className="pl-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="09xxxxxxxxx" /></div></div>
                </div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Email (Tùy chọn)</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input name="email" value={formData.email} onChange={handleInputChange} type="email" className="pl-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="example@gmail.com" /></div></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Địa chỉ cụ thể *</label><input required name="address" value={formData.address} onChange={handleInputChange} type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Số nhà, Tên đường..." /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-sm font-semibold text-slate-700 mb-2">Tỉnh / Thành phố *</label><input required name="city" value={formData.city} onChange={handleInputChange} type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="VD: Hà Nội" /></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-2">Phường / Xã *</label><input required name="ward" value={formData.ward} onChange={handleInputChange} type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="VD: Xuân Phương" /></div>
                </div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-2">Ghi chú cho cửa hàng</label><div className="relative"><FileText className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" /><textarea name="note" value={formData.note} onChange={handleInputChange} rows={3} className="pl-11 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" placeholder="Giao ngoài giờ hành chính..."></textarea></div></div>
              </form>
            </div>
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
               <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100"><Wallet className="text-blue-600" /> Phương thức thanh toán</h2>
              <div className="space-y-4">
                <label className={`flex items-start p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'cod' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-blue-300 bg-white'}`}>
                  <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={() => handlePaymentMethodChange('cod')} className="mt-1 mr-4 w-5 h-5 accent-blue-600" />
                  <div><div className="flex items-center gap-2 mb-1"><CreditCard size={20} className={formData.paymentMethod === 'cod' ? 'text-blue-600' : 'text-slate-500'} /><span className="font-bold text-slate-900">Thanh toán khi nhận hàng (COD)</span></div><p className="text-sm text-slate-500 ml-7">Khách hàng thanh toán bằng tiền mặt cho nhân viên giao hàng.</p></div>
                </label>
                <label className={`flex items-start p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'vnpay' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-blue-300 bg-white'}`}>
                  <input type="radio" name="paymentMethod" value="vnpay" checked={formData.paymentMethod === 'vnpay'} onChange={() => handlePaymentMethodChange('vnpay')} className="mt-1 mr-4 w-5 h-5 accent-blue-600" />
                  <div className="flex-1"><div className="flex items-center gap-2 mb-1"><img src="/vnpay.png" alt="VNPAY" className="h-6 object-contain" /><span className="font-bold text-slate-900 ml-1">Thanh toán qua VNPAY</span></div><p className="text-sm text-slate-500 ml-0">Thanh toán an toàn qua ví điện tử, thẻ ATM nội địa hoặc thẻ quốc tế (Visa, MasterCard).</p></div>
                </label>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 sticky top-24">
              <h2 className="text-xl font-bold text-slate-800 mb-4 pb-4 border-b border-slate-100 flex items-center justify-between"><span className="flex items-center gap-2"><ShoppingBag className="text-blue-600" /> Đơn hàng</span><span className="bg-blue-100 text-blue-700 text-xs font-bold py-1 px-3 rounded-full">{cartItems.length} món</span></h2>
              <div className="space-y-5 max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item) => {
                  const finalPrice = item.product.priceAfterDiscount > 0 ? item.product.priceAfterDiscount : item.product.price;
                  const originalPrice = item.product.price;
                  const hasDiscount = item.product.priceAfterDiscount > 0 && item.product.priceAfterDiscount < item.product.price;
                  return (
                    <div key={item.cartItemId || item.productId} className="flex gap-4">
                      <img src={resolveImgUrl(item.product.imageUrl)} alt={item.product.name} className="w-16 h-16 object-cover rounded-xl border border-slate-200 bg-white"/>
                      <div className="flex-1 flex flex-col justify-center">
                        <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight mb-1">{item.product.name}</h3>
                        {(item.variantName || item.variantColor) && (
                          <span className="text-xs text-slate-500 font-medium bg-slate-100 w-max px-2 py-0.5 rounded-md mb-1">
                            {item.variantColor ? `${item.variantColor} - ` : ''}{item.variantName}
                          </span>
                        )}
                        <p className="text-xs text-slate-500 font-medium mb-1">SL: {item.quantity}</p>
                        <div className="flex items-center gap-2"><span className="text-sm font-bold text-blue-600">{formatVND(finalPrice)}</span>{hasDiscount && <span className="text-xs text-slate-400 line-through">{formatVND(originalPrice)}</span>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* NÚT MỞ MODAL VOUCHER */}
              <div className="mt-5 border-t border-slate-100 pt-5 mb-4">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(true)}
                  className="w-full bg-white border border-slate-200 hover:border-blue-400 p-4 rounded-xl transition shadow-sm flex flex-col items-center justify-center text-center gap-1 group"
                >
                  {hasAnyVoucher ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3 shrink-0">
                        <Ticket className="w-6 h-6 text-blue-600" />
                        <span className="font-bold text-slate-800">Mã ưu đãi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {appliedFreeshipVoucher && (
                            <span className="text-blue-700 font-bold bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs sm:text-[13px] whitespace-nowrap shadow-sm transition-all hover:scale-105">
                              🚚 Freeship
                            </span>
                          )}
                          {appliedDiscountVoucher && (
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs sm:text-[13px] whitespace-nowrap shadow-sm transition-all hover:scale-105">
                              🏷️ -{formatVND(discountAmount)}
                            </span>
                          )}
                        </div>
                        <ArrowRight size={16} className="text-slate-400 shrink-0" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <Ticket className="w-6 h-6 text-blue-600" />
                        <div className="flex flex-col items-start">
                          <span className="font-bold text-slate-800">Mã ưu đãi</span>
                          <span className="text-xs text-slate-500 font-medium group-hover:text-blue-600 transition-colors">
                            Chọn hoặc nhập mã
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </button>

                {isEligibleForFreeship && (
                  <p className="mt-2 text-sm font-medium text-emerald-600">
                    🚚 Freeship cho đơn hàng từ 100.000đ — vào mục <span className="font-bold">Mã ưu đãi</span> để chọn
                  </p>
                )}
              </div>

              {/* TÍNH TIỀN */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-600"><span>Tạm tính</span><span className="font-semibold text-slate-900">{formatVND(subtotal)}</span></div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Phí vận chuyển</span>
                  {shippingFee === 0 ? <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-100">Miễn phí</span> : <span className="font-semibold text-slate-900">{formatVND(shippingFee)}</span>}
                </div>
                {discountAmount > 0 && <div className="flex justify-between items-center text-emerald-600"><span>Voucher giảm giá</span><span className="font-semibold">- {formatVND(discountAmount)}</span></div>}
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
                  <span className="text-lg font-bold text-slate-800">Tổng cộng</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-red-600 block">{formatVND(finalTotal)}</span>
                    <span className="text-xs text-slate-400 font-medium">(Đã bao gồm VAT)</span>
                  </div>
                </div>

                <button type="submit" form="checkout-form" disabled={isSubmitting} className={`w-full flex items-center justify-center gap-2 py-4 mt-6 rounded-2xl font-bold text-white transition-all duration-300 ${isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]"}`}>
                  {isSubmitting ? <span className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Đang xử lý...</span> : <>ĐẶT HÀNG NGAY <ArrowRight size={20} /></>}
                </button>
              </div>
            </div>
          </div>
          
          {/* MODAL VOUCHER RENDER TỪ DATABASE */}
          {showVoucherModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-slate-50 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm z-10">
                  <div className="w-8"></div>
                  <h3 className="font-bold text-base text-slate-800 uppercase text-center tracking-wider">Mã Ưu Đãi</h3>
                  <button onClick={() => setShowVoucherModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-4 overflow-y-auto">
                  <div className="flex gap-2 mb-6">
                    <input type="text" value={voucherCodeInput} onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())} placeholder="Nhập mã ưu đãi" className="flex-1 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 shadow-sm transition-all"/>
                    <button onClick={() => { if(voucherCodeInput) handleApplyVoucher(voucherCodeInput); }} className={`px-6 py-3 rounded-xl font-bold text-sm transition shadow-sm ${voucherCodeInput ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/30' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>ÁP DỤNG</button>
                  </div>
                  <div className="space-y-4">
                    {/* Map từ danh sách API trả về */}
                    {vouchersList.map(v => {
                    // 1. Kiểm tra các điều kiện để mã "KHÔNG DÙNG ĐƯỢC"
                    const isMinOrderNotMet = subtotal < v.minOrder;
                    const isUsedUp = v.isSystemOut || v.isUserOut;
                    const canNotUse = isMinOrderNotMet || isUsedUp;

                    const isSelected = appliedFreeshipVoucher?.code === v.code || appliedDiscountVoucher?.code === v.code;
                    
                    // 2. Xác định thông báo lỗi để hiện cho khách
                    let errorMessage = "";
                    if (v.isSystemOut) errorMessage = "Mã đã hết lượt sử dụng toàn hệ thống";
                    else if (v.isUserOut) errorMessage = "Bạn đã dùng hết lượt mã này";
                    else if (isMinOrderNotMet) errorMessage = `Mua thêm ${formatVND(v.minOrder - subtotal)} để dùng mã`;

                    return (
                      <div 
                        key={v.code} 
                        onClick={() => !canNotUse && handleApplyVoucher(v.code, v)} 
                        className={`relative p-3 flex gap-3 border rounded-xl overflow-hidden transition-all duration-200 
                          ${isSelected ? 'border-blue-500 bg-blue-50/30' : 'bg-white border-slate-200'} 
                          ${canNotUse ? 'cursor-not-allowed opacity-60 grayscale-[0.8]' : 'cursor-pointer hover:border-blue-300'}
                        `}
                      >
                        {/* TAG x3 CÁ NHÂN */}
                        {!v.isUserOut && v.remainingForUser < 100 && (
                          <div className="absolute top-0 right-0 bg-red-50 text-red-500 text-[11px] font-black px-2 py-0.5 rounded-bl-lg z-10 border-l border-b border-red-100">
                            x{v.remainingForUser}
                          </div>
                        )}

                        {/* ICON VOUCHER */}
                        <div className={`w-20 rounded-lg flex flex-col items-center justify-center border border-dashed mt-2 
                          ${v.isFreeship ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'}
                        `}>
                          <span className="text-2xl">{v.isFreeship ? '🚚' : '🏷️'}</span>
                        </div>

                        <div className="flex-1 py-1 mt-1">
                          <h4 className="font-bold text-sm text-slate-800 pr-8">{v.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{v.desc}</p>


                          {/*  DÒNG MÃ VOUCHER Ở ĐÂY */}
                          <p className="text-[10px] bg-slate-100 text-slate-600 font-medium w-max px-1.5 py-0.5 rounded mt-1.5 border border-slate-200">
                            Mã: <span className="font-bold text-slate-800">{v.code}</span>
                          </p>
                          
                          {/* HIỆN LÝ DO KHÔNG DÙNG ĐƯỢC (Nếu có) */}
                          {errorMessage ? (
                            <p className="text-[10px] font-bold text-orange-600 mt-2 italic">⚠️ {errorMessage}</p>
                          ) : (
                            <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{width: `${(v.usedCount/v.usageLimit)*100}%`}}></div>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2.5">
                            <span className="text-[10px] text-slate-400 font-medium">{v.exp}</span>
                            <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300 text-transparent'}`}>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                    {vouchersList.length === 0 && (
                      <p className="text-center text-slate-500 text-sm mt-4">Hiện chưa có mã ưu đãi nào.</p>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-10">
                  <button onClick={() => setShowVoucherModal(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-blue-500/30 transition-all active:scale-[0.98] tracking-wide">XÁC NHẬN</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-slate-50"><div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div><p className="text-slate-500 font-medium">Đang chuẩn bị trang thanh toán...</p></div>}>
      <CheckoutContent />
    </Suspense>
  );
}