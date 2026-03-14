'use client'

import Link from "next/link";
import { ShoppingCart, Heart } from "lucide-react";
import { useState } from "react";
import { addToCart, addToWishlist } from "@/services/api";

export interface Product {
  id: number;
  name: string;
  price: number;
  priceAfterDiscount: number;
  discount: number;
  imageUrl: string;
  categoryName?: string;
  stock: number;
}

export default function ProductCard({ product }: { product: Product }) {
  const [isAdding, setIsAdding] = useState(false);

  const [isWishlisting, setIsWishlisting] = useState(false);

  const displayPrice = product.priceAfterDiscount && product.priceAfterDiscount > 0
    ? product.priceAfterDiscount
    : product.price;

  const hasDiscount = !!product.discount && product.discount > 0;

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault(); // ✅ Quan trọng: Ngăn chặn việc click vào nút mà bị chuyển sang trang Chi tiết
    
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua hàng!");
      return;
    }

    try {
      setIsAdding(true);
      await addToCart(product.id, 1); // Bấm ngoài thẻ thì mặc định thêm 1 cái
      window.dispatchEvent(new Event('cartUpdated')); // Kêu Header nhảy số
      // ✅ THÊM DÒNG NÀY ĐỂ BÁO THÀNH CÔNG:
      alert(`Đã thêm ${product.name} vào giỏ hàng!`);
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddToWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Quan trọng: Ngăn click nhảy sang trang chi tiết
    
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để thêm vào yêu thích!");
      return;
    }

    try {
      setIsWishlisting(true);
      await addToWishlist(product.id);
      window.dispatchEvent(new Event('wishlistUpdated'));
      alert(`Đã thêm ${product.name} vào  danh sách yêu thích!`);
    } catch (error: any) {
      console.error("Lỗi khi thêm vào yêu thích:", error);
      const msg = error.response?.data?.message || "Không thể thêm vào yêu thích!";
      alert(msg);
    } finally {
      setIsWishlisting(false);
    }
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md relative"
    >
      {/* Container Ảnh */}
      <div className="relative overflow-hidden bg-white p-2">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-48 w-full rounded-xl object-contain transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-48 w-full rounded-xl items-center justify-center bg-slate-50 text-4xl">
            📦
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

        {/* Nút Thêm vào giỏ hàng (Nổi góc dưới bên phải ảnh) */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock <= 0 || isAdding}
          className={`absolute right-4 bottom-2 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all z-10 ${
            product.stock <= 0
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-110 active:scale-95"
          }`}
          title={product.stock <= 0 ? "Hết hàng" : "Thêm vào giỏ hàng"}
        >
          {isAdding ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-red-600">
              {formatVND(displayPrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs font-medium text-slate-400 line-through">
                {formatVND(product.price)}
              </span>
            )}
          </div>

          {/* Dòng dưới cùng: Trạng thái kho & Xem chi tiết */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span
              className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
                product.stock > 10
                  ? "bg-green-100 text-green-700"
                  : product.stock > 0
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {product.stock > 0 ? `Còn ${product.stock}` : "Hết hàng"}
            </span>

            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider transition group-hover:translate-x-1 group-hover:text-blue-600">
              Chi tiết →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}