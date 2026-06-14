-- AlterTable
ALTER TABLE "class_weekly_slots" ADD COLUMN     "roomId" TEXT;

-- AddForeignKey
ALTER TABLE "class_weekly_slots" ADD CONSTRAINT "class_weekly_slots_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
