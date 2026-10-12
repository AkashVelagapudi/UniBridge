import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const demoPassword = process.env.DEMO_PASSWORD ?? "CampusLane!2026";

async function main() {
  const passwordHash = await hash(demoPassword, 12);
  const [computing, electronics] = await Promise.all([
    prisma.department.upsert({ where: { code: "CSE" }, update: { name: "Computer Science" }, create: { code: "CSE", name: "Computer Science" } }),
    prisma.department.upsert({ where: { code: "ECE" }, update: { name: "Electronics & Communication" }, create: { code: "ECE", name: "Electronics & Communication" } }),
  ]);
  const officer = await prisma.user.upsert({
    where: { email: "placement@campus.edu" },
    update: { passwordHash, role: "PLACEMENT_INCHARGE" },
    create: { email: "placement@campus.edu", passwordHash, role: "PLACEMENT_INCHARGE" },
  });

  const profiles = [
    { key: "asha", rollNo: "CS22041", name: "Asha Menon", departmentId: computing.id, program: "B.Tech Computer Science", year: 4, section: "A", batch: "2026", cgpa: 8.6, backlogs: 0, skills: "TypeScript, React, SQL", email: "asha@campus.edu", registrationStatus: "REGISTERED", eligibilityStatus: "ELIGIBLE" },
    { key: "rohan", rollNo: "CS22057", name: "Rohan Iyer", departmentId: computing.id, program: "B.Tech Computer Science", year: 4, section: "A", batch: "2026", cgpa: 7.9, backlogs: 1, skills: "Java, SQL, Spring", email: "rohan@campus.edu", registrationStatus: "REGISTERED", eligibilityStatus: "ELIGIBLE" },
    { key: "meera", rollNo: "EC22018", name: "Meera Shah", departmentId: electronics.id, program: "B.Tech Electronics", year: 4, section: "B", batch: "2026", cgpa: 8.2, backlogs: 0, skills: "Python, MATLAB", email: "meera@campus.edu", registrationStatus: "REGISTERED", eligibilityStatus: "ELIGIBLE" },
    { key: "noor", rollNo: "CS22073", name: "Noor Ali", departmentId: computing.id, program: "B.Tech Computer Science", year: 4, section: "B", batch: "2026", cgpa: 6.4, backlogs: 3, skills: "HTML, CSS", email: "noor@campus.edu", registrationStatus: "REGISTERED", eligibilityStatus: "NOT_ELIGIBLE" },
  ];
  const students = new Map<string, { id: string }>();

  for (const profile of profiles) {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: { passwordHash, role: "STUDENT" },
      create: { email: profile.email, passwordHash, role: "STUDENT" },
    });
    const student = await prisma.student.upsert({
      where: { rollNo: profile.rollNo },
      update: {
        userId: user.id,
        name: profile.name,
        departmentId: profile.departmentId,
        program: profile.program,
        year: profile.year,
        section: profile.section,
        batch: profile.batch,
        cgpa: profile.cgpa,
        backlogs: profile.backlogs,
        skills: profile.skills,
        email: profile.email,
        registrationStatus: profile.registrationStatus,
        eligibilityStatus: profile.eligibilityStatus,
      },
      create: {
        userId: user.id,
        rollNo: profile.rollNo,
        name: profile.name,
        departmentId: profile.departmentId,
        program: profile.program,
        year: profile.year,
        section: profile.section,
        batch: profile.batch,
        cgpa: profile.cgpa,
        backlogs: profile.backlogs,
        skills: profile.skills,
        email: profile.email,
        registrationStatus: profile.registrationStatus,
        eligibilityStatus: profile.eligibilityStatus,
      },
    });
    students.set(profile.key, student);
  }

  const driveSpecs = [
    { id: "seed-drive-northstar", company: "Northstar Labs", role: "Graduate Software Engineer", status: "OPEN", departments: [computing.id, electronics.id], packageLpa: 12.5, deadlineDays: 18, stages: ["Resume screen", "Assessment", "Interview"] },
    { id: "seed-drive-orbit", company: "Orbit Systems", role: "Associate Engineer", status: "IN_PROGRESS", departments: [computing.id, electronics.id], packageLpa: 10.5, deadlineDays: 30, stages: ["Assessment", "Technical interview"] },
    { id: "seed-drive-cancelled", company: "Lattice Works", role: "Operations Analyst", status: "CANCELLED", departments: [computing.id], packageLpa: 8.2, deadlineDays: 10, stages: ["Interview"] },
  ];
  const drives = new Map<string, { id: string }>();
  for (const drive of driveSpecs) {
    const saved = await prisma.drive.upsert({
      where: { id: drive.id },
      update: {
        company: drive.company,
        role: drive.role,
        status: drive.status,
        eligibleDepartmentIds: JSON.stringify(drive.departments),
        eligibleBatches: JSON.stringify(["2026"]),
        packageLpa: drive.packageLpa,
        registrationDeadline: new Date(Date.now() + drive.deadlineDays * 86_400_000),
        stages: JSON.stringify(drive.stages),
      },
      create: {
        id: drive.id,
        company: drive.company,
        role: drive.role,
        status: drive.status,
        eligibleDepartmentIds: JSON.stringify(drive.departments),
        eligibleBatches: JSON.stringify(["2026"]),
        packageLpa: drive.packageLpa,
        registrationDeadline: new Date(Date.now() + drive.deadlineDays * 86_400_000),
        stages: JSON.stringify(drive.stages),
      },
    });
    drives.set(drive.id, saved);
  }

  const applicationSpecs = [
    { id: "seed-app-asha-northstar", student: "asha", drive: "seed-drive-northstar", stage: "SELECTED" },
    { id: "seed-app-asha-orbit", student: "asha", drive: "seed-drive-orbit", stage: "OFFER_RECEIVED" },
    { id: "seed-app-rohan-northstar", student: "rohan", drive: "seed-drive-northstar", stage: "OFFER_RECEIVED" },
    { id: "seed-app-meera-northstar", student: "meera", drive: "seed-drive-northstar", stage: "REJECTED" },
    { id: "seed-app-noor-cancelled", student: "noor", drive: "seed-drive-cancelled", stage: "SELECTED" },
  ];
  const applications = new Map<string, { id: string }>();
  for (const item of applicationSpecs) {
    const student = students.get(item.student)!;
    const drive = drives.get(item.drive)!;
    const application = await prisma.application.upsert({
      where: { studentId_driveId: { studentId: student.id, driveId: drive.id } },
      update: { stage: item.stage, resultPublished: true },
      create: { id: item.id, studentId: student.id, driveId: drive.id, stage: item.stage, resultPublished: true },
    });
    applications.set(item.id, application);
  }

  for (const offer of [
    { id: "seed-offer-asha-northstar", application: "seed-app-asha-northstar", packageLpa: 12.5 },
    { id: "seed-offer-asha-orbit", application: "seed-app-asha-orbit", packageLpa: 10.5 },
    { id: "seed-offer-rohan-northstar", application: "seed-app-rohan-northstar", packageLpa: 12.5 },
    { id: "seed-offer-rejected", application: "seed-app-meera-northstar", packageLpa: 9.2 },
    { id: "seed-offer-cancelled", application: "seed-app-noor-cancelled", packageLpa: 8.2 },
  ]) {
    await prisma.offer.upsert({
      where: { id: offer.id },
      update: { applicationId: applications.get(offer.application)!.id, packageLpa: offer.packageLpa, published: true },
      create: { id: offer.id, applicationId: applications.get(offer.application)!.id, packageLpa: offer.packageLpa, published: true },
    });
  }

  const categories = new Map<string, { id: string }>();
  for (const category of [
    { key: "library", name: "Library", mandatory: true },
    { key: "finance", name: "Finance office", mandatory: true },
    { key: "hostel", name: "Hostel", mandatory: true },
    { key: "sports", name: "Sports equipment", mandatory: false },
  ]) {
    const saved = await prisma.clearanceCategory.upsert({
      where: { name: category.name },
      update: { mandatory: category.mandatory, active: true },
      create: { name: category.name, mandatory: category.mandatory, active: true },
    });
    categories.set(category.key, saved);
  }

  for (const item of [
    { id: "seed-clear-asha-library", student: "asha", category: "library", status: "CLEARED" },
    { id: "seed-clear-asha-finance", student: "asha", category: "finance", status: "NOT_APPLICABLE" },
    { id: "seed-clear-rohan-library", student: "rohan", category: "library", status: "CLEARED" },
    { id: "seed-clear-rohan-finance", student: "rohan", category: "finance", status: "CLEARED" },
    { id: "seed-clear-rohan-hostel", student: "rohan", category: "hostel", status: "CLEARED" },
    { id: "seed-clear-meera-library", student: "meera", category: "library", status: "PENDING" },
  ]) {
    const student = students.get(item.student)!;
    const category = categories.get(item.category)!;
    await prisma.clearanceItem.upsert({
      where: { studentId_categoryId: { studentId: student.id, categoryId: category.id } },
      update: { status: item.status, updatedById: officer.id },
      create: { id: item.id, studentId: student.id, categoryId: category.id, status: item.status, updatedById: officer.id },
    });
  }

  console.info(`Seeded portal data. Local demo password: ${demoPassword}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());