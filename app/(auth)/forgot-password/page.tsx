"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { forgotPasswordAction } from "@/lib/auth/actions/forgot-password";
import { FaIcon } from "@/components/ui/FaIcon";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setStatus("loading");
    const formData = new FormData(e.currentTarget);
    const result = await forgotPasswordAction(formData);
    if (result?.error) {
      setError(result.error);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  return (
    <AuthShell
      eyebrow="Khôi phục truy cập"
      title="Đặt lại mật khẩu an toàn và nhanh gọn"
      description="Nhập email đã đăng ký. Nếu tài khoản tồn tại, hệ thống sẽ gửi liên kết để bạn tạo mật khẩu mới trong ít phút."
      footer={
        <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">
          ← Quay lại đăng nhập
        </Link>
      }
    >
      <div className="rounded-[1.75rem] bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:p-5">
          {status === "sent" ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                <FaIcon icon={faEnvelope} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Kiểm tra email của bạn</h2>
              <p className="text-sm leading-7 text-slate-600">
                Nếu địa chỉ email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật
                khẩu. Vui lòng kiểm tra hộp thư đến (và thư mục Spam).
              </p>
              <p className="text-xs font-medium text-slate-400">Liên kết có hiệu lực trong 1 giờ.</p>
              <Link
                href="/login"
                className="inline-block text-sm font-semibold text-sky-700 hover:text-sky-800"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <h2 className="mb-1 text-lg font-black text-slate-900">Quên mật khẩu?</h2>
                <p className="text-sm leading-7 text-slate-600">
                  Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
                </p>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="ten@truong.edu.vn"
                  className="field-input"
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "loading" ? "Đang gửi..." : "Gửi liên kết đặt lại"}
              </button>
              <div className="text-center pt-1">
                <Link
                  href="/security-questions-reset"
                  className="text-xs text-slate-500 hover:text-sky-700"
                >
                  Dùng câu hỏi bảo mật thay thế →
                </Link>
              </div>
            </form>
          )}
      </div>
    </AuthShell>
  );
}
