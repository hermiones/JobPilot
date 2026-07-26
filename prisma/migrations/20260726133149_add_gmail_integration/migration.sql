-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gmailConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gmailEmail" TEXT,
ADD COLUMN     "gmailLastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "gmailRefreshToken" TEXT;
