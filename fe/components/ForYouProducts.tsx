"use client";

import { useEffect, useState } from "react";
import { fetchForYouProducts, type Product } from "@/services/api";
import ProductCard from "@/components/ProductCard";

export default function ForYouProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra xem khách đã đăng nhập chưa
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
      return; // Chưa đăng nhập thì dẹp, không gọi API (vì API yêu cầu [Authorize])
    }
    
    setIsLoggedIn(true);

    // 2. Gọi API móc data "Dành cho bạn"
    fetchForYouProducts()
      .then(res => {
        // Xử lý biến thể y hệt lúc nãy để Card không bị lỗi 0đ
        const mappedData = res.data.map((p: any) => ({
          ...p,
          variants: p.productVariants || p.variants 
        }));
        setProducts(mappedData);
      })
      .catch(err => console.error("Lỗi tải gợi ý For You:", err))
      .finally(() => setLoading(false));
  }, []);

  // Đang tải thì hiện khung xám chớp chớp
  if (loading) return <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse h-64 bg-slate-100 rounded-3xl"></div>;
  
  // Chưa đăng nhập hoặc không có data thì ẩn luôn khu vực này đi cho sạch trang chủ
  if (!isLoggedIn || products.length === 0) return null; 

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black text-slate-900 sm:text-3xl flex items-center gap-2">
          ✨ Dành riêng cho bạn
        </h2>
        <p className="mt-2 text-slate-600">Gợi ý thông minh dựa trên sở thích và hành vi của bạn</p>
      </div>
      
      {/* Ráp ProductCard vào chạy mượt mà */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}