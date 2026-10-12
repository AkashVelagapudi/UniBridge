"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, Download, FileSpreadsheet, Upload } from "lucide-react";

type PreviewRow = {
  rowNumber: number;
  rollNo: string;
  name: string;
  department: string;
  program: string;
  year: string;
  section: string;
  batch: string;
  email: string;
  status: "Valid" | "Duplicate" | "Invalid";
  message: string;
};

type ReportRow = {
  rowNumber: number;
  rollNo: string;
  status: string;
  message: string;
};

type ImportSummary = { successful: number; skipped: number; failed: number };

function csvValue(value: string | number) {
  let safe = String(value);
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function StudentImportFlow() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [counts, setCounts] = useState({ valid: 0, duplicate: 0, invalid: 0 });
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setRows([]);
    setSummary(null);
    setError("");
  }

  async function previewUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a .xlsx or .csv file first.");
      return;
    }
    setBusy(true);
    setError("");
    setSummary(null);
    setReportRows([]);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/officer/students/import/preview", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not preview the uploaded file.");
      setRows(result.rows ?? []);
      setCounts({ valid: result.validCount ?? 0, duplicate: result.duplicateCount ?? 0, invalid: result.invalidCount ?? 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not preview the uploaded file.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/officer/students/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not import these records.");
      setSummary(result.summary);
      setReportRows(result.reportRows ?? []);
      setCounts((current) => ({ ...current, valid: 0 }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import these records.");
    } finally {
      setBusy(false);
    }
  }

  function downloadReport() {
    const header = ["rowNumber", "rollNo", "status", "message"];
    const content = [header, ...reportRows.map((row) => [row.rowNumber, row.rollNo, row.status, row.message])]
      .map((row) => row.map(csvValue).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-import-report.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Student directory · import</div>
          <h1>Import students</h1>
          <p className="subheading">Review every row before any student records are saved.</p>
        </div>
        <Link href="/officer/students" className="secondary-button"><ArrowLeft size={15} /> Student directory</Link>
      </div>

      <section className="import-upload-panel">
        <div className="import-heading">
          <span className="import-icon"><FileSpreadsheet size={20} /></span>
          <div><h2>Prepare your file</h2><p>Upload an Excel workbook or CSV file with the required student columns.</p></div>
          <form className="template-button" action="/api/officer/students/import/template" method="get">
            <button className="secondary-button" type="submit"><Download size={15} /> Download template</button>
          </form>
        </div>
        <form className="upload-form" onSubmit={previewUpload}>
          <label className={`upload-drop${file ? " has-file" : ""}`} htmlFor="student-import-file">
            <Upload size={18} />
            <span>{file ? file.name : "Choose a .xlsx or .csv file"}</span>
            <span className="upload-hint">Maximum 10 MB · up to 2,000 rows</span>
            <input ref={fileInput} id="student-import-file" type="file" accept=".xlsx,.csv" onChange={selectFile} />
          </label>
          <button className="primary-action" type="submit" disabled={busy || !file}>{busy ? "Reading file..." : "Preview rows"}</button>
        </form>
        <p className="required-columns">Required columns: <strong>rollNo, name, department, program, year, section, batch, email</strong></p>
        {error && <p className="form-error import-error" role="alert"><AlertCircle size={15} /> {error}</p>}
      </section>

      {rows.length > 0 && <section className="import-preview-panel" aria-label="Import preview">
        <div className="panel-header import-preview-heading">
          <div><h2>Preview</h2><div className="panel-caption">No records have been saved yet.</div></div>
          <div className="preview-counts"><span className="pill pill-green">{counts.valid} valid</span><span className="pill pill-amber">{counts.duplicate} duplicate</span><span className="pill pill-red">{counts.invalid} invalid</span></div>
        </div>
        <div className="table-wrap">
          <table className="import-table">
            <thead><tr><th>Row</th><th>Roll number</th><th>Student</th><th>Department</th><th>Year / batch</th><th>Status & details</th></tr></thead>
            <tbody>{rows.map((row, index) => (
              <tr key={`${row.rowNumber}-${index}`}>
                <td>{row.rowNumber}</td>
                <td>{row.rollNo || "—"}</td>
                <td><strong>{row.name || "—"}</strong><span className="cell-sub">{row.email}</span></td>
                <td>{row.department || "—"}</td>
                <td>{row.year || "—"} / {row.batch || "—"}</td>
                <td><span className={`pill ${row.status === "Valid" ? "pill-green" : row.status === "Duplicate" ? "pill-amber" : "pill-red"}`}>{row.status === "Valid" && <Check size={11} />}{row.status}</span><span className="import-message">{row.message}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="import-confirm-row">
          <span>Duplicates are skipped. Invalid rows are reported and not imported.</span>
          <button className="primary-action" type="button" onClick={confirmImport} disabled={busy || counts.valid === 0 || summary !== null}>
            {busy ? "Importing..." : `Confirm import · ${counts.valid} valid`}
          </button>
        </div>
      </section>}

      {summary && <section className="import-summary" aria-live="polite">
        <div className="summary-heading"><div><div className="eyebrow">Import complete</div><h2>Student records processed</h2></div><button className="secondary-button" type="button" onClick={downloadReport}><Download size={15} /> Download error report</button></div>
        <div className="summary-counts">
          <article><span>Successful</span><strong>{summary.successful}</strong></article>
          <article><span>Skipped</span><strong>{summary.skipped}</strong></article>
          <article><span>Failed</span><strong>{summary.failed}</strong></article>
        </div>
        <p className="panel-caption">The report includes skipped duplicates and failed rows with their row numbers and reasons.</p>
      </section>}
    </>
  );
}