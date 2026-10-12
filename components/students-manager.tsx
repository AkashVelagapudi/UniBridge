"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { ELIGIBILITY_STATUSES, REGISTRATION_STATUSES } from "@/lib/domain";

type Department = { id: string; name: string; code: string };
type StudentRecord = {
  id: string;
  rollNo: string;
  name: string;
  departmentId: string;
  department: Department;
  program: string;
  year: number;
  section: string;
  batch: string;
  cgpa: number | null;
  backlogs: number | null;
  skills: string | null;
  email: string;
  registrationStatus: string;
  eligibilityStatus: string;
};
type StudentFormValues = Omit<StudentRecord, "id" | "department">;

const blankStudent = (departmentId: string): StudentFormValues => ({
  rollNo: "",
  name: "",
  departmentId,
  program: "",
  year: 1,
  section: "A",
  batch: new Date().getFullYear().toString(),
  cgpa: null,
  backlogs: null,
  skills: "",
  email: "",
  registrationStatus: "NOT_REGISTERED",
  eligibilityStatus: "NA",
});

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StudentsManager({ departments }: { departments: Department[] }) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [batch, setBatch] = useState("");
  const [year, setYear] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (departmentId) params.set("departmentId", departmentId);
    if (batch.trim()) params.set("batch", batch.trim());
    if (year) params.set("year", year);
    if (registrationStatus) params.set("registrationStatus", registrationStatus);

    fetch(`/api/officer/students?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load students.");
        setListError("");
        setStudents(result.students);
        setTotal(result.total);
        setPageCount(result.pageCount);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") setListError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [search, departmentId, batch, year, registrationStatus, page, refreshKey]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setLoading(true);
    setter(value);
    setPage(1);
  }

  function changePage(value: number) {
    setLoading(true);
    setPage(value);
  }

  function startCreate() {
    setEditing(null);
    setFormError("");
    setDialogOpen(true);
  }

  function startEdit(student: StudentRecord) {
    setFormError("");
    setEditing(student);
    setDialogOpen(true);
  }

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    setSaving(true);
    setFormError("");
    try {
      const response = await fetch(editing ? `/api/officer/students/${editing.id}` : "/api/officer/students", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save student.");
      setEditing(null);
      setDialogOpen(false);
      setLoading(true);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save student.");
    } finally {
      setSaving(false);
    }
  }

  const formValues = editing ?? blankStudent(departments[0]?.id ?? "");

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Placement office · directory</div>
          <h1>Students</h1>
          <p className="subheading">Search, filter, and maintain student records.</p>
        </div>
        <div className="students-actions">
          <Link className="secondary-button" href="/officer/students/import"><Upload size={15} /> Import students</Link>
          <button className="primary-action" type="button" onClick={startCreate}><Plus size={16} /> Add student</button>
        </div>
      </div>

      <section className="students-panel" aria-label="Student directory">
        <div className="student-filters">
          <label className="search-field"><Search size={16} /><input aria-label="Search by name or roll number" placeholder="Search name or roll number" value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} /></label>
          <select aria-label="Filter by department" value={departmentId} onChange={(event) => updateFilter(setDepartmentId, event.target.value)}>
            <option value="">All departments</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.code} · {department.name}</option>)}
          </select>
          <input aria-label="Filter by batch" inputMode="numeric" maxLength={4} placeholder="Batch" value={batch} onChange={(event) => updateFilter(setBatch, event.target.value.replace(/\D/g, ""))} />
          <input aria-label="Filter by year" inputMode="numeric" type="number" min="1" placeholder="Year" value={year} onChange={(event) => updateFilter(setYear, event.target.value)} />
          <select aria-label="Filter by registration status" value={registrationStatus} onChange={(event) => updateFilter(setRegistrationStatus, event.target.value)}>
            <option value="">All registration statuses</option>
            {REGISTRATION_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
          </select>
        </div>
        {listError && <p className="form-error" role="alert">{listError}</p>}
        <div className="directory-meta"><span>{loading ? "Loading students..." : `${total} student${total === 1 ? "" : "s"}`}</span><span>Page {page}{pageCount ? ` of ${pageCount}` : " of 0"}</span></div>
        <div className="table-wrap">
          <table className="students-table">
            <thead><tr><th>Student</th><th>Department</th><th>Program</th><th>Year / section</th><th>Batch</th><th>Registration</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td><strong>{student.name}</strong><span className="cell-sub">{student.rollNo} · {student.email}</span></td>
                  <td>{student.department.code}</td>
                  <td>{student.program}</td>
                  <td>{student.year} / {student.section}</td>
                  <td>{student.batch}</td>
                  <td><span className={`pill ${student.registrationStatus === "REGISTERED" ? "pill-green" : "pill-neutral"}`}>{titleCase(student.registrationStatus)}</span></td>
                  <td><button className="icon-button" type="button" title={`Edit ${student.name}`} aria-label={`Edit ${student.name}`} onClick={() => startEdit(student)}><Pencil size={15} /></button></td>
                </tr>
              ))}
              {!loading && students.length === 0 && <tr><td colSpan={7} className="table-empty">No students match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>{total ? `${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}` : "No records"}</span>
          <div>
            <button className="icon-button" type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => changePage(page - 1)}><ChevronLeft size={16} /></button>
            <button className="icon-button" type="button" aria-label="Next page" disabled={!pageCount || page >= pageCount || loading} onClick={() => changePage(page + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {dialogOpen && <StudentDialog
        student={formValues}
        departments={departments}
        error={formError}
        saving={saving}
        onClose={() => { setEditing(null); setDialogOpen(false); setFormError(""); }}
        onSubmit={saveStudent}
      />}
    </>
  );
}

function StudentDialog({
  student,
  departments,
  error,
  saving,
  onClose,
  onSubmit,
}: {
  student: StudentFormValues;
  departments: Department[];
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="student-dialog" role="dialog" aria-modal="true" aria-labelledby="student-dialog-title">
        <div className="dialog-heading"><div><div className="eyebrow">Student record</div><h2 id="student-dialog-title">{student.rollNo ? "Edit student" : "Add student"}</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={17} /></button></div>
        <form onSubmit={onSubmit} className="student-form">
          <label>Roll number<input name="rollNo" defaultValue={student.rollNo} required /></label>
          <label>Full name<input name="name" defaultValue={student.name} required /></label>
          <label>Department<select name="departmentId" defaultValue={student.departmentId} required>{departments.map((department) => <option key={department.id} value={department.id}>{department.code} · {department.name}</option>)}</select></label>
          <label>Program<input name="program" defaultValue={student.program} required /></label>
          <div className="student-form-grid">
            <label>Year<input name="year" type="number" min="1" defaultValue={student.year} required /></label>
            <label>Section<input name="section" defaultValue={student.section} required /></label>
            <label>Batch<input name="batch" inputMode="numeric" maxLength={4} defaultValue={student.batch} required /></label>
          </div>
          <div className="student-form-grid">
            <label>CGPA<input name="cgpa" type="number" min="0" max="10" step="0.01" defaultValue={student.cgpa ?? ""} /></label>
            <label>Backlogs<input name="backlogs" type="number" min="0" step="1" defaultValue={student.backlogs ?? ""} /></label>
            <label>Skills<input name="skills" defaultValue={student.skills ?? ""} placeholder="Comma-separated" /></label>
          </div>
          <label>University email<input name="email" type="email" defaultValue={student.email} required /></label>
          <div className="student-form-grid">
            <label>Registration<select name="registrationStatus" defaultValue={student.registrationStatus}>{REGISTRATION_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label>
            <label>Eligibility<select name="eligibilityStatus" defaultValue={student.eligibilityStatus}>{ELIGIBILITY_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-action" disabled={saving}>{saving ? "Saving..." : "Save student"}</button></div>
        </form>
      </section>
    </div>
  );
}