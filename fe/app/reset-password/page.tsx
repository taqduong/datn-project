"use client";

import React, { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, ArrowLeft } from "lucide-react";
import { resetPassword } from "@/services/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(
    () => [
      {
        label: "Tối thiểu 8 ký tự",
        valid: newPassword.length >= 8,
      },
      {
        label: "Có ít nhất 1 chữ hoa",
        valid: /[A-Z]/.test(newPassword),
      },
      {
        label: "Có ít nhất 1 chữ thường",
        valid: /[a-z]/.test(newPassword),
      },
      {
        label: "Có ít nhất 1 chữ số",
        valid: /\d/.test(newPassword),
      },
    ],
    [newPassword]
  );

  const isPasswordStrong = passwordChecks.every((item) => item.valid);
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Không tìm thấy mã xác thực.");
      return;
    }

    if (!isPasswordStrong) {
      toast.error("Mật khẩu mới chưa đáp ứng đầy đủ điều kiện.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, newPassword });

      toast.success("Đặt lại mật khẩu thành công!");
      router.push("/login");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Liên kết không hợp lệ hoặc đã hết hạn."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full rounded-3xl border border-red-100 bg-white/90 p-8 shadow-xl shadow-slate-200/50 backdrop-blur">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <LockKeyhole className="h-7 w-7 text-red-500" />
            </div>

            <h1 className="text-center text-2xl font-semibold tracking-normal text-slate-900">
              Liên kết không hợp lệ
            </h1>
            <p className="mt-3 text-center text-sm leading-6 text-slate-500">
              Không tìm thấy mã xác thực trong đường dẫn. Vui lòng yêu cầu gửi lại
              email đặt lại mật khẩu.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/forgot-password"
                className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Gửi lại liên kết đặt lại mật khẩu
              </Link>

              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-10">
      <div className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-8 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              Bảo mật tài khoản
            </div>

            <h1 className="text-4xl xl:text-5xl font-semibold leading-tight tracking-normal text-slate-900">
              Tạo mật khẩu mới{" "}
              <span className="block text-blue-600">
                an toàn cho tài khoản
              </span>
              <span className="block text-slate-900">
                của bạn
              </span>
            </h1>

            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
              Hãy chọn một mật khẩu đủ mạnh để bảo vệ tài khoản. Sau khi cập nhật
              thành công, bạn sẽ được chuyển về trang đăng nhập để tiếp tục sử dụng.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">
                  Bảo mật tốt hơn
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ưu tiên mật khẩu có chữ hoa, chữ thường và số.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">
                  Dễ quản lý hơn
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Cập nhật ngay để đăng nhập lại nhanh chóng và an toàn.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-white/60 bg-white/90 p-8 shadow-2xl shadow-slate-200/60 backdrop-blur">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <LockKeyhole className="h-7 w-7 text-blue-600" />
            </div>

            <h2 className="text-center text-2xl font-semibold tracking-normal text-slate-900">
              Đặt lại mật khẩu
            </h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">
              Nhập mật khẩu mới của bạn bên dưới để hoàn tất quá trình khôi phục tài khoản.
            </p>

            <form onSubmit={handleReset} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Nhập mật khẩu mới"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {confirmPassword.length > 0 && (
                  <p
                    className={`mt-2 text-sm ${
                      isMatch ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {isMatch
                      ? "Mật khẩu xác nhận đã khớp."
                      : "Mật khẩu xác nhận chưa khớp."}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Mật khẩu nên có:
                </p>
                <div className="space-y-2">
                  {passwordChecks.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          item.valid ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <span
                        className={
                          item.valid ? "text-emerald-700" : "text-slate-500"
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 px-4 py-10">
          <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
            <div className="w-full rounded-3xl bg-white p-8 text-center shadow-lg">
              <p className="text-sm text-slate-500">Đang tải...</p>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}