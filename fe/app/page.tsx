"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchProducts,
  fetchCategories,
  uploadAvatar,
  type Product,
  type Category,
} from "@/services/api";
import ProductCard from "@/components/ProductCard";

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
  const [currentSlide, setCurrentSlide] = useState(0);

  // THÊM HÀM NỐI LINK BACKEND
  const resolveImgUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5270/api").replace("/api", "");
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

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

  const bannerProducts = useMemo(() => {
    return featuredProducts.filter(p => p.imageUrl); 
  }, [featuredProducts]);

  //LOGIC SLIDER: Auto-play mỗi 3 giây
  useEffect(() => {
    if (bannerProducts.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === bannerProducts.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [bannerProducts.length]);

  const formatVND = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  // Hàm này sẽ kiểm tra xem nếu có biến thể thì lấy giá của biến thể, tính cả giảm giá
  const getBannerPrice = (product: any) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const discountRate = (product.discount || 0) / 100;

    let minPrice = product.price || 0;
    let maxPrice = product.price || 0;

    if (hasVariants) {
      const prices = product.variants.map((v: any) => v.price || 0);
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }

    const minPriceAfterDiscount = minPrice * (1 - discountRate);
    const maxPriceAfterDiscount = maxPrice * (1 - discountRate);

    // Nếu giá biến thể khác nhau thì hiện khoảng giá (VD: 100k - 200k)
    if (hasVariants && minPrice !== maxPrice) {
      return `${formatVND(minPriceAfterDiscount)} - ${formatVND(maxPriceAfterDiscount)}`;
    }
    return formatVND(minPriceAfterDiscount);
  };

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen font-sans">
      {/* Hero Section - Đã lột xác sang giao diện Sáng, Hiện đại */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-linear-to-br from-blue-50 via-white to-indigo-50 px-6 py-12 sm:px-12 lg:py-20 shadow-sm border border-blue-100">
          
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 h-96 w-96 rounded-full bg-blue-200/40 blur-[80px]" />
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 h-96 w-96 rounded-full bg-indigo-200/40 blur-[80px]" />

          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Cột chữ */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/60 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                Bộ sưu tập mới 2026
              </div>

              <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]">
                Mua sắm <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">hiện đại</span>, <br className="hidden lg:block" /> 
                trải nghiệm <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">mượt mà</span>.
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600 font-medium">
                Khám phá hàng ngàn sản phẩm nổi bật với mức giá ưu đãi. Giao diện tối giản, thanh toán dễ dàng chỉ với vài chạm.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-8 py-4 text-base font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5"
                >
                  Khám phá ngay
                </Link>
                <Link
                  href="/sale"
                  className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-8 py-4 text-base font-bold text-white transition-all hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-200 hover:-translate-y-0.5"
                >
                  🔥 Sale Sập Sàn
                </Link>
              </div>

              {/* Thống kê */}
              <div className="mt-12 flex gap-10 border-t border-slate-200/60 pt-8">
                <div>
                  <p className="text-3xl font-black text-slate-900">{products.length}+</p>
                  <p className="text-sm font-semibold text-slate-500 mt-1">Sản phẩm</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900">{categories.length}+</p>
                  <p className="text-sm font-semibold text-slate-500 mt-1">Danh mục</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900">24/7</p>
                  <p className="text-sm font-semibold text-slate-500 mt-1">Hỗ trợ</p>
                </div>
              </div>
            </div>

            {/* CỘT HÌNH ẢNH: BANNER LƯỚT CHUYỂN ĐỘNG */}
            <div className="relative h-[350px] w-full overflow-hidden rounded-[2.5rem] shadow-2xl md:h-[450px] group border-4 border-white">
              
              <div
                className="flex h-full w-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {bannerProducts.length > 0 ? (
                  bannerProducts.map((product, index) => (
                    <Link 
                      href={`/products/${product.id}`}
                      key={index} 
                      className="relative h-full min-w-full block"
                    >
                      <img
                        src={resolveImgUrl(product.imageUrl)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                      {/* Lớp gradient dưới chân ảnh để chữ dễ đọc */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                      
                      {/* Text hiển thị */}
                      <div className="absolute bottom-8 left-8 right-8 text-left">
                        <span className="mb-3 inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                          Mới về
                        </span>
                        <h3 className="line-clamp-2 text-2xl font-bold text-white drop-shadow-md">
                          {product.name}
                        </h3>
                        <p className="text-2xl font-black text-yellow-400 drop-shadow-lg">
                          {getBannerPrice(product)}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex h-full min-w-full items-center justify-center bg-slate-100 text-6xl text-slate-300">
                    📦
                  </div>
                )}
              </div>

              {/* Dấu chấm điều hướng (Chỉ hiện khi có hơn 1 ảnh) */}
              {bannerProducts.length > 1 && (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 z-10">
                  {bannerProducts.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.preventDefault(); // Tránh bị nhảy link khi click vào chấm
                        setCurrentSlide(index);
                      }}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        currentSlide === index ? "w-8 bg-blue-600" : "w-2.5 bg-white/60 hover:bg-white"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md hover:-translate-y-1"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                {item.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Danh mục nổi bật
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-bold text-blue-600 hover:text-blue-700 sm:block bg-blue-50 px-4 py-2 rounded-full"
          >
            Xem tất cả &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 h-14 w-14 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-5 w-1/2 animate-pulse rounded-lg bg-slate-100" />
                <div className="mt-3 h-4 w-full animate-pulse rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCategories.map((category, index) => {
              const icons = ["👕", "🎧", "🪑", "⌚", "💄", "📱"];
              return (
                <Link
                  href={`/products?category=${category.id}`}
                  key={category.id}
                  className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-2xl transition group-hover:bg-blue-50 group-hover:scale-110">
                    {icons[index % icons.length]}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {category.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm font-medium text-slate-500">
                    {category.description || "Khám phá các sản phẩm nổi bật."}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Sản phẩm mới nhất
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-bold text-blue-600 hover:text-blue-700 sm:block bg-blue-50 px-4 py-2 rounded-full"
          >
            Xem thêm &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                <div className="h-64 animate-pulse bg-slate-100" />
                <div className="space-y-3 p-6">
                  <div className="h-6 w-3/4 animate-pulse rounded-lg bg-slate-100" />
                  <div className="h-5 w-1/2 animate-pulse rounded-lg bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mb-4 text-5xl">📦</div>
            <h3 className="text-xl font-bold text-slate-900">Chưa có sản phẩm nào</h3>
            <p className="mt-2 text-base text-slate-500">Hãy thêm sản phẩm từ trang admin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product as any} />
            ))}
          </div>
        )}
      </section>

      {/* Promo banner & Newsletter */}
      <section className="mx-auto max-w-7xl px-4 py-12 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Promo */}
          <div className="overflow-hidden rounded-[2.5rem] bg-linear-to-br from-blue-600 to-indigo-700 p-10 text-white shadow-xl sm:p-12 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <p className="text-sm font-black uppercase tracking-widest text-blue-200 mb-3">
                Ưu đãi giới hạn
              </p>
              <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                Mua sắm thông minh <br /> tiết kiệm mỗi ngày
              </h2>
              <Link
                href="/products"
                className="mt-8 inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-base font-bold text-blue-700 transition hover:bg-slate-50 hover:scale-105 hover:shadow-lg"
              >
                Mua sắm ngay
              </Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-10 shadow-lg sm:p-12">
            <h2 className="text-3xl font-black text-slate-900">
              Nhận thông báo ưu đãi
            </h2>
            <p className="mt-3 text-base font-medium text-slate-500">
              Cập nhật chương trình giảm giá và sản phẩm mới qua email của bạn. Không lo bỏ lỡ deal hời!
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                className="flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 py-4 text-base font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
              />
              <button className="rounded-2xl bg-slate-900 px-8 py-4 text-base font-bold text-white transition hover:bg-slate-800 hover:shadow-lg">
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}