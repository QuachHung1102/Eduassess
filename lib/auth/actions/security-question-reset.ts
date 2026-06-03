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
      securityAnswers: {
        select: { questionText: true },
        orderBy: { questionNo: "asc" },
      },
    },
  });

  if (!user || user.securityAnswers.length !== 3) {
    // Trả cùng một message dù email không tồn tại hay chưa setup
    // để tránh để lộ email hợp lệ (email enumeration)
    return {
      error: "Email không tồn tại hoặc tài khoản chưa thiết lập câu hỏi bảo mật. Vui lòng liên hệ quản trị viên.",
    };
  }

  const [s1, s2, s3] = user.securityAnswers;
  return { questions: [s1.questionText, s2.questionText, s3.questionText] };
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
      securityAnswers: {
        select: { questionNo: true, answerHash: true },
        orderBy: { questionNo: "asc" },
      },
    },
  });

  if (!user || user.securityAnswers.length !== 3) {
    return { error: "Xác minh thất bại. Vui lòng thử lại hoặc liên hệ quản trị viên." };
  }

  const [s1, s2, s3] = user.securityAnswers;

  const [ok1, ok2, ok3] = await Promise.all([
    bcrypt.compare(a1, s1.answerHash),
    bcrypt.compare(a2, s2.answerHash),
    bcrypt.compare(a3, s3.answerHash),
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
