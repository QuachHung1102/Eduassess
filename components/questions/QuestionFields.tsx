"use client";

import { useEffect, useState } from "react";
import { getTopicsAction } from "@/lib/teacher/actions/question";
import { LEVEL_LABEL } from "@/lib/constants/labels";
import { MathPreview } from "@/components/ui/MathPreview";

export type QuestionSubject = { id: string; name: string };
export type QuestionGrade = { id: string; level: string; gradeNumber: number };
export type QuestionOption = { label: string; text: string; isCorrect: boolean };

type Topic = { id: string; name: string };

const SELECT_CLS =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900";
const TEXTAREA_CLS =
  "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder:text-gray-400";
const LABEL_CLS = "block text-sm font-medium text-gray-700 mb-1.5";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

/** 4 đáp án trống dùng khi tạo mới. */
export function emptyOptions(): QuestionOption[] {
  return OPTION_LABELS.map((label) => ({ label, text: "", isCorrect: false }));
}

// ── Độ khó (đứng riêng, không kiểm soát) ──────────────────────
export function QuestionDifficultyField({
  defaultValue = "MEDIUM",
}: {
  defaultValue?: string;
}) {
  return (
    <div>
      <label className={LABEL_CLS}>Độ khó</label>
      <select name="difficulty" defaultValue={defaultValue} className={SELECT_CLS}>
        <option value="EASY">Dễ</option>
        <option value="MEDIUM">Trung bình</option>
        <option value="HARD">Khó</option>
      </select>
    </div>
  );
}

// ── Lưới metadata: môn / khối / chủ đề / độ khó ───────────────
export function QuestionMetadataFields({
  subjects,
  grades,
  initialSubjectId,
  initialGradeId,
  initialTopicName = "",
  initialDifficulty = "MEDIUM",
  onChange,
}: {
  subjects: QuestionSubject[];
  grades: QuestionGrade[];
  initialSubjectId?: string;
  initialGradeId?: string;
  initialTopicName?: string;
  initialDifficulty?: string;
  onChange?: (meta: {
    subjectId: string;
    gradeId: string;
    topicName: string;
    difficulty: string;
  }) => void;
}) {
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? subjects[0]?.id ?? "");
  const [gradeId, setGradeId] = useState(initialGradeId ?? grades[0]?.id ?? "");
  const [topicName, setTopicName] = useState(initialTopicName);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    onChange?.({ subjectId, gradeId, topicName, difficulty });
  }, [subjectId, gradeId, topicName, difficulty, onChange]);

  async function loadTopics(sId: string, gId: string) {
    if (!sId || !gId) {
      setTopics([]);
      setTopicName("");
      return;
    }
    setLoadingTopics(true);
    const result = await getTopicsAction(sId, gId);
    setTopics(result);
    setTopicName((prev) => {
      if (!prev) return result[0]?.name ?? "";
      return result.some((t) => t.name === prev) ? prev : (result[0]?.name ?? "");
    });
    setLoadingTopics(false);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Môn học */}
      <div>
        <label className={LABEL_CLS}>Môn học</label>
        <select
          name="subjectId"
          value={subjectId}
          onChange={(e) => {
            const nextSubjectId = e.target.value;
            setSubjectId(nextSubjectId);
            void loadTopics(nextSubjectId, gradeId);
          }}
          className={SELECT_CLS}
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Khối lớp */}
      <div>
        <label className={LABEL_CLS}>Khối lớp</label>
        <select
          name="gradeId"
          value={gradeId}
          onChange={(e) => {
            const nextGradeId = e.target.value;
            setGradeId(nextGradeId);
            void loadTopics(subjectId, nextGradeId);
          }}
          className={SELECT_CLS}
        >
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {LEVEL_LABEL[g.level]} — Lớp {g.gradeNumber}
            </option>
          ))}
        </select>
      </div>

      {/* Chủ đề */}
      <div>
        <label className={LABEL_CLS}>
          Chủ đề{" "}
          <span className="text-gray-400 font-normal">
            ({loadingTopics ? "đang tải..." : `${topics.length} chủ đề hiện có`})
          </span>
        </label>
        <select
          name="topicName"
          required
          value={topicName}
          onChange={(e) => setTopicName(e.target.value)}
          onFocus={() => {
            if (topics.length === 0 && !loadingTopics) {
              void loadTopics(subjectId, gradeId);
            }
          }}
          className={SELECT_CLS}
          disabled={loadingTopics || !subjectId || !gradeId}
        >
          <option value="" disabled>
            {loadingTopics ? "Đang tải chủ đề..." : topics.length === 0 ? "Không có chủ đề cho môn/khối này" : "-- Chọn chủ đề --"}
          </option>
          {topicName && !topics.some((t) => t.name === topicName) && (
            <option value={topicName}>{topicName}</option>
          )}
          {topics.map((t) => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Độ khó */}
      <div>
        <label className={LABEL_CLS}>Độ khó</label>
        <select
          name="difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className={SELECT_CLS}
        >
          <option value="EASY">Dễ</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="HARD">Khó</option>
        </select>
      </div>
    </div>
  );
}

// ── Nội dung câu hỏi + xem trước (tự quản lý preview) ─────────
export function QuestionContentField({
  defaultValue = "",
  rows,
}: {
  defaultValue?: string;
  rows: number;
}) {
  const [preview, setPreview] = useState(defaultValue);
  return (
    <>
      <div>
        <label className={LABEL_CLS}>Nội dung câu hỏi</label>
        <textarea
          name="content"
          rows={rows}
          required
          defaultValue={defaultValue}
          placeholder="Nhập câu hỏi tại đây..."
          onChange={(e) => setPreview(e.target.value)}
          className={TEXTAREA_CLS}
        />
      </div>
      <MathPreview value={preview} />
    </>
  );
}

// ── 4 đáp án + chọn đáp án đúng ───────────────────────────────
export function QuestionOptionsField({ options }: { options: QuestionOption[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Các đáp án{" "}
        <span className="text-gray-400 font-normal">
          (chọn radio để đánh dấu đáp án đúng)
        </span>
      </label>
      <div className="space-y-2">
        {options.map((opt) => (
          <div key={opt.label} className="flex items-center gap-3">
            <input
              type="radio"
              name="correct-answer"
              value={opt.label}
              required
              defaultChecked={opt.isCorrect}
              className="accent-blue-600 w-4 h-4 shrink-0"
            />
            <span className="text-sm font-medium text-gray-600 w-5">{opt.label}.</span>
            <input
              name={`option-${opt.label}`}
              type="text"
              required
              defaultValue={opt.text}
              placeholder={`Nội dung đáp án ${opt.label}`}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Giải thích đáp án ─────────────────────────────────────────
export function QuestionExplanationField({
  defaultValue = "",
}: {
  defaultValue?: string;
}) {
  return (
    <div>
      <label className={LABEL_CLS}>
        Giải thích đáp án <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
      </label>
      <textarea
        name="explanation"
        rows={3}
        defaultValue={defaultValue}
        placeholder="Giải thích tại sao đáp án này đúng..."
        className={TEXTAREA_CLS}
      />
    </div>
  );
}

// ── Nút Lưu / Hủy ─────────────────────────────────────────────
export function QuestionFormActions({
  isPending,
  submitLabel,
  pendingLabel = "Đang lưu...",
  onCancel,
}: {
  isPending: boolean;
  submitLabel: string;
  pendingLabel?: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? pendingLabel : submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        Hủy
      </button>
    </div>
  );
}
