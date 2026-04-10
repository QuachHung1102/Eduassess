"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { loginAction } from "@/lib/auth/actions/login";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/dashboard");
    }
  }
  return (
    <AuthShell
      eyebrow="Đăng nhập"
      title="Quay lại không gian học của bạn"
      description="Đăng nhập để tiếp tục làm bài, ôn tập bằng flashcard và theo dõi tiến bộ theo từng chủ đề."
      footer={
        <>
          Chưa có tài khoản? {" "}
          <Link href="/register" className="font-semibold text-sky-700 hover:text-sky-800">
            Đăng ký ngay
          </Link>
        </>
      }
    >
      <div className="rounded-[1.75rem] bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:p-5">
          <form className="space-y-5" onSubmit={handleSubmit}>
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

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Mật khẩu
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-sky-700 hover:text-sky-800">
                  Quên mật khẩu?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Mật khẩu của bạn"
                className="field-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
      </div>
    </AuthShell>
  );
}
