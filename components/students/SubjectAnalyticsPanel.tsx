import { ProficiencyTrend } from "./ProficiencyTrend";
import { ExamScoreTrend } from "./ExamScoreTrend";
import { AttendanceDonut } from "./AttendanceDonut";
import { SessionEvalRadar } from "./SessionEvalRadar";
import type { SubjectAnalytics } from "@/lib/students/analytics";

type LevelPoint = { level: string; evaluatedAt: Date | string; subject: { id: string; name: string } };

const EMPTY_TALLY = { present: 0, late: 0, absent: 0, excused: 0, total: 0 };
const EMPTY_DIMS = { performance: null, diligence: null, comprehension: null };

/** 4 biểu đồ phân tích cho MỘT môn, xếp ngang (lưới 2 cột), tự xuống hàng khi hẹp. */
export function SubjectAnalyticsPanel({
  subjectName,
  analytics,
  levelPoints,
}: {
  subjectName: string;
  analytics: SubjectAnalytics | undefined;
  levelPoints: LevelPoint[];
}) {
  const hasAny =
    levelPoints.length > 0 ||
    (analytics && (analytics.examScores.length > 0 || analytics.attendance.total > 0 || analytics.evalAvg.n > 0));

  if (!hasAny) {
    return <p className="text-sm text-foreground/45">Môn {subjectName} chưa có dữ liệu phân tích.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="clay-card p-4">
        <h3 className="mb-2 text-sm font-medium text-foreground/70">Quỹ đạo năng lực</h3>
        {levelPoints.length > 0 ? (
          <ProficiencyTrend levelHistory={levelPoints} />
        ) : (
          <p className="text-xs text-foreground/45">Chưa đánh giá năng lực môn này</p>
        )}
      </div>
      <div className="clay-card p-4">
        <h3 className="mb-2 text-sm font-medium text-foreground/70">Điểm bài kiểm tra</h3>
        <ExamScoreTrend points={analytics?.examScores ?? []} />
      </div>
      <div className="clay-card p-4">
        <h3 className="mb-2 text-sm font-medium text-foreground/70">Điểm danh môn</h3>
        <AttendanceDonut tally={analytics?.attendance ?? EMPTY_TALLY} />
      </div>
      <div className="clay-card p-4">
        <h3 className="mb-2 text-sm font-medium text-foreground/70">Đánh giá sau buổi học</h3>
        <SessionEvalRadar dims={analytics?.evalAvg ?? EMPTY_DIMS} />
      </div>
    </div>
  );
}
