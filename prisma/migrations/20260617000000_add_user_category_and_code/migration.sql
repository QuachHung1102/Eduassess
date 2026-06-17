-- AlterTable
ALTER TABLE "users" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "code" TEXT;

-- CreateTable
CREATE TABLE "user_categories" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "systemKey" TEXT,
    "includeYear" BOOLEAN NOT NULL DEFAULT false,
    "padWidth" INTEGER NOT NULL DEFAULT 6,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_code_counters" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "nextSeq" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_code_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_categories_prefix_key" ON "user_categories"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "user_categories_systemKey_key" ON "user_categories"("systemKey");

-- CreateIndex
CREATE UNIQUE INDEX "user_code_counters_categoryId_year_key" ON "user_code_counters"("categoryId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "users_code_key" ON "users"("code");

-- CreateIndex
CREATE INDEX "users_categoryId_idx" ON "users"("categoryId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "user_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_code_counters" ADD CONSTRAINT "user_code_counters_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "user_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

