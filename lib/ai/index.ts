import Anthropic from "@anthropic-ai/sdk";

// Lazy client — khởi tạo khi gọi để đảm bảo env vars đã được load
function getClient() {
  return new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
}

const MODEL = "claude-opus-4-8";

// ─── Types ────────────────────────────────────────────────────

export type SuggestedQuestion = {
  content: string;
  options: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  explanation: string;
};

// ─── Prompt 1: Gợi ý câu hỏi (cho giáo viên) ────────────────

const SUGGEST_SYSTEM = `\
Bạn là chuyên gia biên soạn đề kiểm tra cho học sinh phổ thông Việt Nam.
TUYỆT ĐỐI KHÔNG viết bất kỳ text giải thích, nhận xét hay lời mở đầu nào.
Chỉ trả về MỘT JSON array thuần túy, bắt đầu bằng ký tự [ và kết thúc bằng ký tự ].
Không có markdown, không có code block, không có chú thích.
Mỗi phần tử có đúng các trường: content (string), options (object với A/B/C/D là string), correct (chữ hoa A-D), explanation (string).
Câu hỏi rõ ràng, chính xác về kiến thức, viết bằng tiếng Việt.
Nếu chủ đề không phù hợp với cấp lớp, hãy TỰ ĐIỀU CHỈNH cho phù hợp mà không cần giải thích.`;

export async function suggestQuestions(params: {
  subject: string;
  topic: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  grade: string;
  count?: number;
}): Promise<SuggestedQuestion[]> {
  const { subject, topic, difficulty, grade, count = 3 } = params;
  const difficultyLabel = { EASY: "Dễ", MEDIUM: "Trung bình", HARD: "Khó" }[
    difficulty
  ];

  const userMessage = `Trả về JSON array gồm ${count} câu hỏi trắc nghiệm. Môn: ${subject}. Chủ đề: "${topic}". Độ khó: ${difficultyLabel}. Cấp học: ${grade}. Mỗi phương án A/B/C/D đủ dài và gây nhầm lẫn hợp lý. Chỉ JSON, không text khác.`;

  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SUGGEST_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "[]";
  // Extract JSON array from anywhere in the response (Claude may prepend explanation)
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match)
    throw new Error("No JSON array in response: " + raw.substring(0, 200));
  return JSON.parse(match[0]) as SuggestedQuestion[];
}

// ─── Prompt 2: Nhận xét bài làm (cho học sinh) ───────────────

const FEEDBACK_SYSTEM = `\
Bạn là giáo viên hỗ trợ học sinh người Việt Nam. 
Hãy nhận xét bài kiểm tra một cách thân thiện, động viên và cụ thể.
Cấu trúc nhận xét ngắn gọn (150–200 từ):
1. Đánh giá tổng quan kết quả (1-2 câu)
2. Điểm mạnh: các chủ đề học sinh nắm tốt
3. Điểm cần cải thiện: các chủ đề còn yếu
4. Gợi ý ôn tập cụ thể (sách, phương pháp)
Viết bằng tiếng Việt, xưng "em" với học sinh, tránh lặp từ.`;

export type FeedbackParams = {
  studentName: string;
  examTitle: string;
  subject: string;
  score: number;
  correct: number;
  total: number;
  topicBreakdown: { topic: string; correct: number; total: number }[];
};

export async function generateExamFeedback(
  params: FeedbackParams,
): Promise<string> {
  const {
    studentName,
    examTitle,
    subject,
    score,
    correct,
    total,
    topicBreakdown,
  } = params;

  const breakdown = topicBreakdown
    .map((t) => `  – ${t.topic}: ${t.correct}/${t.total} câu đúng`)
    .join("\n");

  const userMessage = `\
Học sinh ${studentName} vừa hoàn thành bài kiểm tra "${examTitle}" môn ${subject}.
Kết quả: ${score.toFixed(0)}% (${correct}/${total} câu đúng).

Chi tiết theo chủ đề:
${breakdown}

Hãy nhận xét bài làm cho học sinh này.`;

  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 600,
    system: FEEDBACK_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  return msg.content[0].type === "text" ? msg.content[0].text : "";
}

// ─── Prompt 3: Đề xuất mức năng lực môn (cho CBĐT) ───────────

const LEVEL_SYSTEM = `\
Bạn là cố vấn đào tạo, giúp CBĐT chốt mức năng lực môn học của một học sinh.
Bốn mức: WEAK (Yếu), AVERAGE (Trung bình), GOOD (Khá/Giỏi), EXCELLENT (Xuất sắc).
Tham chiếu ngưỡng điểm: <50 → WEAK, 50–79 → AVERAGE, 80–89 → GOOD, ≥90 → EXCELLENT.
Nhưng hãy TỔNG HỢP cả điểm kiểm tra, tỉ lệ điểm danh và đánh giá theo buổi
(năng lực/chuyên cần/tiếp thu thang 5) để chọn mức hợp lý nhất, không máy móc theo mỗi điểm.
CHỈ trả về MỘT JSON object thuần, không markdown, không text thừa:
{"level":"<WEAK|AVERAGE|GOOD|EXCELLENT>","rationale":"<1–2 câu tiếng Việt giải thích>"}`;

export type LevelSuggestionParams = {
  subject: string;
  avgScore: number | null;
  examScores: number[];
  attendance: { present: number; total: number };
  sessionEval: {
    performance: number | null;
    diligence: number | null;
    comprehension: number | null;
    count: number;
  };
};

export type LevelSuggestion = {
  level: "WEAK" | "AVERAGE" | "GOOD" | "EXCELLENT";
  rationale: string;
};

export async function suggestProficiencyLevel(
  params: LevelSuggestionParams,
): Promise<LevelSuggestion> {
  const { subject, avgScore, examScores, attendance, sessionEval } = params;
  const attPct =
    attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : null;
  const se = sessionEval;

  const userMessage = `\
Môn: ${subject}.
Điểm kiểm tra: ${examScores.length ? `${examScores.map((s) => s.toFixed(0)).join(", ")} (TB ${avgScore?.toFixed(1) ?? "—"})` : "chưa có"}.
Điểm danh: ${attPct !== null ? `${attPct}% (${attendance.present}/${attendance.total} buổi)` : "chưa có"}.
Đánh giá theo buổi (thang 5): ${se.count > 0 ? `năng lực ${se.performance?.toFixed(1) ?? "—"}, chuyên cần ${se.diligence?.toFixed(1) ?? "—"}, tiếp thu ${se.comprehension?.toFixed(1) ?? "—"} (${se.count} buổi)` : "chưa có"}.
Hãy đề xuất mức năng lực phù hợp nhất.`;

  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 300,
    system: LEVEL_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object in response: " + raw.substring(0, 200));
  const parsed = JSON.parse(match[0]) as Partial<LevelSuggestion>;
  if (!parsed.level || !["WEAK", "AVERAGE", "GOOD", "EXCELLENT"].includes(parsed.level)) {
    throw new Error("Invalid level from AI: " + raw.substring(0, 200));
  }
  return { level: parsed.level, rationale: String(parsed.rationale ?? "") };
}
