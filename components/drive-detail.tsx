"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, MapPin, UsersRound } from "lucide-react";

type DriveDetailRecord = {
  id: string;
  company: string;
  role: string;
  eligibleDepartmentIds: string[];
  eligibleBatches: string[];
  minCgpa: number | null;
  maxBacklogs: number | null;
  skills: string | null;
  registrationDeadline: string;
  stages: string[];
  location: string | null;
  packageLpa: number | null;
  status: string;
  applications: {
    id: string;
    stage: string;
    resultPublished: boolean;
    updatedAt: string;
    student: { id: string; rollNo: string; name: string; email: string; department: { code: string; name: string } };
  }[];
};

type EligibleStudent = {
  id: string;
  rollNo: string;
  name: string;
  email: string;
  batch: string;
  cgpa: number | null;
  backlogs: number | null;
  skills: string | null;
  eligibilityStatus: string;
  department: { code: string; name: string };
  isRegistered: boolean;
  eligibility: { eligible: boolean; reasons: string[] };
};

type RegistrationOutcome = {
  summary: { registered: number; skipped: number; ineligible: number; failed: number };
  results: { studentId: string; status: string; message: string }[];
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function DriveDetail({ driveId, departments }: { driveId: string; departments: { id: string; code: string }[] }) {
  const [drive, setDrive] = useState<DriveDetailRecord | null>(null);
  const [candidates, setCandidates] = useState<EligibleStudent[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<RegistrationOutcome | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`/api/officer/drives/${driveId}`, { signal: controller.signal }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load the drive.");
        return result.drive;
      }),
      fetch(`/api/officer/drives/${driveId}/eligible-students`, { signal: controller.signal }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not verify student eligibility.");
        return result.students;
      }),
    ])
      .then(([driveRecord, studentRecords]) => {
        setDrive(driveRecord);
        setCandidates(studentRecords);
        setSelectedIds([]);
        setError("");
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name !== "AbortError") setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [driveId, refreshKey]);

  const selectable = useMemo(
    () => candidates.filter((student) => student.eligibility.eligible && !student.isRegistered),
    [candidates],
  );
  const visibleCandidates = candidates.filter((student) => {
    const query = search.trim().toLowerCase();
    return !query || student.name.toLowerCase().includes(query) || student.rollNo.toLowerCase().includes(query);
  });
  const allSelected = selectable.length > 0 && selectable.every((student) => selectedIds.includes(student.id));

  function toggleStudent(studentId: string) {
    setSelectedIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? selectable.map((student) => student.id) : []);
  }

  async function registerStudents(studentIds: string[]) {
    setBusy(true);
    setError("");
    setOutcome(null);
    try {
      const response = await fetch(`/api/officer/drives/${driveId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not register students.");
      setOutcome(result);
      setLoading(true);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not register students.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !drive) return <div className="empty-state">Loading drive details...</div>;
  if (!drive) return <div className="form-error" role="alert">{error || "Drive not found."}</div>;
  const cancelled = drive.status === "CANCELLED";
  const open = drive.status === "OPEN" && new Date(drive.registrationDeadline) > new Date();

  return (
    <>
      <div className="page-heading drive-detail-heading">
        <div>
          <Link className="back-link" href="/officer/drives"><ArrowLeft size={14} /> All drives</Link>
          <div className="eyebrow">Drive details</div>
          <h1>{drive.company}</h1>
          <p className="subheading">{drive.role}</p>
        </div>
        <span className={`pill drive-detail-status ${drive.status === "OPEN" ? "pill-green" : cancelled ? "pill-red" : drive.status === "IN_PROGRESS" ? "pill-amber" : "pill-neutral"}`}>{drive.status.replaceAll("_", " ")}</span>
      </div>

      {cancelled && <div className="cancelled-drive-note"><span className="cancelled-drive-mark">!</span><span><strong>Drive cancelled.</strong> Existing registrations and stages are preserved. Offers from this drive are excluded from placement counts.</span></div>}

      <section className="drive-facts" aria-label="Drive criteria">
        <div><span className="fact-label">Eligible departments</span><strong>{drive.eligibleDepartmentIds.map((id) => departments.find((department) => department.id === id)?.code ?? "Unknown").join(", ") || "None"}</strong></div>
        <div><span className="fact-label">Eligible batches</span><strong>{drive.eligibleBatches.join(", ")}</strong></div>
        <div><span className="fact-label">Minimum CGPA</span><strong>{drive.minCgpa ?? "No minimum"}</strong></div>
        <div><span className="fact-label">Maximum backlogs</span><strong>{drive.maxBacklogs ?? "No limit"}</strong></div>
        <div><span className="fact-label">Required skills</span><strong>{drive.skills || "No skill filter"}</strong></div>
        <div><span className="fact-label">Package</span><strong>{drive.packageLpa == null ? "Not listed" : `₹${drive.packageLpa} LPA`}</strong></div>
        <div><span className="fact-label">Registration deadline</span><strong><CalendarDays size={13} /> {dateLabel(drive.registrationDeadline)}</strong></div>
        <div><span className="fact-label">Location</span><strong><MapPin size={13} /> {drive.location || "Not listed"}</strong></div>
      </section>

      <section className="panel stage-strip-panel">
        <div className="panel-header"><div><h2>Recruitment stages</h2><div className="panel-caption">Ordered drive progression</div></div></div>
        <ol className="drive-stage-strip">{drive.stages.map((stage, index) => <li key={`${stage}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong></li>)}</ol>
      </section>

      <section className="panel registered-students-panel">
        <div className="panel-header">
          <div className="panel-title"><UsersRound className="panel-icon" size={17} /><div><h2>Registered students</h2><div className="panel-caption">Current application stage for this drive</div></div></div>
          <span className="panel-action">{drive.applications.length} registered</span>
        </div>
        {drive.applications.length ? <div className="table-wrap"><table className="drive-detail-table">
          <thead><tr><th>Student</th><th>Department</th><th>Email</th><th>Current stage</th><th>Updated</th></tr></thead>
          <tbody>{drive.applications.map((application) => <tr key={application.id}>
            <td><strong>{application.student.name}</strong><span className="cell-sub">{application.student.rollNo}</span></td>
            <td>{application.student.department.code}</td>
            <td>{application.student.email}</td>
            <td><span className="pill pill-neutral">{application.stage.replaceAll("_", " ")}</span>{application.resultPublished && <span className="result-published">Result published</span>}</td>
            <td>{dateLabel(application.updatedAt)}</td>
          </tr>)}</tbody>
        </table></div> : <div className="empty-state">No students are registered for this drive yet.</div>}
      </section>

      <section className="panel eligible-students-panel">
        <div className="panel-header register-header">
          <div className="panel-title"><Check className="panel-icon" size={17} /><div><h2>Verify and register</h2><div className="panel-caption">Eligibility is checked again when registration is saved.</div></div></div>
          <button className="primary-action" type="button" disabled={!open || busy || selectedIds.length === 0} onClick={() => registerStudents(selectedIds)}>{busy ? "Registering..." : `Register selected · ${selectedIds.length}`}</button>
        </div>
        {!open && <div className="drive-closed-note">This drive is not open for registration or its deadline has passed.</div>}
        {error && <p className="form-error drive-page-error" role="alert">{error}</p>}
        {outcome && <div className="registration-outcome" role="status"><strong>Registration processed</strong><span>{outcome.summary.registered} registered · {outcome.summary.skipped} already registered · {outcome.summary.ineligible} ineligible · {outcome.summary.failed} failed</span></div>}
        <div className="candidate-toolbar"><label className="search-field"><UsersRound size={15} /><input aria-label="Search eligible students" placeholder="Search name or roll number" value={search} onChange={(event) => setSearch(event.target.value)} /></label><span>{candidates.length} in-scope student{candidates.length === 1 ? "" : "s"}</span></div>
        {candidates.length ? <div className="table-wrap"><table className="drive-detail-table candidate-table">
          <thead><tr><th><input type="checkbox" aria-label="Select all eligible students" checked={allSelected} onChange={(event) => toggleAll(event.target.checked)} disabled={!open || selectable.length === 0} /></th><th>Student</th><th>Department / batch</th><th>CGPA</th><th>Backlogs</th><th>Eligibility check</th><th /></tr></thead>
          <tbody>{visibleCandidates.map((student) => <tr key={student.id}>
            <td><input type="checkbox" aria-label={`Select ${student.name}`} checked={selectedIds.includes(student.id)} onChange={() => toggleStudent(student.id)} disabled={!open || !student.eligibility.eligible || student.isRegistered} /></td>
            <td><strong>{student.name}</strong><span className="cell-sub">{student.rollNo}</span></td>
            <td>{student.department.code}<span className="cell-sub">Batch {student.batch}</span></td>
            <td>{student.cgpa ?? "Not recorded"}</td>
            <td>{student.backlogs ?? "Not recorded"}</td>
            <td><span className={`pill ${student.isRegistered ? "pill-neutral" : student.eligibility.eligible ? "pill-green" : "pill-red"}`}>{student.isRegistered ? "Registered" : student.eligibility.eligible ? "Eligible" : "Not eligible"}</span><span className="eligibility-reason">{student.isRegistered ? "Already on this drive" : student.eligibility.reasons.join(" ") || "Meets all drive criteria."}</span></td>
            <td>{!student.isRegistered && student.eligibility.eligible && <button className="secondary-button single-register" type="button" disabled={!open || busy} onClick={() => registerStudents([student.id])}>Register</button>}</td>
          </tr>)}</tbody>
        </table></div> : <div className="empty-state">No registered-placement students match this drive&apos;s department and batch scope.</div>}
      </section>
    </>
  );
}
