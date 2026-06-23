import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getStudentDetail, getStudentAnalytics, getSubjectsList, canEvaluateStudent } from "@/lib/classes/queries";
import { StudentDetailTabs } from "@/components/students/StudentDetailTabs";
import { EvaluateForm } from "./EvaluateForm";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, analytics, subjects] = await Promise.all([
    getStudentDetail(id),
    getStudentAnalytics(id),
    getSubjectsList(),
  ]);
  if (!data.student) notFound();

  const { student, availability, levelHistory, advisorLinks } = data;

  const sessionUser = (await auth())?.user;
  const canEvaluate = sessionUser ? await canEvaluateStudent(sessionUser, id) : false;

  const levelHistoryItems = levelHistory.map((lv) => ({
    id: lv.id,
    level: lv.level,
    subjectId: lv.subject.id,
    subjectName: lv.subject.name,
    note: lv.note,
    evaluatedAt: lv.evaluatedAt.toISOString(),
  }));

  // Danh sách môn cho tab "Năng lực theo môn" = hợp môn có đánh giá ∪ môn có dữ liệu phân tích.
  const subjMap = new Map<string, string>();
  for (const lv of levelHistory) subjMap.set(lv.subject.id, lv.subject.name);
  for (const b of analytics.bySubject) subjMap.set(b.subjectId, b.subjectName);
  const subjectTabList = [...subjMap.entries()]
    .map(([sid, name]) => ({ id: sid, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const evaluationSlot = canEvaluate ? (
    <EvaluateForm studentId={id} subjects={subjects} />
  ) : (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-600">
      Bạn không phụ trách học sinh này nên không thể đánh giá. Chỉ CBĐT được CBDTS phân công mới đánh giá được.
    </p>
  );

  return (
    <StudentDetailTabs
      studentId={id}
      header={{
        name: student.name,
        code: student.code,
        email: student.email,
        sex: student.sex,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
        phoneNumber: student.phoneNumber,
        advisorNames: advisorLinks.map((a) => a.advisor.name).filter(Boolean) as string[],
      }}
      classEnrollments={student.classEnrollments.map((e) => ({
        id: e.class.id,
        name: e.class.name,
        subjectName: e.class.subject.name,
        advisorName: e.class.advisor.name,
        status: e.class.status,
      }))}
      analytics={analytics}
      levelHistory={levelHistoryItems}
      subjectTabList={subjectTabList}
      availability={availability.map((a) => ({ dayOfWeek: a.dayOfWeek, slot: a.slot, availabilityMode: a.availabilityMode }))}
      evaluationSlot={evaluationSlot}
    />
  );
}
