-- AlterTable
ALTER TABLE "users"
ADD COLUMN "address" TEXT,
ADD COLUMN "dateOfBirth" TIMESTAMP(3),
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "sex" TEXT;