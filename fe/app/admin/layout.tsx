import Link from "next/link";
import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">

        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-800">
            Admin Panel
          </h1>
          <p className="text-sm text-gray-500">
            Quản trị hệ thống bán hàng
          </p>
        </div>

        <nav className="p-4 space-y-2">

          <a
            href="/admin"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600"
          >
            📊 Tổng quan
          </a>

          <a
            href="/admin/products"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600"
          >
            📦 Sản phẩm
          </a>

          <a
            href="/admin/categories"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600"
          >
            📂 Danh mục
          </a>

          <a
            href="/admin/orders"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600"
          >
            🧾 Đơn hàng
          </a>

          <a
            href="/admin/users"
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600"
          >
            👤 Người dùng
          </a>

        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        {children}
      </main>

    </div>
  );
}