"use client";

import { useState } from "react";
import { suggestQuestionsAction } from "@/lib/ai/actions";
import type { SuggestedQuestion } from "@/lib/ai";
import { MathText } from "@/components/MathText";
import { FaIcon } from "@/components/ui/FaIcon";
import { faRobot } from "@fortawesome/free-solid-svg-icons";

interface Props {
  subjectId: string;
  gradeId: string;
  topicName: string;
  difficulty: string;
  onApply: (q: SuggestedQuestion) => void;
}

export function AiSuggestPanel({ subjectId, gradeId, topicName, difficulty, onApply }: Props) {
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function handleGenerate() {
    setError("");
    setSuggestions([]);
    setLoaded(false);
    setIsLoading(true);
    const result = await suggestQuestionsAction({ subjectId, gradeId, topicName, difficulty });
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuggestions(result.questions ?? []);
      setLoaded(true);
    }
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-purple-900 flex items-center gap-2">
          <FaIcon icon={faRobot} className="text-purple-700" /> AI gợi ý câu hỏi
        </h3>
        {!isLoading && (
          <button
            type="button"
            onClick={handleGenerate}
            className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
          >
            {loaded ? "Tạo lại" : "Tạo gợi ý"}
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-purple-700 py-4">
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Đang tạo câu hỏi, vui lòng chờ…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {!isLoading && !loaded && !error && (
        <p className="text-sm text-purple-600">
          Điền chủ đề + độ khó rồi nhấn &ldquo;Tạo gợi ý&rdquo; để AI tạo 3 câu hỏi trắc nghiệm.
        </p>
      )}

      {!isLoading && loaded && suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((q, i) => (
            <div
              key={i}
              className="bg-white border border-purple-100 rounded-lg p-4 space-y-2"
            >
              <p className="text-sm font-medium text-gray-900">
                {i + 1}. <MathText text={q.content} />
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                {(["A", "B", "C", "D"] as const).map((l) => (
                  <span
                    key={l}
                    className={`px-2 py-1 rounded ${
                      q.correct === l
                        ? "bg-green-100 text-green-800 font-semibold"
                        : "bg-gray-50"
                    }`}
                  >
                    {l}. <MathText text={q.options[l]} />
                    {q.correct === l && " ✓"}
                  </span>
                ))}
              </div>
              {q.explanation && (
                <p className="text-xs text-gray-500 italic">💡 <MathText text={q.explanation} /></p>
              )}
              <button
                type="button"
                onClick={() => onApply(q)}
                className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Dùng câu này →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
