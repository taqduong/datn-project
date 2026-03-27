"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { forgotPassword } from "@/services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await forgotPassword({ email });
      setIsSent(true);
      toast.success("Hệ thống đã gửi liên kết đặt lại mật khẩu!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/70 border border-white/60">
          {/* Header */}
          <div className="relative px-8 pt-8 pb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="absolute top-0 right-0 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg">
                {isSent ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : (
                  <ShieldCheck className="h-8 w-8" />
                )}
              </div>
            </div>

            <div className="relative mt-5 text-center">
              <h1 className="text-2xl font-semibold tracking-normal">
                {isSent ? "Kiểm tra email của bạn" : "Quên mật khẩu"}
              </h1>
              <p className="mt-2 text-sm text-blue-100 leading-6">
                {isSent
                  ? "Chúng tôi đã gửi liên kết đặt lại mật khẩu đến email của bạn."
                  : "Nhập email đã đăng ký để nhận liên kết thiết lập lại mật khẩu."}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            {!isSent ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Địa chỉ email
                  </label>

                  <div className="group flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Nhập email của bạn..."
                      className="w-full bg-transparent px-3 py-4 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Hãy nhập đúng email bạn đã dùng để đăng ký tài khoản.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Đang gửi liên kết..." : "Gửi liên kết đặt lại mật khẩu"}
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-5 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
                <p className="text-base font-bold text-emerald-700">
                  Gửi email thành công!
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-700/80">
                  Vui lòng kiểm tra hộp thư đến hoặc thư rác để mở liên kết đặt lại mật khẩu.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setIsSent(false);
                    setEmail("");
                  }}
                  className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Gửi lại email khác
                </button>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Bảo mật tài khoản của bạn là ưu tiên hàng đầu của chúng tôi.
        </p>
      </div>
    </div>
  );
}