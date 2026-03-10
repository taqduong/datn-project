import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ecommerce Store",
  description: "Website thương mại điện tử hiện đại với Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-100 text-slate-900`}
      >
        <div className="min-h-screen">
          {/* Topbar */}
          <div className="border-b border-slate-200 bg-slate-900 text-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-sm sm:px-6 lg:px-8">
              <p className="truncate">
                Miễn phí vận chuyển cho đơn hàng từ 500.000đ
              </p>
              <div className="hidden items-center gap-4 sm:flex">
                <Link href="/products" className="transition hover:text-blue-300">
                  Khuyến mãi
                </Link>
                <Link href="/profile/1" className="transition hover:text-blue-300">
                  Tài khoản
                </Link>
              </div>
            </div>
          </div>

          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white shadow-sm">
                  S
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    ShopX
                  </h1>
                  <p className="text-xs text-slate-500">Modern Ecommerce</p>
                </div>
              </Link>

              {/* Navigation */}
              <nav className="hidden items-center gap-6 lg:flex">
                <Link
                  href="/"
                  className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
                >
                  Trang chủ
                </Link>
                <Link
                  href="/products"
                  className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
                >
                  Sản phẩm
                </Link>
                <Link
                  href="/wishlist"
                  className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
                >
                  Yêu thích
                </Link>
                <Link
                  href="/orders"
                  className="text-sm font-medium text-slate-700 transition hover:text-slate-900"
                >
                  Đơn hàng
                </Link>
                <Link
                  href="/sale"
                  className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Sale
                </Link>
              </nav>

              {/* Search */}
              <div className="hidden flex-1 md:block">
                <div className="relative mx-auto max-w-xl">
                  <input
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    🔍
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <Link
                  href="/wishlist"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg transition hover:bg-slate-50"
                  aria-label="Wishlist"
                >
                  ♡
                </Link>

                <Link
                  href="/carts"
                  className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg transition hover:bg-slate-50"
                  aria-label="Cart"
                >
                  🛒
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    0
                  </span>
                </Link>

                <Link
                  href="/login"
                  className="hidden rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-flex"
                >
                  Đăng nhập
                </Link>
              </div>
            </div>
          </header>

          {/* Main */}
          <main>{children}</main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white font-bold">
                    S
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">ShopX</h3>
                    <p className="text-sm text-slate-500">Modern Ecommerce</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  Nền tảng mua sắm hiện đại, giao diện đẹp, tốc độ nhanh và trải
                  nghiệm thân thiện cho người dùng.
                </p>
              </div>

              <div>
                <h4 className="mb-4 font-semibold text-slate-900">Khám phá</h4>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li>
                    <Link href="/" className="transition hover:text-slate-900">
                      Trang chủ
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/products"
                      className="transition hover:text-slate-900"
                    >
                      Sản phẩm
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/wishlist"
                      className="transition hover:text-slate-900"
                    >
                      Yêu thích
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/orders"
                      className="transition hover:text-slate-900"
                    >
                      Đơn hàng
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-4 font-semibold text-slate-900">Hỗ trợ</h4>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li>Chính sách vận chuyển</li>
                  <li>Đổi trả sản phẩm</li>
                  <li>Chính sách bảo mật</li>
                  <li>Điều khoản sử dụng</li>
                </ul>
              </div>

              <div>
                <h4 className="mb-4 font-semibold text-slate-900">Liên hệ</h4>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li>Email: support@shopx.vn</li>
                  <li>Hotline: 0123 456 789</li>
                  <li>Địa chỉ: Hà Nội, Việt Nam</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-slate-200">
              <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-sm text-slate-500 sm:px-6 md:flex-row lg:px-8">
                <p>© 2026 ShopX. All rights reserved.</p>
                <p>Thiết kế với Next.js + Tailwind CSS</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}