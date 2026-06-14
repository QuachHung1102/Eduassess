-- CreateTable
CREATE TABLE "session_evaluations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "performance" INTEGER,
    "diligence" INTEGER,
    "comprehension" INTEGER,
    "note" TEXT,
    "evaluatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_evaluations_studentId_idx" ON "session_evaluations"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "session_evaluations_sessionId_studentId_key" ON "session_evaluations"("sessionId", "studentId");

-- AddForeignKey
ALTER TABLE "session_evaluations" ADD CONSTRAINT "session_evaluations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_evaluations" ADD CONSTRAINT "session_evaluations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_evaluations" ADD CONSTRAINT "session_evaluations_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
