import type { Rng } from "./rng";

export type RoomSlot = { day: string; start: number; end: number };
export type AllocClass = { id: string; size: number; slots: RoomSlot[] };
export type AllocRoom = { id: string; capacity: number };
export type Assignment = {
  classId: string;
  slotIndex: number;
  roomId: string;
  day: string;
  start: number;
  end: number;
};
export type AllocResult = {
  assignments: Assignment[];
  unassigned: { classId: string; slotIndex: number }[];
};

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Xếp mỗi (lớp, khung tuần) vào một phòng sao cho: phòng đủ sức chứa và không
 * trùng khoảng [start,end) với khung khác cùng (phòng, ngày). Greedy, tất định
 * theo `rng` (xáo danh sách phòng ứng viên để phân tán). Trả khung không xếp được.
 */
export function allocateRooms(input: {
  classes: AllocClass[];
  rooms: AllocRoom[];
  rng: Rng;
}): AllocResult {
  const { classes, rooms, rng } = input;
  const occupied = new Map<string, Map<string, { start: number; end: number }[]>>();
  for (const r of rooms) occupied.set(r.id, new Map());

  const assignments: Assignment[] = [];
  const unassigned: { classId: string; slotIndex: number }[] = [];

  for (const cls of classes) {
    cls.slots.forEach((slot, slotIndex) => {
      const candidates = rng.shuffle(rooms.filter((r) => r.capacity >= cls.size));
      let placed = false;
      for (const room of candidates) {
        const dayMap = occupied.get(room.id)!;
        const blocks = dayMap.get(slot.day) ?? [];
        if (blocks.some((b) => overlaps(b, slot))) continue;
        blocks.push({ start: slot.start, end: slot.end });
        dayMap.set(slot.day, blocks);
        assignments.push({
          classId: cls.id,
          slotIndex,
          roomId: room.id,
          day: slot.day,
          start: slot.start,
          end: slot.end,
        });
        placed = true;
        break;
      }
      if (!placed) unassigned.push({ classId: cls.id, slotIndex });
    });
  }

  return { assignments, unassigned };
}
