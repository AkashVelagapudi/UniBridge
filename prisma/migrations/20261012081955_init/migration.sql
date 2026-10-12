-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "rollNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "registrationStatus" TEXT NOT NULL DEFAULT 'NOT_REGISTERED',
    "eligibilityStatus" TEXT NOT NULL DEFAULT 'NA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Drive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "eligibleDepartmentIds" TEXT NOT NULL DEFAULT '[]',
    "eligibleBatches" TEXT NOT NULL DEFAULT '[]',
    "minCgpa" REAL,
    "maxBacklogs" INTEGER,
    "skills" TEXT,
    "registrationDeadline" DATETIME NOT NULL,
    "stages" TEXT NOT NULL DEFAULT '[]',
    "location" TEXT,
    "packageLpa" REAL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'REGISTERED',
    "resultPublished" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "packageLpa" REAL NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "offeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Offer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClearanceCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ClearanceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "pendingRequirements" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "ClearanceItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClearanceItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ClearanceCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClearanceItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNo_key" ON "Student"("rollNo");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_departmentId_batch_idx" ON "Student"("departmentId", "batch");

-- CreateIndex
CREATE INDEX "Student_registrationStatus_eligibilityStatus_idx" ON "Student"("registrationStatus", "eligibilityStatus");

-- CreateIndex
CREATE INDEX "Drive_status_registrationDeadline_idx" ON "Drive"("status", "registrationDeadline");

-- CreateIndex
CREATE INDEX "Application_driveId_stage_idx" ON "Application"("driveId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Application_studentId_driveId_key" ON "Application"("studentId", "driveId");

-- CreateIndex
CREATE INDEX "Offer_published_offeredAt_idx" ON "Offer"("published", "offeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClearanceCategory_name_key" ON "ClearanceCategory"("name");

-- CreateIndex
CREATE INDEX "ClearanceItem_categoryId_status_idx" ON "ClearanceItem"("categoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClearanceItem_studentId_categoryId_key" ON "ClearanceItem"("studentId", "categoryId");
