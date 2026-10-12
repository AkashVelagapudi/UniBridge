# UniBridge

University placement and department no-dues portal built with Next.js App Router, TypeScript, Prisma, SQLite, Tailwind CSS, and NextAuth credentials.

## Setup

Requirements: Node.js 20.9 or later and npm.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set a private, random `NEXTAUTH_SECRET`. Keep `.env` out of source control.

   ```powershell
   Copy-Item .env.example .env
   ```

3. Generate Prisma Client and apply the initial SQLite migration:

   ```bash
   npm run db:generate
   npm run db:migrate -- --name init
   ```

4. Seed the local database with `npm run db:seed`.
5. Start the app with `npm run dev` and open [http://localhost:3000](http://localhost:3000).

The seed is safe to rerun. It creates one placement officer, four student accounts, three departments, drives, applications, offers, and clearance data.

## Demo Accounts

The local seed uses `CampusLane!2026` for all accounts. Set `DEMO_PASSWORD` before seeding to use a different password. These demo credentials are for local development only.

- Placement in-charge: `placement@campus.edu`
- Students: `asha@campus.edu`, `rohan@campus.edu`, `meera@campus.edu`, `noor@campus.edu`

Replace or remove seeded users before deploying.

## Portal Features

- Officer placement dashboards, drive management, eligibility verification, and single/bulk drive registration.
- Officer student directory with search, filters, pagination, add/edit, and CSV/XLSX import preview and reporting.
- Student application and no-dues views scoped to the authenticated student's own record.
- Placement and no-dues metrics computed from database records. Unique placed students and offer rows are reported separately.

Student import requires these columns: `rollNo`, `name`, `department`, `program`, `year`, `section`, `batch`, `email`. Download the XLSX template from the officer import page. Files are previewed before import; duplicate rows are skipped and never overwrite existing students.

Drive skill criteria are comma-separated and require every listed skill to appear in the student's recorded skills. CGPA, backlog, and skills are optional student fields; when a drive requires a value that is not recorded, the student is not considered eligible.

## API and Shared Services

Officer APIs are under `/api/officer/*`; student APIs are under `/api/student/*`. Every API checks the role server-side. Student APIs derive the student ID from the session, and there is no student clearance write endpoint.

- `lib/services/authz.ts` enforces role and student ownership.
- `lib/services/noDues.ts` computes overall no-dues and officer clearance summaries. Missing mandatory active items count as pending.
- `lib/services/stats.ts` computes placement aggregates from valid offers and eligible registered students.
- `lib/services/driveEligibility.ts` applies the drive's department, batch, CGPA, backlog, and skills criteria.

## Validation

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npm run build
```