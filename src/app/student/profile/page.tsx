import { StudentShell } from "@/components/student-shell";
import { getStudentPageContext } from "@/lib/services/student-page";

export default async function StudentProfilePage() {
  const student = await getStudentPageContext();

  const fields = [
    ["Full name", student.name],
    ["Roll number", student.rollNo],
    ["Email", student.email],
    ["Program", student.program],
    ["Year", String(student.year)],
    ["Section", student.section],
    ["Batch", student.batch],
    ["Registration status", student.registrationStatus.replaceAll("_", " ")],
    ["Eligibility status", student.eligibilityStatus.replaceAll("_", " ")],
  ];

  return (
    <StudentShell>
      <div>
        <p className="text-sm font-semibold text-indigo-700">Account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">My profile</h1>
        <p className="mt-2 text-slate-600">Your student record as maintained by the placement office.</p>
      </div>
      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
        <dl className="grid gap-6 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="mt-1 font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-7 border-t border-slate-100 pt-5 text-sm text-slate-500">
          To correct a detail, contact the placement office. Profile edits are managed centrally.
        </p>
      </section>
    </StudentShell>
  );
}
