import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requirePageSession } from "@/lib/auth/page-guard";
import { ProfileForm, ChangePasswordForm, SecurityQuestionsForm } from "./SettingsForms";
import { ThemeSettingsSection } from "@/components/theme/ThemeSettingsSection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cài đặt tài khoản" };

export default async function SettingsPage() {
  const { id } = await requirePageSession();

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      name: true,
      email: true,
      code: true,
      category: { select: { label: true } },
      sex: true,
      phoneNumber: true,
      address: true,
      dateOfBirth: true,
      securityAnswers: {
        select: { questionNo: true, questionText: true },
        orderBy: { questionNo: "asc" },
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Cài đặt tài khoản</h1>
        <p className="text-sm mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>Quản lý thông tin cá nhân và bảo mật</p>
      </div>

      {user.code && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: "var(--surface-strong)", border: "1.5px solid var(--border-soft)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
            Mã của bạn{user.category ? ` · ${user.category.label}` : ""}
          </p>
          <p className="mt-1 text-lg font-bold font-mono" style={{ color: "var(--foreground)" }}>{user.code}</p>
        </div>
      )}

      <ThemeSettingsSection />

      <ProfileForm
        user={{
          name: user.name ?? "",
          email: user.email,
          sex: user.sex,
          phoneNumber: user.phoneNumber,
          address: user.address,
          dateOfBirth: user.dateOfBirth,
        }}
      />

      <ChangePasswordForm />

      <SecurityQuestionsForm existing={user.securityAnswers} />
    </div>
  );
}
