"use server";

import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

/**
 * Step 1: given an email, return the 3 security questions (not the answers).
 * We never reveal whether the account exists or not.
 */
export async function getSecurityQuestionsAction(
  email: string
): Promise<{ questions: [string, string, string] } | { error: string }> {
  if (!email) return { error: "Vui lòng nhập email" };

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      securityQuestion: {
        select: { question1: true, question2: true, question3: true },
      },
    },
  });

  if (!user || !user.securityQuestion) {
    return {
      error:
        "Tài khoản này chưa thiết lập câu hỏi bảo mật. Vui lòng liên hệ quản trị viên.",
    };
  }

  const { question1, question2, question3 } = user.securityQuestion;
  return { questions: [question1, question2, question3] };
}

/**
 * Step 2: verify the 3 answers + set a new password in one step.
 */
export async function resetPasswordBySecurityQuestionsAction(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const a1 = (formData.get("a1") as string)?.trim().toLowerCase();
  const a2 = (formData.get("a2") as string)?.trim().toLowerCase();
  const a3 = (formData.get("a3") as string)?.trim().toLowerCase();
  const newPassword = (formData.get("newPassword") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();

  if (!email || !a1 || !a2 || !a3 || !newPassword || !confirmPassword)
    return { error: "Vui lòng điền đầy đủ thông tin" };

  if (newPassword.length < 8)
    return { error: "Mật khẩu mới phải có ít nhất 8 ký tự" };

  if (newPassword !== confirmPassword)
    return { error: "Mật khẩu xác nhận không khớp" };

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      securityQuestion: {
        select: { answer1: true, answer2: true, answer3: true },
      },
    },
  });

  if (!user || !user.securityQuestion) {
    return { error: "Xác minh thất bại. Vui lòng thử lại hoặc liên hệ quản trị viên." };
  }

  const { answer1, answer2, answer3 } = user.securityQuestion;

  const [ok1, ok2, ok3] = await Promise.all([
    bcrypt.compare(a1, answer1),
    bcrypt.compare(a2, answer2),
    bcrypt.compare(a3, answer3),
  ]);

  if (!ok1 || !ok2 || !ok3) {
    return { error: "Câu trả lời không đúng. Vui lòng kiểm tra lại." };
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return { success: true };
}
