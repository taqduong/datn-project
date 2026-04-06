"use client";

import { useEffect, useState } from "react";
import { fetchProducts } from "@/services/api"; 
import Link from "next/link";
import { Flame, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard"; 

export default function SalePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ================= 1. STATE PHÂN TRANG =================
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12; // In 12 sản phẩm Sale mỗi trang (4 cột x 3 hàng)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await fetchProducts();
        const data = res.data as any[];

        // LOGIC MỚI: Lọc tất cả sản phẩm có giảm giá
        const saleProducts = data.filter((p) => {
          // 1. Kiểm tra giảm giá ở sản phẩm Mẹ
          const hasGeneralDiscount = Number(p.discount) > 0;

          // 2. Kiểm tra giảm giá ở từng Biến thể con
          const hasVariantDiscount = p.variants?.some((v: any) => Number(v.discount) > 0);

          // Chỉ cần 1 trong 2 có giảm giá là cho "lên sóng" trang Sale ngay
          return hasGeneralDiscount || hasVariantDiscount;
        });

        setProducts(saleProducts);
      } catch (err) {
        console.error("Lỗi khi tải sản phẩm giảm giá:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ================= 2. CẮT DỮ LIỆU ĐỂ PHÂN TRANG =================
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const currentProducts = products.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* ================= HERO BANNER  ================= */}
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
          <h1 className="text-4xl md:text-6xl font-sans antialiased font-black text-white mb-4 drop-shadow-md">
            SALE SẬP SÀN - CHỚP NHOÁNG
          </h1>
          <p className="text-red-100 text-lg md:text-xl font-medium max-w-2xl mx-auto">
            Hàng ngàn deal sốc giảm giá lên đến cực khủng. Mua ngay kẻo lỡ, số lượng có hạn!
          </p>
        </div>
      </div>

      {/* ================= PRODUCT SECTION ================= */}
      <div className="container mx-auto px-4 -mt-10 relative z-20 max-w-7xl">
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 h-[380px] animate-pulse flex flex-col">
                <div className="w-full h-48 bg-slate-200 rounded-2xl mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded-xl w-full mt-auto"></div>
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
          <>
            {/* GỌI PRODUCT CARD CỦA currentProducts  */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
              {currentProducts.map((p) => (
                <ProductCard key={p.id} product={p as any} />
              ))}
            </div>

            {/* ================= 3. GIAO DIỆN THANH PHÂN TRANG ================= */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCurrentPage((prev) => Math.max(prev - 1, 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage === 1}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: "smooth" }); 
                          }}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border font-semibold transition-all ${
                            currentPage === page
                              ? "border-rose-500 bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-md"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-1 text-slate-400">...</span>;
                    }
                    return null;
                  })}

                  <button
                    onClick={() => {
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage === totalPages}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}