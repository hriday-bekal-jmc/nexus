export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardStats, getRecentProjects } from "@/lib/actions";
import DashboardClient from "@/components/DashboardClient";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/api/auth/signin");

  // 🚀 FETCH DATA ON SERVER - No more loading loops!
  const [stats, projectData] = await Promise.all([
    getDashboardStats(),
    getRecentProjects()
  ]);

  return (
    <DashboardClient 
      userName={session.user.name} 
      userId={session.user.id}
      userRole={(session.user as any).role} 
      stats={stats} 
      projects={projectData.projects} 
    />
  );
}