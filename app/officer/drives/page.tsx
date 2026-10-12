import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DrivesManager } from "@/components/drives-manager";
import { PortalShell } from "@/components/portal-shell";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function DrivesContent() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PLACEMENT_INCHARGE") redirect("/student");
  const departments = await prisma.department.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });

  return <PortalShell role="PLACEMENT_INCHARGE" name={session.user.name || session.user.email || "Placement office"}><DrivesManager departments={departments} /></PortalShell>;
}

export default function DrivesPage() {
  return <Suspense fallback={<WorkspaceLoading />}><DrivesContent /></Suspense>;
}