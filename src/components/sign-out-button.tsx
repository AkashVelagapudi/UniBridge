"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="font-medium text-slate-800 hover:text-indigo-700"
    >
      Sign out
    </button>
  );
}
