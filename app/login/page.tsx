"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GraduationCap, LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError("Those credentials do not match an account.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="login-page">
      <section className="login-aside">
        <a href="/login" className="brand">
          <span className="brand-mark"><GraduationCap size={19} strokeWidth={2.3} /></span>
          <span><span className="brand-name">Campus Lane</span><span className="brand-caption">PLACEMENT & NO-DUES</span></span>
        </a>
        <div className="login-message">
          <div className="eyebrow">The next step starts here</div>
          <h1>Make your campus journey count.</h1>
          <p>Track placement opportunities, application progress, and department clearances from one reliable place.</p>
        </div>
        <div className="login-foot">A shared workspace for students and the placement office.</div>
      </section>
      <section className="login-form-side">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="eyebrow">University access</div>
          <h2>Welcome back</h2>
          <p>Sign in with your university account to continue.</p>
          <div className="field">
            <label htmlFor="email">University email</label>
            <input id="email" name="email" type="email" autoComplete="username" placeholder="name@university.edu" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required />
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={pending} type="submit">
            {pending ? "Signing in..." : "Sign in to your workspace"}
          </button>
          <div className="login-secure"><LockKeyhole size={13} /> Secure, role-based access</div>
        </form>
      </section>
    </main>
  );
}