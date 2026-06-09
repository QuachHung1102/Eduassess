-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "startDate" DATE;

-- CreateTable
CREATE TABLE "class_weekly_slots" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "class_weekly_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_weekly_slots_classId_idx" ON "class_weekly_slots"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "class_weekly_slots_classId_dayOfWeek_startTime_key" ON "class_weekly_slots"("classId", "dayOfWeek", "startTime");

-- AddForeignKey
ALTER TABLE "class_weekly_slots" ADD CONSTRAINT "class_weekly_slots_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
