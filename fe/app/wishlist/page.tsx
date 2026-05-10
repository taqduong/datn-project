'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, XCircle, ArrowRight, ShoppingCart, Trash2, Tag } from 'lucide-react';
import { fetchWishlist, removeFromWishlist, clearWishlist, addToCart, trackProductAddToCart, logUserActivity } from '@/services/api';
import Modal from '@/components/Modal'; 

type Product = {
  id: number;
  name: string;
  price: number;
  discount: number;
  priceAfterDiscount?: number;
  imageUrl?: string;
  imageUrls?: string | string[];
  stock: number;
  variants?: any[]; 
};

type WishlistItem = {
  id: number;
  productId: number;
  createdAt: string;
  product: Product;
};

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // STATE CHO MODAL THÊM VÀO GIỎ
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedModalProduct, setSelectedModalProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null); 
  const [quantity, setQuantity] = useState<number | string>(1);
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); 
    if (val === '') {
      setQuantity('');
      return;
    }
    setQuantity(Number(val));
  };

  const handleQuantityBlur = () => {
    let validQty = Number(quantity);
    if (isNaN(validQty) || validQty < 1) validQty = 1;
    setQuantity(validQty);
  };
  const [isAdding, setIsAdding] = useState(false);

  

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetchWishlist();
      if (res.data && res.data.success) {
        setWishlist(res.data.data);
      } else {
        setWishlist([]);
      }
    } catch (error) {
      console.error('Lỗi khi tải Wishlist:', error);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (value: string | string[] | undefined): string => {
    if (!value) return "https://placehold.co/400x400?text=No+Image";
    let url = Array.isArray(value) ? value[0] : value;
    try {
      if (url.startsWith("[")) {
        const arr = JSON.parse(url);
        if (Array.isArray(arr) && arr.length > 0) url = arr[0];
      }
      if (url.includes(",")) url = url.split(",")[0].trim();
      if (!/^https?:\/\//i.test(url)) {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
        url = `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
      }
      return url;
    } catch (e) {
      return "https://placehold.co/400x400?text=Error";
    }
  };

  const handleRemove = async (productId: number) => {
    try {
      await removeFromWishlist(productId);
      setWishlist((prev) => prev.filter((item) => item.productId !== productId));
      window.dispatchEvent(new Event('wishlistUpdated'));
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      alert('Không thể xóa sản phẩm, vui lòng thử lại!');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Bạn có chắc chắn muốn dọn sạch danh sách yêu thích không?')) return;
    try {
      await clearWishlist();
      setWishlist([]);
      window.dispatchEvent(new Event('wishlistUpdated'));
      alert('Đã xóa sạch danh sách yêu thích!');
    } catch (error) {
      console.error('Lỗi khi dọn dẹp wishlist:', error);
      alert('Đã xảy ra lỗi khi xóa!');
    }
  };

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  // HÀM KHI BẤM XÁC NHẬN TRONG MODAL
  const handleConfirmAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedModalProduct) return;

    const modalHasVariants = selectedModalProduct.variants && selectedModalProduct.variants.length > 0;
    
    if (modalHasVariants && !selectedVariant) {
      alert("Vui lòng chọn phân loại sản phẩm!");
      return;
    }

    if (Number(quantity) > maxStockLimit) {
      alert("Sản phẩm không đủ số lượng trong kho");
      return;
    }

    try {
      setIsAdding(true);
      await addToCart(selectedModalProduct.id, Number(quantity), modalHasVariants ? selectedVariant.id : undefined);
      trackProductAddToCart(selectedModalProduct.id).catch(err => console.error(err));

      // BÁO CHO AI (THÊM DÒNG NÀY): Cộng 3 điểm AddToCart
      logUserActivity({ productId: selectedModalProduct.id, actionType: "AddToCart" }).catch(err => console.error(err));
      
      window.dispatchEvent(new Event('cartUpdated'));
      setShowVariantModal(false);
      alert(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
    } catch (error) {
      console.error('Lỗi thêm giỏ hàng:', error);
      alert('Có lỗi xảy ra, không thể thêm vào giỏ.');
    } finally {
      setIsAdding(false);
    }
  };

  // Kế thừa logic xử lý dữ liệu và tính toán tương tự Component ProductCard
  const modalHasVariants = selectedModalProduct?.variants && selectedModalProduct.variants.length > 0;
  const modalDiscountRate = (selectedModalProduct?.discount || 0) / 100;
  const modalHasDiscount = !!selectedModalProduct?.discount && selectedModalProduct.discount > 0;
  
  let modalMinPrice = selectedModalProduct?.price || 0;
  if (modalHasVariants && selectedModalProduct?.variants) {
    const prices = selectedModalProduct.variants.map((v: any) => v.price || 0);
    modalMinPrice = Math.min(...prices);
  }

  // HÀM TÍNH GIÁ ĐỘNG CHO MODAL
  const modalBasePrice = (modalHasVariants && selectedVariant) ? selectedVariant.price : (selectedModalProduct?.price || 0);
  const modalActiveDiscount = (modalHasVariants && selectedVariant) 
    ? (selectedVariant.discount ?? selectedModalProduct?.discount ?? 0)
    : (selectedModalProduct?.discount || 0);
  
  const modalCurrentPrice = Math.round(modalBasePrice * (1 - modalActiveDiscount / 100));

  const maxStockLimit = modalHasVariants 
    ? (selectedVariant ? selectedVariant.stock : 0) 
    : (selectedModalProduct?.stock || 0);

  // ===== THÊM MÀU =====
  const getHexColor = (colorName?: string) => {
    if (!colorName) return null;
    const cleanName = colorName.trim().toLowerCase();
    const map: { [key: string]: string } = {
      đỏ: "#ef4444", cam: "#f97316", vàng: "#eab308", "xanh dương": "#3b82f6",
      "xanh lá cây": "#22c55e", tím: "#a855f7", đen: "#000000", trắng: "#ffffff",
      xanh: "#3b82f6", "xanh lá": "#22c55e", xám: "#6b7280", hồng: "#ec4899",
      bạc: "#c0c0c0", nâu: "#8b4513", kem: "#f5f5dc", "vàng nhạt": "#fef08a",
    };
    return map[cleanName] || null;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ================= HEADER ================= */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-500 shadow-inner">
              <Heart className="w-7 h-7 fill-pink-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Danh sách yêu thích
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                {wishlist.length} sản phẩm đang chờ bạn mang về
              </p>
            </div>
          </div>

          {wishlist.length > 0 && !loading && (
            <button
              onClick={handleClearAll}
              className="group flex items-center justify-center gap-2 bg-white border-2 border-red-100 hover:border-red-500 text-red-500 px-6 py-2.5 rounded-xl font-bold transition-all duration-300 hover:bg-red-500 hover:text-white shadow-sm"
            >
              <Trash2 size={18} className="group-hover:animate-bounce" />
              Xóa tất cả
            </button>
          )}
        </div>

        {/* ================= CONTENT ================= */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 animate-pulse">
                <div className="w-full h-48 bg-slate-200 rounded-2xl mb-4"></div>
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-6"></div>
                <div className="flex gap-2 mt-auto">
                  <div className="h-10 bg-slate-200 rounded-xl flex-1"></div>
                  <div className="h-10 bg-slate-200 rounded-xl w-10"></div>
                </div>
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 p-16 text-center max-w-3xl mx-auto border border-slate-100">
            <div className="w-32 h-32 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
              <Heart className="w-16 h-16 text-pink-400 opacity-50" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Trái tim bạn đang trống!</h2>
            <p className="text-slate-500 text-lg mb-10 max-w-md mx-auto">
              Hãy dạo quanh cửa hàng và "thả tim" cho những món đồ bạn yêu thích nhé. Chúng tôi sẽ giữ hộ bạn ở đây.
            </p>
            <button
              onClick={() => router.push('/products')}
              className="inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-pink-600 transition-colors duration-300 shadow-lg shadow-slate-900/20"
            >
              Khám phá sản phẩm ngay
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
            {wishlist.map((item) => {
              const p = item.product;
              const imageUrl = getImageUrl(p.imageUrls || p.imageUrl);
              
              // ==========================================
              // Logic xác định giá trị sản phẩm theo thuộc tính
              // ==========================================
              const hasVariants = p.variants && p.variants.length > 0;
              const generalDiscount = p.discount || 0;

              let minOriginal = p.price || 0;
              let maxOriginal = p.price || 0;
              let minFinal = p.priceAfterDiscount ?? (p.price * (1 - generalDiscount / 100));
              let maxFinal = minFinal;
              let bestDiscount = generalDiscount;

              if (hasVariants) {
                const originalPrices = p.variants!.map((v: any) => v.price || 0);
                minOriginal = Math.min(...originalPrices);
                maxOriginal = Math.max(...originalPrices);

                const finalPrices = p.variants!.map((v: any) => {
                  const d = v.discount ?? generalDiscount;
                  return Math.round(v.price * (1 - d / 100));
                });
                minFinal = Math.min(...finalPrices);
                maxFinal = Math.max(...finalPrices);

                const discounts = p.variants!.map((v: any) => v.discount ?? generalDiscount);
                bestDiscount = Math.max(...discounts);
              }

              const isPriceRange = minFinal !== maxFinal;
              const totalStock = hasVariants
                ? p.variants!.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
                : (p.stock || 0);

              // ==========================================
              // 2. RENDER GIAO DIỆN
              // ==========================================
              return (
                <div
                  key={item.id}
                  className="group bg-white rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-pink-100/50 transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col relative"
                >
                  <button
                    onClick={() => handleRemove(p.id)}
                    className="absolute top-4 right-4 z-20 w-8 h-8 bg-white/80 backdrop-blur-md hover:bg-red-500 text-slate-400 hover:text-white flex items-center justify-center rounded-full shadow-sm transition-all duration-300"
                    title="Bỏ thích"
                  >
                    <XCircle size={18} />
                  </button>

                  {bestDiscount > 0 && (
                    <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-md shadow-red-500/30 flex items-center gap-1">
                      <Tag size={12} /> -{bestDiscount}%
                    </div>
                  )}

                  <div 
                    className="relative w-full pt-[100%] bg-slate-50 overflow-hidden cursor-pointer"
                    onClick={() => router.push(`/products/${p.id}`)}
                  >
                    <img
                      src={imageUrl}
                      alt={p.name}
                      className={`absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 mix-blend-multiply ${totalStock > 0 ? 'group-hover:scale-110' : 'opacity-60'}`}
                    />
                    
                    {totalStock <= 0 && (
                      <div className="absolute right-4 bottom-4 z-20 rotate-[18deg] transform-gpu">
                        <div className="rounded-full border-[4px] border-red-600 px-4 py-2 text-sm font-extrabold uppercase tracking-wider text-red-600 bg-white/80 shadow-md">
                          <span className="font-sans antialiased text-sm font-black text-red-600">
                            HẾT HÀNG
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 
                      className="text-base font-bold text-slate-900 line-clamp-2 mb-2 cursor-pointer group-hover:text-pink-600 transition-colors"
                      onClick={() => router.push(`/products/${p.id}`)}
                    >
                      {p.name}
                    </h3>

                    <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                      <div className="flex flex-col flex-wrap items-baseline gap-1">
                        <span className="text-xl font-bold text-red-600">
                          {isPriceRange 
                            ? `${formatVND(minFinal)} - ${formatVND(maxFinal)}` 
                            : formatVND(minFinal)}
                        </span>
                        {bestDiscount > 0 && (
                          <span className="text-xs font-semibold text-slate-400 line-through">
                            {minOriginal !== maxOriginal 
                              ? `${formatVND(minOriginal)} - ${formatVND(maxOriginal)}` 
                              : formatVND(minOriginal)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          disabled={totalStock <= 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (totalStock <= 0) return;
                            
                            setSelectedModalProduct(p);
                            if (hasVariants && p.variants && p.variants.length > 0) {
                              // Mặc định chọn biến thể đầu tiên và lấy màu của nó
                              setSelectedVariant(p.variants[0]);
                              setSelectedColor(p.variants[0].color); 
                            } else {
                              setSelectedVariant(null);
                              setSelectedColor(null);
                            }
                            setQuantity(1);
                            setShowVariantModal(true);
                          }}
                          className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md transition-colors duration-300 ${
                            totalStock <= 0 
                              ? "bg-slate-300 cursor-not-allowed" 
                              : "bg-slate-900 hover:bg-pink-500"
                          }`}
                          title={totalStock <= 0 ? "Hết hàng" : "Thêm vào giỏ"}
                        >
                          <ShoppingCart size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POPUP MODAL */}
      {selectedModalProduct && (
        <Modal isOpen={showVariantModal} onClose={() => setShowVariantModal(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 relative">
            <div className="flex flex-col gap-6">
              
              <div className="flex items-start gap-4 border-b border-gray-100 pb-4">
                <div className="relative h-60 w-60 shrink-0 aspect-square overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 p-1.5 shadow-sm">
                  <img 
                    src={getImageUrl((modalHasVariants && selectedVariant && selectedVariant.imageUrl) || selectedModalProduct.imageUrls || selectedModalProduct.imageUrl)} 
                    alt={selectedModalProduct.name} 
                    className="h-full w-full object-contain rounded-3xl"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <h3 className="line-clamp-2 text-base font-bold text-gray-900 pr-10">{selectedModalProduct.name}</h3>
                  
                  {/* BỌC GIÁ TIỀN VÀ NÚT CHI TIẾT VÀO CHUNG 1 DÒNG */}
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-2xl font-bold text-red-600">
                        {formatVND(modalCurrentPrice)}
                      </span>
                      {modalHasDiscount && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatVND(modalHasVariants && selectedVariant ? selectedVariant.price : modalMinPrice)}
                        </span>
                      )}
                    </div>

                    {/* Nút Chi tiết >> */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/products/${selectedModalProduct.id}`);
                      }}
                      className="shrink-0 flex items-center gap-1 rounded border border-blue-600 px-3 py-1.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      Chi tiết <span className="text-[14px] leading-none">»</span>
                    </button>
                  </div>
                  {modalHasVariants && selectedVariant && (
                    <p className="mt-1.5 text-sm text-slate-600">
                      Bạn đang chọn: <span className="font-semibold text-gray-900">
                        {selectedVariant.color ? `${selectedVariant.color} - ` : ''}{selectedVariant.variantName}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {modalHasVariants && (
                <div className="space-y-6">
                  {/* PHẦN 1: MÀU SẮC */}
                  {(() => {
                    // Tiền xử lý dữ liệu: Loại bỏ các giá trị không hợp lệ
                    const uniqueColors = Array.from(
                      new Set(selectedModalProduct.variants?.map((v: any) => v.color).filter(Boolean))
                    ) as string[];

                    // Điều kiện hiển thị: Vô hiệu hóa phân đoạn nếu dữ liệu thuộc tính trống.
                    if (uniqueColors.length === 0) return null;

                    return (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Màu sắc</h3>
                        <div className="flex flex-wrap gap-3">
                          {uniqueColors.map(color => {
                            const colorHex = getHexColor(color);
                            const isWhite = colorHex === "#ffffff";

                            return (
                              <button
                                key={color}
                                onClick={() => {
                                  setSelectedColor(color);
                                  const firstVarOfColor = selectedModalProduct.variants?.find((v: any) => v.color === color);
                                  setSelectedVariant(firstVarOfColor);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                  selectedColor === color 
                                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' 
                                  : 'border-gray-100 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                              >
                                {colorHex && (
                                  <div 
                                    className={`w-4 h-4 rounded-full shadow-sm shrink-0 ${isWhite ? 'border border-gray-300' : ''}`} 
                                    style={{ backgroundColor: colorHex }} 
                                  />
                                )}
                                {color}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* PHẦN 2: KÍCH THƯỚC / PHÂN LOẠI */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kích thước / Phân loại</h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedModalProduct.variants
                        ?.filter(v => v.color === selectedColor) // Chỉ hiện phân loại của màu đang chọn
                        .map((v) => {
                          const isOutOfStock = v.stock <= 0;
                          return (
                            <button
                              key={v.id}
                              disabled={isOutOfStock}
                              onClick={() => setSelectedVariant(v)}
                              className={`px-5 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                                selectedVariant?.id === v.id
                                ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                                : 'border-gray-100 bg-white text-gray-600 hover:border-gray-300'
                              } ${isOutOfStock ? 'opacity-40 cursor-not-allowed bg-gray-50' : ''}`}
                            >
                              {v.variantName}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Số lượng</h3>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-300">
                    <button 
                      onClick={() => setQuantity(prev => Math.max(Number(prev) - 1, 1))}
                      className="px-3 py-1.5 text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
                    >−</button>
                    
                    <input 
                      type="text"
                      value={quantity}
                      onChange={handleQuantityChange}
                      onBlur={handleQuantityBlur}
                      disabled={maxStockLimit <= 0}
                      className="w-12 border-x border-slate-300 px-2 py-1.5 text-center font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
                    />

                    <button 
                      onClick={() => setQuantity(prev => Math.min(Number(prev) + 1, maxStockLimit))}
                      disabled={maxStockLimit <= 0 || Number(quantity) >= maxStockLimit}
                      className="px-3 py-1.5 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >+</button>
                  </div>
                  <p className="text-xs text-slate-500">Tối đa: {maxStockLimit} sản phẩm</p>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={handleConfirmAddToCart}
                  disabled={(modalHasVariants && !selectedVariant) || isAdding || maxStockLimit <= 0}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-bold text-white shadow transition ${
                    (modalHasVariants && !selectedVariant) || maxStockLimit <= 0
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isAdding ? "Đang xử lý..." : "Thêm vào giỏ hàng"}
                </button>
              </div>

            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}