import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardStats, getRecentProjects } from "@/lib/actions";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  // 🚨 古い /api/auth/signin ではなく、直接 /login に飛ばす
  if (!session) redirect("/login");

  const stats = await getDashboardStats();
  const projectData = await getRecentProjects();

  return (
    <DashboardClient 
      userName={session.user.name} 
      userId={(session.user as any).id}
      userRole={(session.user as any).role} 
      stats={stats} 
      projects={projectData.projects} 
    />
  );
}