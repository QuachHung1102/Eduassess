import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getStudentDetail, getSubjectsList, canEvaluateStudent } from "@/lib/classes/queries";
import { saveStudentAvailabilityAction } from "@/lib/classes/actions";
import { AvailabilityMatrix } from "@/components/availability/AvailabilityMatrix";
import { EvaluateForm } from "./EvaluateForm";
import {
  STUDENT_LEVEL_LABEL as LEVEL_LABEL,
  STUDENT_LEVEL_COLOR as LEVEL_COLOR,
} from "@/lib/constants/labels";
import type { DayOfWeek, TimeSlot, AvailabilityMode } from "@/lib/types";

export const dynamic = "force-dynamic";

const CLASS_STATUS_LABEL: Record<string, string> = {
  RECRUITING: "Tuyển sinh", ONGOING: "Đang học",
};

const mutedText = "color-mix(in srgb, var(--foreground) 60%, transparent)";
const faintText = "color-mix(in srgb, var(--foreground) 45%, transparent)";

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

  const sessionUser = (await auth())?.user;
  const canEvaluate = sessionUser ? await canEvaluateStudent(sessionUser, id) : false;

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <Link href="/staff/students" className="text-sm hover:underline" style={{ color: "var(--primary)" }}>
        ← Danh sách học sinh
      </Link>

      {/* Student header */}
      <div className="clay-card p-5">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full text-lg font-bold flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)" }}
          >
            {student.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{student.name}</h1>
            <p className="text-sm" style={{ color: mutedText }}>{student.email}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: "Giới tính", value: student.sex === "MALE" ? "Nam" : student.sex === "FEMALE" ? "Nữ" : "—" },
            { label: "Ngày sinh", value: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—" },
            { label: "Điện thoại", value: student.phoneNumber ?? "—" },
            { label: "CBDT phụ trách", value: advisorLinks.map((a) => a.advisor.name).filter(Boolean).join(", ") || "—" },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs mb-0.5" style={{ color: faintText }}>{f.label}</p>
              <p className="font-medium" style={{ color: "var(--foreground)" }}>{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active classes */}
      {student.classEnrollments.length > 0 && (
        <div className="clay-card overflow-hidden p-0">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-soft)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              Lớp đang học ({student.classEnrollments.length})
            </h2>
          </div>
          <div>
            {student.classEnrollments.map((e) => (
              <div
                key={e.class.id}
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderTop: "1px solid var(--border-soft)" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{e.class.name}</p>
                  <p className="text-xs" style={{ color: mutedText }}>{e.class.subject.name} · CBDT: {e.class.advisor.name}</p>
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
        <div className="clay-card p-4">
          <h2 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>Lịch rảnh hàng tuần</h2>
          <AvailabilityMatrix
            initial={availability.map((a) => ({
              dayOfWeek: a.dayOfWeek as DayOfWeek,
              slot: a.slot as TimeSlot,
              availabilityMode: a.availabilityMode as AvailabilityMode,
            }))}
            onSave={saveStudentAvailabilityAction.bind(null, id)}
          />
        </div>

        {/* Evaluation form */}
        <div className="clay-card p-4">
          <h2 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>Đánh giá năng lực</h2>
          {canEvaluate ? (
            <EvaluateForm studentId={id} subjects={subjects} />
          ) : (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              Bạn không phụ trách học sinh này nên không thể đánh giá. Chỉ CBĐT được CBDTS phân công mới đánh giá được.
            </p>
          )}

          {/* Level history */}
          <div className="mt-5">
            <h3 className="text-sm font-medium mb-2" style={{ color: mutedText }}>Lịch sử đánh giá</h3>
            {levelHistory.length === 0 ? (
              <p className="text-xs" style={{ color: faintText }}>Chưa có đánh giá nào</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {levelHistory.map((lv) => (
                  <div key={lv.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{lv.subject.name}</span>
                      {lv.note && (
                        <span className="ml-2 text-xs italic" style={{ color: faintText }}>{lv.note}</span>
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
                      <span className="text-xs" style={{ color: faintText }}>
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
