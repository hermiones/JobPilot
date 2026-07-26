-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "appliedVariantLabel" TEXT,
ADD COLUMN     "selectedVariantId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "ApplicationVariant" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tone" TEXT,
    "resumeVersion" TEXT NOT NULL,
    "coverLetterVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationVariant_applicationId_label_key" ON "ApplicationVariant"("applicationId", "label");

-- AddForeignKey
ALTER TABLE "ApplicationVariant" ADD CONSTRAINT "ApplicationVariant_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
