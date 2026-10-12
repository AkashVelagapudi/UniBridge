import {
  ApplicationStage,
  ClearanceStatus,
  DriveStatus,
  EligibilityStatus,
  RegistrationStatus,
  Role,
} from "@prisma/client";
import { hash } from "bcryptjs";

import { prisma } from "../src/lib/prisma";

const DEMO_PASSWORD = "password123";
const BATCH = "2026";

const departmentSeeds = [
  { id: "seed-department-cse", code: "CSE", name: "Computer Science and Engineering" },
  { id: "seed-department-ece", code: "ECE", name: "Electronics and Communication Engineering" },
  { id: "seed-department-mech", code: "MECH", name: "Mechanical Engineering" },
] as const;

const driveSeeds = [
  {
    id: "seed-drive-northstar",
    company: "Northstar Systems",
    role: "Software Engineer",
    status: DriveStatus.OPEN,
    packageLpa: 12,
    location: "Hyderabad",
    daysUntilDeadline: 30,
  },
  {
    id: "seed-drive-bluepeak",
    company: "BluePeak Analytics",
    role: "Data Analyst",
    status: DriveStatus.IN_PROGRESS,
    packageLpa: 9,
    location: "Bengaluru",
    daysUntilDeadline: 5,
  },
  {
    id: "seed-drive-orbit",
    company: "Orbit Mobility",
    role: "Graduate Engineer Trainee",
    status: DriveStatus.COMPLETED,
    packageLpa: 7.5,
    location: "Pune",
    daysUntilDeadline: -30,
  },
  {
    id: "seed-drive-copperleaf",
    company: "Copperleaf Finance",
    role: "Technology Associate",
    status: DriveStatus.PLANNED,
    packageLpa: 10,
    location: "Hyderabad",
    daysUntilDeadline: 60,
  },
  {
    id: "seed-drive-summit",
    company: "Summit Cloud",
    role: "Cloud Support Associate",
    status: DriveStatus.CANCELLED,
    packageLpa: 8,
    location: "Remote",
    daysUntilDeadline: 15,
  },
] as const;

const applicationSeeds: Array<{
  id: string;
  studentIndex: number;
  driveIndex: number;
  stage: ApplicationStage;
  resultPublished: boolean;
}> = [
  { id: "seed-application-01", studentIndex: 0, driveIndex: 0, stage: ApplicationStage.REGISTERED, resultPublished: false },
  { id: "seed-application-02", studentIndex: 1, driveIndex: 0, stage: ApplicationStage.ELIGIBILITY_VERIFIED, resultPublished: false },
  { id: "seed-application-03", studentIndex: 2, driveIndex: 1, stage: ApplicationStage.SHORTLISTED, resultPublished: true },
  { id: "seed-application-04", studentIndex: 3, driveIndex: 1, stage: ApplicationStage.ASSESSMENT_COMPLETED, resultPublished: true },
  { id: "seed-application-05", studentIndex: 4, driveIndex: 2, stage: ApplicationStage.INTERVIEW_IN_PROGRESS, resultPublished: true },
  { id: "seed-application-06", studentIndex: 5, driveIndex: 0, stage: ApplicationStage.SELECTED, resultPublished: true },
  { id: "seed-application-07", studentIndex: 6, driveIndex: 3, stage: ApplicationStage.OFFER_RECEIVED, resultPublished: true },
  { id: "seed-application-08", studentIndex: 7, driveIndex: 2, stage: ApplicationStage.JOINED, resultPublished: true },
  { id: "seed-application-09", studentIndex: 8, driveIndex: 2, stage: ApplicationStage.REJECTED, resultPublished: true },
  { id: "seed-application-10", studentIndex: 9, driveIndex: 3, stage: ApplicationStage.WITHDRAWN, resultPublished: true },
  { id: "seed-application-11", studentIndex: 10, driveIndex: 4, stage: ApplicationStage.SELECTED, resultPublished: true },
  { id: "seed-application-12", studentIndex: 11, driveIndex: 0, stage: ApplicationStage.SHORTLISTED, resultPublished: true },
];

const offerSeeds = [
  { id: "seed-offer-selected-1", applicationId: "seed-application-06", packageLpa: 12, published: true },
  { id: "seed-offer-selected-2", applicationId: "seed-application-06", packageLpa: 14, published: true },
  { id: "seed-offer-received", applicationId: "seed-application-07", packageLpa: 10, published: true },
  { id: "seed-offer-joined", applicationId: "seed-application-08", packageLpa: 7.5, published: true },
  { id: "seed-offer-cancelled-drive", applicationId: "seed-application-11", packageLpa: 8, published: true },
];

const categorySeeds = [
  { id: "seed-category-library", name: "Library", mandatory: true },
  { id: "seed-category-laboratory", name: "Laboratory", mandatory: true },
  { id: "seed-category-department", name: "Department", mandatory: true },
  { id: "seed-category-placement", name: "Placement", mandatory: true },
  { id: "seed-category-accounts", name: "Accounts", mandatory: true },
  { id: "seed-category-hostel", name: "Hostel", mandatory: false },
] as const;

function studentEmail(rollNo: string) {
  return `${rollNo.toLowerCase()}@siddhartha.edu.in`;
}

function clearanceStatus(studentIndex: number, categoryIndex: number): ClearanceStatus {
  const matrix: ClearanceStatus[][] = [
    [ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED],
    [ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.PENDING],
    [ClearanceStatus.CLEARED, ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.REJECTED],
    [ClearanceStatus.PENDING, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.PENDING],
    [ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.REJECTED, ClearanceStatus.CLEARED],
    [ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.CLEARED, ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.NOT_APPLICABLE],
    [ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.PENDING],
    [ClearanceStatus.CLEARED, ClearanceStatus.REJECTED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED],
    [ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.PENDING],
    [ClearanceStatus.PENDING, ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.CLEARED, ClearanceStatus.PENDING, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED],
    [ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED],
    [ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.NOT_APPLICABLE],
    [ClearanceStatus.CLEARED, ClearanceStatus.PENDING, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED],
    [ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.REJECTED],
    [ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED],
    [ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED, ClearanceStatus.REJECTED, ClearanceStatus.CLEARED, ClearanceStatus.CLEARED],
  ];
  const row = matrix[studentIndex];
  if (row) return row[categoryIndex];
  const patterns = [ClearanceStatus.CLEARED, ClearanceStatus.NOT_APPLICABLE, ClearanceStatus.PENDING, ClearanceStatus.REJECTED];
  return categoryIndex === 5
    ? (studentIndex % 2 === 0 ? ClearanceStatus.CLEARED : ClearanceStatus.PENDING)
    : patterns[(studentIndex + categoryIndex) % patterns.length];
}

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const officerEmail = "placement@siddhartha.edu.in";
  const officer = await prisma.user.upsert({
    where: { email: officerEmail },
    update: { passwordHash, role: Role.PLACEMENT_INCHARGE },
    create: {
      id: "seed-placement-officer",
      email: officerEmail,
      passwordHash,
      role: Role.PLACEMENT_INCHARGE,
    },
  });

  const departments = await Promise.all(
    departmentSeeds.map((department) =>
      prisma.department.upsert({
        where: { code: department.code },
        update: { name: department.name },
        create: department,
      }),
    ),
  );

  const students = [];
  for (let index = 0; index < 30; index += 1) {
    const department = departments[Math.floor(index / 10)];
    const rollNo = `SB2026${String(index + 1).padStart(3, "0")}`;
    const email = studentEmail(rollNo);
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: Role.STUDENT },
      create: {
        id: `seed-user-${rollNo}`,
        email,
        passwordHash,
        role: Role.STUDENT,
      },
    });
    const student = await prisma.student.upsert({
      where: { rollNo },
      update: {
        userId: user.id,
        name: `Student ${String(index + 1).padStart(2, "0")}`,
        departmentId: department.id,
        program: department.code === "CSE" ? "B.Tech CSE" : department.code === "ECE" ? "B.Tech ECE" : "B.Tech Mechanical",
        year: 4,
        section: index % 2 === 0 ? "A" : "B",
        batch: BATCH,
        email,
        registrationStatus: index === 29 ? RegistrationStatus.NOT_REGISTERED : RegistrationStatus.REGISTERED,
        eligibilityStatus: index === 29 ? EligibilityStatus.NA : index === 28 ? EligibilityStatus.NOT_ELIGIBLE : EligibilityStatus.ELIGIBLE,
      },
      create: {
        id: `seed-student-${rollNo}`,
        userId: user.id,
        rollNo,
        name: `Student ${String(index + 1).padStart(2, "0")}`,
        departmentId: department.id,
        program: department.code === "CSE" ? "B.Tech CSE" : department.code === "ECE" ? "B.Tech ECE" : "B.Tech Mechanical",
        year: 4,
        section: index % 2 === 0 ? "A" : "B",
        batch: BATCH,
        email,
        registrationStatus: index === 29 ? RegistrationStatus.NOT_REGISTERED : RegistrationStatus.REGISTERED,
        eligibilityStatus: index === 29 ? EligibilityStatus.NA : index === 28 ? EligibilityStatus.NOT_ELIGIBLE : EligibilityStatus.ELIGIBLE,
      },
    });
    students.push(student);
  }

  for (const drive of driveSeeds) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + drive.daysUntilDeadline);
    await prisma.drive.upsert({
      where: { id: drive.id },
      update: {
        company: drive.company,
        role: drive.role,
        eligibleDepartmentIds: JSON.stringify(departments.map(({ id }) => id)),
        eligibleBatches: JSON.stringify([BATCH]),
        minCgpa: 6.5,
        maxBacklogs: 0,
        skills: "Communication, problem solving",
        registrationDeadline: deadline,
        stages: JSON.stringify(["Application", "Assessment", "Interview", "Final result"]),
        location: drive.location,
        packageLpa: drive.packageLpa,
        status: drive.status,
      },
      create: {
        id: drive.id,
        company: drive.company,
        role: drive.role,
        eligibleDepartmentIds: JSON.stringify(departments.map(({ id }) => id)),
        eligibleBatches: JSON.stringify([BATCH]),
        minCgpa: 6.5,
        maxBacklogs: 0,
        skills: "Communication, problem solving",
        registrationDeadline: deadline,
        stages: JSON.stringify(["Application", "Assessment", "Interview", "Final result"]),
        location: drive.location,
        packageLpa: drive.packageLpa,
        status: drive.status,
      },
    });
  }

  for (const application of applicationSeeds) {
    const student = students[application.studentIndex];
    const drive = driveSeeds[application.driveIndex];
    await prisma.application.upsert({
      where: { studentId_driveId: { studentId: student.id, driveId: drive.id } },
      update: {
        stage: application.stage,
        resultPublished: application.resultPublished,
      },
      create: {
        id: application.id,
        studentId: student.id,
        driveId: drive.id,
        stage: application.stage,
        resultPublished: application.resultPublished,
      },
    });
  }

  for (const offer of offerSeeds) {
    await prisma.offer.upsert({
      where: { id: offer.id },
      update: {
        applicationId: offer.applicationId,
        packageLpa: offer.packageLpa,
        published: offer.published,
      },
      create: offer,
    });
  }

  for (const category of categorySeeds) {
    await prisma.clearanceCategory.upsert({
      where: { name: category.name },
      update: { mandatory: category.mandatory, active: true },
      create: { ...category, active: true },
    });
  }

  const categories = await prisma.clearanceCategory.findMany({
    where: { name: { in: categorySeeds.map(({ name }) => name) } },
  });
  for (let studentIndex = 0; studentIndex < students.length; studentIndex += 1) {
    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
      if (studentIndex === 10) continue;
      if (studentIndex === 6 && categoryIndex === 0) continue;
      const category = categories.find(({ name }) => name === categorySeeds[categoryIndex].name);
      if (!category) throw new Error(`Missing seeded clearance category: ${categorySeeds[categoryIndex].name}`);

      const status = clearanceStatus(studentIndex, categoryIndex);
      const remarks = status === ClearanceStatus.REJECTED
        ? "Please contact the responsible department to resolve this item."
        : null;
      const pendingRequirements = status === ClearanceStatus.PENDING
        ? "Submit the outstanding form or return the listed item."
        : null;
      const data = {
        status,
        remarks,
        pendingRequirements,
        updatedById: officer.id,
      };
      await prisma.clearanceItem.upsert({
        where: {
          studentId_categoryId: {
            studentId: students[studentIndex].id,
            categoryId: category.id,
          },
        },
        update: data,
        create: {
          ...data,
          studentId: students[studentIndex].id,
          categoryId: category.id,
        },
      });
    }
  }

  console.info(
    `Seed complete: ${departments.length} departments, ${students.length} students, ` +
      `${driveSeeds.length} drives, ${applicationSeeds.length} applications, ` +
      `${offerSeeds.length} offers, ${categorySeeds.length} clearance categories.`,
  );
  console.info(`Demo officer: ${officerEmail} / ${DEMO_PASSWORD}`);
  console.info(`Demo students: ${studentEmail("SB2026001")} through ${studentEmail("SB2026030")} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
