"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { getExamFeedbackAction } from "@/lib/ai/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import { faRobot } from "@fortawesome/free-solid-svg-icons";

export function AiFeedback({
  attemptId,
  initialFeedback,
}: {
  attemptId: string;
  initialFeedback?: string | null;
}) {
  const [feedback, setFeedback] = useState<string | null>(initialFeedback ?? null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(!!initialFeedback);

  async function handleLoad() {
    setError("");
    setIsLoading(true);
    const result = await getExamFeedbackAction(attemptId);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setFeedback(result.feedback ?? "");
      setLoaded(true);
    }
  }

  return (
    <div className="primary-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <h3
          className="font-semibold flex items-center gap-2"
          style={{ color: "var(--primary-dark)" }}
        >
          <FaIcon icon={faRobot} className="text-primary" /> Nhận xét từ AI
        </h3>
        {!loaded && !isLoading && (
          <button
            onClick={handleLoad}
            className="text-xs text-white px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "var(--primary)" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--primary-dark)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "var(--primary)")}
          >
            Xem nhận xét
          </button>
        )}
      </div>

      {isLoading && (
        <div
          className="flex items-center gap-2 text-sm py-2"
          style={{ color: "var(--primary)" }}
        >
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          AI đang phân tích bài làm…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!isLoading && !loaded && !error && (
        <p
          className="text-sm"
          style={{ color: "color-mix(in srgb, var(--foreground) 65%, transparent)" }}
        >
          Nhận phân tích điểm mạnh/yếu và gợi ý ôn tập từ AI dựa trên bài làm của bạn.
        </p>
      )}

      {feedback && !isLoading && (
        <div
          className="prose prose-sm max-w-none
            prose-ul:my-1 prose-li:my-0
            prose-p:my-1.5
            prose-pre:overflow-x-auto"
          style={{
            color: "var(--foreground)",
            ["--tw-prose-body" as string]: "var(--foreground)",
            ["--tw-prose-headings" as string]: "var(--foreground)",
            ["--tw-prose-bold" as string]: "var(--foreground)",
            ["--tw-prose-bullets" as string]: "var(--primary)",
            ["--tw-prose-links" as string]: "var(--primary)",
          }}
        >
          <ReactMarkdown>{feedback}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

