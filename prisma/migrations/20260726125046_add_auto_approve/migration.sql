-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoApproveEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoApproveMaxPerRun" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "autoApproveMinScore" INTEGER NOT NULL DEFAULT 50;
