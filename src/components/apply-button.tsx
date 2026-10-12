"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApplyButton({ driveId }: { driveId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/student/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveId }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to submit your application.");
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
        onClick={apply}
        disabled={busy}
        className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
      >
        {busy ? "Applying…" : "Apply now"}
      </button>
      {message && <p role="alert" className="mt-2 max-w-56 text-xs text-rose-700">{message}</p>}
    </div>
  );
}
