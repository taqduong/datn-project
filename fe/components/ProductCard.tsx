'use client'

import Link from "next/link";
import { ShoppingCart, Heart, Star, ListPlus, X, Truck } from "lucide-react"; 
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart, addToWishlist, trackProductAddToCart, logUserActivity } from "@/services/api";
import Modal from "@/components/Modal"; // 

// THÊM TRƯỜNG variants VÀO INTERFACE
export interface Product {
  id: number;
  name: string;
  price: number;
  priceAfterDiscount?: number;
  discount?: number;
  imageUrl?: string;
  categoryName?: string;
  stock: number;
  soldCount?: number;
  averageRating?: number; 
  totalReviews?: number;
  variants?: any[]; 
}

export default function ProductCard({ product }: { product: Product }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);
  const router = useRouter();

  // 1. STATE MỚI QUẢN LÝ MODAL CHỌN BIẾN THỂ (QUICK ADD)
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null); // THÊM STATE QUẢN LÝ MÀU

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

  // LOGIC XỬ LÝ BIẾN THỂ (TÍNH KHOẢNG GIÁ & TỔNG TỒN KHO)
  const hasVariants = product.variants && product.variants.length > 0;
  
  const totalStock = hasVariants
    ? product.variants!.reduce((sum, v) => sum + (v.stock || 0), 0)
    : product.stock;

  // LOGIC TÍNH TOÁN GIÁ & GIẢM GIÁ MỚI NHẤT
  let minOriginalPrice = product.price;
  let maxOriginalPrice = product.price;
  let minFinalPrice = product.priceAfterDiscount ?? (product.price * (1 - (product.discount || 0) / 100));
  let maxFinalPrice = minFinalPrice;
  let maxDiscount = product.discount || 0;

  if (hasVariants) {
    const originalPrices = product.variants!.map(v => v.price);
    minOriginalPrice = Math.min(...originalPrices);
    maxOriginalPrice = Math.max(...originalPrices);

    // Tính giá sau giảm của từng biến thể (ưu tiên giảm riêng, không có thì lấy giảm chung)
    const finalPrices = product.variants!.map(v => {
      const d = v.discount ?? product.discount ?? 0;
      return v.price * (1 - d / 100);
    });
    minFinalPrice = Math.min(...finalPrices);
    maxFinalPrice = Math.max(...finalPrices);

    // Tìm mức giảm giá cao nhất để treo biển "Sale sập sàn"
    const discounts = product.variants!.map(v => v.discount ?? product.discount ?? 0);
    maxDiscount = Math.max(...discounts);
  }

  const isFinalPriceRange = minFinalPrice !== maxFinalPrice;
  const isOriginalPriceRange = minOriginalPrice !== maxOriginalPrice;
  const hasDiscount = maxDiscount > 0;

  // Hàm xử lý link ảnh
  const resolveImgUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);
  
  const formatSoldCount = (count?: number) => {
    if (!count || count === 0) return "0";
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '').replace('.', ',') + 'k';
    }
    return count.toString();
  };

  // LOGIC 2 CẤP ĐỘ: HÀM KHI BẤM CHỌN MÀU / SIZE
  const handleSelectVariant = (variant: any) => {
    setSelectedVariant(variant);
    if (variant.color) setSelectedColor(variant.color); // Đồng bộ màu
    setQuantity(1);
  };

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    if (!product.variants) return;

    const variantsOfColor = product.variants.filter((v: any) => v.color === color);
    const exactMatch = variantsOfColor.find((v: any) => v.variantName === selectedVariant?.variantName);
    
    if (exactMatch && exactMatch.stock > 0) {
      handleSelectVariant(exactMatch); 
    } else {
      setSelectedVariant(null); 
    }
  };

  // MỞ MODAL KHI BẤM GIỎ HÀNG NGOÀI THẺ
  const handleOpenModalClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    setQuantity(1); 
    if (hasVariants && product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      setSelectedVariant(firstVariant); 
      setSelectedColor(firstVariant.color || null); // Tự động set màu
    } else {
      setSelectedVariant(null);
      setSelectedColor(null);
    }
    setShowVariantModal(true); 
  };

  // XÁC NHẬN THÊM VÀO GIỎ TỪ TRONG MODAL
  const handleConfirmAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasVariants && !selectedVariant) {
      alert("Vui lòng chọn phân loại sản phẩm!");
      return;
    }

    if (Number(quantity) > maxStockLimit) {
      alert("Sản phẩm không đủ số lượng trong kho");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua hàng!");
      return;
    }

    try {
      setIsAdding(true);
      // Truyền variantId nếu có biến thể, không thì truyền undefined
      await addToCart(product.id, Number(quantity), hasVariants ? selectedVariant.id : undefined); 

      trackProductAddToCart(product.id).catch(err => console.error("Lỗi tracking cart:", err));

      // Báo cho AI biết khách vừa thêm giỏ hàng (Điểm: 3)
      logUserActivity({ productId: product.id, actionType: "AddToCart" }).catch(err => console.error(err));
      window.dispatchEvent(new Event('cartUpdated')); 
      
      setShowVariantModal(false); 
      alert(`Đã thêm ${quantity} ${product.name} ${selectedVariant ? `(${selectedColor ? selectedColor + ' - ' : ''}${selectedVariant.variantName})` : ""} vào giỏ hàng!`);
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsAdding(false);
    }
  };

  // Thêm biến này để giới hạn số lượng theo đúng tồn kho
  const maxStockLimit = hasVariants 
    ? (selectedVariant ? selectedVariant.stock : 0) 
    : product.stock;

  const handleAddToWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để thêm vào yêu thích!");
      return;
    }

    try {
      setIsWishlisting(true);
      await addToWishlist(product.id);

      //  Báo cho AI biết khách vừa Tym sản phẩm (Điểm: 2)
      logUserActivity({ productId: product.id, actionType: "AddToWishlist" }).catch(err => console.error(err));
      window.dispatchEvent(new Event('wishlistUpdated'));
      alert(`Đã thêm ${product.name} vào danh sách yêu thích!`);
    } catch (error: any) {
      // console.error("Lỗi khi thêm vào yêu thích:", error);
      const msg = error.response?.data?.message || "Không thể thêm vào yêu thích!";
      alert(msg);
    } finally {
      setIsWishlisting(false);
    }
  };

  // HÀM TÍNH GIÁ ĐỘNG CHO MODAL
  const modalOriginalPrice = selectedVariant ? selectedVariant.price : product.price;
  const modalDiscountRate = selectedVariant 
    ? ((selectedVariant.discount ?? product.discount ?? 0) / 100) 
    : ((product.discount ?? 0) / 100);
  const modalCurrentPrice = modalOriginalPrice * (1 - modalDiscountRate);

  // THÊM: MÀU SẮC ĐỘC NHẤT VÀ LỌC SIZE THEO MÀU
  const uniqueColors = Array.from(new Set(product.variants?.map((v: any) => v.color).filter(Boolean) || [])) as string[];
  const hasColors = uniqueColors.length > 0;
  const variantsToShow = hasColors && selectedColor 
    ? product.variants?.filter((v: any) => v.color === selectedColor) || []
    : product.variants || [];

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
    <>
      <Link
        href={`/products/${product.id}`}
        className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md relative"
      >
        {/* Container Ảnh */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-50 p-2">
          {product.imageUrl ? (
            <img
              src={resolveImgUrl(product.imageUrl)}
              alt={product.name}
              className={`h-48 w-full rounded-2xl object-cover transition duration-500 ${totalStock > 0 ? 'group-hover:scale-105' : 'opacity-60'}`}
            />
          ) : (
            <div className="flex h-48 w-full rounded-xl items-center justify-center bg-slate-50 text-4xl">
              📦
            </div>
          )}
          {totalStock <= 0 && (
            <div className="absolute right-4 bottom-4 z-20 rotate-[18deg] transform-gpu">
              <div className="rounded-full border-[4px] border-red-600 px-4 py-2 text-sm font-extrabold uppercase tracking-wider text-red-600 bg-white/80 shadow-md">
                <span className="font-sans antialiased text-sm font-black text-red-600">
                  HẾT HÀNG
                </span>
              </div>
            </div>
          )}

          {/* Badge Giảm giá */}
          {hasDiscount && (
            <div className="absolute left-4 top-4">
              <span className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                -{maxDiscount}%
              </span>
            </div>
          )}

          {/* Nút Trái Tim (Góc trên phải) */}
          <button
            onClick={handleAddToWishlist}
            disabled={isWishlisting}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-400 shadow-sm backdrop-blur-md transition-all hover:bg-pink-50 hover:text-pink-500 hover:scale-110 active:scale-95"
            title="Thêm vào yêu thích"
          >
            {isWishlisting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
            ) : (
              <Heart size={18} />
            )}
          </button>

          {/* NÚT THÊM VÀO GIỎ HÀNG NGOÀI THẺ -BẤM LÀ MỞ MODAL */}
          <button
            onClick={handleOpenModalClick}
            disabled={totalStock <= 0}
            className={`absolute right-4 bottom-2 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all z-10 ${
              totalStock <= 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-110 active:scale-95"
            }`}
            title={totalStock <= 0 ? "Hết hàng" : "Thêm vào giỏ hàng"}
          >
            <ShoppingCart size={18} />
          </button>
        </div>

        {/* Nội dung bên dưới */}
        <div className="flex flex-1 flex-col p-5 border-t border-slate-50">
          {product.categoryName && (
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {product.categoryName}
            </p>
          )}

          <h3 className="line-clamp-2 text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>

          <div className="mt-auto pt-4">
            {/* Khu vực Rating & Sold */}
            <div className="mt-2 flex items-center gap-2 text-xs font-medium">
              {product.averageRating && product.averageRating > 0 ? (
                <div className="flex items-center gap-1 border border-yellow-300 bg-yellow-50 px-1.5 py-0.5 rounded text-yellow-600">
                  <Star size={11} fill="currentColor" stroke="none" />
                  <span>{product.averageRating.toFixed(1)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded text-slate-400">
                  <Star size={11} className="text-slate-300" />
                  <span className="text-[10px]">Chưa đánh giá</span>
                </div>
              )}
              
              <span className="text-slate-200">|</span>
              <span className="text-slate-500">Đã bán {formatSoldCount(product.soldCount)}</span>
            </div>

            {/* GIÁ TIỀN (HIỂN THỊ KHOẢNG GIÁ NẾU LÀ BIẾN THỂ) */}
            <div className="mt-auto pt-3">
              <div className="flex flex-col items-start gap-1">
                <span className="text-lg font-bold text-red-600 leading-none">
                  {isFinalPriceRange 
                    ? `${formatVND(minFinalPrice)} - ${formatVND(maxFinalPrice)}` 
                    : formatVND(minFinalPrice)}
                </span>
                
                {hasDiscount && (
                  <span className="text-xs font-medium text-slate-400 line-through leading-none">
                    {isOriginalPriceRange 
                      ? `${formatVND(minOriginalPrice)} - ${formatVND(maxOriginalPrice)}` 
                      : formatVND(minOriginalPrice)}
                  </span>
                )}

                {/* TAG FREESHIP... (Giữ nguyên đoạn này của sếp) */}

                {/* TAG FREESHIP HIỂN THỊ Ở ĐÂY (NẾU GIÁ MIN SAU GIẢM >= 100K và SẢN PHẨM CÒN HÀNG ) */}
                {minFinalPrice >= 100000 && totalStock > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition group-hover:scale-105">
                    <Truck size={13} className="text-white" />
                    <span>Freeship</span>
                  </div>
                )}
              </div>
            </div>

            {/* Dòng dưới cùng: Trạng thái kho & Xem chi tiết */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  totalStock > 10
                    ? "bg-green-100 text-green-700"
                    : totalStock > 0
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {totalStock > 0 ? `Còn ${totalStock}` : "Hết hàng"}
              </span>

              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider transition group-hover:translate-x-1 group-hover:text-blue-600">
                Chi tiết →
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* POPUP MODAL CHUNG CHO CẢ SẢN PHẨM CÓ VÀ KHÔNG CÓ BIẾN THỂ */}
      <Modal isOpen={showVariantModal} onClose={() => setShowVariantModal(false)}>
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 relative">
          <div className="flex flex-col gap-6">
            
            {/* Header Modal (Ảnh & Giá) */}
            <div className="flex items-start gap-4 border-b border-gray-100 pb-4">
              <div className="relative h-60 w-60 shrink-0 aspect-square overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 p-1.5 shadow-sm">
                <img 
                  src={resolveImgUrl((hasVariants && selectedVariant && selectedVariant.imageUrl) || product.imageUrl)} 
                  alt={product.name} 
                  className="h-full w-full object-contain rounded-3xl"
                />
              </div>
              <div className="flex flex-col flex-1">
                <h3 className="line-clamp-2 text-base font-bold text-gray-900 pr-10">{product.name}</h3>
                
                {/* BỌC GIÁ TIỀN VÀ NÚT CHI TIẾT VÀO CHUNG 1 DÒNG */}
                <div className="mt-3 flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    {hasVariants && !selectedVariant ? (
                      /* CHƯA CHỌN ĐỦ PHÂN LOẠI -> HIỆN KHOẢNG GIÁ */
                      <>
                        <span className="text-2xl font-bold text-red-600">
                          {isFinalPriceRange
                            ? `${formatVND(minFinalPrice)} - ${formatVND(maxFinalPrice)}`
                            : formatVND(minFinalPrice)}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-gray-400 line-through">
                            {isOriginalPriceRange
                              ? `${formatVND(minOriginalPrice)} - ${formatVND(maxOriginalPrice)}`
                              : formatVND(minOriginalPrice)}
                          </span>
                        )}
                      </>
                    ) : (
                      /* ĐÃ CHỌN ĐỦ HOẶC KO CÓ PHÂN LOẠI -> HIỆN GIÁ CỤ THỂ */
                      <>
                        <span className="text-2xl font-bold text-red-600">
                          {formatVND(modalCurrentPrice)}
                        </span>
                        {modalDiscountRate > 0 && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatVND(modalOriginalPrice)}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Nút Chi tiết >> */}
                  <Link 
                    href={`/products/${product.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 flex items-center gap-1 rounded border border-blue-600 px-3 py-1.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    Chi tiết <span className="text-[14px] leading-none">»</span>
                  </Link>
                </div>
                {hasVariants && selectedVariant && (
                  <p className="mt-1.5 text-sm text-slate-600">
                    Đã chọn: <span className="font-semibold text-gray-900">{selectedColor ? `${selectedColor} - ` : ''}{selectedVariant.variantName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* CHỈ HIỆN KHU VỰC CHỌN MÀU/SIZE NẾU SẢN PHẨM ĐÓ CÓ BIẾN THỂ */}
            {hasVariants && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                {/* HÀNG 1: CHỌN MÀU SẮC */}
                {hasColors && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Màu sắc
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {uniqueColors.map((color) => {
                        const isSelectedColor = selectedColor === color;
                        const colorHex = getHexColor(color);
                        const isWhite = colorHex === "#ffffff";

                        return (
                          <button
                            key={color}
                            onClick={() => handleSelectColor(color)}
                            className={`relative overflow-hidden rounded-lg border px-3 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5
                              ${isSelectedColor 
                                ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600" 
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}
                          >
                            {colorHex && (
                              <span
                                className={`w-3.5 h-3.5 rounded-full shrink-0 ${isWhite ? "border border-slate-300" : ""}`}
                                style={{ backgroundColor: colorHex }}
                              />
                            )}
                            <span>{color}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* HÀNG 2: CHỌN KÍCH THƯỚC / PHÂN LOẠI */}
                {variantsToShow.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {hasColors ? "Kích thước / Phân loại" : "Phân loại"}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {variantsToShow.map((v: any) => {
                        const isSelected = selectedVariant?.id === v.id;
                        const isOutOfStock = v.stock <= 0;

                        return (
                          <button
                            key={v.id}
                            onClick={() => !isOutOfStock && handleSelectVariant(v)}
                            disabled={isOutOfStock}
                            className={`relative overflow-hidden rounded-lg border px-4 py-1.5 text-sm font-medium transition-all duration-200 min-w-[60px]
                              ${isSelected
                                ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                              }
                              ${isOutOfStock ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400" : ""}
                            `}
                          >
                            <span className="leading-none">{v.variantName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Khu vực Chọn số lượng (Dùng chung cho cả 2 loại) */}
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

            {/* Nút add to cart cuối cùng */}
            <div className="mt-6">
              <button 
                onClick={handleConfirmAddToCart}
                disabled={(hasVariants && !selectedVariant) || isAdding || maxStockLimit <= 0}
                className={`w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-bold text-white shadow transition ${
                  (hasVariants && !selectedVariant) || maxStockLimit <= 0
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
    </>
  );
}