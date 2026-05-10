"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminAuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    
    // Kiểm tra trạng thái xác thực: Điều hướng về trang Login
    if (!userStr) {
      router.replace("/login");
      return;
    }

    const user = JSON.parse(userStr);
    
    // Điều hướng về Trang chủ nếu không có quyền Quản trị
    if (user?.role !== "nhanvien" && user?.role !== "admin") {
      router.replace("/");
      return; 
    }

    // Xác thực thành công: Cấp quyền truy cập vào khu vực Quản trị
    setIsAuthorized(true);
  }, [router]);

  // Ngăn chặn Render giao diện trong quá trình kiểm tra quyền truy cập
  if (!isAuthorized) {
    return null; 
  }

  return <>{children}</>;
}