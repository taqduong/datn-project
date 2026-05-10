"use client";

import { useEffect, useState } from "react";
import { fetchProducts } from "@/services/api"; 
import Link from "next/link";
import { Flame, Tag, ChevronLeft, ChevronRight, ChevronDown, Search } from "lucide-react"; // <-- Thêm Icon Search
import ProductCard from "@/components/ProductCard"; 

export default function SalePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ================= 1. STATE PHÂN TRANG & TÌM KIẾM =================
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchQuery, setSearchQuery] = useState(""); // <-- State lưu từ khóa tìm kiếm local

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await fetchProducts();
        const data = res.data as any[];

        const saleProducts = data.filter((p) => {
          const hasGeneralDiscount = Number(p.discount) > 0;
          const hasVariantDiscount = p.variants?.some((v: any) => Number(v.discount) > 0);
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

  // Reset phân trang về trang đầu tiên khi thay đổi tham số hiển thị hoặc từ khóa tìm kiếm.
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, searchQuery]);

  // ================= 2. LOGIC TÌM KIẾM LOCAL & CẮT PHÂN TRANG =================
  // 2.1: Lọc ra các sản phẩm Sale có tên chứa từ khóa tìm kiếm (Không phân biệt hoa thường)
  const filteredProducts = products.filter((p) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 2.2: Phân trang dựa trên mảng ĐÃ LỌC TÌM KIẾM
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
            {/* ================= TOOLBAR BỘ LỌC + TÌM KIẾM ================= */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <p className="text-base font-bold text-slate-900 whitespace-nowrap">
                  Trang {currentPage} / {totalPages > 0 ? totalPages : 1}
                </p>

                {/* THANH TÌM KIẾM SẢN PHẨM SALE */}
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">Hiển thị:</label>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                  >
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* KIỂM TRA NẾU TÌM KIẾM KHÔNG RA KẾT QUẢ NÀO */}
            {filteredProducts.length === 0 ? (
               <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-16 text-center">
                 <div className="text-4xl mb-4">🔍</div>
                 <h3 className="text-xl font-bold text-slate-900">Không tìm thấy sản phẩm</h3>
                 <p className="mt-2 text-slate-500">Không có sản phẩm Sale nào khớp với từ khóa "{searchQuery}"</p>
                 <button 
                   onClick={() => setSearchQuery("")}
                   className="mt-6 inline-flex px-5 py-2.5 bg-rose-50 text-rose-600 font-semibold rounded-xl hover:bg-rose-100 transition"
                 >
                   Xóa tìm kiếm
                 </button>
               </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700">
                {currentProducts.map((p) => (
                  <ProductCard key={p.id} product={p as any} />
                ))}
              </div>
            )}

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