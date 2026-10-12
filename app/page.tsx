import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { WorkspaceLoading } from "@/components/workspace-loading";
import { authOptions } from "@/lib/auth";

async function HomeRedirect() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  redirect(session.user.role === "PLACEMENT_INCHARGE" ? "/officer" : "/student");
  return null;
}

export default function Home() {
  return <Suspense fallback={<WorkspaceLoading />}><HomeRedirect /></Suspense>;
}
