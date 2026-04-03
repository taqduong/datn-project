"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  FolderTree,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChartArea,
  Home,
  Ticket,
  MessageSquare
} from "lucide-react";
import { useMemo, useState } from "react";

type MenuItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  exact?: boolean;
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        href: "/admin",
        label: "Dashboard",
        description: "Tổng quan hệ thống",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: "/admin/categories",
        label: "Danh mục",
        description: "Quản lý nhóm sản phẩm",
        icon: FolderTree,
      },
      {
        href: "/admin/products",
        label: "Sản phẩm",
        description: "Quản lý sản phẩm",
        icon: Package,
      },
      {
        href: "/admin/orders",
        label: "Đơn hàng",
        description: "Quản lý đơn hàng",
        icon: ShoppingBag,
      },
      {
        href: "/admin/vouchers",
        label: "Mã ưu đãi",
        description: "Quản lý khuyến mãi",
        icon: Ticket,
      },
      {
        href: "/admin/users",
        label: "Người dùng",
        description: "Quản lý người dùng",
        icon: Users,
      },
      {
        href: "/admin/contacts",
        label: "Liên hệ",
        description: "Tin nhắn khách hàng",
        icon: MessageSquare,
      },
      {
        href: "/admin/analytics",
        label: "Phân tích",
        description: "Thống kê và báo cáo",
        icon: ChartArea,
      },
    ],
    []
  );

  const isActive = (item: MenuItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <aside
      className={[
        "sticky top-0 flex h-screen flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-300",
        collapsed ? "w-20" : "w-72",
      ].join(" ")}
    >
      <div className="border-b border-slate-100 p-4">
        <div
          className={`flex items-center ${
            collapsed ? "flex-col gap-3" : "justify-between gap-3"
          }`}
        >
          {!collapsed ? (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 shadow-sm">
                <span className="text-sm font-bold text-white">HM</span>
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-900">
                  Admin Panel
                </h2>
                <p className="truncate text-sm text-slate-500">
                  Quản trị hệ thống
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 shadow-sm">
              <span className="text-sm font-bold text-white">HM</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!collapsed && (
          <div className="mb-4 rounded-2xl bg-linear-to-r from-blue-50 to-indigo-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
              Trang quản trị
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Quản lý sản phẩm, danh mục, đơn hàng, mã ưu đãi và người dùng.
            </p>
          </div>
        )}

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={[
                  "group relative flex items-center rounded-2xl transition-all duration-200",
                  collapsed
                    ? "justify-center px-3 py-3"
                    : "gap-3 px-4 py-3.5",
                  active
                    ? "border border-blue-100 bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
              >
                <div
                  className={[
                    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition",
                    active
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                  {active && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                  )}
                </div>

                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm font-semibold ${
                        active ? "text-blue-700" : "text-slate-800"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-xs ${
                        active ? "text-blue-500" : "text-slate-500"
                      }`}
                    >
                      {item.description}
                    </span>
                  </div>
                )}

                {!collapsed && active && (
                  <span className="h-8 w-1 rounded-full bg-blue-500" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-100 p-4">
        {!collapsed ? (
          <div className="space-y-3">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Home className="h-5 w-5 text-slate-500" />
              <span>Về trang người dùng</span>
            </Link>

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Settings className="h-5 w-5 text-slate-500" />
              <span>Cài đặt</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
              title="Về trang người dùng"
            >
              <Home className="h-5 w-5" />
            </Link>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              title="Cài đặt"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}