"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminAuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    
    // Chưa đăng nhập -> Đá về Login
    if (!userStr) {
      router.replace("/login");
      return;
    }

    const user = JSON.parse(userStr);
    
    // Khách hàng mò vào -> Đá về Trang chủ
    if (user?.role !== "nhanvien" && user?.role !== "admin") {
      router.replace("/");
      return; 
    }

    // Đúng người đúng tội -> Mở cổng
    setIsAuthorized(true);
  }, [router]);

  // TẤM KHIÊN: Trả về null (màn hình tàng hình) nếu chưa check xong
  if (!isAuthorized) {
    return null; 
  }

  // Check xong thì mới nhả giao diện Admin ra
  return <>{children}</>;
}