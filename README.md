# UniBridge

University placement and department no-dues portal built with Next.js App Router, TypeScript, Prisma, SQLite, Tailwind CSS, and NextAuth credentials.

## Setup

Requirements: Node.js 20.9 or later and npm.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`. Set a private random `NEXTAUTH_SECRET`, and keep `.env` out of source control. `DATABASE_URL` defaults to a local SQLite file.

   ```bash
   # PowerShell
   Copy-Item .env.example .env
   ```

3. Generate Prisma Client, create/update the database from the schema, and load the deterministic demo data:

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

   The seed is safe to rerun: it upserts the same demo departments, users, students, drives, applications, offers, and clearance items.

4. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

All seeded credentials use the development-only password `password123`.

- Placement in-charge: `placement@siddhartha.edu.in`
- Students: `sb2026001@siddhartha.edu.in` through `sb2026030@siddhartha.edu.in`

Credentials are restricted to exact `@siddhartha.edu.in` and `@vrsiddhartha.edu.in` email domains. Do not use the seeded demo password or accounts in production; replace or remove demo users before deployment.

## Seed contents

The seed creates three departments and 30 linked student/User accounts, five companies with drives in mixed statuses (including a cancelled drive), applications for every application stage, and students without applications. It includes multiple offers for one student, a withdrawn application with no offer, and an offer on the cancelled drive to exercise placement-stat exclusions.

It also creates the mandatory Library, Laboratory, Department, Placement, and Accounts clearance categories plus optional Hostel. The clearance records include fully cleared students, pending and rejected requirements, not-applicable combinations, and missing items (which count as pending).

## Role routing and access

Next.js 16 renamed Middleware to Proxy. `src/proxy.ts` applies the same role-aware redirect behavior to `/officer/*` and `/student/*`: unauthenticated requests go to `/login`, and authenticated users are redirected to their role's dashboard if they enter the other role's area. The JWT and NextAuth session include the user's role. API routes must still enforce role and ownership authorization server-side.

Student pages and APIs are scoped to the authenticated user's linked student record. Students cannot update clearance items. Officer pages can be added under `/officer/*`.

## Student import templates

Download the CSV or Excel template from `public/student-import-template.csv` or `public/student-import-template.xlsx`. Both use the same columns:

`rollNo,name,departmentCode,program,year,section,batch,email,registrationStatus,eligibilityStatus`

The three example rows use the seeded departments and allowed university email domains. The templates are examples; they are not automatically imported by this starter.

## Validation

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```
