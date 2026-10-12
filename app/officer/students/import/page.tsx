import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { PortalShell } from "@/components/portal-shell";
import { StudentImportFlow } from "@/components/student-import-flow";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { authOptions } from "@/lib/auth";

async function StudentImportPageContent() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PLACEMENT_INCHARGE") redirect("/student");

  return (
    <PortalShell role="PLACEMENT_INCHARGE" name={session.user.name || session.user.email || "Placement office"}>
      <StudentImportFlow />
    </PortalShell>
  );
}

export default function StudentImportPage() {
  return <Suspense fallback={<WorkspaceLoading />}><StudentImportPageContent /></Suspense>;
}