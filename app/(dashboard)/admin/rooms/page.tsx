import { prisma } from "@/lib/db/prisma";
import { RoomFormModal } from "./RoomFormModal";
import { DeleteRoomButton } from "./DeleteRoomButton";
import { ToggleActiveButton } from "./ToggleActiveButton";
import { RoomLayoutButton } from "@/components/rooms/RoomLayoutButton";
import { FaIcon } from "@/components/ui/FaIcon";
import { faDoorOpen } from "@fortawesome/free-solid-svg-icons";

async function getAllRooms() {
  return prisma.room.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { bookings: true } },
      layoutImage: { select: { url: true } },
    },
  });
}

export default async function AdminRoomsPage() {
  const rooms = await getAllRooms();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Quản lý phòng
          </h1>
          <p className="text-sm mt-1" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }}>
            {rooms.length} phòng · {rooms.filter((r) => r.isActive).length} đang hoạt động
          </p>
        </div>
        <RoomFormModal mode="create" />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <FaIcon icon={faDoorOpen} className="text-4xl" />
            <p className="text-sm">Chưa có phòng nào. Nhấn &quot;+ Thêm phòng&quot; để bắt đầu.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  {["Tên phòng", "Sức chứa", "Mô tả", "Sơ đồ", "Trạng thái", "Lịch đặt", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-900">{room.name}</span>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{room.capacity} người</td>
                    <td className="px-4 py-4 text-gray-500 max-w-xs truncate">
                      {room.description ?? <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {room.layoutImage ? (
                        <RoomLayoutButton roomName={room.name} layoutImageUrl={room.layoutImage.url} />
                      ) : (
                        <span className="text-xs text-amber-500">Chưa có</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <ToggleActiveButton
                        roomId={room.id}
                        roomName={room.name}
                        isActive={room.isActive}
                      />
                    </td>
                    <td className="px-4 py-4 text-gray-600">{room._count.bookings}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <RoomFormModal
                          mode="edit"
                          room={{
                            id: room.id,
                            name: room.name,
                            capacity: room.capacity,
                            description: room.description,
                            layoutImageUrl: room.layoutImage?.url ?? null,
                          }}
                        />
                        <DeleteRoomButton roomId={room.id} roomName={room.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
