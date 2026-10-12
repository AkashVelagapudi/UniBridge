import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
} from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOverallStatus } from "@/lib/services/noDues";

function statusClass(status: string) {
  if (["CLEARED", "SELECTED", "OFFER_RECEIVED", "JOINED"].includes(status)) return "pill pill-green";
  if (["REJECTED", "NOT_ELIGIBLE"].includes(status)) return "pill pill-red";
  if (["PENDING", "INCOMPLETE", "IN_PROGRESS"].includes(status)) return "pill pill-amber";
  return "pill pill-neutral";
}

async function StudentDashboard() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/officer");
  const studentId = session.user.studentId;
  if (!studentId) redirect("/login");

  const [student, overallClearance, mandatoryCategories] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        rollNo: true,
        name: true,
        program: true,
        year: true,
        section: true,
        batch: true,
        registrationStatus: true,
        eligibilityStatus: true,
        department: { select: { name: true, code: true } },
        applications: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            stage: true,
            resultPublished: true,
            updatedAt: true,
            drive: { select: { company: true, role: true, status: true } },
            offers: {
              where: { published: true },
              select: { id: true, packageLpa: true, offeredAt: true },
              orderBy: { offeredAt: "desc" },
            },
          },
        },
        clearanceItems: {
          where: { category: { active: true } },
          select: {
            status: true,
            remarks: true,
            pendingRequirements: true,
            category: { select: { name: true, mandatory: true } },
          },
          orderBy: { category: { name: "asc" } },
        },
      },
    }),
    getOverallStatus(studentId),
    prisma.clearanceCategory.findMany({
      where: { active: true, mandatory: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!student) redirect("/login");
  const visibleOffers = student.applications.flatMap((application) => application.offers);
  const clearanceItems = mandatoryCategories.map((category) => {
    const item = student.clearanceItems.find((entry) => entry.category.name === category.name);
    return {
      categoryName: category.name,
      status: item?.status ?? "PENDING",
      details: item?.pendingRequirements || item?.remarks || "Status maintained by your department",
    };
  });
  const nameParts = student.name.trim().split(/\s+/);

  return (
    <PortalShell role="STUDENT" name={student.name}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Student workspace</div>
          <h1>Your next step, in view.</h1>
          <p className="subheading">Placement activity and department clearance, together.</p>
        </div>
        <div className="date-chip"><CalendarDays size={14} /> {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date())}</div>
      </div>

      <section className="student-intro" aria-label="Student profile">
        <div className="avatar">{nameParts.slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
        <div>
          <h2>{student.name}</h2>
          <p>{student.rollNo} · {student.department.name} · {student.program}</p>
        </div>
        <div className="intro-meta">Batch {student.batch}<br />Year {student.year} · Section {student.section}</div>
      </section>

      <section className="stat-grid" aria-label="My placement summary">
        <article className="stat-card">
          <div className="stat-top"><span>Applications</span><span className="stat-icon"><BriefcaseBusiness size={15} /></span></div>
          <div className="stat-number">{student.applications.length}</div>
          <div className="stat-foot">Across your placement drives</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Published offers</span><span className="stat-icon"><FileCheck2 size={15} /></span></div>
          <div className="stat-number">{visibleOffers.length}</div>
          <div className="stat-foot">Offers shared with you</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Placement eligibility</span><span className="stat-icon"><CheckCircle2 size={15} /></span></div>
          <div className="stat-number" style={{ fontSize: 22 }}>{student.eligibilityStatus.replaceAll("_", " ")}</div>
          <div className="stat-foot">Registration: {student.registrationStatus.replaceAll("_", " ").toLowerCase()}</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Overall no-dues</span><span className="stat-icon"><ClipboardCheck size={15} /></span></div>
          <div className="stat-number" style={{ fontSize: 24 }}>{overallClearance}</div>
          <div className="stat-foot">Based on mandatory active categories</div>
        </article>
      </section>

      <div className="content-grid">
        <section className="panel" id="applications">
          <div className="panel-header">
            <div className="panel-title"><BriefcaseBusiness className="panel-icon" size={17} /><div><h2>My applications</h2><div className="panel-caption">Your latest placement activity</div></div></div>
            <span className="panel-action">{student.applications.length} total</span>
          </div>
          {student.applications.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Company & role</th><th>Stage</th><th>Package</th><th>Updated</th></tr></thead>
                <tbody>
                  {student.applications.map((application) => {
                    const publishedOffers = application.offers;
                    const displayStage = application.resultPublished ? application.stage : "IN_REVIEW";
                    return (
                      <tr key={application.id}>
                        <td><div className="company-cell"><span className="company-mark">{application.drive.company.slice(0, 2).toUpperCase()}</span><span>{application.drive.company}<span className="cell-sub">{application.drive.role}</span></span></div></td>
                        <td><span className={statusClass(displayStage)}>{displayStage.replaceAll("_", " ")}</span></td>
                        <td>{publishedOffers.length ? publishedOffers.map((offer) => `₹${offer.packageLpa} LPA`).join(", ") : "Not published"}</td>
                        <td>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(application.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state">Your applications will appear here when you apply to a drive.</div>}
        </section>

        <section className="panel" id="clearance">
          <div className="panel-header">
            <div className="panel-title"><ClipboardCheck className="panel-icon" size={17} /><div><h2>Department no-dues</h2><div className="panel-caption">Mandatory active categories</div></div></div>
            <span className={statusClass(overallClearance)}>{overallClearance}</span>
          </div>
          <div className="panel-body">
            {clearanceItems.length ? <div className="clearance-list">
              {clearanceItems.map((item) => (
                <div className="clearance-row" key={item.categoryName}>
                  <div><div className="clearance-name">{item.categoryName}</div><div className="clearance-detail">{item.details}</div></div>
                  <span className={statusClass(item.status)}>{item.status.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div> : <div className="empty-state">No active mandatory categories are configured.</div>}
            {overallClearance !== "CLEARED" && <div className="helper-note"><CircleAlert size={15} /><span>Items are updated by your department. Missing items remain pending until recorded.</span></div>}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}

export default function StudentPage() {
  return <Suspense fallback={<WorkspaceLoading />}><StudentDashboard /></Suspense>;
}