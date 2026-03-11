"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateTaskStatusDrag(taskId: string, newStatus: string) {
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus }
    });

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "タスクの更新に失敗しました。" };
  }
}