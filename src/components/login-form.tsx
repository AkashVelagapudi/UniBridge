"use client";

import { getSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { normalizeUniversityEmail } from "@/lib/university-email";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const emailValue = String(formData.get("email") ?? "");
    const email = normalizeUniversityEmail(emailValue);
    if (!email) {
      setError("Use your @siddhartha.edu.in or @vrsiddhartha.edu.in university email.");
      setSubmitting(false);
      return;
    }
    try {
      const result = await signIn("credentials", {
        email,
        password: formData.get("password"),
        redirect: false,
      });
      if (result?.error) {
        setError("The email or password you entered is incorrect.");
        return;
      }
      const session = await getSession();
      window.location.assign(session?.user.role === "STUDENT" ? "/student/dashboard" : "/officer/dashboard");
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const pageError = searchParams.get("error");
  return (
    <form onSubmit={submit} className="space-y-5">
      {pageError === "profile" && (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          This account does not have a linked student profile. Contact the placement office.
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        University email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          autoCapitalize="none"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          placeholder="name@siddhartha.edu.in"
        />
      </label>
      <p className="-mt-3 text-xs text-slate-500">
        Use an @siddhartha.edu.in or @vrsiddhartha.edu.in address.
      </p>
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          placeholder="Your password"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
