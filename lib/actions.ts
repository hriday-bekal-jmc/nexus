"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

// 日付の空文字エラーを防ぐ安全装置
const safeDate = (dateStr: any) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

// 🚀 1. CREATE PROJECT
export async function createProject(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    
    // 🚨 セッションやIDがない場合は明確なエラーを返す
    if (!session || !(session.user as any).id) {
      return { error: "User ID is missing. Please sign out and sign in again." };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const drive_url = formData.get("drive_url") as string;
    const memberIds = JSON.parse(formData.get("memberIds") as string || "[]");
    const tasks = JSON.parse(formData.get("tasks") as string || "[]");

    await prisma.project.create({
      data: {
        name,
        description,
        drive_url,
        managerId: (session.user as any).id,
        members: {
          connect: memberIds.map((id: string) => ({ id }))
        },
        tasks: {
          create: tasks.map((t: any) => {
            const taskData: any = {
              title: t.title,
              description: t.description,
              priority: t.priority || "MEDIUM",
              status: "TODO",
              startDate: safeDate(t.startDate),
              dueDate: safeDate(t.dueDate),
            };

            // 🌟 修正ポイント: Prismaの入れ子作成ルールに従い、connectを使ってユーザーを紐付ける
            if (t.assigneeId) {
              taskData.assignee = { connect: { id: t.assigneeId } };
            }

            return taskData;
          })
        }
      }
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Create Project Error:", error);
    return { error: error.message || "Database error occurred." };
  }
}

// 🚀 2. UPDATE PROJECT
export async function updateProject(formData: FormData) {
  try {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const drive_url = formData.get("drive_url") as string;
    const memberIds = JSON.parse(formData.get("memberIds") as string || "[]");
    const tasks = JSON.parse(formData.get("tasks") as string || "[]");

    await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        drive_url,
        members: {
          set: memberIds.map((uid: string) => ({ id: uid }))
        }
      }
    });

    for (const t of tasks) {
      if (t.id) {
         // タスク単独の更新時は assigneeId がそのまま使える
         await prisma.task.update({
            where: { id: t.id },
            data: {
               title: t.title, 
               description: t.description, 
               priority: t.priority,
               assigneeId: t.assigneeId || null, 
               startDate: safeDate(t.startDate),
               dueDate: safeDate(t.dueDate),
            }
         });
      } else {
         // タスク単独の作成時も assigneeId がそのまま使える
         await prisma.task.create({
            data: {
               projectId: id,
               title: t.title, 
               description: t.description, 
               priority: t.priority,
               assigneeId: t.assigneeId || null,
               startDate: safeDate(t.startDate),
               dueDate: safeDate(t.dueDate),
            }
         });
      }
    }
    
    const currentTaskIds = tasks.filter((t:any) => t.id).map((t:any) => t.id);
    await prisma.task.deleteMany({
      where: {
         projectId: id,
         id: { notIn: currentTaskIds }
      }
    });

    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Update Project Error:", error);
    return { error: error.message || "Database update failed." };
  }
}

// 🚀 2.5 UPDATE TASK TIME ()
// 🚀 タスクの経過時間を保存する
export async function updateTaskTime(taskId: string, additionalSeconds: number) {
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        timeElapsed: {
          increment: additionalSeconds // 既存の時間に加算
        }
      }
    });
    return { success: true };
  } catch (error) {
    return { error: "Failed to save time" };
  }
}

// 📊 3. FETCH DASHBOARD STATS
export async function getDashboardStats() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const whereClause = userRole === "MANAGER" ? {} : { members: { some: { id: userId } } };

    const projectCount = await prisma.project.count({ where: whereClause });
    const taskStats = {
      todo: await prisma.task.count({ where: { ...whereClause, status: "TODO" } }),
      inProgress: await prisma.task.count({ where: { ...whereClause, status: "IN_PROGRESS" } }),
      blocked: await prisma.task.count({ where: { ...whereClause, status: "BLOCKED" } }),
      done: await prisma.task.count({ where: { ...whereClause, status: "DONE" } }),
    };
    return { projectCount, taskStats };
  } catch (error) {
    return { projectCount: 0, taskStats: { todo: 0, inProgress: 0, blocked: 0, done: 0 } };
  }
}

// 📂 4. FETCH RECENT PROJECTS
export async function getRecentProjects() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { projects: [] };
    
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const whereClause = userRole === "MANAGER" ? {} : { members: { some: { id: userId } } };

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        members: true,
        tasks: {
           include: { 
             assignee: true,
             comments: { include: { user: true }, orderBy: { createdAt: 'asc' } }, // 👈 追加
             reactions: { include: { user: true } } // 👈 追加
           },
           orderBy: { createdAt: 'asc' }
        },
      }
    });
    return { projects };
  } catch (error) {
    return { projects: [] };
  }
}

// ==========================================
// 👇 Comments and reactions
// ==========================================

export async function addTaskComment(taskId: string, text: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    await prisma.taskComment.create({
      data: { text, taskId, userId: (session.user as any).id }
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Failed to add comment" };
  }
}

export async function toggleTaskReaction(taskId: string, emoji: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    const userId = (session.user as any).id;

    const existing = await prisma.taskReaction.findUnique({
      where: { taskId_userId_emoji: { taskId, userId, emoji } }
    });

    if (existing) {
      await prisma.taskReaction.delete({ where: { id: existing.id } }); // すでにあれば外す
    } else {
      await prisma.taskReaction.create({ data: { taskId, userId, emoji } }); // なければ付ける
    }
    
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Failed to toggle reaction" };
  }
}

// ✅ 5. TOGGLE TASK STATUS
export async function toggleTaskStatus(taskId: string, currentStatus: string) {
  try {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus }
    });
    revalidatePath("/");
    revalidatePath("/projects");
    return { success: true, newStatus };
  } catch (error) {
    return { error: "Failed to update task." };
  }
}

// 🗑️ 6. DELETE PROJECT
export async function deleteProject(projectId: string) {
  try {
    await prisma.project.delete({ where: { id: projectId } });
    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { error: "Delete failed" };
  }
}

// 👥 7. FETCH USERS
export async function getAllUsers() {
  try {
    return await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });
  } catch (error) {
    return [];
  }
}

// 🤖 8. AI GENERATE TASKS
export async function generateTasksFromAI(notes: string) {
  await new Promise(resolve => setTimeout(resolve, 1500)); 
  return [
    { title: "Review Meeting Notes", description: notes.slice(0, 100) + "...", priority: "HIGH" },
    { title: "Draft Strategy Document", description: "Create the initial strategy based on the discussion", priority: "MEDIUM" },
    { title: "Schedule Follow-up Sync", description: "Setup a meeting to review progress next week", priority: "LOW" }
  ];
}

export async function registerUser(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { name, email, password_hash: hashedPassword, role: "MEMBER" }});
    return { success: true };
  } catch (error) { return { error: "Registration failed." }; }
}


//updating the user profile (name, department, image)
export async function updateUserProfile(userId: string, data: { name?: string, department?: string, image?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).id !== userId) return { error: "Unauthorized" };

    await prisma.user.update({
      where: { id: userId },
      data: { ...data }
    });

    revalidatePath(`/members/${userId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update profile" };
  }
}