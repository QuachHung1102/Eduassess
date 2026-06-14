-- CreateEnum
CREATE TYPE "ExamKind" AS ENUM ('EXAM', 'QUIZ');

-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "kind" "ExamKind" NOT NULL DEFAULT 'EXAM';
