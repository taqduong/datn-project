"use client";

import { useEffect, useState } from "react";
import { fetchProducts, addToCart } from "@/services/api"; // Đã import đủ cả 2 hàm
import Link from "next/link";
import { Flame, Tag, ShoppingCart } from "lucide-react";

export default function SalePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchProducts();
        const data = res.data as any[];
        // Lọc ra những sản phẩm có % giảm giá > 0
        const saleProducts = data.filter((p) => Number(p.discount) > 0);
        setProducts(saleProducts);
      } catch (err) {
        console.error("❌ Lỗi khi tải sản phẩm giảm giá:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Hàm chuẩn hoá URL ảnh
  const getImageUrl = (value: string): string => {
    if (!value) return "https://placehold.co/400x400?text=No+Image";

    let url = value.trim();
    try {
      if (url.startsWith("[")) {
        const arr = JSON.parse(url);
        if (Array.isArray(arr) && arr.length > 0) url = arr[0];
      }
      if (url.includes(",")) {
        url = url.split(",")[0].trim();
      }
      if (!/^https?:\/\//i.test(url)) {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
        url = `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
      }
      return url;
    } catch (e) {
      return "https://placehold.co/400x400?text=Error";
    }
  };

  // Hàm xử lý khi bấm nút Thêm vào giỏ hàng (Gọi API CHUẨN)
  const handleAddToCart = async (e: React.MouseEvent, productId: number, productName: string) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để mua hàng!");
      return;
    }

    try {
      // Gọi API ném thẳng lên giỏ hàng Database
      await addToCart(productId, 1); 
      
      // Bắn pháo hiệu cho số trên icon Giỏ hàng ở Header nhảy lên
      window.dispatchEvent(new Event('cartUpdated')); 
      
      // Báo thành công
      alert(`Đã thêm "${productName}" vào giỏ hàng!`);
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại sau.");
    }
  };

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* ================= HERO BANNER ================= */}
      <div className="bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 pt-16 pb-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-yellow-300 blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/30 text-sm font-bold uppercase tracking-widest mb-6">
            <Flame size={18} className="text-yellow-300 animate-pulse" />
            Siêu Sale Giờ Vàng
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-md">
            SALE SẬP SÀN - CHỚP NHOÁNG
          </h1>
          <p className="text-red-100 text-lg md:text-xl font-medium max-w-2xl mx-auto">
            Hàng ngàn deal sốc giảm giá lên đến cực khủng. Mua ngay kẻo lỡ, số lượng có hạn!
          </p>
        </div>
      </div>

      {/* ================= PRODUCT SECTION ================= */}
      <div className="container mx-auto px-4 -mt-10 relative z-20">
        
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 h-[320px] animate-pulse">
                <div className="w-full h-40 bg-slate-200 rounded-xl mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-6 bg-slate-200 rounded w-full mt-auto"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-16 text-center max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Tag size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Chưa có chương trình Sale</h2>
            <p className="text-slate-500 mb-8">Hiện tại chưa có sản phẩm nào được giảm giá. Hãy quay lại sau nhé!</p>
            <Link 
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition"
            >
              Xem tất cả sản phẩm
            </Link>
          </div>

        ) : (
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
            {products.map((p) => {
              const imageUrl = getImageUrl(p.imageUrls || p.imageUrl);
              const priceBeforeDiscount = p.price;
              const priceAfterDiscount = Math.round(Number(p.price) * (1 - Number(p.discount) / 100));
              
              return (
                <Link href={`/products/${p.id}`} key={p.id} className="group">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 h-full flex flex-col relative">
                    
                    {/* Badge Giảm Giá */}
                    <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-md shadow-red-500/30 z-10 flex items-center gap-0.5">
                      -{p.discount}%
                    </div>

                    {/* Hình ảnh */}
                    <div className="relative w-full aspect-square overflow-hidden bg-slate-50 p-2">
                      <img
                        src={imageUrl}
                        alt={p.name}
                        className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "https://placehold.co/400x400?text=No+Image";
                        }}
                      />
                    </div>

                    {/* Thông tin */}
                    <div className="p-4 flex flex-col flex-1">
                      <h2 className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                        {p.name}
                      </h2>
                      
                      <div className="mt-auto pt-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-black text-red-600">
                            {formatVND(priceAfterDiscount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-400 line-through">
                            {formatVND(priceBeforeDiscount)}
                          </span>
                          
                          {/* Nút giỏ hàng (Đã gắn hàm API chuẩn) */}
                          <button 
                            onClick={(e) => handleAddToCart(e, p.id, p.name)} 
                            className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-blue-600 hover:text-white shadow-sm"
                            title="Thêm vào giỏ hàng"
                          >
                            <ShoppingCart size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}