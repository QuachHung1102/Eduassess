"use client";

import { useState, useTransition } from "react";
import {
  updateProfileAction,
  changePasswordAction,
  saveSecurityQuestionsAction,
} from "@/lib/settings/actions";

type User = {
  name: string;
  email: string;
  sex: string | null;
  phoneNumber: string | null;
  address: string | null;
  dateOfBirth: Date | null;
};

type SecurityAnswerRow = {
  questionNo: number;
  questionText: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="primary-panel">
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-soft)" }}>
        <h2 className="font-semibold" style={{ color: "var(--foreground)" }}>{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function FormFeedback({ error, success }: { error: string; success: string }) {
  if (error) return (
    <div className="border text-sm rounded-lg px-4 py-3" style={{ background: "rgb(254 242 242)", borderColor: "rgb(254 202 202)", color: "rgb(185 28 28)" }}>{error}</div>
  );
  if (success) return (
    <div className="border text-sm rounded-lg px-4 py-3" style={{ background: "rgb(240 253 244)", borderColor: "rgb(187 247 208)", color: "rgb(21 128 61)" }}>{success}</div>
  );
  return null;
}

export function ProfileForm({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dob = user.dateOfBirth
    ? new Date(user.dateOfBirth).toISOString().split("T")[0]
    : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setSuccess("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfileAction(fd);
      if (result?.error) setError(result.error);
      else setSuccess("Đã cập nhật thông tin");
    });
  }

  return (
    <Section title="Thông tin cá nhân">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormFeedback error={error} success={success} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Họ và tên <span className="text-red-500">*</span></label>
            <input name="name" required defaultValue={user.name}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)" }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Email</label>
            <input value={user.email} disabled
              className="w-full rounded-lg px-3 py-2 text-sm cursor-not-allowed"
              style={{ border: "1px solid var(--border-soft)", background: "var(--surface-muted)", color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Giới tính</label>
            <select name="sex" defaultValue={user.sex ?? ""}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)" }}>
              <option value="">-- Không chọn --</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Ngày sinh</label>
            <input name="dateOfBirth" type="date" defaultValue={dob}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)" }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Số điện thoại</label>
            <input name="phoneNumber" type="tel" defaultValue={user.phoneNumber ?? ""}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)" }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Địa chỉ</label>
            <input name="address" defaultValue={user.address ?? ""}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)" }} />
          </div>
        </div>
        <button type="submit" disabled={isPending}
          className="text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}>
          {isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </Section>
  );
}

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setSuccess("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await changePasswordAction(fd);
      if (result?.error) setError(result.error);
      else {
        setSuccess("Đã đổi mật khẩu thành công");
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  return (
    <Section title="Đổi mật khẩu">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <FormFeedback error={error} success={success} />
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Mật khẩu hiện tại</label>
          <input name="currentPassword" type="password" required
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)" }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Mật khẩu mới <span className="font-normal" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>(ít nhất 8 ký tự)</span></label>
          <input name="newPassword" type="password" required minLength={8}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)" }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>Xác nhận mật khẩu mới</label>
          <input name="confirmPassword" type="password" required
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)" }} />
        </div>
        <button type="submit" disabled={isPending}
          className="text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}>
          {isPending ? "Đang đổi..." : "Đổi mật khẩu"}
        </button>
      </form>
    </Section>
  );
}

const PRESET_QUESTIONS = [
  "Tên thú cưng đầu tiên của bạn là gì?",
  "Tên trường tiểu học bạn từng học là gì?",
  "Tên người bạn thân nhất thời thơ ấu của bạn là gì?",
  "Tên thành phố bạn sinh ra là gì?",
  "Nghề nghiệp mơ ước thuở nhỏ của bạn là gì?",
  "Bạn học lớp 1 ở đâu?",
  "Món ăn yêu thích từ nhỏ của bạn là gì?",
];

export function SecurityQuestionsForm({ existing }: { existing: SecurityAnswerRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setSuccess("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveSecurityQuestionsAction(fd);
      if (result?.error) setError(result.error);
      else setSuccess("Đã lưu câu hỏi bảo mật");
    });
  }

  const questions = [
    { qKey: "q1", aKey: "a1", label: "Câu hỏi 1", defaultQ: existing[0]?.questionText },
    { qKey: "q2", aKey: "a2", label: "Câu hỏi 2", defaultQ: existing[1]?.questionText },
    { qKey: "q3", aKey: "a3", label: "Câu hỏi 3", defaultQ: existing[2]?.questionText },
  ];

  return (
    <Section title="Câu hỏi bảo mật">
      <p className="text-sm mb-4" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
        Dùng để xác minh danh tính khi bạn quên mật khẩu. Đáp án không phân biệt hoa thường.
        {existing.length > 0 && <span className="ml-1 text-green-600 font-medium">✓ Đã thiết lập</span>}
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormFeedback error={error} success={success} />
        {questions.map(({ qKey, aKey, label, defaultQ }) => (
          <div key={qKey} className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: "color-mix(in srgb, var(--foreground) 78%, transparent)" }}>{label}</label>
            <select name={qKey} required defaultValue={defaultQ ?? ""}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)" }}>
              <option value="">-- Chọn câu hỏi --</option>
              {PRESET_QUESTIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <input name={aKey} required placeholder="Đáp án của bạn"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--border-soft)", background: "var(--surface)", color: "var(--foreground)" }}
              autoComplete="off" />
          </div>
        ))}
        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 45%, transparent)" }}>Đáp án mới sẽ ghi đè đáp án cũ. Hệ thống chỉ lưu dạng mã hóa.</p>
        <button type="submit" disabled={isPending}
          className="text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}>
          {isPending ? "Đang lưu..." : "Lưu câu hỏi bảo mật"}
        </button>
      </form>
    </Section>
  );
}
