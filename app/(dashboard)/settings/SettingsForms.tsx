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

type SecurityQuestion = {
  question1: string;
  question2: string;
  question3: string;
} | null;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function FormFeedback({ error, success }: { error: string; success: string }) {
  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
  );
  if (success) return (
    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{success}</div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
            <input name="name" required defaultValue={user.name}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={user.email} disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
            <select name="sex" defaultValue={user.sex ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">-- Không chọn --</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
            <input name="dateOfBirth" type="date" defaultValue={dob}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input name="phoneNumber" type="tel" defaultValue={user.phoneNumber ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <input name="address" defaultValue={user.address ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button type="submit" disabled={isPending}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
          <input name="currentPassword" type="password" required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới <span className="text-gray-400 font-normal">(ít nhất 8 ký tự)</span></label>
          <input name="newPassword" type="password" required minLength={8}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
          <input name="confirmPassword" type="password" required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" disabled={isPending}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
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

export function SecurityQuestionsForm({ existing }: { existing: SecurityQuestion }) {
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
    { qKey: "q1", aKey: "a1", label: "Câu hỏi 1", defaultQ: existing?.question1 },
    { qKey: "q2", aKey: "a2", label: "Câu hỏi 2", defaultQ: existing?.question2 },
    { qKey: "q3", aKey: "a3", label: "Câu hỏi 3", defaultQ: existing?.question3 },
  ];

  return (
    <Section title="Câu hỏi bảo mật">
      <p className="text-sm text-gray-500 mb-4">
        Dùng để xác minh danh tính khi bạn quên mật khẩu. Đáp án không phân biệt hoa thường.
        {existing && <span className="ml-1 text-green-600 font-medium">✓ Đã thiết lập</span>}
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormFeedback error={error} success={success} />
        {questions.map(({ qKey, aKey, label, defaultQ }) => (
          <div key={qKey} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <select name={qKey} required defaultValue={defaultQ ?? ""}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">-- Chọn câu hỏi --</option>
              {PRESET_QUESTIONS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <input name={aKey} required placeholder="Đáp án của bạn"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off" />
          </div>
        ))}
        <p className="text-xs text-gray-400">Đáp án mới sẽ ghi đè đáp án cũ. Hệ thống chỉ lưu dạng mã hóa.</p>
        <button type="submit" disabled={isPending}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
          {isPending ? "Đang lưu..." : "Lưu câu hỏi bảo mật"}
        </button>
      </form>
    </Section>
  );
}
