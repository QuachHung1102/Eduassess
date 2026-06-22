import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/auth/permissions";
import { getTeacherWithAvailability } from "@/lib/classes/queries";
import { saveTeacherAvailabilityAction } from "@/lib/classes/actions/availability";
import { AvailabilityMatrix } from "@/components/availability/AvailabilityMatrix";
import type { DayOfWeek, TimeSlot, AvailabilityMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeacherAvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await auth())?.user;
  if (!user || !(await can(user, "class.create"))) redirect("/staff");

  const { teacher, availability } = await getTeacherWithAvailability(id);
  if (!teacher) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/staff/teachers" className="text-sm text-blue-600 hover:underline">
          ← Danh sách giáo viên
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Lịch rảnh: {teacher.name}</h1>
        <p className="text-sm text-gray-500">{teacher.email}</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Bạn đang khai/sửa lịch rảnh hộ giáo viên này để hỗ trợ xếp lớp. Giáo viên vẫn tự khai được ở khu giáo viên.
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <AvailabilityMatrix
          initial={availability.map((a) => ({
            dayOfWeek: a.dayOfWeek as DayOfWeek,
            slot: a.slot as TimeSlot,
            availabilityMode: a.availabilityMode as AvailabilityMode,
          }))}
          onSave={saveTeacherAvailabilityAction.bind(null, id)}
        />
      </div>
    </div>
  );
}
