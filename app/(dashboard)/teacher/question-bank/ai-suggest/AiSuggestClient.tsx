"use client";

import { useState } from "react";
import { suggestQuestionsAction } from "@/lib/ai/actions";
import { saveAiQuestionAction } from "@/lib/teacher/actions/question";
import type { SuggestedQuestion } from "@/lib/ai";
import { MathText } from "@/components/MathText";
import { FaIcon } from "@/components/ui/FaIcon";
import { faRobot } from "@fortawesome/free-solid-svg-icons";

type Subject = { id: string; name: string };
type Grade = { id: string; level: string; gradeNumber: number };

import { LEVEL_LABEL } from "@/lib/constants/labels";

type SaveState = "idle" | "saving" | "saved" | "error";

function QuestionCard({
  q, index, subjectId, gradeId, topicName, difficulty,
}: {
  q: SuggestedQuestion; index: number;
  subjectId: string; gradeId: string; topicName: string; difficulty: string;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    setSaveState("saving");
    setSaveError("");
    const result = await saveAiQuestionAction({
      content: q.content, explanation: q.explanation,
      options: q.options, correct: q.correct,
      subjectId, gradeId, topicName, difficulty,
    });
    if (result.error) { setSaveError(result.error); setSaveState("error"); }
    else setSaveState("saved");
  }

  return (
    <div className={`border rounded-xl p-5 space-y-3 transition-colors ${saveState === "saved" ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-900 flex-1">
          <span className="text-purple-600 font-bold mr-1">{index + 1}.</span>
          <MathText text={q.content} />
        </p>
        {saveState === "saved" ? (
          <span className="shrink-0 text-xs bg-green-100 text-green-700 font-medium px-3 py-1.5 rounded-lg border border-green-200">✓ Đã lưu</span>
        ) : (
          <button onClick={handleSave} disabled={saveState === "saving"}
            className="shrink-0 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5">
            {saveState === "saving" ? (
              <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>Đang lưu…</>
            ) : "Thêm vào ngân hàng +"}
          </button>
        )}
      </div>
      {saveState === "error" && <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{saveError}</p>}
      <div className="grid grid-cols-2 gap-2">
        {(["A", "B", "C", "D"] as const).map((l) => (
          <div key={l} className={`px-3 py-2 rounded-lg text-xs ${q.correct === l ? "bg-green-100 text-green-800 font-semibold border border-green-200" : "bg-gray-50 text-gray-600 border border-gray-100"}`}>
            <span className="font-semibold mr-1">{l}.</span>
            <MathText text={q.options[l]} />
            {q.correct === l && <span className="ml-1">✓</span>}
          </div>
        ))}
      </div>
      {q.explanation && (
        <div className="text-xs text-gray-600 bg-amber-50 px-3 py-2.5 rounded-lg border border-amber-100">
          <span className="font-medium text-amber-700">💡 Giải thích: </span>
          <MathText text={q.explanation} />
        </div>
      )}
    </div>
  );
}

export function AiSuggestClient({ subjects, grades }: { subjects: Subject[]; grades: Grade[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? "");
  const [topicName, setTopicName] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [count, setCount] = useState(3);

  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [savedParams, setSavedParams] = useState({ subjectId: "", gradeId: "", topicName: "", difficulty: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuggestions([]);
    setGenerated(false);
    setIsLoading(true);

    const result = await suggestQuestionsAction({ subjectId, gradeId, topicName, difficulty, count });

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuggestions(result.questions ?? []);
      setSavedParams({ subjectId, gradeId, topicName, difficulty });
      setGenerated(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Config form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Cấu hình gợi ý</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Môn học</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Khối lớp</label>
              <select
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {LEVEL_LABEL[g.level]} — Lớp {g.gradeNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Chủ đề / Nội dung</label>
              <input
                type="text"
                required
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="VD: Phương trình lượng giác cơ bản"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Số câu cần tạo</label>
              <input
                type="number"
                min={1}
                max={5}
                value={count}
                onChange={(e) => setCount(Math.min(5, Math.max(1, Number(e.target.value))))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Độ khó</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Đang tạo gợi ý…
              </>
            ) : (
              <><FaIcon icon={faRobot} className="mr-1.5" /> Tạo gợi ý</>
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {!generated && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="text-4xl mb-3"><FaIcon icon={faRobot} /></div>
            <p className="text-sm">Điền thông tin và nhấn &quot;Tạo gợi ý&quot; để AI tổng hợp câu hỏi</p>
            <p className="text-xs mt-1 text-gray-300">Review từng câu trước khi lưu vào ngân hàng</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-purple-700 text-sm">
            <svg className="animate-spin h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            AI đang tạo câu hỏi, vui lòng chờ…
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {!isLoading && generated && suggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">{suggestions.length} câu hỏi được tạo</p>
              <p className="text-xs text-gray-400">Nhấn &quot;Thêm vào ngân hàng&quot; để lưu từng câu</p>
            </div>
            {suggestions.map((q, i) => (
              <QuestionCard
                key={i}
                q={q}
                index={i}
                subjectId={savedParams.subjectId}
                gradeId={savedParams.gradeId}
                topicName={savedParams.topicName}
                difficulty={savedParams.difficulty}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
