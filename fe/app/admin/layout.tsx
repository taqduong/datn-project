import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import AdminAuthWrapper from "components/AdminAuthWrapper"; 

export const metadata: Metadata = {
  title: "Admin - Quản trị hệ thống",
  description: "Trang quản trị e-commerce",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthWrapper>
      <div className="flex min-h-screen bg-gray-100">
        
        {/* Sidebar */}
        <Sidebar />

        {/* Content */}
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

      </div>
    </AdminAuthWrapper>
  );
}