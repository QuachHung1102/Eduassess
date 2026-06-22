"use server";

import { prisma } from "@/lib/db/prisma";
import { randomBytes } from "crypto";

/**
 * Gửi email đặt lại mật khẩu chỉ bật khi (1) đã tích hợp dịch vụ gửi mail bên
 * dưới VÀ (2) env `PASSWORD_RESET_EMAIL_ENABLED=1`. Khi chưa bật, action KHÔNG
 * giả vờ đã gửi (trước đây trả success nhưng email không bao giờ tới — người
 * dùng kẹt ngoài) — thay vào đó trả `emailDisabled` để UI hướng sang đặt lại
 * bằng câu hỏi bảo mật (`/security-questions-reset`, đường đang hoạt động).
 */
const EMAIL_RESET_ENABLED = process.env.PASSWORD_RESET_EMAIL_ENABLED === "1";

export async function forgotPasswordAction(
  formData: FormData,
): Promise<{ error?: string; success?: boolean; emailDisabled?: boolean }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email) {
    return { error: "Vui lòng nhập địa chỉ email" };
  }

  // Chưa cấu hình gửi email → không giả vờ đã gửi; hướng sang câu hỏi bảo mật.
  if (!EMAIL_RESET_ENABLED) {
    return { emailDisabled: true };
  }

  // Luôn trả về success để không lộ thông tin tài khoản tồn tại hay không
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { success: true };
  }

  // Xóa token cũ nếu có
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  // Tạo token mới, hết hạn sau 1 giờ
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt },
  });

  // TODO: Tích hợp dịch vụ email (Resend, SendGrid, Nodemailer...) và gửi link:
  //   ${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}
  // Sau khi hiện thực phần gửi, đặt env PASSWORD_RESET_EMAIL_ENABLED=1 để bật.
  console.log(`[DEV] Reset link: /reset-password?token=${token}`);

  return { success: true };
}
