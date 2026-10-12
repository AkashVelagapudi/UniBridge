import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleAlert,
  FileCheck2,
  GraduationCap,
  UsersRound,
} from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClearanceSummary } from "@/lib/services/noDues";
import { getBatchTrends, getCompanyStats, getDepartmentStats, getPackageStats, getPlacementStats } from "@/lib/services/stats";

function percentage(value: number) {
  return `${value.toFixed(1)}%`;
}

async function OfficerDashboard() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PLACEMENT_INCHARGE") redirect("/student");

  const [placement, departments, companies, packages, batchTrends, clearance, drives, studentCount] = await Promise.all([
    getPlacementStats(),
    getDepartmentStats(),
    getCompanyStats(),
    getPackageStats(),
    getBatchTrends(),
    getClearanceSummary(),
    prisma.drive.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS", "PLANNED"] } },
      select: { id: true, company: true, role: true, status: true, packageLpa: true, registrationDeadline: true, _count: { select: { applications: true } } },
      orderBy: { registrationDeadline: "asc" },
      take: 6,
    }),
    prisma.student.count(),
  ]);
  const maxBatchPlacement = Math.max(1, ...batchTrends.map((batch) => batch.uniqueStudentsPlaced));
  const displayName = session.user.name || session.user.email || "Placement office";

  return (
    <PortalShell role="PLACEMENT_INCHARGE" name={displayName}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Placement office · overview</div>
          <h1>Good work starts with a clear view.</h1>
          <p className="subheading">Live placement outcomes and department readiness.</p>
        </div>
        <div className="date-chip"><CalendarDays size={14} /> {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date())}</div>
      </div>

      <section className="stat-grid" aria-label="Placement summary">
        <article className="stat-card">
          <div className="stat-top"><span>Placement rate</span><span className="stat-icon"><GraduationCap size={16} /></span></div>
          <div className="stat-number">{percentage(placement.placementPercentage)}</div>
          <div className="stat-foot"><strong>{placement.uniqueStudentsPlaced} unique students</strong> placed</div>
          <div className="denominator-note">of {placement.eligibleStudents} registered & eligible students</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Total offers</span><span className="stat-icon"><FileCheck2 size={15} /></span></div>
          <div className="stat-number">{placement.totalOffers}</div>
          <div className="stat-foot">Valid offer records across drives</div>
          <div className="denominator-note">Offer count is separate from students placed</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Active drives</span><span className="stat-icon"><BriefcaseBusiness size={15} /></span></div>
          <div className="stat-number">{drives.length}</div>
          <div className="stat-foot">Planned, open, or in progress</div>
          <div className="denominator-note">{studentCount} student records in the portal</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>No-dues cleared</span><span className="stat-icon"><CircleAlert size={15} /></span></div>
          <div className="stat-number">{clearance.clearedStudents}</div>
          <div className="stat-foot">of {clearance.totalStudents} students</div>
          <div className="denominator-note">Missing mandatory items count as pending</div>
        </article>
      </section>

      <div className="content-grid">
        <section className="panel" id="drives">
          <div className="panel-header">
            <div className="panel-title"><Building2 className="panel-icon" size={17} /><div><h2>Placement drives</h2><div className="panel-caption">Upcoming and active opportunities</div></div></div>
            <span className="panel-action">{drives.length} shown</span>
          </div>
          {drives.length ? <div className="table-wrap">
            <table>
              <thead><tr><th>Company & role</th><th>Status</th><th>Applications</th><th>Package</th><th>Deadline</th></tr></thead>
              <tbody>{drives.map((drive) => (
                <tr key={drive.id}>
                  <td><div className="company-cell"><span className="company-mark">{drive.company.slice(0, 2).toUpperCase()}</span><span>{drive.company}<span className="cell-sub">{drive.role}</span></span></div></td>
                  <td><span className={`pill ${drive.status === "OPEN" ? "pill-green" : "pill-neutral"}`}>{drive.status.replaceAll("_", " ")}</span></td>
                  <td>{drive._count.applications}</td>
                  <td>{drive.packageLpa ? `₹${drive.packageLpa} LPA` : "Not listed"}</td>
                  <td>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(drive.registrationDeadline)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div> : <div className="empty-state">No active or planned drives in the database.</div>}
        </section>

        <section className="panel" id="outcomes">
          <div className="panel-header">
            <div className="panel-title"><UsersRound className="panel-icon" size={17} /><div><h2>Department outcomes</h2><div className="panel-caption">Unique placed students / eligible base</div></div></div>
          </div>
          <div className="panel-body">
            {departments.length ? <div className="chart-list">
              {departments.map((department) => (
                <div key={department.id}>
                  <div className="chart-row-head"><span className="chart-label">{department.code}</span><span className="chart-value">{department.uniqueStudentsPlaced} / {department.eligibleStudents} · {percentage(department.placementPercentage)}</span></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(department.placementPercentage, 100)}%` }} /></div>
                </div>
              ))}
            </div> : <div className="empty-state">Department statistics appear when departments are added.</div>}
            <div className="helper-note"><GraduationCap size={15} /><span>The placement rate uses unique students placed, not offer count.</span></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="panel-title"><BriefcaseBusiness className="panel-icon" size={17} /><div><h2>Company outcomes</h2><div className="panel-caption">Distinct students and total offers</div></div></div>
          </div>
          <div className="table-wrap">
            {companies.length ? <table>
              <thead><tr><th>Company</th><th>Students</th><th>Offers</th></tr></thead>
              <tbody>{companies.slice(0, 6).map((company) => (
                <tr key={company.company}><td>{company.company}</td><td>{company.uniqueStudentsPlaced}</td><td>{company.totalOffers}</td></tr>
              ))}</tbody>
            </table> : <div className="empty-state">Valid offers will be grouped by company here.</div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="panel-title"><FileCheck2 className="panel-icon" size={17} /><div><h2>Package distribution</h2><div className="panel-caption">Valid offer rows grouped by package</div></div></div>
          </div>
          <div className="panel-body">
            {packages.length ? <div className="chart-list">
              {packages.slice(-5).reverse().map((item) => {
                const maxOffers = Math.max(1, ...packages.map((entry) => entry.totalOffers));
                return <div key={item.packageLpa}>
                  <div className="chart-row-head"><span className="chart-label">₹{item.packageLpa} LPA</span><span className="chart-value">{item.totalOffers} offers · {item.uniqueStudentsPlaced} students</span></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(item.totalOffers / maxOffers) * 100}%` }} /></div>
                </div>;
              })}
            </div> : <div className="empty-state">Offer packages appear once offers are recorded.</div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="panel-title"><GraduationCap className="panel-icon" size={17} /><div><h2>Batch trends</h2><div className="panel-caption">Unique students placed by batch</div></div></div>
          </div>
          <div className="panel-body">
            {batchTrends.length ? <div className="trend-grid">
              {batchTrends.map((batch) => <div className="trend-row" key={batch.batch}>
                <span className="trend-year">{batch.batch}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(batch.uniqueStudentsPlaced / maxBatchPlacement) * 100}%` }} /></div>
                <span className="trend-count">{batch.uniqueStudentsPlaced}</span>
              </div>)}
            </div> : <div className="empty-state">Batch trends appear for registered, eligible students.</div>}
            <div className="denominator-note">Placement rate denominator for each batch: {" "}{batchTrends.map((batch) => `${batch.batch}: ${batch.eligibleStudents}`).join(" · ") || "no eligible students"}</div>
          </div>
        </section>

        <section className="panel" id="clearance">
          <div className="panel-header">
            <div className="panel-title"><FileCheck2 className="panel-icon" size={17} /><div><h2>No-dues readiness</h2><div className="panel-caption">Mandatory active categories only</div></div></div>
            <span className="panel-action">{clearance.incompleteStudents} incomplete</span>
          </div>
          <div className="panel-body">
            {clearance.students.length ? <div className="clearance-list">
              {[...clearance.students].sort((left, right) => left.status.localeCompare(right.status)).slice(0, 6).map((student) => (
                <div className="clearance-row" key={student.id}>
                  <div><div className="clearance-name">{student.name}</div><div className="clearance-detail">{student.rollNo} · {student.department.code} · {student.batch}</div></div>
                  <span className={`pill ${student.status === "CLEARED" ? "pill-green" : "pill-amber"}`}>{student.status}</span>
                </div>
              ))}
            </div> : <div className="empty-state">No student records are available yet.</div>}
            <div className="helper-note"><CircleAlert size={15} /><span>A student is cleared only when every active mandatory category is cleared or not applicable. Missing items are pending.</span></div>
          </div>
        </section>
      </div>
      <div className="denominator-note">All totals and charts are computed from database records. Offers attached to rejected/withdrawn applications or cancelled drives are excluded from placement outcomes.</div>
    </PortalShell>
  );
}

export default function OfficerPage() {
  return <Suspense fallback={<WorkspaceLoading />}><OfficerDashboard /></Suspense>;
}