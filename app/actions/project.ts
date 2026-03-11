"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) return { error: "Name is required" };

  try {
    await prisma.project.create({
      data: {
        name,
        description,
        status: "PLANNING",
        // For now, we'll hardcode a manager ID or leave it My Project 4101Nexus MVP
        // until we link the session, to keep it simple.
      },
    });

    revalidatePath("/"); // Refresh the dashboard data
    return { success: true };
  } catch (e) {
    return { error: "Failed to create project" };
  }
}