"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { 
  Package, 
  Grid, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp,
  Activity
} from "lucide-react";

export default function AdminDashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Khởi tạo State quản lý dữ liệu thống kê tổng quan
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    orders: 0,
    users: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    // Kiểm tra quyền
    if (user?.role !== "nhanvien" && user?.role !== "admin") {
      router.push("/");
      return; 
    } 
    setIsAdmin(true);

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Gọi song song nhiều API cùng lúc để tăng tốc độ load
        // Áp dụng Promise.allSettled đảm bảo tính toàn vẹn khi một phần request thất bại
        const [prodRes, catRes, orderRes, userRes] = await Promise.allSettled([
          api.get("/Products"),
          api.get("/Categories"),
          api.get("/Order/admin"),
          api.get("/users")
        ]);

        // Đếm dữ liệu (Xử lý an toàn tránh lỗi undefined)
        const productsCount = prodRes.status === "fulfilled" ? (prodRes.value.data?.length || prodRes.value.data?.data?.length || 0) : 0;
        const categoriesCount = catRes.status === "fulfilled" ? (catRes.value.data?.length || catRes.value.data?.data?.length || 0) : 0;
        
        // Xử lý riêng mảng Đơn hàng để đếm số lượng và tính doanh thu
        let ordersCount = 0;
        let totalRevenue = 0;
        if (orderRes.status === "fulfilled") {
          const ordersList = orderRes.value.data || [];
          ordersCount = ordersList.length;
          // Tính tổng tiền của những đơn hàng ĐÃ HOÀN THÀNH
          totalRevenue = ordersList.reduce((sum: number, order: any) => {
            if (order.status?.toLowerCase() === 'completed') {
              return sum + (order.totalAmount || 0);
            }
            return sum;
          }, 0);
        }

        const usersCount = userRes.status === "fulfilled" ? (userRes.value.data?.length || userRes.value.data?.data?.length || 0) : 0;

        setStats({
          products: productsCount,
          categories: categoriesCount,
          orders: ordersCount,
          users: usersCount,
          revenue: totalRevenue,
        });

      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  if (!isAdmin) return null;

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Activity className="text-blue-600" size={32} />
          Dashboard Tổng Quan
        </h1>
        <p className="mt-2 text-slate-600">
          Chào mừng bạn đến trang quản trị hệ thống. Dưới đây là tóm tắt tình hình kinh doanh.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Thẻ thống kê trọng tâm: Tổng quan doanh thu hệ thống (Total Revenue) */}
          <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-8">
              <TrendingUp size={150} />
            </div>
            <div className="relative z-10">
              <p className="text-blue-100 font-medium flex items-center gap-2 mb-2">
                <DollarSign size={20} />
                Tổng doanh thu thực tế (Đã hoàn thành)
              </p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
                {formatVND(stats.revenue)}
              </h2>
            </div>
          </div>

          {/* Các Card Thống Kê Chi Tiết */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            
            {/* Card Đơn hàng */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Đơn hàng</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{stats.orders}</p>
              </div>
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <ShoppingCart size={28} />
              </div>
            </div>

            {/* Card Sản phẩm */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sản phẩm</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{stats.products}</p>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Package size={28} />
              </div>
            </div>

            {/* Card Danh mục */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Danh mục</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{stats.categories}</p>
              </div>
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                <Grid size={28} />
              </div>
            </div>

            {/* Card Người dùng */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Người dùng</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{stats.users}</p>
              </div>
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}