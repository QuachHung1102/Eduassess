"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAvailability } from "@/lib/availability/store";
import { resolveUserIdByRole } from "@/lib/auth/require";
import type { AvailabilityMode, DayOfWeek, TimeSlot } from "@/lib/types";

// ── Lịch rảnh của giáo viên đang đăng nhập ───────────────────
export async function saveMyTeacherAvailabilityAction(
  slots: { dayOfWeek: DayOfWeek; slot: TimeSlot; availabilityMode: AvailabilityMode }[],
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const teacherId = await resolveUserIdByRole(
    { id: session.user.id, email: session.user.email },
    "TEACHER",
  );
  if (!teacherId) {
    return { error: "Không xác định được tài khoản giáo viên. Vui lòng đăng nhập lại." };
  }

  try {
    await saveAvailability({ kind: "teacher", id: teacherId }, slots);
  } catch {
    return { error: "Không thể lưu lịch rảnh lúc này. Vui lòng đăng nhập lại và thử lại." };
  }

  revalidatePath("/teacher/schedule");
  return { success: true };
}
