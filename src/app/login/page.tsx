import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">UniBridge</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in with your university account to view placement opportunities and track your no-dues status.
        </p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-slate-100" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-xs leading-5 text-slate-500">
          Student accounts are provisioned by the placement office. Contact your placement in-charge if you need access.
        </p>
      </section>
    </main>
  );
}
