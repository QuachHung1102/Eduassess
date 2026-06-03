"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { registerAction } from "@/lib/auth/actions/register";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await registerAction(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/login?registered=1");
    }
  }
  return (
    <AuthShell
      eyebrow="Tạo tài khoản"
      title="Bắt đầu với một trải nghiệm học tập gọn gàng hơn"
      description="Tạo tài khoản để vào hệ thống, làm bài kiểm tra, ôn tập bằng flashcard và xem tiến bộ của bạn rõ ràng hơn theo từng môn."
      footer={
        <>
          Đã có tài khoản? {" "}
          <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">
            Đăng nhập
          </Link>
        </>
      }
    >
        <div className="rounded-[1.5rem] bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:rounded-[1.75rem] sm:p-5">
          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
              <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
                Họ và tên
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Nguyễn Văn A"
                className="field-input min-h-11"
              />
              </div>

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
                className="field-input min-h-11"
              />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="mb-2 block text-sm font-semibold text-slate-700">
                Vai trò
              </label>
              <select
                id="role"
                name="role"
                defaultValue="STUDENT"
                className="field-input min-h-11"
              >
                <option value="TEACHER">Giáo viên</option>
                <option value="STUDENT">Học sinh</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Tối thiểu 8 ký tự"
                className="field-input min-h-11"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">
                Xác nhận mật khẩu
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Nhập lại mật khẩu"
                className="field-input min-h-11"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="primary-button focus-ring-strong press-feedback-inset state-disabled loading-inline w-full justify-center"
            >
              {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </button>
          </form>
      </div>
    </AuthShell>
  );
}
