"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { resetPasswordAction } from "@/lib/auth/actions/reset-password";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setStatus("loading");
    const formData = new FormData(e.currentTarget);
    formData.set("token", token);
    const result = await resetPasswordAction(formData);
    if (result?.error) {
      setError(result.error);
      setStatus("idle");
    } else {
      setStatus("done");
      setTimeout(() => router.push("/login"), 2500);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="text-sm text-slate-600">Liên kết không hợp lệ.</p>
        <Link href="/forgot-password" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
          Yêu cầu liên kết mới
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
          ✅
        </div>
        <h2 className="text-lg font-black text-slate-900">Đặt lại mật khẩu thành công!</h2>
        <p className="text-sm text-slate-600">Đang chuyển hướng về trang đăng nhập...</p>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <h2 className="mb-1 text-lg font-black text-slate-900">Đặt mật khẩu mới</h2>
        <p className="text-sm leading-7 text-slate-600">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
          Mật khẩu mới
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Tối thiểu 8 ký tự"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">
          Xác nhận mật khẩu mới
        </label>
        <input
          id="confirm-password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Nhập lại mật khẩu mới"
          className="field-input"
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "Đang lưu..." : "Đặt lại mật khẩu"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Tạo mật khẩu mới"
      title="Cập nhật mật khẩu để vào lại hệ thống"
      description="Sau khi đặt mật khẩu mới, bạn sẽ được chuyển về trang đăng nhập để tiếp tục học tập hoặc quản lý lớp học."
      footer={
        <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">
          ← Quay lại đăng nhập
        </Link>
      }
    >
      <div className="rounded-[1.75rem] bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:p-5">
          <Suspense fallback={<div className="text-center text-sm text-gray-400">Đang tải...</div>}>
            <ResetPasswordForm />
          </Suspense>
      </div>
    </AuthShell>
  );
}
