'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, XCircle, ArrowRight, ShoppingCart, Trash2, Tag } from 'lucide-react';
import { fetchWishlist, removeFromWishlist, clearWishlist, addToCart } from '@/services/api';

type Product = {
  id: number;
  name: string;
  price: number;
  discount: number;
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

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart(product.id, 1);
      window.dispatchEvent(new Event('cartUpdated'));
      alert(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch (error) {
      console.error('Lỗi thêm giỏ hàng:', error);
      alert('Có lỗi xảy ra, không thể thêm vào giỏ.');
    }
  };

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

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
              
              const hasVariants = p.variants && p.variants.length > 0;
              const discountRate = (p.discount || 0) / 100;

              let minPrice = p.price || 0;
              let maxPrice = p.price || 0;

              if (hasVariants) {
                const prices = p.variants!.map((v: any) => v.price || 0);
                minPrice = Math.min(...prices);
                maxPrice = Math.max(...prices);
              }

              const minPriceAfterDiscount = minPrice * (1 - discountRate);
              const maxPriceAfterDiscount = maxPrice * (1 - discountRate);
              const isPriceRange = hasVariants && minPrice !== maxPrice;

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

                  {p.discount > 0 && (
                    <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-md shadow-red-500/30 flex items-center gap-1">
                      <Tag size={12} /> -{p.discount}%
                    </div>
                  )}

                  <div 
                    className="relative w-full pt-[100%] bg-slate-50 overflow-hidden cursor-pointer"
                    onClick={() => router.push(`/products/${p.id}`)}
                  >
                    <img
                      src={imageUrl}
                      alt={p.name}
                      className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500 mix-blend-multiply"
                    />
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 
                      className="text-base font-bold text-slate-900 line-clamp-2 mb-2 cursor-pointer group-hover:text-pink-600 transition-colors"
                      onClick={() => router.push(`/products/${p.id}`)}
                    >
                      {p.name}
                    </h3>

                    <div className="mt-auto pt-4 flex items-end justify-between">
                      <div>
                        <div className="text-lg font-black text-pink-600">
                          {isPriceRange 
                            ? `${formatVND(minPriceAfterDiscount)} - ${formatVND(maxPriceAfterDiscount)}` 
                            : formatVND(minPriceAfterDiscount)}
                        </div>
                        
                        {p.discount > 0 && (
                          <div className="text-xs font-semibold text-slate-400 line-through">
                            {isPriceRange 
                              ? `${formatVND(minPrice)} - ${formatVND(maxPrice)}` 
                              : formatVND(minPrice)}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasVariants) {
                            router.push(`/products/${p.id}`);
                          } else {
                            handleAddToCart(p as any);
                          }
                        }}
                        className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-pink-500 transition-colors duration-300 shadow-md shrink-0 ml-2"
                        title={hasVariants ? "Chọn phân loại" : "Thêm vào giỏ"}
                      >
                        <ShoppingCart size={18} />
                      </button>
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