-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('queued', 'approved', 'applied', 'responded', 'interview', 'rejected', 'offer');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "masterResume" TEXT NOT NULL,
    "coverLetterTemplates" TEXT NOT NULL,
    "targetRoles" TEXT NOT NULL,
    "targetLocations" TEXT NOT NULL,
    "salaryFloor" INTEGER,
    "excludedCompanies" TEXT NOT NULL,
    "dailyGoal" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "postedDate" TIMESTAMP(3),
    "salaryRange" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'queued',
    "resumeVersion" TEXT,
    "coverLetterVersion" TEXT,
    "appliedAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "reasons" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "JobListing_company_title_idx" ON "JobListing"("company", "title");

-- CreateIndex
CREATE UNIQUE INDEX "JobListing_source_externalId_key" ON "JobListing"("source", "externalId");

-- CreateIndex
CREATE INDEX "Application_userId_status_idx" ON "Application"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_jobListingId_key" ON "Application"("userId", "jobListingId");

-- CreateIndex
CREATE INDEX "Match_userId_relevanceScore_idx" ON "Match"("userId", "relevanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "Match_userId_jobListingId_key" ON "Match"("userId", "jobListingId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
