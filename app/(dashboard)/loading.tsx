export default function DashboardLoading() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center p-6">
      <div
        className="dashboard-loading w-full max-w-2xl rounded-2xl border p-5"
        style={{
          backgroundColor: "var(--surface-strong)",
          borderColor: "var(--border-soft)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-36 animate-pulse rounded-md" style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 12%, transparent)" }} />
          <div className="h-4 w-24 animate-pulse rounded-md" style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 9%, transparent)" }} />
        </div>

        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 8%, transparent)" }} />
          <div className="h-10 animate-pulse rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 8%, transparent)" }} />
          <div className="h-10 animate-pulse rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 8%, transparent)" }} />
          <div className="h-10 animate-pulse rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 8%, transparent)" }} />
        </div>
      </div>
    </div>
  );
}
