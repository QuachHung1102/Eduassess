import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { FaIcon } from "@/components/ui/FaIcon";
import { RoomLayoutButton } from "@/components/rooms/RoomLayoutButton";
import { faDoorOpen, faCalendarCheck, faChair, faTableCellsLarge } from "@fortawesome/free-solid-svg-icons";

const mutedText = "color-mix(in srgb, var(--foreground) 60%, transparent)";

async function getRoomsForStaff() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return prisma.room.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          sessions: true,
        },
      },
      layoutImage: { select: { url: true } },
      bookings: {
        where: {
          status: "APPROVED",
          startAt: { gte: todayStart, lt: todayEnd },
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          reason: { select: { label: true } },
          bookedFor: { select: { name: true } },
        },
        orderBy: { startAt: "asc" },
      },
    },
  });
}

type RoomItem = Awaited<ReturnType<typeof getRoomsForStaff>>[number];

function formatTime(d: Date) {
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default async function StaffRoomsPage() {
  const rooms = await getRoomsForStaff();
  const activeCount = rooms.filter((r) => r.isActive).length;

  return (
    <div className="flex flex-col h-full gap-4 sm:gap-6">
      <PageHeader
        icon={faDoorOpen}
        title="Danh sách phòng"
        subtitle={`${rooms.length} phòng · ${activeCount} đang hoạt động`}
        actions={
          <>
            <Link
              href="/staff/rooms/schedule"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]"
              style={{ color: "var(--foreground)", border: "1px solid var(--border-soft)" }}
            >
              <FaIcon icon={faTableCellsLarge} />
              <span className="hidden sm:inline">Lịch sử dụng phòng</span>
              <span className="sm:hidden">Lịch phòng</span>
            </Link>
            <Link
              href="/booking"
              className="clay-btn flex items-center gap-2 px-4 py-2 text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))" }}
            >
              <FaIcon icon={faCalendarCheck} />
              Đặt phòng
            </Link>
          </>
        }
      />

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3" style={{ color: mutedText }}>
          <FaIcon icon={faDoorOpen} className="text-4xl" />
          <p className="text-sm">Chưa có phòng nào trong hệ thống</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: RoomItem }) {
  const busyNow = room.bookings.some((b) => {
    const now = new Date();
    return b.startAt <= now && b.endAt >= now;
  });

  return (
    <div className={`clay-card flex flex-col overflow-hidden p-0 ${room.isActive ? "" : "opacity-60"}`}>
      {/* Card header */}
      <div className="px-4 py-3 flex items-start justify-between gap-2" style={{ borderBottom: "1px solid var(--border-soft)" }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold truncate" style={{ color: "var(--foreground)" }}>{room.name}</h2>
            {busyNow && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                Đang sử dụng
              </span>
            )}
            {!room.isActive && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                Ngừng hoạt động
              </span>
            )}
          </div>
          {room.description && (
            <p className="text-xs mt-0.5 truncate" style={{ color: mutedText }}>{room.description}</p>
          )}
        </div>
        <RoomLayoutButton roomName={room.name} layoutImageUrl={room.layoutImage?.url ?? null} />
      </div>

      {/* Meta */}
      <div className="px-4 py-3 flex items-center gap-4 text-xs" style={{ color: mutedText, borderBottom: "1px solid var(--border-soft)" }}>
        <span className="flex items-center gap-1.5">
          <FaIcon icon={faChair} />
          {room.capacity} người
        </span>
        <span className="flex items-center gap-1.5">
          <FaIcon icon={faDoorOpen} />
          {room._count.sessions} buổi học
        </span>
      </div>

      {/* Bookings hôm nay */}
      <div className="flex-1 px-4 py-3">
        {room.bookings.length === 0 ? (
          <p className="text-xs text-center py-2" style={{ color: mutedText }}>
            {room.isActive ? "Trống cả ngày hôm nay" : "Không khả dụng"}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium mb-1" style={{ color: mutedText }}>Lịch hôm nay:</p>
            {room.bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              >
                <span className="font-medium" style={{ color: "var(--primary-dark)" }}>
                  {formatTime(b.startAt)} – {formatTime(b.endAt)}
                </span>
                <span className="truncate ml-2 max-w-30" style={{ color: mutedText }}>
                  {b.reason.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer action */}
      {room.isActive && (
        <div className="px-4 py-2.5" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <Link
            href={`/booking?roomId=${room.id}`}
            className="text-xs hover:underline"
            style={{ color: "var(--primary)" }}
          >
            Đặt phòng này →
          </Link>
        </div>
      )}
    </div>
  );
}
