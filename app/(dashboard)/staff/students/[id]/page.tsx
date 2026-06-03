import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail, getSubjectsList } from "@/lib/classes/queries";
import { AvailabilityMatrix } from "./AvailabilityMatrix";
import { EvaluateForm } from "./EvaluateForm";
import type { DayOfWeek, TimeSlot, AvailabilityMode } from "@/lib/types";

export const dynamic = "force-dynamic";

const LEVEL_LABEL: Record<string, string> = {
  WEAK: "Yếu", AVERAGE: "Trung bình", GOOD: "Khá/Giỏi",
};
const LEVEL_COLOR: Record<string, string> = {
  WEAK: "bg-red-100 text-red-700",
  AVERAGE: "bg-yellow-100 text-yellow-700",
  GOOD: "bg-green-100 text-green-700",
};
const CLASS_STATUS_LABEL: Record<string, string> = {
  RECRUITING: "Tuyển sinh", ONGOING: "Đang học",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, subjects] = await Promise.all([
    getStudentDetail(id),
    getSubjectsList(),
  ]);
  if (!data.student) notFound();

  const { student, availability, levelHistory, advisorLinks } = data;

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <Link href="/staff/students" className="text-sm text-blue-600 hover:underline">
        ← Danh sách học sinh
      </Link>

      {/* Student header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 text-lg font-bold flex items-center justify-center shrink-0">
            {student.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{student.name}</h1>
            <p className="text-gray-500 text-sm">{student.email}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Giới tính</p>
            <p className="font-medium text-gray-800">
              {student.sex === "MALE" ? "Nam" : student.sex === "FEMALE" ? "Nữ" : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Ngày sinh</p>
            <p className="font-medium text-gray-800">
              {student.dateOfBirth
                ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Điện thoại</p>
            <p className="font-medium text-gray-800">{student.phoneNumber ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">CBDT phụ trách</p>
            <p className="font-medium text-gray-800">
              {advisorLinks.map((a) => a.advisor.name).filter(Boolean).join(", ") || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Active classes */}
      {student.classEnrollments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800 text-sm">
              Lớp đang học ({student.classEnrollments.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {student.classEnrollments.map((e) => (
              <div key={e.class.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.class.name}</p>
                  <p className="text-xs text-gray-400">{e.class.subject.name} · CBDT: {e.class.advisor.name}</p>
                </div>
                <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                  {CLASS_STATUS_LABEL[e.class.status] ?? e.class.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column: availability + evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Availability matrix */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-4">Lịch rảnh hàng tuần</h2>
          <AvailabilityMatrix
            studentId={id}
            initial={availability.map((a) => ({
              dayOfWeek: a.dayOfWeek as DayOfWeek,
              slot: a.slot as TimeSlot,
              mode: a.availabilityMode as AvailabilityMode,
            }))}
          />
        </div>

        {/* Evaluation form */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-4">Đánh giá năng lực</h2>
          <EvaluateForm studentId={id} subjects={subjects} />

          {/* Level history */}
          <div className="mt-5">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Lịch sử đánh giá</h3>
            {levelHistory.length === 0 ? (
              <p className="text-xs text-gray-400">Chưa có đánh giá nào</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {levelHistory.map((lv) => (
                  <div key={lv.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-800">{lv.subject.name}</span>
                      {lv.note && (
                        <span className="ml-2 text-xs text-gray-400 italic">{lv.note}</span>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          LEVEL_COLOR[lv.level] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {LEVEL_LABEL[lv.level]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(lv.evaluatedAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
