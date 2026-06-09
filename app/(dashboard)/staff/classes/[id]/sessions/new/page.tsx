import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClassDetail,
  getTeachersList,
  getRoomUsageForDate,
  getNextSessionNumber,
} from "@/lib/classes/queries";
import { SessionScheduler } from "./SessionScheduler";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const today = new Date().toISOString().split("T")[0];
  const [cls, teachers, rooms, nextNum] = await Promise.all([
    getClassDetail(id),
    getTeachersList(),
    getRoomUsageForDate(today),
    getNextSessionNumber(id),
  ]);
  if (!cls) notFound();

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/staff/classes/${id}`}
          className="text-sm hover:underline"
          style={{ color: "var(--primary)" }}
        >
          ← {cls.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Thêm buổi học mới
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground, #6b7280)" }}>
          Lên lịch buổi học #{nextNum} cho lớp {cls.name}
        </p>
      </div>

      <div
        className="rounded-xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border-soft)" }}
      >
        <SessionScheduler
          classId={id}
          classMode={cls.mode as "ONLINE" | "OFFLINE" | "HYBRID"}
          nextSessionNumber={nextNum}
          teachers={teachers}
          initialDate={today}
          initialRooms={rooms}
        />
      </div>
    </div>
  );
}
