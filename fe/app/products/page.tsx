"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchProducts,
  fetchCategories,
  searchProducts,
  type Product,
  type Category,
} from "@/services/api";

type SortType = "newest" | "priceAsc" | "priceDesc" | "nameAsc";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortType>("newest");

  const loadData = async () => {
    try {
      setLoading(true);

      const [productsRes, categoriesRes] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);

      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getDisplayPrice = (product: Product) => {
    return product.priceAfterDiscount && product.priceAfterDiscount > 0
      ? product.priceAfterDiscount
      : product.price;
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="mb-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Sản phẩm
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Khám phá các sản phẩm mới nhất với nhiều ưu đãi hấp dẫn.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Danh mục</h2>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full rounded-2xl px-5 py-4 text-left text-lg font-medium transition ${
                    selectedCategory === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  Tất cả sản phẩm
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full rounded-2xl px-5 py-4 text-left text-lg font-medium transition ${
                      selectedCategory === category.id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-8 border-t border-slate-200" />

            <div>
              <h2 className="text-2xl font-bold text-slate-900">Khoảng giá</h2>

              <div className="mt-6 space-y-4">
                <label className="flex cursor-pointer items-center gap-3 text-lg text-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedPriceRange.includes("under2m")}
                    onChange={() => handlePriceRangeChange("under2m")}
                    className="h-6 w-6 rounded border-slate-300"
                  />
                  <span>Dưới 2.000.000đ</span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 text-lg text-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedPriceRange.includes("2mTo5m")}
                    onChange={() => handlePriceRangeChange("2mTo5m")}
                    className="h-6 w-6 rounded border-slate-300"
                  />
                  <span>2.000.000đ - 5.000.000đ</span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 text-lg text-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedPriceRange.includes("over5m")}
                    onChange={() => handlePriceRangeChange("over5m")}
                    className="h-6 w-6 rounded border-slate-300"
                  />
                  <span>Trên 5.000.000đ</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Main */}
          <section>
            <div className="mb-7 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  Hiển thị {filteredAndSortedProducts.length} sản phẩm
                </p>
                <p className="mt-2 text-lg text-slate-600">
                  Khoảng giá từ {formatVND(minPrice)} đến {formatVND(maxPrice)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <label className="text-lg font-medium text-slate-700">
                  Sắp xếp:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="priceAsc">Giá tăng dần</option>
                  <option value="priceDesc">Giá giảm dần</option>
                  <option value="nameAsc">Tên A-Z</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="h-56 animate-pulse bg-slate-200" />
                    <div className="space-y-3 p-5">
                      <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
                      <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAndSortedProducts.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                <div className="mb-4 text-6xl">📦</div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Không tìm thấy sản phẩm phù hợp
                </h3>
                <p className="mt-3 text-lg text-slate-600">
                  Hãy thử thay đổi danh mục hoặc khoảng giá.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredAndSortedProducts.map((p) => {
                  const displayPrice = getDisplayPrice(p);
                  const hasDiscount = !!p.discount && p.discount > 0;

                  return (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="relative overflow-hidden">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-60 w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-60 w-full items-center justify-center bg-slate-100 text-6xl">
                            📦
                          </div>
                        )}

                        {hasDiscount && (
                          <div className="absolute left-4 top-4">
                            <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-semibold text-white shadow">
                              -{p.discount}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        {p.categoryName && (
                          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
                            {p.categoryName}
                          </p>
                        )}

                        <h3 className="line-clamp-2 text-2xl font-bold text-slate-900">
                          {p.name}
                        </h3>

                        <div className="mt-4 flex items-end gap-3">
                          <span className="text-3xl font-bold text-red-600">
                            {formatVND(displayPrice)}
                          </span>

                          {hasDiscount && (
                            <span className="pb-1 text-lg text-slate-400 line-through">
                              {formatVND(p.price)}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                              p.stock > 10
                                ? "bg-green-100 text-green-700"
                                : p.stock > 0
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.stock > 0 ? `Còn ${p.stock}` : "Hết hàng"}
                          </span>

                          <span className="text-sm font-medium text-blue-600 transition group-hover:translate-x-1">
                            Xem chi tiết →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}