"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "github-markdown-css/github-markdown-light.css";

type Props = {
  content: string;
};

export function LessonViewer({ content }: Props) {
  return (
    <div
      className="markdown-body"
      style={{
        backgroundColor: "transparent",
        color: "var(--foreground)",
        fontFamily: "var(--font-be-vietnam-pro), 'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif",
        fontSize: "0.9375rem",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
