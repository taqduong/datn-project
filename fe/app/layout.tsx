import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css"

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatBox from "@/components/ChatBox";
import ChatWidget from "@/components/ChatWidget";
import AuthGuard from "@/components/AuthGuard"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HomeMart Store",
  description: "Cửa hàng thương mại điện tử",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-slate-900`}
      >
        <AuthGuard > 
        
          <Toaster position="top-right" />
          <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1">
              {children}
            </main>

            <Footer />
            <ChatBox />
            <ChatWidget />
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}