import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PortalShell } from "@/components/portal-shell";
import { StudentsManager } from "@/components/students-manager";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function StudentDirectory() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PLACEMENT_INCHARGE") redirect("/student");

  const departments = await prisma.department.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return (
    <PortalShell role="PLACEMENT_INCHARGE" name={session.user.name || session.user.email || "Placement office"}>
      <StudentsManager departments={departments} />
    </PortalShell>
  );
}

export default function StudentsPage() {
  return <Suspense fallback={<WorkspaceLoading />}><StudentDirectory /></Suspense>;
}