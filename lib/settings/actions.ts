"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function updateProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const sex = (formData.get("sex") as string) || null;
  const phone = (formData.get("phoneNumber") as string)?.trim() || null;
  const dobRaw = formData.get("dateOfBirth") as string | null;
  const dateOfBirth = dobRaw ? new Date(dobRaw) : null;

  if (!name) return { error: "Họ tên không được để trống" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, address, sex, phoneNumber: phone, dateOfBirth },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function changePasswordAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Vui lòng điền đầy đủ" };
  }

  if (newPassword.length < 8) {
    return { error: "Mật khẩu mới phải có ít nhất 8 ký tự" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Xác nhận mật khẩu không khớp" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Không tìm thấy tài khoản" };

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { error: "Mật khẩu hiện tại không đúng" };

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return { success: true };
}

export async function saveSecurityQuestionsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Chưa đăng nhập" };

  const q1 = (formData.get("q1") as string)?.trim();
  const a1 = (formData.get("a1") as string)?.trim().toLowerCase();
  const q2 = (formData.get("q2") as string)?.trim();
  const a2 = (formData.get("a2") as string)?.trim().toLowerCase();
  const q3 = (formData.get("q3") as string)?.trim();
  const a3 = (formData.get("a3") as string)?.trim().toLowerCase();

  if (!q1 || !a1 || !q2 || !a2 || !q3 || !a3) {
    return { error: "Vui lòng điền đầy đủ tất cả câu hỏi và đáp án" };
  }

  const [h1, h2, h3] = await Promise.all([
    bcrypt.hash(a1, 12),
    bcrypt.hash(a2, 12),
    bcrypt.hash(a3, 12),
  ]);

  await prisma.$transaction([
    prisma.securityAnswer.deleteMany({ where: { userId: session.user.id } }),
    prisma.securityAnswer.createMany({
      data: [
        { userId: session.user.id, questionNo: 1, questionText: q1, answerHash: h1 },
        { userId: session.user.id, questionNo: 2, questionText: q2, answerHash: h2 },
        { userId: session.user.id, questionNo: 3, questionText: q3, answerHash: h3 },
      ],
    }),
  ]);

  revalidatePath("/settings");
  return { success: true };
}
