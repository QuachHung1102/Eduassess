import { getMyTeacherAvailability } from "@/lib/teacher/queries";
import { saveMyTeacherAvailabilityAction } from "@/lib/teacher/actions/schedule";
import { requirePageSession } from "@/lib/auth/page-guard";
import { AvailabilityMatrix } from "@/components/availability/AvailabilityMatrix";
import { FaIcon } from "@/components/ui/FaIcon";
import { faCalendarCheck, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import type { DayOfWeek, TimeSlot, AvailabilityMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeacherSchedulePage() {
  await requirePageSession();

  const rawAvailability = await getMyTeacherAvailability();

  const availability = rawAvailability.map((a) => ({
    dayOfWeek: a.dayOfWeek as DayOfWeek,
    slot: a.slot as TimeSlot,
    availabilityMode: a.availabilityMode as AvailabilityMode,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-xl shrink-0" style={{ color: "var(--primary)" }}>
            <FaIcon icon={faCalendarCheck} className="text-xl" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Lịch rảnh dạy học
          </h1>
        </div>
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
          Khai báo lịch rảnh theo từng giờ digital trong 3 buổi sáng, chiều, tối để cán bộ đào tạo phân lớp dạy phù hợp
        </p>
      </div>

      {/* Lưu ý */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
        style={{
          background: "color-mix(in srgb, var(--primary) 8%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--primary) 20%, var(--border-soft))",
          color: "color-mix(in srgb, var(--foreground) 80%, transparent)",
        }}
      >
        <div className="shrink-0 mt-0.5" style={{ color: "var(--primary)" }}>
          <FaIcon icon={faInfoCircle} />
        </div>
        <div>
          <span className="font-medium">Hướng dẫn:</span>
          {" "}Mỗi hàng là một khung giờ digital cố định. Chọn <strong className="text-green-700">Được</strong> nếu bạn dạy được cả offline lẫn online,{" "}
          <strong className="text-yellow-700">Online</strong> nếu chỉ dạy được trực tuyến, để trống nếu bận.
          Nhớ nhấn <strong>Lưu lịch rảnh</strong> sau khi chỉnh sửa xong.
        </div>
      </div>

      {/* Matrix card */}
      <div className="primary-panel p-5 md:p-6">
        <AvailabilityMatrix initial={availability} onSave={saveMyTeacherAvailabilityAction} />
      </div>
    </div>
  );
}
