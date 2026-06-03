import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClassDetail,
  getTeachersList,
  getAvailableRooms,
  getNextSessionNumber,
} from "@/lib/classes/queries";
import { CreateSessionForm } from "./CreateSessionForm";

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
    getAvailableRooms(today, "00:00", "23:59"),
    getNextSessionNumber(id),
  ]);
  if (!cls) notFound();

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link href={`/staff/classes/${id}`} className="text-sm text-blue-600 hover:underline">
          ← {cls.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Thêm buổi học mới</h1>
        <p className="text-gray-500 text-sm mt-1">
          Lên lịch buổi học #{nextNum} cho lớp {cls.name}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <CreateSessionForm
          classId={id}
          classMode={cls.mode as "ONLINE" | "OFFLINE" | "HYBRID"}
          nextSessionNumber={nextNum}
          teachers={teachers}
          initialRooms={rooms}
        />
      </div>
    </div>
  );
}
