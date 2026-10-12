import {
  ApplicationStage,
  ClearanceStatus,
  DriveStatus,
  EligibilityStatus,
  RegistrationStatus,
  Role,
} from "@prisma/client";
import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  applicationFindFirst: vi.fn(),
  applicationFindMany: vi.fn(),
  applicationUpdate: vi.fn(),
  categoryFindMany: vi.fn(),
  clearanceItemFindMany: vi.fn(),
  offerFindMany: vi.fn(),
  studentFindUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findFirst: mocks.applicationFindFirst,
      findMany: mocks.applicationFindMany,
      update: mocks.applicationUpdate,
    },
    clearanceCategory: { findMany: mocks.categoryFindMany },
    clearanceItem: { findMany: mocks.clearanceItemFindMany },
    offer: { findMany: mocks.offerFindMany },
    student: { findUnique: mocks.studentFindUnique },
  },
}));

import {
  DELETE as deleteOfficerApi,
  GET as getOfficerApi,
  PATCH as patchOfficerApi,
  POST as postOfficerApi,
  PUT as putOfficerApi,
} from "@/app/api/officer/[[...path]]/route";
import { GET as getApplications } from "@/app/api/student/applications/route";
import { PATCH as patchApplication } from "@/app/api/student/applications/[applicationId]/route";
import {
  DELETE as deleteClearances,
  GET as getClearances,
  PATCH as patchClearances,
  POST as postClearances,
} from "@/app/api/student/clearances/route";
import { GET as getOffers } from "@/app/api/student/offers/route";
import StudentNoDuesPage from "@/app/student/no-dues/page";

const requestHandler = (handler: () => Promise<Response>) =>
  handler as (request: Request) => Promise<Response>;

function collectText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (isValidElement<{ children?: ReactNode }>(node)) return collectText(node.props.children);
  return "";
}

const studentA = {
  id: "student-a",
  userId: "user-a",
  departmentId: "department-a",
  batch: "2026",
  registrationStatus: RegistrationStatus.REGISTERED,
  eligibilityStatus: EligibilityStatus.ELIGIBLE,
};

const applicationA = {
  id: "application-a",
  studentId: "student-a",
  driveId: "drive-a",
  stage: ApplicationStage.SELECTED,
  resultPublished: false,
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  drive: {
    id: "drive-a",
    company: "Private Company",
    role: "Private Role",
    status: DriveStatus.OPEN,
    registrationDeadline: new Date("2027-01-01T00:00:00Z"),
    location: null,
    packageLpa: 20,
  },
  offers: [
    {
      id: "unpublished-offer-a",
      packageLpa: 20,
      offeredAt: new Date("2026-01-01T00:00:00Z"),
    },
  ],
};

const applicationAWithUnpublishedOffer = {
  ...applicationA,
  id: "application-a-result-published",
  resultPublished: true,
  offers: [
    {
      id: "unpublished-offer-result-published",
      packageLpa: 99,
      offeredAt: new Date("2026-01-02T00:00:00Z"),
      published: false,
    },
  ],
};

const offerRows = [
  {
    id: "published-offer-a",
    packageLpa: 20,
    offeredAt: new Date("2026-01-01T00:00:00Z"),
    published: true,
    studentId: "student-a",
    resultPublished: true,
    stage: ApplicationStage.SELECTED,
    driveStatus: DriveStatus.OPEN,
    company: "Company A",
    role: "Role A",
    location: null,
  },
  {
    id: "unpublished-offer-a",
    packageLpa: 99,
    offeredAt: new Date("2026-01-02T00:00:00Z"),
    published: false,
    studentId: "student-a",
    resultPublished: true,
    stage: ApplicationStage.SELECTED,
    driveStatus: DriveStatus.OPEN,
    company: "Company A",
    role: "Role A",
    location: null,
  },
  {
    id: "published-offer-b",
    packageLpa: 55,
    offeredAt: new Date("2026-01-03T00:00:00Z"),
    published: true,
    studentId: "student-b",
    resultPublished: true,
    stage: ApplicationStage.SELECTED,
    driveStatus: DriveStatus.OPEN,
    company: "Company B",
    role: "Role B",
    location: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerSession.mockResolvedValue({
    user: { id: "user-a", role: Role.STUDENT },
    expires: new Date(Date.now() + 60_000).toISOString(),
  });
  mocks.studentFindUnique.mockResolvedValue(studentA);
  mocks.applicationFindMany.mockImplementation(async (args: {
    include?: { offers?: { where?: { published?: boolean } } };
  }) => {
    const applications = [applicationA, applicationAWithUnpublishedOffer];
    return applications.map((application) => ({
      ...application,
      offers: args.include?.offers?.where?.published
        ? application.offers.filter((offer) => "published" in offer && offer.published)
        : application.offers,
    }));
  });
  mocks.applicationFindFirst.mockResolvedValue(null);
  mocks.categoryFindMany.mockResolvedValue([
    { id: "library", name: "Library", mandatory: true },
    { id: "accounts", name: "Accounts", mandatory: true },
  ]);
  mocks.clearanceItemFindMany.mockImplementation(async (args: {
    where?: { categoryId?: { in: string[] }; studentId?: string; category?: { active?: boolean } };
  }) => {
    if (args.where?.studentId && args.where.studentId !== "student-a") return [];
    const allItems = [
      { categoryId: "library", status: ClearanceStatus.CLEARED, studentId: "student-a" },
      { categoryId: "accounts", status: ClearanceStatus.CLEARED, studentId: "student-b" },
    ];
    return allItems
      .filter((item) => !args.where?.studentId || args.where.studentId === item.studentId)
      .map(({ categoryId, status }) => ({ categoryId, status }));
  });
  mocks.offerFindMany.mockImplementation(async (args: {
    where?: {
      published?: boolean;
      application?: {
        studentId?: string;
        resultPublished?: boolean;
        stage?: { notIn?: ApplicationStage[] };
        drive?: { status?: { not?: DriveStatus } };
      };
    };
  }) => offerRows
    .filter((offer) =>
      offer.published === args.where?.published &&
      offer.studentId === args.where?.application?.studentId &&
      offer.resultPublished === args.where?.application?.resultPublished &&
      !args.where?.application?.stage?.notIn?.includes(offer.stage) &&
      offer.driveStatus !== args.where?.application?.drive?.status?.not,
    )
    .map((offer) => ({
      id: offer.id,
      packageLpa: offer.packageLpa,
      offeredAt: offer.offeredAt,
      application: { drive: { company: offer.company, role: offer.role, location: offer.location } },
    })));
});

describe("student API authorization integration", () => {
  it("ignores a supplied student ID and masks unpublished result stages and offers", async () => {
    const response = await requestHandler(getApplications)(
      new Request("http://localhost/api/student/applications?studentId=student-b"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.studentFindUnique).toHaveBeenCalledWith({ where: { userId: "user-a" } });
    expect(mocks.applicationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: "student-a" } }),
    );
    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({
      id: "application-a",
      stage: ApplicationStage.REGISTERED,
      resultPublished: false,
      offers: [],
    });
    expect(payload[1]).toMatchObject({
      id: "application-a-result-published",
      stage: ApplicationStage.SELECTED,
      resultPublished: true,
      offers: [],
    });
    expect(JSON.stringify(payload)).not.toContain("unpublished-offer-a");
    expect(JSON.stringify(payload)).not.toContain("unpublished-offer-result-published");
    expect(JSON.stringify(payload)).not.toContain("99");
  });

  it("returns 404 when a student tries to withdraw another student's application by ID", async () => {
    mocks.applicationFindFirst.mockResolvedValue(null);
    const response = await patchApplication(
      new Request("http://localhost/api/student/applications/application-b", {
        method: "PATCH",
      }),
      { params: Promise.resolve({ applicationId: "application-b" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.applicationFindFirst).toHaveBeenCalledWith({
      where: { id: "application-b", studentId: "student-a" },
      select: { id: true, stage: true },
    });
    expect(mocks.applicationUpdate).not.toHaveBeenCalled();
  });

  it("returns only the authenticated student's published valid offers despite supplied IDs", async () => {
    const response = await requestHandler(getOffers)(
      new Request("http://localhost/api/student/offers?studentId=student-b&applicationId=application-b"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.offerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          published: true,
          application: {
            studentId: "student-a",
            resultPublished: true,
            stage: { notIn: [ApplicationStage.REJECTED, ApplicationStage.WITHDRAWN] },
            drive: { status: { not: DriveStatus.CANCELLED } },
          },
        },
      }),
    );
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      id: "published-offer-a",
      packageLpa: 20,
      application: { drive: { company: "Company A" } },
    });
    expect(JSON.stringify(payload)).not.toContain("published-offer-b");
    expect(JSON.stringify(payload)).not.toContain("unpublished-offer-a");
  });

  it("reports INCOMPLETE when this student's mandatory clearance is pending", async () => {
    const response = await requestHandler(getClearances)(
      new Request("http://localhost/api/student/clearances?studentId=student-b&categoryId=accounts"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.clearanceItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: "student-a", category: { active: true } },
      }),
    );
    expect(payload.overall).toEqual({
      status: "INCOMPLETE",
      mandatoryCount: 2,
      clearedCount: 1,
      pendingCount: 1,
    });
    expect(payload.clearances).toEqual([
      expect.objectContaining({ id: "library", status: ClearanceStatus.CLEARED }),
      expect.objectContaining({ id: "accounts", status: ClearanceStatus.PENDING }),
    ]);
  });

  it("renders INCOMPLETE in the student's no-dues statement when a mandatory item is pending", async () => {
    const page = await StudentNoDuesPage();

    expect(collectText(page)).toContain("Incomplete");
    expect(collectText(page).replace(/\s+/g, " ")).toContain(
      "1 of 2 mandatory clearances complete",
    );
  });

  it("does not allow students to update or approve their own clearance", async () => {
    const requests = [
      postClearances(),
      patchClearances(),
      deleteClearances(),
    ];
    const responses = await Promise.all(requests);

    expect(responses.map(({ status }) => status)).toEqual([405, 405, 405]);
    for (const response of responses) {
      expect(response.headers.get("allow")).toBe("GET");
      await expect(response.json()).resolves.toEqual({
        error: "Student clearance records are read-only.",
      });
    }
  });

  it("denies students every unimplemented officer API path", async () => {
    const handlers = [getOfficerApi, postOfficerApi, putOfficerApi, patchOfficerApi, deleteOfficerApi];
    for (const handler of handlers) {
      const response = await requestHandler(handler)(
        new Request("http://localhost/api/officer/students/student-b/clearances"),
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "You do not have access to this resource.",
      });
    }
  });
});
