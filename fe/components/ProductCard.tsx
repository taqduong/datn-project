'use client'

import Link from "next/link";
import { ShoppingCart, Heart, Star, ListPlus, X } from "lucide-react"; // Đã thêm icon X cho modal
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart, addToWishlist, trackProductAddToCart } from "@/services/api";
import Modal from "@/components/Modal"; // ✅ QUAN TRỌNG: Import cái Modal sếp đã làm ở các turns trước

// ✅ THÊM TRƯỜNG variants VÀO INTERFACE
export interface Product {
  id: number;
  name: string;
  price: number;
  priceAfterDiscount: number;
  discount: number;
  imageUrl: string;
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

  // ✅ 1. STATE MỚI QUẢN LÝ MODAL CHỌN BIẾN THỂ (QUICK ADD)
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  const [quantity, setQuantity] = useState(1);

  // ✅ LOGIC XỬ LÝ BIẾN THỂ (TÍNH KHOẢNG GIÁ & TỔNG TỒN KHO)
  const hasVariants = product.variants && product.variants.length > 0;
  
  const totalStock = hasVariants
    ? product.variants!.reduce((sum, v) => sum + (v.stock || 0), 0)
    : product.stock;

  const discountRate = (product.discount || 0) / 100;
  const hasDiscount = !!product.discount && product.discount > 0;

  let minPrice = product.price;
  let maxPrice = product.price;

  if (hasVariants) {
    const prices = product.variants!.map(v => v.price);
    minPrice = Math.min(...prices);
    maxPrice = Math.max(...prices);
  }

  const minPriceAfterDiscount = minPrice * (1 - discountRate);
  const maxPriceAfterDiscount = maxPrice * (1 - discountRate);
  const isPriceRange = minPrice !== maxPrice;

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

  // ✅ HÀM KHI BẤM CHỌN MỘT BIẾN THỂ TRONG MODAL
  const handleSelectVariant = (variant: any) => {
    setSelectedVariant(variant);
    setQuantity(1); // Reset số lượng về 1 khi đổi loại
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); // ✅ Ngăn click vào icon bay sang trang chi tiết

    // ✅ NẾU CÓ BIẾN THỂ -> CHỈ MỞ MODAL
    if (hasVariants) {
      // Tự động chọn biến thể đầu tiên nếu chưa chọn
      if (product.variants && product.variants.length > 0) {
        handleSelectVariant(product.variants[0]);
      }
      setShowVariantModal(true);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua hàng!");
      return;
    }

    try {
      setIsAdding(true);
      await addToCart(product.id, 1); 

      trackProductAddToCart(product.id).catch(err => console.error("Lỗi tracking cart:", err));

      window.dispatchEvent(new Event('cartUpdated')); 
      alert(`Đã thêm ${product.name} vào giỏ hàng!`);
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsAdding(false);
    }
  };

  // ✅ HÀM KHI BẤM "THÊM VÀO GIỎ" CUỐI CÙNG TRONG MODAL
  const addSelectedVariantToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedVariant) {
      alert("Vui lòng chọn phân loại sản phẩm!");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua hàng!");
      return;
    }

    try {
      setIsAdding(true);
      // ✅ SẾP NHỚ UPDATE HÀM addToCart ĐỂ NHẬN VariantId NHÉ!
      await addToCart(product.id, quantity, selectedVariant.id); 

      window.dispatchEvent(new Event('cartUpdated')); 
      setShowVariantModal(false); // Đóng modal
      alert(`Đã thêm ${product.name} (${selectedVariant.variantName}) vào giỏ hàng!`);
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsAdding(false);
    }
  };

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
      window.dispatchEvent(new Event('wishlistUpdated'));
      alert(`Đã thêm ${product.name} vào danh sách yêu thích!`);
    } catch (error: any) {
      console.error("Lỗi khi thêm vào yêu thích:", error);
      const msg = error.response?.data?.message || "Không thể thêm vào yêu thích!";
      alert(msg);
    } finally {
      setIsWishlisting(false);
    }
  };

  // ✅ HÀM TÍNH GIÁ ĐỘNG CHO MODAL
  const modalCurrentPrice = selectedVariant 
    ? selectedVariant.price * (1 - discountRate)
    : minPriceAfterDiscount;

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
              className="h-48 w-full rounded-2xl object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-48 w-full rounded-xl items-center justify-center bg-slate-50 text-4xl">
              📦
            </div>
          )}
          {totalStock <= 0 && (
            <div className="absolute right-4 bottom-4 z-20 rotate-[18deg]">
              <div className="rounded-full border-[4px] border-red-600 px-4 py-2 text-sm font-extrabold uppercase tracking-wider text-red-600 bg-white/80 shadow-md">
                <span className="text-sm font-black text-red-600">
                  HẾT HÀNG
                </span>
              </div>
            </div>
          )}

          {/* Badge Giảm giá */}
          {hasDiscount && (
            <div className="absolute left-4 top-4">
              <span className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                -{product.discount}%
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

          {/* Nút Thêm Giỏ Hàng (Nổi góc dưới bên phải ảnh) */}
          <button
            onClick={handleAddToCart}
            disabled={totalStock <= 0 || isAdding}
            className={`absolute right-4 bottom-2 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all z-10 ${
              totalStock <= 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : hasVariants 
                ? "bg-amber-500 text-white hover:bg-amber-600 hover:scale-110 active:scale-95" // Màu cam nếu có biến thể
                : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-110 active:scale-95"
            }`}
            title={totalStock <= 0 ? "Hết hàng" : hasVariants ? "Chọn phân loại" : "Thêm vào giỏ hàng"}
          >
            {isAdding ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : hasVariants ? (
              <ListPlus size={18} /> // Icon chọn list nếu có biến thể
            ) : (
              <ShoppingCart size={18} />
            )}
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
                  {isPriceRange 
                    ? `${formatVND(minPriceAfterDiscount)} - ${formatVND(maxPriceAfterDiscount)}` 
                    : formatVND(minPriceAfterDiscount)}
                </span>
                
                {hasDiscount && (
                  <span className="text-xs font-medium text-slate-400 line-through leading-none">
                    {isPriceRange 
                      ? `${formatVND(minPrice)} - ${formatVND(maxPrice)}` 
                      : formatVND(minPrice)}
                  </span>
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

      {/* ✅ ========================================================== */}
      {/* ✅ POPUP MODAL CHỌN BIẾN THỂ (QUICK ADD) - CHUẨN SHOPEE */}
      {/* ✅ ========================================================== */}
      <Modal isOpen={showVariantModal} onClose={() => setShowVariantModal(false)}>
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 relative">

          {/* Cột trái: Ảnh nhỏ bự */}
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4 border-b border-gray-100 pb-4">
              <div className="relative h-60 w-60 shrink-0 aspect-square overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 p-1.5 shadow-sm">
                <img 
                  // Ưu tiên hiển thị ảnh của biến thể, nếu ko thì ảnh bìa
                  src={resolveImgUrl((selectedVariant && selectedVariant.imageUrl) || product.imageUrl)} 
                  alt={product.name} 
                  className="h-full w-full object-contain rounded-3xl"
                />
              </div>
              <div className="flex flex-col flex-1">
                <h3 className="line-clamp-2 text-base font-bold text-gray-900 pr-10">{product.name}</h3>
                
                <div className="mt-3 flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600">
                    {formatVND(modalCurrentPrice)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatVND(selectedVariant ? selectedVariant.price : minPrice)}
                    </span>
                  )}
                </div>
                {selectedVariant && (
                  <p className="mt-1.5 text-sm text-slate-600">
                    Bạn đang chọn: <span className="font-semibold text-gray-900">{selectedVariant.variantName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Cột phải: Danh sách phân loại */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Phân loại</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {product.variants?.map((v, index) => {
                  const isOutOfStock = v.stock <= 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => !isOutOfStock && handleSelectVariant(v)}
                      disabled={isOutOfStock}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                        ${selectedVariant?.id === v.id 
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' 
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                        }
                        ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200' : ''}
                      `}
                    >
                      {/* Hiển thị icon tròn màu sắc */}
                      {v.color && (
                        <div 
                          className={`w-3 h-3 rounded-full shrink-0 border border-slate-300`}
                          style={{ backgroundColor: v.color.toLowerCase() }} 
                        />
                      )}
                      
                      <span className="leading-none">{v.variantName}</span>
                      
                      {/* Gạch chéo nếu hết hàng */}
                      {isOutOfStock && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-full border-t border-slate-400 -rotate-12 transform absolute"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chọn số lượng */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Số lượng</h3>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-300">
                  <button 
                    onClick={() => setQuantity(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
                  >−</button>
                  <div className="min-w-10 border-x border-slate-300 px-3 py-1.5 text-center font-semibold text-slate-900">{quantity}</div>
                  <button 
                    onClick={() => {
                      if (!selectedVariant) return;
                      setQuantity(prev => Math.min(prev + 1, selectedVariant.stock))
                    }}
                    disabled={!selectedVariant || selectedVariant.stock <= 0}
                    className="px-3 py-1.5 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >+</button>
                </div>
                {selectedVariant && (
                  <p className="text-xs text-slate-500">Tối đa: {selectedVariant.stock} sản phẩm</p>
                )}
              </div>
            </div>

            {/* Nút add to cart cuối cùng */}
            <div className="mt-6">
              <button 
                onClick={addSelectedVariantToCart}
                disabled={!selectedVariant || isAdding || selectedVariant.stock <= 0}
                className={`w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-bold text-white shadow transition ${
                  !selectedVariant || selectedVariant.stock <= 0
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