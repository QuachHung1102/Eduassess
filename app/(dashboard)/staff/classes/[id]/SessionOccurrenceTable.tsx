"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { FaIcon } from "@/components/ui/FaIcon";
import { faCheck, faXmark, faRotate, faCalendarPlus } from "@fortawesome/free-solid-svg-icons";
import { markSessionAction, createMakeupSessionAction } from "@/lib/classes/actions";

export interface SessionRow {
  id: string;
  sessionNumber: number;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  roomName: string | null;
  teacherName: string;
  status: string;
  note: string | null;
}

const SESSION_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Đã lên lịch",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Nghỉ",
  POSTPONED: "Tạm hoãn",
};
const SESSION_STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  POSTPONED: "bg-yellow-100 text-yellow-700",
};

function formatDate(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

interface MakeupTarget {
  cancelledSessionId: string;
  cancelledNumber: number;
  date: string;
  startTime: string;
  endTime: string;
}

export function SessionOccurrenceTable({
  classId,
  sessions,
}: {
  classId: string;
  sessions: SessionRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Modal "nghỉ" — nhập lý do
  const [cancelTarget, setCancelTarget] = useState<SessionRow | null>(null);
  const [reason, setReason] = useState("");

  // Modal "buổi bù"
  const [makeup, setMakeup] = useState<MakeupTarget | null>(null);

  const [error, setError] = useState<string | null>(null);

  function markOccurred(s: SessionRow) {
    setError(null);
    startTransition(async () => {
      const res = await markSessionAction(s.id, { cancelled: false });
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  function openCancel(s: SessionRow) {
    setError(null);
    setReason("");
    setCancelTarget(s);
  }

  function confirmCancel() {
    if (!cancelTarget) return;
    if (!reason.trim()) {
      setError("Cần nhập lý do nghỉ");
      return;
    }
    const target = cancelTarget;
    setError(null);
    startTransition(async () => {
      const res = await markSessionAction(target.id, { cancelled: true, reason: reason.trim() });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setCancelTarget(null);
      router.refresh();
      const sug = res.suggestion;
      // Mở luôn modal tạo buổi bù với ngày đề xuất (nếu có)
      setMakeup({
        cancelledSessionId: target.id,
        cancelledNumber: target.sessionNumber,
        date: sug?.date ?? target.date,
        startTime: sug?.startTime ?? target.startTime,
        endTime: sug?.endTime ?? target.endTime,
      });
    });
  }

  function openMakeup(s: SessionRow) {
    setError(null);
    setMakeup({
      cancelledSessionId: s.id,
      cancelledNumber: s.sessionNumber,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
    });
  }

  function confirmMakeup() {
    if (!makeup) return;
    const m = makeup;
    setError(null);
    startTransition(async () => {
      const res = await createMakeupSessionAction(m.cancelledSessionId, {
        date: m.date,
        startTime: m.startTime,
        endTime: m.endTime,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setMakeup(null);
      router.refresh();
    });
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead className="bg-surface-tint sticky top-0">
          <tr>
            {["#", "Ngày", "Giờ", "Phòng", "Giáo viên", "Trạng thái", "Diễn ra?", ""].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-2.5 text-xs font-medium text-foreground/60 uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-soft">
          {sessions.map((s) => {
            const cancelled = s.status === "CANCELLED";
            return (
              <tr key={s.id} className="hover:bg-foreground/5 transition-colors align-top">
                <td className="px-4 py-2.5 text-foreground/45 text-xs">{s.sessionNumber}</td>
                <td className="px-4 py-2.5 font-medium text-foreground text-sm">{formatDate(s.date)}</td>
                <td className="px-4 py-2.5 text-foreground/60 text-xs">
                  {s.startTime} – {s.endTime}
                </td>
                <td className="px-4 py-2.5 text-foreground/60 text-xs">
                  {s.roomName ?? <span className="text-foreground/30">—</span>}
                </td>
                <td className="px-4 py-2.5 text-foreground/60 text-xs">{s.teacherName}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      SESSION_STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {SESSION_STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  {cancelled && s.note && (
                    <p className="text-[11px] text-red-400 mt-1 italic max-w-40">{s.note}</p>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {cancelled ? (
                    <button
                      type="button"
                      onClick={() => openMakeup(s)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      <FaIcon icon={faCalendarPlus} className="text-[11px]" /> Tạo buổi bù
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => markOccurred(s)}
                        disabled={pending}
                        title="Đánh dấu buổi diễn ra"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-green-600 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        <FaIcon icon={faCheck} className="text-xs" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openCancel(s)}
                        disabled={pending}
                        title="Đánh dấu buổi nghỉ"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <FaIcon icon={faXmark} className="text-xs" />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/staff/classes/${classId}/sessions/${s.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {s.status === "SCHEDULED" ? "Điểm danh" : "Xem"}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Modal: lý do nghỉ */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget ? `Buổi #${cancelTarget.sessionNumber} nghỉ` : "Buổi nghỉ"}
        description="Nhập lý do, hệ thống sẽ đề xuất ngày bù."
        maxWidthClassName="sm:max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="px-3 py-1.5 text-sm rounded-lg text-foreground/70 hover:bg-foreground/5"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={confirmCancel}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg bg-primary hover:opacity-90 disabled:opacity-50"
            >
              <FaIcon icon={faXmark} className="text-xs" /> Xác nhận nghỉ
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground/70">Lý do nghỉ</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="VD: Giáo viên bận đột xuất, mất điện…"
            className="w-full rounded-lg border border-soft bg-surface-strong text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </Modal>

      {/* Modal: tạo buổi bù */}
      <Modal
        open={!!makeup}
        onClose={() => setMakeup(null)}
        title={makeup ? `Buổi bù cho #${makeup.cancelledNumber}` : "Buổi bù"}
        description="Kiểm tra/chỉnh ngày giờ đề xuất rồi xác nhận. Phòng & giáo viên giữ như buổi gốc."
        maxWidthClassName="sm:max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setMakeup(null)}
              className="px-3 py-1.5 text-sm rounded-lg text-foreground/70 hover:bg-foreground/5"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={confirmMakeup}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg bg-primary hover:opacity-90 disabled:opacity-50"
            >
              <FaIcon icon={faCalendarPlus} className="text-xs" /> Tạo buổi bù
            </button>
          </div>
        }
      >
        {makeup && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Ngày bù</label>
              <input
                type="date"
                value={makeup.date}
                onChange={(e) => setMakeup({ ...makeup, date: e.target.value })}
                className="w-full rounded-lg border border-soft bg-surface-strong text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Giờ bắt đầu</label>
                <input
                  type="time"
                  value={makeup.startTime}
                  onChange={(e) => setMakeup({ ...makeup, startTime: e.target.value })}
                  className="w-full rounded-lg border border-soft bg-surface-strong text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Giờ kết thúc</label>
                <input
                  type="time"
                  value={makeup.endTime}
                  onChange={(e) => setMakeup({ ...makeup, endTime: e.target.value })}
                  className="w-full rounded-lg border border-soft bg-surface-strong text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <p className="text-xs text-foreground/45 flex items-center gap-1">
              <FaIcon icon={faRotate} className="text-[10px]" /> Hệ thống sẽ kiểm tra trùng phòng & giáo viên trước khi tạo.
            </p>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
