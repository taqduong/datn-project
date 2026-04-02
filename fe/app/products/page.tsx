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
import { Filter, ChevronDown } from "lucide-react";
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

  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword");
  const categoryIdFromUrl = searchParams.get("category");

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Chạy lấy danh mục song song
      const categoriesRes = await fetchCategories();
      setCategories(categoriesRes.data);

      // LOGIC TÌM KIẾM THÔNG MINH
      let productsRes;
      if (keyword) {
        // Nếu có từ khóa -> Gọi API Search
        productsRes = await searchProducts(keyword);
      } else {
        // Nếu không có -> Lấy tất cả như cũ
        productsRes = await fetchProducts();
      }

      setProducts(productsRes.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

  // THÊM ĐOẠN NÀY ĐỂ TỰ ĐỘNG CHỌN DANH MỤC NẾU CÓ URL
  useEffect(() => {
    if (categoryIdFromUrl) {
      setSelectedCategory(Number(categoryIdFromUrl)); // Ép kiểu string sang number
    } else {
      setSelectedCategory("all"); // Nếu xóa tham số thì trả về "all"
    }
  }, [categoryIdFromUrl]);

  // Vẫn giữ nguyên đoạn useEffect loadData cũ
  useEffect(() => {
    loadData();
  }, [keyword]);

  // QUAN TRỌNG: Phải thêm [keyword] vào đây để khi sếp gõ từ mới, trang tự tải lại
  useEffect(() => {
    loadData();
  }, [keyword]);

  // LOGIC TÍNH GIÁ ĐỘNG (BẢN UPDATE CHO BIẾN THỂ)
  const getDisplayPrice = (product: Product) => {
    const discountRate = (product.discount || 0) / 100;
    let minPrice = product.price || 0;

    // Nếu sản phẩm có biến thể, phải chui vào trong móc cái giá nhỏ nhất ra
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map((v: any) => v.price || 0);
      minPrice = Math.min(...prices);
    }

    // Trả về giá ĐÃ TRỪ KHUYẾN MÃI (nếu có)
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
        
        {/* Hero Section - Đã trả về nền trắng như cũ */}
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

        {/* Layout: Sidebar + Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          
          {/* ================== SIDEBAR ================== */}
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sticky top-24">
            
            {/* Filter: Category */}
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

            {/* Filter: Price Range */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Khoảng giá</h2>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={selectedPriceRange.includes("under2m")}
                    onChange={() => handlePriceRangeChange("under2m")}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <span>Dưới 2.000.000đ</span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={selectedPriceRange.includes("2mTo5m")}
                    onChange={() => handlePriceRangeChange("2mTo5m")}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <span>2.000.000đ - 5.000.000đ</span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={selectedPriceRange.includes("over5m")}
                    onChange={() => handlePriceRangeChange("over5m")}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <span>Trên 5.000.000đ</span>
                </label>
              </div>
            </div>
          </aside>

          {/* ================== MAIN CONTENT ================== */}
          <section>
            
            {/* Toolbar */}
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-bold text-slate-900">
                  Hiển thị {filteredAndSortedProducts.length} sản phẩm
                </p>
                {filteredAndSortedProducts.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    Giá từ {formatVND(minPrice)} - {formatVND(maxPrice)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-600">
                  Sắp xếp:
                </label>
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

            {/* Product Grid */}
            {loading ? (
              // Skeleton Loader
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
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
              // Empty State - Xuất hiện khi tìm kiếm/lọc không ra gì
              <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                <div className="mb-4 text-5xl">📦</div>
                <h3 className="text-xl font-bold text-slate-900">
                  Không tìm thấy sản phẩm phù hợp
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {keyword 
                    ? `Không có kết quả nào cho từ khóa "${keyword}".` 
                    : "Hãy thử thay đổi danh mục hoặc khoảng giá."}
                </p>
                
                <button 
                  onClick={() => { 
                    // 1. Reset các bộ lọc local
                    setSelectedCategory("all"); 
                    setSelectedPriceRange([]); 
                    // 2. Xóa từ khóa trên URL bằng cách đẩy về trang gốc
                    router.push("/products"); 
                  }}
                  className="mt-6 inline-flex px-5 py-2.5 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition"
                >
                  Xem tất cả sản phẩm
                </button>
              </div>
            ) : (
              // Product List
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedProducts.map((p) => (
                  <ProductCard key={p.id} product={p as any} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}