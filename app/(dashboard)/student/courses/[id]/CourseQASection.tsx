"use client";

import { useState } from "react";
import { postQAAction } from "@/lib/courses/actions";
import { FaIcon } from "@/components/ui/FaIcon";
import { faReply, faPaperPlane } from "@fortawesome/free-solid-svg-icons";

type QAThread = {
  id: string;
  content: string;
  createdAt: Date;
  author: { name: string | null; email: string | null } | null;
  replies: {
    id: string;
    content: string;
    createdAt: Date;
    author: { name: string | null; email: string | null } | null;
  }[];
};

export function CourseQASection({
  courseId,
  userName,
  initialThreads = [],
}: {
  courseId: string;
  userName: string;
  initialThreads?: QAThread[];
}) {
  const [threads, setThreads] = useState<QAThread[]>(initialThreads);
  const [question, setQuestion] = useState("");
  const [postingQ, setPostingQ] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [postingR, setPostingR] = useState(false);

  async function postQuestion() {
    if (!question.trim()) return;
    setPostingQ(true);
    const r = await postQAAction({ courseId, content: question });
    setPostingQ(false);
    if (!r.error && "qaId" in r) {
      setThreads((prev) => [
        {
          id: r.qaId as string,
          content: question,
          createdAt: new Date(),
          author: { name: userName, email: null },
          replies: [],
        },
        ...prev,
      ]);
      setQuestion("");
    }
  }

  async function postReply(parentId: string) {
    if (!replyText.trim()) return;
    setPostingR(true);
    const r = await postQAAction({ courseId, content: replyText, parentId });
    setPostingR(false);
    if (!r.error && "qaId" in r) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === parentId
            ? {
                ...t,
                replies: [
                  ...t.replies,
                  {
                    id: r.qaId as string,
                    content: replyText,
                    createdAt: new Date(),
                    author: { name: userName, email: null },
                  },
                ],
              }
            : t,
        ),
      );
      setReplyText("");
      setReplyingTo(null);
    }
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--surface-strong)",
        border: "1.5px solid var(--border-soft)",
      }}
    >
      <h2 className="font-semibold text-gray-800 mb-4">Hỏi đáp</h2>

      {/* New question */}
      <div className="flex gap-2 mb-5">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder="Đặt câu hỏi của bạn…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          type="button"
          onClick={postQuestion}
          disabled={postingQ || !question.trim()}
          className="self-end bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <FaIcon icon={faPaperPlane} />
        </button>
      </div>

      {/* Threads */}
      <div className="space-y-4">
        {threads.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">Chưa có câu hỏi nào. Hãy là người đầu tiên!</p>
        )}
        {threads.map((t) => (
          <div key={t.id} className="space-y-2">
            {/* Thread root */}
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: "var(--panel-bg)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {t.author?.name ?? t.author?.email ?? "Ẩn danh"}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
              <p className="text-sm text-gray-800">{t.content}</p>
              <button
                type="button"
                onClick={() =>
                  setReplyingTo(replyingTo === t.id ? null : t.id)
                }
                className="text-xs text-blue-500 hover:underline mt-1.5 flex items-center gap-1"
              >
                <FaIcon icon={faReply} /> Trả lời
              </button>
            </div>

            {/* Replies */}
            {t.replies.map((r) => (
              <div
                key={r.id}
                className="ml-6 rounded-lg p-3"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--primary) 5%, var(--panel-bg))",
                  borderLeft: "3px solid var(--primary)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-700">
                    {r.author?.name ?? r.author?.email ?? "Ẩn danh"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <p className="text-sm text-gray-800">{r.content}</p>
              </div>
            ))}

            {/* Reply input */}
            {replyingTo === t.id && (
              <div className="ml-6 flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  placeholder="Trả lời…"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  type="button"
                  onClick={() => postReply(t.id)}
                  disabled={postingR || !replyText.trim()}
                  className="self-end bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <FaIcon icon={faPaperPlane} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
