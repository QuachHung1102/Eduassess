import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ProfileForm, ChangePasswordForm, SecurityQuestionsForm } from "./SettingsForms";
import { ThemeSettingsSection } from "@/components/theme/ThemeSettingsSection";

export const metadata = { title: "Cài đặt tài khoản" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      sex: true,
      phoneNumber: true,
      address: true,
      dateOfBirth: true,
      securityQuestion: {
        select: { question1: true, question2: true, question3: true },
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt tài khoản</h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý thông tin cá nhân và bảo mật</p>
      </div>

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

      <SecurityQuestionsForm existing={user.securityQuestion} />
    </div>
  );
}
