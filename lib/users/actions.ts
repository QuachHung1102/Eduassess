"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/require";
import { generateUserCode, findCategoryBySystemKey } from "./user-code-store";

/** Staff tạo tài khoản học sinh (gate quyền `student.create`). Mã HS sinh tự động. */
export async function createStudentByStaffAction(formData: FormData) {
  const { error } = await requirePermission("student.create");
  if (error) return { error };

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim();
  const sex = (formData.get("sex") as string) || null;
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const dobStr = (formData.get("dateOfBirth") as string)?.trim() || null;

  if (!name || !email || !password) return { error: "Vui lòng điền đầy đủ thông tin bắt buộc" };
  if (password.length < 8) return { error: "Mật khẩu phải có ít nhất 8 ký tự" };

  if (await prisma.user.findUnique({ where: { email } })) return { error: "Email đã được dùng" };

  const hashed = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const category = await findCategoryBySystemKey(tx, "STUDENT");
    if (!category) throw new Error("Thiếu UserCategory STUDENT — chạy seed/backfill trước");
    const code = await generateUserCode(tx, category);
    await tx.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "STUDENT",
        sex,
        phoneNumber,
        address,
        dateOfBirth: dobStr ? new Date(dobStr) : null,
        categoryId: category.id,
        code,
      },
    });
  });

  revalidatePath("/staff/students");
  return { success: true };
}
