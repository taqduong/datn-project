'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // Kiểm tra nếu người dùng có vai trò là 'admin'
    if (user?.role !== 'admin') {
      // Nếu không phải admin, chuyển hướng về trang chủ
      router.push('/');
    } else {
      setIsAdmin(true);
    }
  }, [router]);

  // Nếu không có quyền admin, trả về null (không hiển thị gì)
  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard Admin</h1>
        <p className="mt-2 text-slate-600">
          Chào mừng bạn đến trang quản trị hệ thống thương mại điện tử.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Sản phẩm</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">--</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Danh mục</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">--</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Đơn hàng</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">--</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Người dùng</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">--</p>
        </div>
      </div>
    </div>
  );
}