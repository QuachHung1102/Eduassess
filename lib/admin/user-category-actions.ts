"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require";

function parse(formData: FormData) {
  return {
    label: (formData.get("label") as string)?.trim(),
    prefix: (formData.get("prefix") as string)?.trim().toUpperCase(),
    includeYear: formData.get("includeYear") === "on",
    padWidth: Math.max(0, Number(formData.get("padWidth")) || 0),
    isActive: formData.get("isActive") === "on",
  };
}

export async function createCategoryAction(formData: FormData) {
  const { error } = await requireAdmin();
  if (error) return { error };

  const { label, prefix, includeYear, padWidth } = parse(formData);
  if (!label || !prefix) return { error: "Nhãn và prefix không được để trống" };
  if (await prisma.userCategory.findUnique({ where: { prefix } }))
    return { error: "Prefix này đã tồn tại" };

  await prisma.userCategory.create({ data: { label, prefix, includeYear, padWidth } });
  revalidatePath("/admin/user-categories");
  return { success: true };
}

export async function updateCategoryAction(id: string, formData: FormData) {
  const { error } = await requireAdmin();
  if (error) return { error };

  const { label, prefix, includeYear, padWidth, isActive } = parse(formData);
  if (!label || !prefix) return { error: "Nhãn và prefix không được để trống" };
  const dup = await prisma.userCategory.findFirst({ where: { prefix, NOT: { id } } });
  if (dup) return { error: "Prefix này đã tồn tại" };

  await prisma.userCategory.update({
    where: { id },
    data: { label, prefix, includeYear, padWidth, isActive },
  });
  revalidatePath("/admin/user-categories");
  return { success: true };
}

export async function deleteCategoryAction(id: string) {
  const { error } = await requireAdmin();
  if (error) return { error };

  const cat = await prisma.userCategory.findUnique({
    where: { id },
    select: { systemKey: true, _count: { select: { users: true } } },
  });
  if (!cat) return { error: "Không tìm thấy loại" };
  if (cat.systemKey) return { error: "Không thể xoá loại hệ thống" };
  if (cat._count.users > 0) return { error: "Còn user thuộc loại này, không thể xoá" };

  await prisma.userCategory.delete({ where: { id } });
  revalidatePath("/admin/user-categories");
  return { success: true };
}
