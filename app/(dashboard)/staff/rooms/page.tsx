import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { FaIcon } from "@/components/ui/FaIcon";
import { faDoorOpen, faCalendarCheck, faChair } from "@fortawesome/free-solid-svg-icons";

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
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Danh sách phòng</h1>
          <p className="text-sm text-gray-500 mt-1">
            {rooms.length} phòng · {activeCount} đang hoạt động
          </p>
        </div>
        <Link
          href="/booking"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <FaIcon icon={faCalendarCheck} />
          Đặt phòng
        </Link>
      </div>

      {/* Grid */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
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
    <div
      className={`bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden transition-opacity ${
        room.isActive ? "border-gray-100" : "border-gray-200 opacity-60"
      }`}
    >
      {/* Card header */}
      <div className="px-4 py-3 border-b border-gray-50 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-gray-900 truncate">{room.name}</h2>
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
            <p className="text-xs text-gray-400 mt-0.5 truncate">{room.description}</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 py-3 flex items-center gap-4 text-xs text-gray-500 border-b border-gray-50">
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
          <p className="text-xs text-gray-400 text-center py-2">
            {room.isActive ? "Trống cả ngày hôm nay" : "Không khả dụng"}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-gray-600 mb-1">Lịch hôm nay:</p>
            {room.bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between text-xs bg-blue-50 rounded-lg px-2.5 py-1.5"
              >
                <span className="text-blue-700 font-medium">
                  {formatTime(b.startAt)} – {formatTime(b.endAt)}
                </span>
                <span className="text-gray-500 truncate ml-2 max-w-30">
                  {b.reason.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer action */}
      {room.isActive && (
        <div className="px-4 py-2.5 border-t border-gray-50">
          <Link
            href={`/booking?roomId=${room.id}`}
            className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Đặt phòng này →
          </Link>
        </div>
      )}
    </div>
  );
}
