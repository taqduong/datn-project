"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  fetchProducts,
  fetchCategories,
  searchProducts,
  type Product,
  type Category,
} from "@/services/api";
import { Filter, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";

type SortType = "newest" | "priceAsc" | "priceDesc" | "nameAsc";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortType>("newest");
  
  // ================= STATE PHÂN TRANG =================
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); 

  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword");
  const categoryIdFromUrl = searchParams.get("category");

  const loadData = async () => {
    try {
      setLoading(true);
      const categoriesRes = await fetchCategories();
      setCategories(categoriesRes.data);

      let productsRes;
      if (keyword) {
        productsRes = await searchProducts(keyword);
      } else {
        productsRes = await fetchProducts();
      }

      setProducts(productsRes.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categoryIdFromUrl) {
      setSelectedCategory(Number(categoryIdFromUrl));
    } else {
      setSelectedCategory("all");
    }
  }, [categoryIdFromUrl]);

  useEffect(() => {
    loadData();
  }, [keyword]);

  // Tái lập vị trí về Trang đầu tiên khi phát sinh thay đổi điều kiện truy vấn
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedPriceRange, sortBy, keyword, pageSize]);

  const getDisplayPrice = (product: Product) => {
    const discountRate = (product.discount || 0) / 100;
    let minPrice = product.price || 0;

    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map((v: any) => v.price || 0);
      minPrice = Math.min(...prices);
    }

    return minPrice * (1 - discountRate);
  };

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const handlePriceRangeChange = (range: string) => {
    setSelectedPriceRange((prev) =>
      prev.includes(range)
        ? prev.filter((item) => item !== range)
        : [...prev, range]
    );
  };

  // TÍNH TOÁN DATA ĐÃ LỌC VÀ SẮP XẾP (Toàn bộ)
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }

    if (selectedPriceRange.length > 0) {
      result = result.filter((product) => {
        const price = getDisplayPrice(product);
        return selectedPriceRange.some((range) => {
          if (range === "under2m") return price < 2000000;
          if (range === "2mTo5m") return price >= 2000000 && price <= 5000000;
          if (range === "over5m") return price > 5000000;
          return false;
        });
      });
    }

    switch (sortBy) {
      case "priceAsc":
        result.sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b));
        break;
      case "priceDesc":
        result.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a));
        break;
      case "nameAsc":
        result.sort((a, b) => a.name.localeCompare(b.name, "vi"));
        break;
      case "newest":
      default:
        result.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        break;
    }

    return result;
  }, [products, selectedCategory, selectedPriceRange, sortBy]);

  // ================= CẮT DỮ LIỆU ĐỂ PHÂN TRANG =================
  const totalPages = Math.ceil(filteredAndSortedProducts.length / pageSize); 
  const currentProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize        
  );

  const minPrice =
    filteredAndSortedProducts.length > 0
      ? Math.min(...filteredAndSortedProducts.map((p) => getDisplayPrice(p)))
      : 0;

  const maxPrice =
    filteredAndSortedProducts.length > 0
      ? Math.max(...filteredAndSortedProducts.map((p) => getDisplayPrice(p)))
      : 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {keyword ? `Kết quả tìm kiếm cho: "${keyword}"` : "Tất cả sản phẩm"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            {keyword 
              ? `Tìm thấy ${filteredAndSortedProducts.length} sản phẩm phù hợp.` 
              : "Khám phá các sản phẩm mới nhất với nhiều ưu đãi hấp dẫn."}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sticky top-24">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Filter size={18} className="text-slate-400" />
                <h2 className="text-lg font-bold text-slate-900">Danh mục</h2>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-all ${
                    selectedCategory === "all"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  Tất cả sản phẩm
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-all ${
                      selectedCategory === category.id
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-6 border-t border-slate-200" />

            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Khoảng giá</h2>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 hover:text-slate-900">
                  <input type="checkbox" checked={selectedPriceRange.includes("under2m")} onChange={() => handlePriceRangeChange("under2m")} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" />
                  <span>Dưới 2.000.000đ</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 hover:text-slate-900">
                  <input type="checkbox" checked={selectedPriceRange.includes("2mTo5m")} onChange={() => handlePriceRangeChange("2mTo5m")} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" />
                  <span>2.000.000đ - 5.000.000đ</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 hover:text-slate-900">
                  <input type="checkbox" checked={selectedPriceRange.includes("over5m")} onChange={() => handlePriceRangeChange("over5m")} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" />
                  <span>Trên 5.000.000đ</span>
                </label>
              </div>
            </div>
          </aside>

          <section>
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-bold text-slate-900">
                  Hiển thị {currentProducts.length} trên tổng {filteredAndSortedProducts.length} sản phẩm
                </p>
                {filteredAndSortedProducts.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    Giá từ {formatVND(minPrice)} - {formatVND(maxPrice)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-6">
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-600">Hiển thị:</label>
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value={4}>4</option>
                      <option value={8}>8</option>
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-600">Sắp xếp:</label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortType)}
                      className="appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="priceAsc">Giá tăng dần</option>
                      <option value="priceDesc">Giá giảm dần</option>
                      <option value="nameAsc">Tên A-Z</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-48 animate-pulse bg-slate-100" />
                    <div className="space-y-3 p-5">
                      <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
                      <div className="h-6 w-1/2 animate-pulse rounded bg-slate-100 mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAndSortedProducts.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                <div className="mb-4 text-5xl">📦</div>
                <h3 className="text-xl font-bold text-slate-900">Không tìm thấy sản phẩm phù hợp</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {keyword ? `Không có kết quả nào cho từ khóa "${keyword}".` : "Hãy thử thay đổi danh mục hoặc khoảng giá."}
                </p>
                <button 
                  onClick={() => { 
                    setSelectedCategory("all"); 
                    setSelectedPriceRange([]); 
                    router.push("/products"); 
                  }}
                  className="mt-6 inline-flex px-5 py-2.5 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition"
                >
                  Xem tất cả sản phẩm
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {currentProducts.map((p) => (
                    <ProductCard key={p.id} product={p as any} />
                  ))}
                </div>

                {/* ================= GIAO DIỆN THANH PHÂN TRANG ================= */}
                {totalPages > 1 && (
                  <div className="mt-10 flex justify-center">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      {Array.from({ length: totalPages }).map((_, i) => {
                        const page = i + 1;
                        // Logic hiển thị ... nếu nhiều trang quá (rút gọn)
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
                                window.scrollTo({ top: 0, behavior: "smooth" }); // Chuyển trang thì tự cuộn lên trên
                              }}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl border font-semibold transition-all ${
                                currentPage === page
                                  ? "border-blue-600 bg-blue-600 text-white shadow-md"
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
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
          </section>
        </div>
      </div>
    </div>
  );
}