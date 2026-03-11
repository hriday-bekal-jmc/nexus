export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TasksClient from "./TasksClient";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;

  // 関連するプロジェクトを取得
  const projects = await prisma.project.findMany({
    where: userRole === "MANAGER" ? {} : { members: { some: { id: userId } } },
    include: {
      tasks: {
        include: {
          assignee: true,
          project: true,
        },
        orderBy: { updatedAt: 'desc' }
      }
    }
  });

  // すべてのタスクをフラットな配列にする
  const allTasks = projects.flatMap(p => p.tasks);

  // 🔒 権限によるフィルタリング
  // マネージャー：全タスク / メンバー：自分のタスクのみ
  const filteredTasks = userRole === "MANAGER" 
    ? allTasks 
    : allTasks.filter(t => t.assigneeId === userId);

  return (
    <div className="p-8">
      <TasksClient 
        initialTasks={filteredTasks} 
        userId={userId} 
        userRole={userRole} 
      />
    </div>
  );
}