-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "attachedResumeData" TEXT,
ADD COLUMN     "attachedResumeName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "masterResumeFileData" TEXT,
ADD COLUMN     "masterResumeFileName" TEXT,
ADD COLUMN     "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduleTimes" TEXT NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastJobCount" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Board_source_slug_key" ON "Board"("source", "slug");
