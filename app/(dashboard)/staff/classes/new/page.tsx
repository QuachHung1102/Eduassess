import Link from "next/link";
import { getSubjectsList, getTeachersList } from "@/lib/classes/queries";
import { ClassBuilder } from "./ClassBuilder";

export default async function NewClassPage() {
  const [subjects, teachers] = await Promise.all([
    getSubjectsList(),
    getTeachersList(),
  ]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link href="/staff/classes" className="text-sm hover:underline" style={{ color: "var(--primary)" }}>
          ← Quay lại danh sách lớp
        </Link>
        <h1 className="mt-2 text-2xl font-bold" style={{ color: "var(--foreground)" }}>Tạo lớp học mới</h1>
        <p className="mt-1 text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
          Dựng khung lịch tuần, hệ thống tự lọc giáo viên, phòng và học sinh khả thi để tránh trùng lịch.
        </p>
      </div>

      <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border-soft)" }}>
        <ClassBuilder subjects={subjects} teachers={teachers} />
      </div>
    </div>
  );
}
