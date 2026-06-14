-- CreateEnum
CREATE TYPE "OccupancySource" AS ENUM ('CLASS_SESSION', 'BOOKING');

-- CreateTable
CREATE TABLE "room_occupancies" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "source" "OccupancySource" NOT NULL,
    "sessionId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_occupancies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_occupancies_sessionId_key" ON "room_occupancies"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "room_occupancies_bookingId_key" ON "room_occupancies"("bookingId");

-- CreateIndex
CREATE INDEX "room_occupancies_roomId_startsAt_endsAt_idx" ON "room_occupancies"("roomId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "room_occupancies_startsAt_endsAt_idx" ON "room_occupancies"("startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "room_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: block từ buổi học đang chiếm phòng (SCHEDULED/COMPLETED, có phòng)
INSERT INTO "room_occupancies" ("id", "roomId", "startsAt", "endsAt", "source", "sessionId")
SELECT
    'occ_s_' || s."id",
    s."roomId",
    s."date" + s."startTime"::time,
    s."date" + s."endTime"::time,
    'CLASS_SESSION',
    s."id"
FROM "class_sessions" s
WHERE s."roomId" IS NOT NULL AND s."status" IN ('SCHEDULED', 'COMPLETED');

-- Backfill: block từ đặt phòng đã duyệt
INSERT INTO "room_occupancies" ("id", "roomId", "startsAt", "endsAt", "source", "bookingId")
SELECT
    'occ_b_' || b."id",
    b."roomId",
    b."startAt",
    b."endAt",
    'BOOKING',
    b."id"
FROM "room_bookings" b
WHERE b."status" = 'APPROVED';

-- Chống double-booking ở tầng DB (ADR-0001): từ chối hai block giao nhau trên
-- cùng một phòng. Khoảng nửa mở [startsAt, endsAt) — block kề nhau hợp lệ.
-- Nếu lệnh này fail: dữ liệu hiện có đã chứa lịch phòng chồng chéo, cần dọn
-- trước (xem các dòng vi phạm bằng self-join overlap trên room_occupancies).
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_no_overlap"
    EXCLUDE USING gist ("roomId" WITH =, tsrange("startsAt", "endsAt") WITH &&);
