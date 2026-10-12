import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DriveDetail } from "@/components/drive-detail";
import { PortalShell } from "@/components/portal-shell";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function DriveDetailContent({ params }: { params: Promise<{ driveId: string }> }) {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PLACEMENT_INCHARGE") redirect("/student");
  const { driveId } = await params;
  const departments = await prisma.department.findMany({ select: { id: true, code: true } });
  return <PortalShell role="PLACEMENT_INCHARGE" name={session.user.name || session.user.email || "Placement office"}><DriveDetail driveId={driveId} departments={departments} /></PortalShell>;
}

export default function DriveDetailPage({ params }: { params: Promise<{ driveId: string }> }) {
  return <Suspense fallback={<WorkspaceLoading />}><DriveDetailContent params={params} /></Suspense>;
}