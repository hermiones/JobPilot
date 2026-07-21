-- AlterTable
ALTER TABLE "User" ADD COLUMN     "apiKeys" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "preferredProvider" TEXT NOT NULL DEFAULT 'gemini';
