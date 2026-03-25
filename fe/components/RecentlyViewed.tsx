"use client";

import { useEffect, useState, useRef } from "react";
import { fetchRecentlyViewed, type Product } from "@/services/api";
import ProductCard from "@/components/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function RecentlyViewed() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetchRecentlyViewed()
      .then((res) => {
        const mappedData = res.data.map((p: any) => ({
          ...p,
          variants: p.productVariants || p.variants,
        }));
        setProducts(mappedData);
      })
      .catch((err) => console.error("Lỗi tải sp vừa xem:", err))
      .finally(() => setLoading(false));
  }, []);

  // LOGIC MỚI: TỰ ĐỘNG TRƯỢT (AUTOPLAY)
  useEffect(() => {
    // Nếu chưa load xong, không có sản phẩm, hoặc khách đang di chuột vào -> KHÔNG trượt
    if (products.length === 0 || isHovered) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        
        // Nếu đã cuộn sát mép bên phải (trừ hao 10px cho chắc)
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          // Cuộn ngược trở lại đầu tiên
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          // Cuộn sang phải 1 khoảng bằng đúng chiều rộng 1 card (256px bao gồm cả gap)
          scrollRef.current.scrollTo({ left: scrollLeft + 256, behavior: "smooth" });
        }
      }
    }, 3000); // Tốc độ trượt: 3000ms = 3 giây trượt 1 lần

    // Dọn dẹp interval khi component bị hủy hoặc khi khách di chuột vào
    return () => clearInterval(interval);
  }, [products.length, isHovered]);

  // Hàm xử lý lướt sang trái/phải bằng nút bấm (giữ nguyên của sếp)
  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (loading || products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            🕒 Sản phẩm bạn vừa xem
          </h2>
        </div>
        
        {/* Nút bấm điều hướng */}
        <div className="flex gap-2">
          <button 
            onClick={() => scroll("left")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => scroll("right")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Container thanh trượt (Đã thêm sự kiện onMouseEnter, onMouseLeave) */}
      <div 
        ref={scrollRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((p) => (
          <div key={p.id} className="min-w-[200px] w-[200px] sm:min-w-[240px] sm:w-[240px] snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}