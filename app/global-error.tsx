"use client";

export const dynamic = "force-dynamic";

// global-error must include <html> and <body> tags
// This page catches errors in the root layout

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          margin: 0,
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            maxWidth: "400px",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Đã xảy ra lỗi
          </h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            {error.digest ? `Mã lỗi: ${error.digest}` : "Vui lòng thử lại sau."}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: "0.5rem",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
