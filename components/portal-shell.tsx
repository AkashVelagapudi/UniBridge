"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Role } from "@/lib/domain";

type PortalShellProps = {
  role: Role;
  name: string;
  children: ReactNode;
};

export function PortalShell({ role, name, children }: PortalShellProps) {
  const pathname = usePathname();
  const officer = role === "PLACEMENT_INCHARGE";
  const navItems = officer
    ? [
        { label: "Overview", href: "/officer", icon: LayoutDashboard },
        { label: "Placement drives", href: "/officer/drives", icon: Building2 },
        { label: "Student outcomes", href: "/officer#outcomes", icon: UsersRound },
        { label: "Students", href: "/officer/students", icon: UserRoundCog },
        { label: "No-dues tracking", href: "/officer#clearance", icon: ClipboardCheck },
      ]
    : [
        { label: "My overview", href: "/student", icon: LayoutDashboard },
        { label: "My applications", href: "/student#applications", icon: Building2 },
        { label: "No-dues status", href: "/student#clearance", icon: ShieldCheck },
      ];
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="portal app-shell">
      <aside className="sidebar">
        <a href={officer ? "/officer" : "/student"} className="brand">
          <span className="brand-mark"><GraduationCap size={19} strokeWidth={2.3} /></span>
          <span>
            <span className="brand-name">Campus Lane</span>
            <span className="brand-caption">PLACEMENT & NO-DUES</span>
          </span>
        </a>
        <div className="nav-label">Workspace</div>
        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map(({ label, href, icon: Icon }) => {
            const basePath = href.split("#")[0];
            const active = !href.includes("#") && (
              pathname === basePath ||
              basePath === "/officer/students" && pathname.startsWith(`${basePath}/`)
            );
            return (
              <a key={href} className={`nav-link${active ? " active" : ""}`} href={href}>
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
                {label === "No-dues tracking" && <ArrowUpRight size={13} className="ml-auto" />}
              </a>
            );
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="profile-row">
          <div className="avatar">{initials || "U"}</div>
          <div>
            <div className="profile-name">{name}</div>
            <div className="profile-role">{officer ? "Placement in-charge" : "Student"}</div>
          </div>
          <button
            className="signout"
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="breadcrumb">University portal <span aria-hidden="true">/</span> {officer ? "Placement office" : "Student space"}</div>
          <div className="topbar-right"><span><i className="status-dot" />Live workspace</span></div>
        </div>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}