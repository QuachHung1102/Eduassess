import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { FaIcon } from "@/components/ui/FaIcon";
import { faClipboardList, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

const PAGE_SIZE = 25;

// ─── Labels ──────────────────────────────────────────────────────────────────

const ACTION_COLOR: Record<string, string> = {
  "permission.role.grant":    "bg-green-100 text-green-700",
  "permission.role.revoke":   "bg-red-100 text-red-700",
  "permission.position.grant":"bg-green-100 text-green-700",
  "permission.position.revoke":"bg-red-100 text-red-700",
  "booking.approve":          "bg-blue-100 text-blue-700",
  "booking.reject":           "bg-red-100 text-red-700",
  "user.create":              "bg-emerald-100 text-emerald-700",
  "user.delete":              "bg-red-100 text-red-700",
  "class.create":             "bg-purple-100 text-purple-700",
  "class.update":             "bg-yellow-100 text-yellow-700",
};

function badgeColor(action: string) {
  return ACTION_COLOR[action] ?? "bg-gray-100 text-gray-600";
}

function formatDt(d: Date) {
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncateJson(payload: unknown): string {
  try {
    const s = JSON.stringify(payload, null, 2);
    return s.length > 300 ? s.slice(0, 300) + "\n…" : s;
  } catch {
    return String(payload);
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getAuditLogs({
  page,
  action,
  entityType,
  entityId,
  actorId,
  actorRole,
  from,
  to,
}: {
  page: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  actorRole?: string;
  from?: string;
  to?: string;
}) {
  const fromDate = from ? new Date(`${from}T00:00:00`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : undefined;

  const where = {
    ...(action     ? { action:     { contains: action,     mode: "insensitive" as const } } : {}),
    ...(entityType ? { entityType: { contains: entityType, mode: "insensitive" as const } } : {}),
    ...(entityId   ? { entityId:   { contains: entityId,   mode: "insensitive" as const } } : {}),
    ...(actorId    ? { actorId } : {}),
    ...(actorRole  ? { actor: { role: actorRole as "OWNER" | "ADMIN" | "STAFF" | "TEACHER" | "STUDENT" | "PARENT" } } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        payload: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
  ]);

  return { logs, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OwnerAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const page       = Math.max(1, parseInt(sp.page       ?? "1", 10));
  const action     = sp.action     ?? "";
  const entityType = sp.entityType ?? "";
  const entityId   = sp.entityId   ?? "";
  const actorId    = sp.actorId    ?? "";
  const actorRole  = sp.actorRole  ?? "";
  const from       = sp.from       ?? "";
  const to         = sp.to         ?? "";

  const { logs, total, totalPages } = await getAuditLogs({
    page,
    action:     action     || undefined,
    entityType: entityType || undefined,
    entityId:   entityId   || undefined,
    actorId:    actorId    || undefined,
    actorRole:  actorRole  || undefined,
    from:       from       || undefined,
    to:         to         || undefined,
  });

  function buildUrl(p: number, overrides: Record<string, string> = {}) {
    const params = new URLSearchParams({
      ...(action     ? { action }     : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId   ? { entityId }   : {}),
      ...(actorId    ? { actorId }    : {}),
      ...(actorRole  ? { actorRole }  : {}),
      ...(from       ? { from }       : {}),
      ...(to         ? { to }         : {}),
      page: String(p),
      ...overrides,
    });
    return `?${params.toString()}`;
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0">
        <Link href="/owner" className="text-sm text-blue-600 hover:underline">
          ← Tổng quan
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <FaIcon icon={faClipboardList} className="text-amber-600 text-xl" />
          <h1 className="text-2xl font-bold text-gray-900">Nhật ký kiểm tra</h1>
        </div>
        <p className="text-sm text-gray-400 mt-1">{total.toLocaleString("vi-VN")} bản ghi</p>
      </div>

      {/* Filters (GET form) */}
      <form method="GET" className="shrink-0 flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Action</label>
          <input
            name="action"
            defaultValue={action}
            placeholder="VD: booking.approve"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Entity type</label>
          <input
            name="entityType"
            defaultValue={entityType}
            placeholder="VD: RoomBooking"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Entity ID</label>
          <input
            name="entityId"
            defaultValue={entityId}
            placeholder="ID đối tượng"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Vai trò</label>
          <select
            name="actorRole"
            defaultValue={actorRole}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Tất cả</option>
            <option value="OWNER">OWNER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="STAFF">STAFF</option>
            <option value="TEACHER">TEACHER</option>
            <option value="STUDENT">STUDENT</option>
            <option value="PARENT">PARENT</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Từ ngày</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Đến ngày</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
        >
          Lọc
        </button>
        {(action || entityType || entityId || actorId || actorRole || from || to) && (
          <Link
            href="/owner/audit"
            className="px-4 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Xoá bộ lọc
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
            <FaIcon icon={faClipboardList} className="text-3xl" />
            <p className="text-sm">Không có bản ghi nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {["Thời gian", "Người thực hiện", "Action", "Entity", "Payload"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors align-top">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDt(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {log.actor ? (
                        <div>
                          <div className="text-sm font-medium text-gray-800">{log.actor.name}</div>
                          <div className="text-xs text-gray-400">{log.actor.role}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Hệ thống</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium whitespace-nowrap ${badgeColor(
                          log.action,
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      <div>{log.entityType}</div>
                      {log.entityId && (
                        <div className="text-gray-300 font-mono text-xs truncate max-w-28" title={log.entityId}>
                          {log.entityId.slice(0, 8)}…
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {log.payload ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-blue-500 hover:underline select-none">
                            Xem payload
                          </summary>
                          <pre className="mt-1 text-xs text-gray-600 bg-gray-50 rounded-lg p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                            {truncateJson(log.payload)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between text-sm text-gray-500">
          <span>
            Trang {page} / {totalPages} · {total.toLocaleString("vi-VN")} bản ghi
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildUrl(page - 1)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaIcon icon={faChevronLeft} className="text-xs" /> Trước
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 border border-gray-100 rounded-lg text-gray-300 cursor-not-allowed">
                <FaIcon icon={faChevronLeft} className="text-xs" /> Trước
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={buildUrl(page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Tiếp <FaIcon icon={faChevronRight} className="text-xs" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 border border-gray-100 rounded-lg text-gray-300 cursor-not-allowed">
                Tiếp <FaIcon icon={faChevronRight} className="text-xs" />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
