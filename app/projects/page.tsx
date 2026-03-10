export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecentProjects, getAllUsers } from "@/lib/actions";
import ProjectClientContent from "@/components/ProjectClientContent";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) redirect("/");

  // 🚀 Fetch everything on the server. No more "Loading..." spinners!
  const [projectData, users] = await Promise.all([
    getRecentProjects(),
    getAllUsers()
  ]);

 return (
    <ProjectClientContent 
      initialProjects={projectData.projects || []} 
      allUsers={users || []} 
      userRole={session.user.role as string}
      userId={session.user.id as string}
    />
  );
}