"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkProjectCompletion } from "@/lib/actions";

export async function updateTaskStatusDrag(taskId: string, status: string) {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status }
    });

    let projectCompletedName = null;
    // もしタスクが「完了」になり、プロジェクトに属しているなら、プロジェクト全体が完了したかチェック
    if (status === "DONE" && task.projectId) {
      projectCompletedName = await checkProjectCompletion(task.projectId);
    }

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true, projectCompleted: !!projectCompletedName, projectName: projectCompletedName };
  } catch (error) {
    return { error: "Failed to update task status" };
  }
}