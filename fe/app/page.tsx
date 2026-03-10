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
    desc: "Nhận hàng toàn quốc với thời gian giao linh hoạt và tối ưu.",
    icon: "🚚",
  },
  {
    title: "Thanh toán an toàn",
    desc: "Nhiều phương thức thanh toán bảo mật và tiện lợi.",
    icon: "🔒",
  },
  {
    title: "Đổi trả dễ dàng",
    desc: "Hỗ trợ đổi trả minh bạch, nhanh chóng và rõ ràng.",
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
    <div className="bg-slate-100 text-slate-800">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16 bg-gray-100 text-gray-800">
        <div className="relative overflow-hidden rounded-4xl border border-blue-200 bg-[#1a95e1] px-6 py-12 text-white shadow-2xl sm:px-10 lg:px-14 lg:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.6),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.4),transparent_25%)]" />

          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                ✨ Bộ sưu tập mới đã lên kệ
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Mua sắm hiện đại, trải nghiệm mượt mà và sản phẩm chất lượng.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Khám phá nhiều sản phẩm nổi bật, danh mục đa dạng và giao diện
                thương mại điện tử trực quan, hiện đại.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Khám phá sản phẩm
                </Link>

                <Link
                  href="/sale"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 font-semibold text-white transition hover:bg-white/15"
                >
                  Xem ưu đãi hôm nay
                </Link>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-bold">{products.length}+</p>
                  <p className="mt-1 text-sm text-slate-300">Sản phẩm</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-bold">{categories.length}+</p>
                  <p className="mt-1 text-sm text-slate-300">Danh mục</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-bold">24/7</p>
                  <p className="mt-1 text-sm text-slate-300">Hỗ trợ</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 p-3 shadow-xl backdrop-blur">
                <img
                  src={
                    featuredProducts[0]?.imageUrl ||
                    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1400&auto=format&fit=crop"
                  }
                  alt="Hero product"
                  className="h-72 w-full rounded-[1.25rem] object-cover sm:h-80"
                />
              </div>

              <div className="grid gap-4">
                <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 p-3 shadow-xl backdrop-blur">
                  <img
                    src={
                      featuredProducts[1]?.imageUrl ||
                      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop"
                    }
                    alt="Hero sub product 1"
                    className="h-36 w-full rounded-[1.25rem] object-cover sm:h-40"
                  />
                </div>
                <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 p-3 shadow-xl backdrop-blur">
                  <img
                    src={
                      featuredProducts[2]?.imageUrl ||
                      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200&auto=format&fit=crop"
                    }
                    alt="Hero sub product 2"
                    className="h-36 w-full rounded-[1.25rem] object-cover sm:h-40"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
              Danh mục nổi bật
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Khám phá theo danh mục
            </h2>
          </div>

          <Link
            href="/products"
            className="hidden rounded-2xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-800 transition hover:bg-slate-50 sm:inline-flex"
          >
            Xem tất cả
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 h-16 w-16 animate-pulse rounded-2xl bg-slate-200" />
                <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-5 w-full animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredCategories.map((category, index) => {
              const icons = ["👕", "🎧", "🪑", "⌚", "💄", "📱"];
              return (
                <Link
                  href="/products"
                  key={category.id}
                  className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl transition group-hover:bg-blue-50">
                    {icons[index % icons.length]}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {category.name}
                  </h3>
                  <p className="mt-2 leading-7 text-slate-600">
                    {category.description || "Khám phá các sản phẩm nổi bật."}
                  </p>
                  <div className="mt-5 text-sm font-semibold text-blue-600">
                    Xem sản phẩm →
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-6xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-500">
              Sản phẩm nổi bật
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Sản phẩm mới nhất từ cửa hàng
            </h2>
          </div>

          <Link
            href="/products"
            className="hidden rounded-2xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-800 transition hover:bg-slate-50 sm:inline-flex"
          >
            Xem thêm sản phẩm
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
              >
                <div className="h-72 animate-pulse bg-slate-200" />
                <div className="space-y-3 p-5">
                  <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mb-4 text-6xl">📦</div>
            <h3 className="text-2xl font-bold text-slate-900">
              Chưa có sản phẩm nào
            </h3>
            <p className="mt-3 text-slate-600">
              Hãy thêm sản phẩm từ trang admin để hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.map((product) => {
              const hasDiscount = !!product.discount && product.discount > 0;
              const displayPrice = getDisplayPrice(product);

              return (
                <div
                  key={product.id}
                  className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-72 w-full items-center justify-center bg-slate-100 text-6xl">
                        📦
                      </div>
                    )}

                    {hasDiscount && (
                      <div className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-sm font-semibold text-white shadow">
                        -{product.discount}%
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    {product.categoryName && (
                      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
                        {product.categoryName}
                      </p>
                    )}

                    <h3 className="line-clamp-2 text-2xl font-bold text-slate-900">
                      {product.name}
                    </h3>

                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-3xl font-bold text-red-600">
                        {formatVND(displayPrice)}
                      </span>

                      {hasDiscount && (
                        <span className="pb-1 text-lg text-slate-400 line-through">
                          {formatVND(product.price)}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex gap-3">
                      <Link
                        href={`/products/${product.id}`}
                        className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-center font-semibold text-white transition hover:bg-slate-800"
                      >
                        Xem chi tiết
                      </Link>

                      <button className="rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-800 transition hover:bg-slate-50">
                        ♡
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Promo banner */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-4xl border border-slate-200 bg-linear-to-r from-blue-600 via-indigo-600 to-slate-900 px-8 py-10 text-white shadow-xl">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                Ưu đãi giới hạn
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Mua sắm thông minh với giá tốt hơn mỗi ngày
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-blue-100">
                Theo dõi các chương trình khuyến mãi và lựa chọn những sản phẩm
                phù hợp nhất với nhu cầu của bạn.
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Mua sắm ngay
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Đăng ký nhận ưu đãi mới nhất
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                Cập nhật chương trình giảm giá, sản phẩm mới và ưu đãi nổi bật
                ngay qua email của bạn.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <input
                type="email"
                placeholder="Nhập email của bạn"
                className="min-w-70 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400"
              />
              <button className="rounded-2xl bg-slate-900 px-6 py-3.5 font-semibold text-white transition hover:bg-slate-800">
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}