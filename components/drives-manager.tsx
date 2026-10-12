"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Pencil,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { DRIVE_STATUSES, type DriveStatus } from "@/lib/domain";

type Department = { id: string; code: string; name: string };
type DriveRecord = {
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
  status: DriveStatus;
  _count: { applications: number };
};

const statusLabel = (status: DriveStatus) => status.replaceAll("_", " ");

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function DrivesManager({ departments }: { departments: Department[] }) {
  const [drives, setDrives] = useState<DriveRecord[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DriveRecord | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    fetch(`/api/officer/drives${query}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load drives.");
        setDrives(result.drives);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name !== "AbortError") setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, refreshKey]);

  function openCreate() {
    setEditing(null);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(event: React.MouseEvent, drive: DriveRecord) {
    event.preventDefault();
    event.stopPropagation();
    setEditing(drive);
    setError("");
    setDialogOpen(true);
  }

  async function saveDrive(event: FormEvent<HTMLFormElement>, stages: string[]) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const deadline = String(form.get("registrationDeadline") ?? "");
    const payload = {
      company: form.get("company"),
      role: form.get("role"),
      eligibleDepartmentIds: form.getAll("eligibleDepartmentIds"),
      eligibleBatches: String(form.get("eligibleBatches") ?? "").split(/[\s,;]+/).filter(Boolean),
      minCgpa: form.get("minCgpa"),
      maxBacklogs: form.get("maxBacklogs"),
      skills: form.get("skills"),
      registrationDeadline: deadline ? new Date(deadline).toISOString() : "",
      stages,
      location: form.get("location"),
      packageLpa: form.get("packageLpa"),
      status: form.get("status"),
    };

    setSaving(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/officer/drives/${editing.id}` : "/api/officer/drives", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save the drive.");
      setDialogOpen(false);
      setEditing(null);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the drive.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">Placement office · opportunities</div><h1>Placement drives</h1><p className="subheading">Manage opportunities, eligibility, and registration progress.</p></div>
        <button type="button" className="primary-action" onClick={openCreate}><Plus size={16} /> Create drive</button>
      </div>
      <section className="drive-list-panel">
        <div className="drive-list-toolbar">
          <div><h2>All drives</h2><p>{loading ? "Loading drive records..." : `${drives.length} drive${drives.length === 1 ? "" : "s"}`}</p></div>
          <label className="drive-status-filter">Status
            <select aria-label="Filter drives by status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {DRIVE_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item as DriveStatus)}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="form-error drive-page-error" role="alert">{error}</p>}
        <div className="table-wrap">
          <table className="drive-table">
            <thead><tr><th>Company & role</th><th>Eligible scope</th><th>Deadline</th><th>Package</th><th>Registrations</th><th>Status</th><th /></tr></thead>
            <tbody>
              {drives.map((drive) => {
                const departmentCodes = drive.eligibleDepartmentIds.map((id) => departments.find((department) => department.id === id)?.code ?? "Unknown");
                return <tr key={drive.id}>
                  <td><Link className="drive-company-link" href={`/officer/drives/${drive.id}`}><span className="company-mark">{drive.company.slice(0, 2).toUpperCase()}</span><span><strong>{drive.company}</strong><span className="cell-sub">{drive.role}</span></span></Link></td>
                  <td><span>{departmentCodes.join(", ")}</span><span className="cell-sub">Batches {drive.eligibleBatches.join(", ")}</span></td>
                  <td>{formatDate(drive.registrationDeadline)}</td>
                  <td>{drive.packageLpa == null ? "Not listed" : `₹${drive.packageLpa} LPA`}</td>
                  <td><UsersRound size={14} className="drive-inline-icon" />{drive._count.applications}</td>
                  <td><span className={`pill ${drive.status === "OPEN" ? "pill-green" : drive.status === "CANCELLED" ? "pill-red" : drive.status === "IN_PROGRESS" ? "pill-amber" : "pill-neutral"}`}>{statusLabel(drive.status)}</span></td>
                  <td><button type="button" className="icon-button" aria-label={`Edit ${drive.company} drive`} title="Edit drive" onClick={(event) => openEdit(event, drive)}><Pencil size={15} /></button></td>
                </tr>;
              })}
              {!loading && drives.length === 0 && <tr><td colSpan={7} className="table-empty">No drives match this status.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {dialogOpen && <DriveEditor
        key={editing?.id ?? "new-drive"}
        drive={editing}
        departments={departments}
        error={error}
        saving={saving}
        onClose={() => { setDialogOpen(false); setEditing(null); setError(""); }}
        onSubmit={saveDrive}
      />}
    </>
  );
}

function toLocalDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function DriveEditor({
  drive,
  departments,
  error,
  saving,
  onClose,
  onSubmit,
}: {
  drive: DriveRecord | null;
  departments: Department[];
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, stages: string[]) => void;
}) {
  const [stages, setStages] = useState(drive?.stages.length ? drive.stages : ["Resume screening", "Assessment", "Interview"]);
  const [stageDraft, setStageDraft] = useState("");
  const [stageError, setStageError] = useState("");

  function updateStage(index: number, value: string) {
    setStages((current) => current.map((stage, stageIndex) => stageIndex === index ? value : stage));
  }

  function moveStage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    setStages((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addStage() {
    const stage = stageDraft.trim();
    if (!stage) return;
    if (stages.some((item) => item.toLowerCase() === stage.toLowerCase())) {
      setStageError("Stage names must be unique.");
      return;
    }
    setStages((current) => [...current, stage]);
    setStageDraft("");
    setStageError("");
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="drive-dialog" role="dialog" aria-modal="true" aria-labelledby="drive-dialog-title">
        <div className="dialog-heading"><div><div className="eyebrow">Drive setup</div><h2 id="drive-dialog-title">{drive ? "Edit drive" : "Create drive"}</h2></div><button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={17} /></button></div>
        <form className="drive-form" onSubmit={(event) => onSubmit(event, stages)}>
          <div className="drive-form-grid">
            <label>Company<input name="company" defaultValue={drive?.company ?? ""} required /></label>
            <label>Role<input name="role" defaultValue={drive?.role ?? ""} required /></label>
          </div>
          <div className="drive-form-grid drive-form-grid-three">
            <label>Minimum CGPA<input name="minCgpa" type="number" min="0" max="10" step="0.01" defaultValue={drive?.minCgpa ?? ""} placeholder="No minimum" /></label>
            <label>Maximum backlogs<input name="maxBacklogs" type="number" min="0" step="1" defaultValue={drive?.maxBacklogs ?? ""} placeholder="No limit" /></label>
            <label>Package (LPA)<input name="packageLpa" type="number" min="0" step="0.1" defaultValue={drive?.packageLpa ?? ""} placeholder="Optional" /></label>
          </div>
          <div className="drive-form-grid">
            <label>Eligible departments<select name="eligibleDepartmentIds" multiple defaultValue={drive?.eligibleDepartmentIds ?? []} required size={Math.min(4, Math.max(2, departments.length))}>{departments.map((department) => <option key={department.id} value={department.id}>{department.code} · {department.name}</option>)}</select><span className="form-hint">Use Ctrl or Command to select more than one.</span></label>
            <label>Eligible batches<input name="eligibleBatches" defaultValue={drive?.eligibleBatches.join(", ") ?? ""} placeholder="2026, 2027" required /><span className="form-hint">Separate batches with commas.</span></label>
          </div>
          <div className="drive-form-grid">
            <label>Required skills<input name="skills" defaultValue={drive?.skills ?? ""} placeholder="TypeScript, React" /><span className="form-hint">Comma-separated; every listed skill is required.</span></label>
            <label>Location<input name="location" defaultValue={drive?.location ?? ""} placeholder="City or Remote" /></label>
          </div>
          <div className="drive-form-grid">
            <label>Registration deadline<input name="registrationDeadline" type="datetime-local" defaultValue={toLocalDateTime(drive?.registrationDeadline)} required /></label>
            <label>Status<select name="status" defaultValue={drive?.status ?? "PLANNED"}>{DRIVE_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></label>
          </div>
          <fieldset className="stage-editor">
            <legend>Recruitment stages <span>Ordered</span></legend>
            <div className="stage-list">
              {stages.map((stage, index) => <div className="stage-edit-row" key={`${index}-${stage}`}>
                <span className="stage-index">{index + 1}</span>
                <input aria-label={`Stage ${index + 1}`} value={stage} onChange={(event) => updateStage(index, event.target.value)} required />
                <button type="button" className="icon-button" aria-label={`Move stage ${index + 1} up`} title="Move up" disabled={index === 0} onClick={() => moveStage(index, -1)}><ArrowUp size={14} /></button>
                <button type="button" className="icon-button" aria-label={`Move stage ${index + 1} down`} title="Move down" disabled={index === stages.length - 1} onClick={() => moveStage(index, 1)}><ArrowDown size={14} /></button>
                <button type="button" className="icon-button stage-remove" aria-label={`Remove stage ${index + 1}`} title="Remove stage" disabled={stages.length <= 1} onClick={() => setStages((current) => current.filter((_, stageIndex) => stageIndex !== index))}><X size={14} /></button>
              </div>)}
            </div>
            <div className="stage-add-row"><input aria-label="New stage name" value={stageDraft} onChange={(event) => setStageDraft(event.target.value)} placeholder="Add a stage" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addStage(); } }} /><button className="secondary-button" type="button" onClick={addStage}><Plus size={14} /> Add stage</button></div>
            {stageError && <p className="form-error">{stageError}</p>}
          </fieldset>
          {drive?.status === "CANCELLED" && <div className="helper-note"><CalendarDays size={15} /><span>This drive is cancelled. Existing student registrations remain on record.</span></div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-action" disabled={saving}>{saving ? "Saving..." : drive ? "Save changes" : "Create drive"}</button></div>
        </form>
      </section>
    </div>
  );
}