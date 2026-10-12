"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function withdraw() {
    if (!window.confirm("Withdraw this application? This action cannot be undone.")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/student/applications/${encodeURIComponent(applicationId)}`, {
        method: "PATCH",
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to withdraw this application.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={withdraw}
        disabled={busy}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-rose-300 hover:text-rose-700 disabled:opacity-60"
      >
        {busy ? "Withdrawing…" : "Withdraw"}
      </button>
      {message && <p role="alert" className="mt-2 text-xs text-rose-700">{message}</p>}
    </div>
  );
}
