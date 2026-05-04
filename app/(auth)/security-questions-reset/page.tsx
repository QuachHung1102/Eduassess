"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import AuthShell from "@/components/auth/AuthShell";
import {
  getSecurityQuestionsAction,
  resetPasswordBySecurityQuestionsAction,
} from "@/lib/auth/actions/security-question-reset";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faShieldHalved,
  faCircleCheck,
  faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";

type Step = "email" | "reset" | "done";

export default function SecurityQuestionsResetPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<[string, string, string] | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showContactModal, setShowContactModal] = useState(false);

  function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const emailVal = (fd.get("email") as string).trim().toLowerCase();
    startTransition(async () => {
      const result = await getSecurityQuestionsAction(emailVal);
      if ("error" in result) {
        setError(result.error);
      } else {
        setEmail(emailVal);
        setQuestions(result.questions);
        setStep("reset");
      }
    });
  }

  function handleResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("email", email);
    startTransition(async () => {
      const result = await resetPasswordBySecurityQuestionsAction(fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        setStep("done");
      }
    });
  }

  return (
    <AuthShell
      eyebrow="Khôi phục mật khẩu"
      title="Xác minh qua câu hỏi bảo mật"
      description="Trả lời đúng các câu hỏi bảo mật đã thiết lập để đặt lại mật khẩu của bạn."
      footer={
        <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">
          ← Quay lại đăng nhập
        </Link>
      }
    >
      <div className="rounded-[1.75rem] bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:p-5">
        {step === "done" ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              <FaIcon icon={faCircleCheck} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Đặt lại mật khẩu thành công!</h2>
            <p className="text-sm text-slate-600">Bạn có thể đăng nhập với mật khẩu mới ngay bây giờ.</p>
            <Link href="/login" className="inline-block mt-2 text-sm font-semibold text-sky-700 hover:text-sky-800">
              Đăng nhập ngay →
            </Link>
          </div>
        ) : step === "email" ? (
          <form className="space-y-5" onSubmit={handleEmailSubmit}>
            <div className="flex justify-center mb-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-2xl">
                <FaIcon icon={faShieldHalved} className="text-sky-600" />
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email tài khoản</label>
              <input
                name="email"
                type="email"
                required
                placeholder="ten@email.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-60"
            >
              {isPending ? "Đang tải..." : "Tiếp tục"}
            </button>
            <div className="text-center">
              <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-sky-700">
                Dùng email thay thế
              </Link>
            </div>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleResetSubmit}>
            <p className="text-sm text-slate-500 text-center">
              Đang xác minh cho: <span className="font-medium text-slate-700">{email}</span>
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}
            {questions!.map((q, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{q}</label>
                <input
                  name={`a${i + 1}`}
                  required
                  placeholder="Đáp án của bạn"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            ))}
            <hr className="border-slate-100" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mật khẩu mới <span className="text-slate-400 font-normal">(ít nhất 8 ký tự)</span>
              </label>
              <input
                name="newPassword"
                type="password"
                required
                minLength={8}
                placeholder="Mật khẩu mới"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
              <input
                name="confirmPassword"
                type="password"
                required
                placeholder="Nhập lại mật khẩu"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-60"
            >
              {isPending ? "Đang xác minh..." : "Đặt lại mật khẩu"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto"
              >
                <FaIcon icon={faCircleQuestion} />
                Tôi không nhớ câu trả lời
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Contact modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Liên hệ quản trị viên</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Nếu bạn không nhớ câu trả lời bảo mật, hãy liên hệ với quản trị viên hệ thống
              để được hỗ trợ đặt lại mật khẩu trực tiếp.
            </p>
            <p className="text-sm text-slate-500">
              Bạn sẽ cần cung cấp thông tin xác minh danh tính theo quy trình offline của đơn vị.
            </p>
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
