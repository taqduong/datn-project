"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchProducts,
  fetchCategories,
  type Product,
  type Category,
} from "@/services/api";

const benefits = [
  {
    title: "Giao hàng nhanh",
    desc: "Nhận hàng toàn quốc với thời gian linh hoạt.",
    icon: "🚚",
  },
  {
    title: "Thanh toán an toàn",
    desc: "Nhiều phương thức thanh toán bảo mật.",
    icon: "🔒",
  },
  {
    title: "Đổi trả dễ dàng",
    desc: "Hỗ trợ đổi trả minh bạch, nhanh chóng.",
    icon: "↩️",
  },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);

      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu trang chủ:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  const featuredProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [products]);

  const featuredCategories = useMemo(() => {
    return categories.slice(0, 4);
  }, [categories]);

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const getDisplayPrice = (product: Product) => {
    return product.priceAfterDiscount && product.priceAfterDiscount > 0
      ? product.priceAfterDiscount
      : product.price;
  };

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-10 text-white shadow-xl sm:px-10 lg:py-14">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 h-96 w-96 rounded-full bg-blue-500/20 blur-[80px]" />
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 h-96 w-96 rounded-full bg-indigo-500/20 blur-[80px]" />

          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md">
                ✨ Bộ sưu tập mới 2026
              </div>

              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Mua sắm hiện đại, <br className="hidden lg:block" /> trải nghiệm mượt mà.
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
                Khám phá hàng ngàn sản phẩm nổi bật với mức giá ưu đãi. Giao diện tối giản, thanh toán dễ dàng.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Khám phá ngay
                </Link>
                <Link
                  href="/sale"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800/50 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Xem ưu đãi
                </Link>
              </div>

              <div className="mt-10 flex gap-8 border-t border-slate-700/50 pt-6">
                <div>
                  <p className="text-2xl font-bold">{products.length}+</p>
                  <p className="text-xs text-slate-400">Sản phẩm</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{categories.length}+</p>
                  <p className="text-xs text-slate-400">Danh mục</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">24/7</p>
                  <p className="text-xs text-slate-400">Hỗ trợ</p>
                </div>
              </div>
            </div>

            {/* Hero Images Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30 p-2 backdrop-blur-sm">
                <img
                  src={
                    featuredProducts[0]?.imageUrl ||
                    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=800&auto=format&fit=crop"
                  }
                  alt="Hero product"
                  className="h-56 w-full rounded-xl object-cover sm:h-64"
                />
              </div>
              <div className="grid gap-3">
                <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30 p-2 backdrop-blur-sm">
                  <img
                    src={
                      featuredProducts[1]?.imageUrl ||
                      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop"
                    }
                    alt="Hero sub product 1"
                    className="h-24 w-full rounded-xl object-cover sm:h-[118px]"
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30 p-2 backdrop-blur-sm">
                  <img
                    src={
                      featuredProducts[2]?.imageUrl ||
                      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop"
                    }
                    alt="Hero sub product 2"
                    className="h-24 w-full rounded-xl object-cover sm:h-[118px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                {item.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-0.5 text-sm text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Danh mục nổi bật
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-semibold text-blue-600 hover:text-blue-700 sm:block"
          >
            Xem tất cả &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 h-12 w-12 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCategories.map((category, index) => {
              const icons = ["👕", "🎧", "🪑", "⌚", "💄", "📱"];
              return (
                <Link
                  href="/products"
                  key={category.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-2xl transition group-hover:bg-blue-50">
                    {icons[index % icons.length]}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {category.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {category.description || "Khám phá các sản phẩm nổi bật."}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Sản phẩm mới nhất
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-semibold text-blue-600 hover:text-blue-700 sm:block"
          >
            Xem thêm &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="h-56 animate-pulse bg-slate-100" />
                <div className="space-y-2 p-5">
                  <div className="h-6 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
            <div className="mb-3 text-4xl">📦</div>
            <h3 className="text-lg font-bold text-slate-900">Chưa có sản phẩm nào</h3>
            <p className="mt-2 text-sm text-slate-500">Hãy thêm sản phẩm từ trang admin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => {
              const hasDiscount = !!product.discount && product.discount > 0;
              const displayPrice = getDisplayPrice(product);

              return (
                <div
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative overflow-hidden bg-slate-50">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-56 w-full items-center justify-center text-4xl">
                        📦
                      </div>
                    )}

                    {hasDiscount && (
                      <div className="absolute left-3 top-3 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        -{product.discount}%
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    {product.categoryName && (
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {product.categoryName}
                      </p>
                    )}

                    <h3 className="line-clamp-2 text-base font-bold text-slate-900">
                      {product.name}
                    </h3>

                    <div className="mt-auto pt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">
                          {formatVND(displayPrice)}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-slate-400 line-through">
                            {formatVND(product.price)}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Link
                          href={`/products/${product.id}`}
                          className="flex-1 rounded-xl bg-slate-900 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Chi tiết
                        </Link>
                        <button className="flex items-center justify-center rounded-xl border border-slate-200 px-4 text-slate-600 transition hover:bg-slate-50 hover:text-red-500">
                          ♡
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Promo banner & Newsletter */}
      <section className="mx-auto max-w-7xl px-4 py-10 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Promo */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-lg sm:p-10">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
              Ưu đãi giới hạn
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Mua sắm thông minh <br /> tiết kiệm mỗi ngày
            </h2>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Mua sắm ngay
            </Link>
          </div>

          {/* Newsletter */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs sm:p-10">
            <h2 className="text-2xl font-bold text-slate-900">
              Nhận thông báo ưu đãi
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Cập nhật chương trình giảm giá và sản phẩm mới qua email của bạn.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                placeholder="Nhập email của bạn"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
              <button className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}