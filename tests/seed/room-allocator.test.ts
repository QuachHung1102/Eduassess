import { describe, expect, it } from "vitest";
import { allocateRooms } from "@/lib/seed/room-allocator";
import { makeRng } from "@/lib/seed/rng";

const rooms = [
  { id: "r1", capacity: 30 },
  { id: "r2", capacity: 45 },
];

describe("allocateRooms", () => {
  it("hai khung trùng giờ ⇒ khác phòng", () => {
    const res = allocateRooms({
      classes: [
        { id: "c1", size: 20, slots: [{ day: "MON", start: 18, end: 20 }] },
        { id: "c2", size: 20, slots: [{ day: "MON", start: 18, end: 20 }] },
      ],
      rooms,
      rng: makeRng(1),
    });
    const mon = res.assignments.filter((a) => a.day === "MON" && a.start === 18);
    expect(mon).toHaveLength(2);
    expect(new Set(mon.map((a) => a.roomId)).size).toBe(2);
    expect(res.unassigned).toHaveLength(0);
  });

  it("tôn trọng capacity (size 40 chỉ vào r2)", () => {
    const res = allocateRooms({
      classes: [{ id: "c1", size: 40, slots: [{ day: "MON", start: 8, end: 10 }] }],
      rooms,
      rng: makeRng(1),
    });
    expect(res.assignments[0].roomId).toBe("r2");
  });

  it("cùng phòng OK nếu khác giờ", () => {
    const res = allocateRooms({
      classes: [
        { id: "c1", size: 20, slots: [{ day: "MON", start: 8, end: 10 }] },
        { id: "c2", size: 20, slots: [{ day: "MON", start: 10, end: 12 }] },
      ],
      rooms: [{ id: "r1", capacity: 30 }],
      rng: makeRng(3),
    });
    expect(res.assignments).toHaveLength(2);
    expect(res.assignments.every((a) => a.roomId === "r1")).toBe(true);
    expect(res.unassigned).toHaveLength(0);
  });

  it("không đủ phòng ⇒ unassigned", () => {
    const res = allocateRooms({
      classes: [
        { id: "c1", size: 20, slots: [{ day: "MON", start: 18, end: 20 }] },
        { id: "c2", size: 20, slots: [{ day: "MON", start: 18, end: 20 }] },
      ],
      rooms: [{ id: "r1", capacity: 30 }],
      rng: makeRng(1),
    });
    expect(res.assignments).toHaveLength(1);
    expect(res.unassigned).toEqual([{ classId: "c2", slotIndex: 0 }]);
  });
});
