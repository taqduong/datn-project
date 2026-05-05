"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setIsAuthorized(false);

    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const currentRole = user?.role?.toLowerCase();

        if ((currentRole === "admin" || currentRole === "nhanvien") && !pathname.startsWith("/admin")) {
          router.replace("/admin"); 
          return; 
        }
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra quyền:", error);
    }

    setIsAuthorized(true);
  }, [pathname, router]);

  if (!isAuthorized) {
    return null; 
  }

  return <>{children}</>;
}