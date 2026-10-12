# Campus Lane

University placement and department no-dues portal built with Next.js App Router, TypeScript, Prisma, SQLite, Tailwind CSS, and NextAuth credentials.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set a unique `NEXTAUTH_SECRET`.
3. Apply the initial database schema with `npm run db:migrate -- --name init`.
4. Seed local demo rows with `npm run db:seed`.
5. Start the app with `npm run dev` and open `http://localhost:3000`.

The seed creates one placement officer and four student accounts. The default local password is `CampusLane!2026`; set `DEMO_PASSWORD` before seeding to choose another. These demo credentials are for local development only.

## Shared services

- `lib/services/noDues.ts` computes each student's overall status and officer clearance summary. A missing mandatory active category is pending.
- `lib/services/stats.ts` computes placement, department, company, package, and batch aggregates from database records. Unique placed students and valid offer rows are separate counts.
- `lib/services/authz.ts` enforces role and own-student access for server handlers.

Student APIs are under `/api/student/*`; placement officer APIs are under `/api/officer/*`. Student routes derive the student ID from the authenticated session and expose no clearance write endpoint.