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

  // TỰ ĐỘNG TRƯỢT (AUTOPLAY)
  // TỰ ĐỘNG TRƯỢT THEO ĐỘ RỘNG THỰC TẾ
  useEffect(() => {
    if (products.length === 0 || isHovered) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        
        // Lấy độ rộng của 1 thẻ con đầu tiên để biết khoảng cách cần trượt
        const firstItem = scrollRef.current.children[0] as HTMLElement;
        const itemWidth = firstItem?.offsetWidth + 16; // 16 là gap-4

        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          // Trượt đúng 1 khoảng bằng độ rộng 1 card
          scrollRef.current.scrollTo({ left: scrollLeft + itemWidth, behavior: "smooth" });
        }
      }
    }, 3000);

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
          <div key={p.id} className="min-w-[calc(50%-12px)] w-[calc(50%-12px)] md:min-w-[calc(33.333%-12px)] md:w-[calc(33.333%-12px)] lg:min-w-[calc(25%-12px)] lg:w-[calc(25%-12px)] snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}