import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/sign-out-button";

const links = [
  { href: "/student/dashboard", label: "Overview" },
  { href: "/student/drives", label: "Placement drives" },
  { href: "/student/applications", label: "My applications" },
  { href: "/student/offers", label: "Offers" },
  { href: "/student/no-dues", label: "No-dues" },
  { href: "/student/profile", label: "My profile" },
];

export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/student/dashboard" className="text-lg font-bold tracking-tight text-slate-900">
            UniBridge <span className="font-medium text-slate-500">/ Student portal</span>
          </Link>
          <nav aria-label="Student navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-indigo-700">
                {link.label}
              </Link>
            ))}
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
