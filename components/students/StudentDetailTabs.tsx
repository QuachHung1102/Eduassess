"use client";

import { useState } from "react";
import Link from "next/link";
import { AvailabilityMatrix } from "@/components/availability/AvailabilityMatrix";
import { saveStudentAvailabilityAction } from "@/lib/classes/actions/availability";
import { SubjectAnalyticsPanel } from "./SubjectAnalyticsPanel";
import { AttendanceDonut } from "./AttendanceDonut";
import { STUDENT_LEVEL_LABEL, STUDENT_LEVEL_COLOR } from "@/lib/constants/labels";
import type { StudentAnalytics } from "@/lib/students/analytics";
import type { DayOfWeek, TimeSlot, AvailabilityMode } from "@/lib/types";

type LevelHistoryItem = { id: string; level: string; subjectId: string; subjectName: string; note: string | null; evaluatedAt: string };
type ClassItem = { id: string; name: string; subjectName: string; advisorName: string | null; status: string };
type Header = { name: string; code: string | null; email: string; sex: string | null; dateOfBirth: string | null; phoneNumber: string | null; advisorNames: string[] };

const CLASS_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp", RECRUITING: "Tuyển sinh", ONGOING: "Đang học", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy",
};
const TABS = ["overview", "subjects", "availability", "evaluation"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Tổng quan", subjects: "Năng lực theo môn", availability: "Lịch rảnh", evaluation: "Đánh giá",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-foreground/5 px-3 py-2">
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

export function StudentDetailTabs({
  studentId,
  header,
  classEnrollments,
  analytics,
  levelHistory,
  subjectTabList,
  availability,
  evaluationSlot,
}: {
  studentId: string;
  header: Header;
  classEnrollments: ClassItem[];
  analytics: StudentAnalytics;
  levelHistory: LevelHistoryItem[];
  subjectTabList: { id: string; name: string }[];
  availability: { dayOfWeek: string; slot: string; availabilityMode: string }[];
  evaluationSlot: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [subjectId, setSubjectId] = useState<string>(subjectTabList[0]?.id ?? "");

  const currentLevelBySubject = new Map<string, string>();
  for (const lv of levelHistory) if (!currentLevelBySubject.has(lv.subjectId)) currentLevelBySubject.set(lv.subjectId, lv.level);

  const initial = header.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col gap-5">
      <Link href="/staff/students" className="text-sm text-primary hover:underline">← Danh sách học sinh</Link>

      {/* Header (luôn hiện) */}
      <div className="clay-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">{initial}</div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">{header.name}</h1>
            <p className="text-sm text-foreground/60">
              {header.email}
              {header.code && <span className="ml-2 font-mono text-xs text-foreground/45">{header.code}</span>}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {[
            { label: "Giới tính", value: header.sex === "MALE" ? "Nam" : header.sex === "FEMALE" ? "Nữ" : "—" },
            { label: "Ngày sinh", value: header.dateOfBirth ? new Date(header.dateOfBirth).toLocaleDateString("vi-VN") : "—" },
            { label: "Điện thoại", value: header.phoneNumber ?? "—" },
            { label: "CBĐT phụ trách", value: header.advisorNames.join(", ") || "—" },
          ].map((f) => (
            <div key={f.label}>
              <p className="mb-0.5 text-xs text-foreground/45">{f.label}</p>
              <p className="font-medium text-foreground">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-1 border-b border-soft">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-foreground/60 hover:text-foreground"}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Tab: Tổng quan */}
      {tab === "overview" && (
        <div className="flex flex-col gap-5">
          {classEnrollments.length > 0 && (
            <div className="clay-card overflow-hidden p-0">
              <div className="border-b border-soft px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Lớp đang học ({classEnrollments.length})</h2>
              </div>
              {classEnrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between border-t border-soft px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.name}</p>
                    <p className="text-xs text-foreground/60">{e.subjectName}{e.advisorName ? ` · CBĐT: ${e.advisorName}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{CLASS_STATUS_LABEL[e.status] ?? e.status}</span>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="clay-card p-4">
              <h2 className="mb-3 font-semibold text-foreground">Thống kê nhanh</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Môn đã đánh giá" value={String(currentLevelBySubject.size)} />
                <Stat label="Bài KT đã làm" value={String(analytics.overall.examCount)} />
                <Stat label="Điểm TB" value={analytics.overall.examAvgScore != null ? analytics.overall.examAvgScore.toFixed(1) : "—"} />
                <Stat label="Tỉ lệ có mặt" value={analytics.overall.attendanceRate != null ? `${Math.round(analytics.overall.attendanceRate * 100)}%` : "—"} />
              </div>
              {currentLevelBySubject.size > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {[...currentLevelBySubject.entries()].map(([sid, level]) => {
                    const name = subjectTabList.find((s) => s.id === sid)?.name ?? "";
                    return (
                      <span key={sid} className={`rounded-full px-2 py-0.5 text-xs font-medium ${STUDENT_LEVEL_COLOR[level] ?? "bg-gray-100 text-gray-600"}`}>
                        {name}: {STUDENT_LEVEL_LABEL[level] ?? level}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="clay-card p-4">
              <h2 className="mb-3 font-semibold text-foreground">Điểm danh tổng</h2>
              <AttendanceDonut tally={analytics.overall.attendance} />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Năng lực theo môn */}
      {tab === "subjects" && (
        <div className="flex flex-col gap-4">
          {subjectTabList.length === 0 ? (
            <p className="text-sm text-foreground/45">Học sinh chưa có dữ liệu môn nào.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {subjectTabList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubjectId(s.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${subjectId === s.id ? "bg-primary text-white" : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"}`}
                  >
                    {s.name}
                    {currentLevelBySubject.has(s.id) && <span className="ml-1.5 opacity-80">· {STUDENT_LEVEL_LABEL[currentLevelBySubject.get(s.id)!]}</span>}
                  </button>
                ))}
              </div>
              <SubjectAnalyticsPanel
                subjectName={subjectTabList.find((s) => s.id === subjectId)?.name ?? ""}
                analytics={analytics.bySubject.find((b) => b.subjectId === subjectId)}
                levelPoints={levelHistory
                  .filter((lv) => lv.subjectId === subjectId)
                  .map((lv) => ({ level: lv.level, evaluatedAt: lv.evaluatedAt, subject: { id: lv.subjectId, name: lv.subjectName } }))}
              />
            </>
          )}
        </div>
      )}

      {/* Tab: Lịch rảnh */}
      {tab === "availability" && (
        <div className="clay-card p-4">
          <h2 className="mb-4 font-semibold text-foreground">Lịch rảnh hàng tuần</h2>
          <AvailabilityMatrix
            initial={availability.map((a) => ({
              dayOfWeek: a.dayOfWeek as DayOfWeek,
              slot: a.slot as TimeSlot,
              availabilityMode: a.availabilityMode as AvailabilityMode,
            }))}
            onSave={(slots) => saveStudentAvailabilityAction(studentId, slots)}
          />
        </div>
      )}

      {/* Tab: Đánh giá */}
      {tab === "evaluation" && (
        <div className="flex flex-col gap-5">
          <div className="clay-card p-4">
            <h2 className="mb-4 font-semibold text-foreground">Đánh giá năng lực</h2>
            {evaluationSlot}
          </div>
          <div className="clay-card p-4">
            <h3 className="mb-2 text-sm font-medium text-foreground/60">Lịch sử đánh giá</h3>
            {levelHistory.length === 0 ? (
              <p className="text-xs text-foreground/45">Chưa có đánh giá nào</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-auto">
                {levelHistory.map((lv) => (
                  <div key={lv.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">{lv.subjectName}</span>
                      {lv.note && <span className="ml-2 text-xs italic text-foreground/45">{lv.note}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STUDENT_LEVEL_COLOR[lv.level] ?? "bg-gray-100 text-gray-600"}`}>{STUDENT_LEVEL_LABEL[lv.level] ?? lv.level}</span>
                      <span className="text-xs text-foreground/45">{new Date(lv.evaluatedAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
