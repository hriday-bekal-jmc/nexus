"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    // 🌟 修正ポイント: 削除処理（deleteMany）を「新規作成」よりも先に実行する
    // 現在画面に残っているタスクのIDだけを抽出
    const currentTaskIds = tasks.filter((t:any) => t.id).map((t:any) => t.id);
    await prisma.task.deleteMany({
      where: {
         projectId: id,
         id: { notIn: currentTaskIds } // 画面にないタスクをデータベースから削除
      }
    });

    // その後に更新と新規作成を行う
    for (const t of tasks) {
      if (t.id) {
         // 既存タスクの更新
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
         // 新規タスクの作成
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
// 👇 Comments and reactions (🔔 通知機能を追加して上書き)
// ==========================================

export async function addTaskComment(taskId: string, text: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    const userId = (session.user as any).id;
    const userName = session.user?.name || "メンバー";

    const task = await prisma.task.findUnique({ where: { id: taskId } });

    await prisma.taskComment.create({
      data: { text, taskId, userId }
    });

    // 🔔 タスクの担当者が自分以外なら通知を送る
    if (task && task.assigneeId && task.assigneeId !== userId) {
      await createNotification(
        task.assigneeId, 
        "COMMENT", 
        "💬 タスクにコメントがありました", 
        `${userName}さんが「${task.title}」にコメントしました: ${text}`, 
        "/tasks"
      );
    }

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
    const userName = session.user?.name || "メンバー";

    const existing = await prisma.taskReaction.findUnique({
      where: { taskId_userId_emoji: { taskId, userId, emoji } }
    });

    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (existing) {
      await prisma.taskReaction.delete({ where: { id: existing.id } }); 
    } else {
      await prisma.taskReaction.create({ data: { taskId, userId, emoji } }); 
      // 🔔 リアクションがついたら通知
      if (task && task.assigneeId && task.assigneeId !== userId) {
        await createNotification(task.assigneeId, "REACTION", "👍 リアクション", `${userName}さんが「${task.title}」に ${emoji} をリアクションしました`, "/tasks");
      }
    }
    
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Failed to toggle reaction" };
  }
}

export async function toggleCommentReaction(commentId: string, emoji: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    const userId = (session.user as any).id;
    const userName = session.user?.name || "メンバー";

    const existing = await prisma.taskCommentReaction.findUnique({
      where: { commentId_userId_emoji: { commentId, userId, emoji } }
    });

    const comment = await prisma.taskComment.findUnique({ where: { id: commentId }, include: { task: true } });

    if (existing) {
      await prisma.taskCommentReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.taskCommentReaction.create({ data: { commentId, userId, emoji } });
      // 🔔 コメント主に通知
      if (comment && comment.userId !== userId) {
        await createNotification(comment.userId, "REACTION", "👍 コメントへの反応", `${userName}さんがあなたのコメントに ${emoji} をリアクションしました`, "/tasks");
      }
    }
    
    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "リアクションの更新に失敗しました" };
  }
}

// 🤖 22. GENERATE PERSONAL FOCUS PLAN (AIによるパーソナルプラン作成)
export async function generatePersonalFocusPlan(tasksData: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "APIキーが設定されていません。";

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      あなたは優秀なパーソナルアシスタントです。以下のユーザーの担当タスク一覧をもとに、
      「今日フォーカスすべきこと」と「簡単なモチベーションメッセージ」を組み合わせて、
      3〜4行の短いマークダウンテキスト（リスト形式など）でアドバイスを作成してください。
      
      タスクデータ: ${tasksData}
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Plan Error:", error);
    return "AIプランの生成に失敗しました。";
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
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return [{ title: "APIキーが.envに設定されていません", priority: "HIGH" }];
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 💡 修正1: getModel ではなく getGenerativeModel が正しいメソッド名です
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite",
      // 💡 修正2: JSONモードを強制（余計なテキストやマークダウンを含めない）
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      あなたは優秀なプロジェクトマネージャーです。以下のテキストからタスクを抽出してください。
      出力は必ず以下のJSON配列スキーマに厳密に従ってください。

      [
        {
          "title": "タスクの簡潔なタイトル（日本語）",
          "priority": "HIGH" または "MEDIUM" または "LOW"
        }
      ]

      テキスト: "${notes}"
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // JSONモードのおかげで、そのままパース可能です
    const tasks = JSON.parse(text);
    return tasks;

  } catch (error) {
    // 🚨 ターミナルに詳細なエラー理由を出力します
    console.error("🚨 AI Generation Error:", error);
    return [{ title: "AIによるタスク生成に失敗しました", priority: "HIGH" }];
  }
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

//generate AI summary in the dashboard
export async function generateDashboardInsights(tasksData: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return [];

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using the same reliable 2.5 flash model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

const prompt = `
      あなたは優秀で鋭いプロジェクトマネージャーです。
      提供されるJSONデータには「現在の日付(currentDate)」と「チームの未完了タスク一覧(activeTasks)」が含まれています。
      これを分析し、マネージャー向けに各メンバーの状況を要約したインサイトを生成してください。

      【分析の重要ポイント】
      1. 期限超過: currentDate と dueDate を比較し、期限を過ぎているタスクがあれば厳しく警告してください。
      2. 業務負荷: タスクの件数や優先度（HIGH）から、メンバーの業務負荷（多すぎるか等）を推測してください。
      3. ブロック状態: statusが「BLOCKED」のタスクがあれば、早急なフォローを促してください。
      4. 事実のみを語る: 提供されたデータのみに基づいて分析し、嘘や適当なポジティブ発言はしないでください。

      出力は必ず以下のJSON配列形式にしてください。メンバーごとに1つのオブジェクトにまとめ、チーム全体で最大5件程度出力してください。

      [
        {
          "user": "担当者名",
          "summary": "分析に基づいた具体的な状況要約（例: 「優先度高のタスクを3件抱えており高負荷です」「〇〇の期限が昨日で超過しています。フォローが必要です。」）",
          "status": "ブロック", "遅延", "順調", "要確認" のいずれか
        }
      ]

      提供データ: ${tasksData}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Dashboard AI Error:", error);
    return [];
  }
}

// 🤖 9. AI SUBTASK GENERATION (DBには保存せずテキストを返すだけ)
export async function generateSubtasks(title: string, currentDescription: string | null) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: "API key is missing" };

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      あなたは優秀なプロジェクトマネージャーです。
      以下のタスクを達成するための、具体的なサブタスク（アクションプラン）を3〜5個提案してください。
      出力はシンプルにマークダウンのチェックリスト形式（- [ ] サブタスク名）のみを出力してください。挨拶や解説は一切不要です。

      タスク名: ${title}
      現在の詳細: ${currentDescription || "なし"}
    `;

    const result = await model.generateContent(prompt);
    const generatedList = result.response.text();
    
    // 生成されたテキストをフロントエンドに返すだけ
    return { success: true, text: generatedList };
  } catch (error) {
    console.error("AI Subtask Error:", error);
    return { error: "サブタスクの生成に失敗しました。" };
  }
}

// 📝 10. タスクの詳細(description)を保存するアクション
export async function updateTaskDescription(taskId: string, description: string) {
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { description }
    });
    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "詳細の保存に失敗しました。" };
  }
}

// 🚨 11. BLOCKER REPORTING (AIオプション化 ＋ 🔔Google Chat通知)
export async function reportBlocker(taskId: string, title: string, reason: string, askAI: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    const userId = (session.user as any).id;

    let aiAdvice = "";

    // 🌟 AIの助けを求めた場合(askAI === true)のみGeminiを呼び出す
    if (askAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
          あなたはシニアエンジニアであり、優しいプロジェクトマネージャーです。
          チームメンバーが以下のタスクで障害（ブロック）に直面しています。
          タスク名: ${title}
          ブロックの理由: ${reason}
          このメンバーに対して、解決のための具体的なヒントを3つ程度簡潔にアドバイスしてください。
        `;
        const result = await model.generateContent(prompt);
        aiAdvice = result.response.text();
      }
    }

    // 1. タスクのステータスをBLOCKEDに更新
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "BLOCKED" }
    });

    // 2. メンバーの「ブロック理由」をコメントとして記録
    await prisma.taskComment.create({
      data: { taskId, userId, text: `🚨 【障害報告】\n${reason}` }
    });

    // 3. AIからの「アドバイス」がある場合のみシステムコメントとして記録
    if (askAI && aiAdvice) {
      await prisma.taskComment.create({
        data: { taskId, userId, text: `🤖 【AI アシスト】\n${aiAdvice}` }
      });
    }

    // 4. Google Chat への Webhook 通知送信 (必ず送信されます)
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.startsWith("http")) {
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      const userName = currentUser?.name || "メンバー";

      // AIアドバイスがあれば通知にも追記、なければ理由だけ
      const aiText = (askAI && aiAdvice) ? `\n\n*🤖 AIの初期アドバイス:*\n${aiAdvice}` : "";
      
      const chatMessage = {
        text: `*🚨 タスクがブロックされました！*\n\n*🙋 担当者:* ${userName}\n*📝 タスク:* ${title}\n*⚠️ 理由:* ${reason}${aiText}\n\n<${process.env.NEXTAUTH_URL}/tasks|👉 Nexusシステムで確認する>`
      };

      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chatMessage),
        });
      } catch (webhookError) {
        console.error("Webhook Error:", webhookError);
      }
    }

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Blocker Error:", error);
    return { error: "ブロック報告に失敗しました。" };
  }
}

// 🗑️ 12. DELETE TASK COMMENT (コメントの削除 - マネージャー特権追加)
export async function deleteTaskComment(commentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role; // 🌟 ユーザーの権限を取得

    // 削除しようとしているコメントを取得
    const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!comment) return { error: "コメントが見つかりません" };

    // 🌟 「自分のコメント」または「マネージャー」である場合のみ削除を許可
    if (comment.userId !== userId && userRole !== "MANAGER") {
      return { error: "他の人のコメントを削除する権限がありません" };
    }

    await prisma.taskComment.delete({ where: { id: commentId } });
    
    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Delete Comment Error:", error);
    return { error: "コメントの削除に失敗しました。" };
  }
}

// // 👍 13. TOGGLE COMMENT REACTION (個別のコメントへのリアクション)
// export async function toggleCommentReaction(commentId: string, emoji: string) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session) return { error: "Unauthorized" };
//     const userId = (session.user as any).id;

//     const existing = await prisma.taskCommentReaction.findUnique({
//       where: { commentId_userId_emoji: { commentId, userId, emoji } }
//     });

//     if (existing) {
//       await prisma.taskCommentReaction.delete({ where: { id: existing.id } });
//     } else {
//       await prisma.taskCommentReaction.create({ data: { commentId, userId, emoji } });
//     }
    
//     revalidatePath("/tasks");
//     revalidatePath("/");
//     return { success: true };
//   } catch (error) {
//     return { error: "リアクションの更新に失敗しました" };
//   }
// }

// 📝 14. GENERATE DAILY REPORT DRAFT (賢いAIによる日報自動生成)
export async function generateDailyReportDraft() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    const userId = (session.user as any).id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 🌟 改善1: 今日更新・完了したタスク（今日の実績用）
    const recentTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        updatedAt: { gte: todayStart }
      }
    });

    // 🌟 改善2: まだ終わっていない残りのタスクを「期限順・優先度順」で取得（明日の予定用）
    const pendingTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { not: "DONE" }
      },
      orderBy: [
        { dueDate: 'asc' },  // 期限が近い順
        { priority: 'desc' } // 優先度が高い順
      ]
    });

    if (recentTasks.length === 0 && pendingTasks.length === 0) {
      return { text: "タスクが見つかりませんでした。手動で入力してください。" };
    }

    const achievedList = recentTasks.map(t => `- ${t.title} (${t.status})`).join("\n") || "今日の更新タスクなし";
    const pendingList = pendingTasks.map(t => `- ${t.title} (優先度: ${t.priority}${t.dueDate ? `, 期限: ${new Date(t.dueDate).toLocaleDateString('ja-JP')}` : ''})`).join("\n") || "残タスクなし";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: "API Key is missing" };

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 🌟 改善3: AIに「残りのタスク」を渡し、明日の予定をそこから選ばせる
    const prompt = `
      あなたは優秀なアシスタントです。ユーザーの実際のタスク状況をもとに、日報の叩き台を作成してください。
      
      【今日更新・完了したタスク】
      ${achievedList}
      
      【現在残っているタスク（優先度・期限順）】
      ${pendingList}
      
      ルール：
      1. "achieved_tasks"（今日の実績）は、【今日更新・完了したタスク】をもとに箇条書きでまとめてください。
      2. "tomorrow_plan"（明日の予定）は、【現在残っているタスク】の中から、期限が近いものや優先度が高いものを最大3〜4つピックアップして箇条書きで作成してください。（もし残タスクがなければ、適宜提案してください）
      3. 以下のJSONフォーマットで返してください（挨拶やマークダウン修飾子は不要）:
      {
        "achieved_tasks": "今日の実績のテキスト",
        "tomorrow_plan": "明日の予定のテキスト"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, "").trim();
    const draft = JSON.parse(responseText);

    return { success: true, draft };
  } catch (error) {
    console.error("AI Draft Error:", error);
    return { error: "AIドラフトの生成に失敗しました。" };
  }
}

// 💾 15. SUBMIT DAILY REPORT (日報の保存)
export async function submitDailyReport(achievedTasks: string, tomorrowPlan: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    const userId = (session.user as any).id;

    await prisma.report.create({
      data: {
        achieved_tasks: achievedTasks,
        tomorrow_plan: tomorrowPlan,
        userId: userId
      }
    });
    
    revalidatePath("/nippo");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "日報の送信に失敗しました" };
  }
}

// 💬 16. ADD REPORT COMMENT (日報へのコメント)
export async function addReportComment(reportId: string, content: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    const userId = (session.user as any).id;

    await prisma.comment.create({
      data: { content, reportId, userId }
    });
    
    revalidatePath("/nippo");
    return { success: true };
  } catch (error) {
    return { error: "コメントの送信に失敗しました" };
  }
}

// ✅ 17. UPDATE REPORT STATUS (日報の承認・修正要求)
export async function updateReportStatus(reportId: string, status: "APPROVED" | "REVISION") {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    
    const userRole = (session.user as any).role;
    if (userRole !== "MANAGER") return { error: "この操作はマネージャーのみ可能です" };

    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status },
      include: { user: true } // 提出者の情報を取得
    });
    
    // 🔔 通知を発行！
    const title = status === "APPROVED" ? "✅ 日報が承認されました" : "🚨 日報に修正依頼があります";
    const message = status === "APPROVED" 
      ? "お疲れ様です！今日の日報がマネージャーによって承認されました。" 
      : "マネージャーから日報の差し戻しがありました。確認して再提出してください。";
      
    await createNotification(report.userId, "REPORT_STATUS", title, message, "/nippo");

    revalidatePath("/nippo");
    return { success: true };
  } catch (error) {
    return { error: "ステータスの更新に失敗しました" };
  }
}

// ✏️ 18. EDIT DAILY REPORT (日報の編集・再提出)
export async function editDailyReport(reportId: string, achievedTasks: string, tomorrowPlan: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };
    const userId = (session.user as any).id;

    // 権限チェック（自分のレポートか確認）
    const existing = await prisma.report.findUnique({ where: { id: reportId } });
    if (!existing || existing.userId !== userId) {
      return { error: "編集権限がありません" };
    }

    // 更新して、ステータスを「確認待ち(PENDING)」に戻す
    await prisma.report.update({
      where: { id: reportId },
      data: {
        achieved_tasks: achievedTasks,
        tomorrow_plan: tomorrowPlan,
        status: "PENDING", 
      }
    });

    revalidatePath("/nippo");
    return { success: true };
  } catch (error) {
    return { error: "日報の更新に失敗しました" };
  }
}

// ==========================================
// 🔔 通知システム (Notifications)
// ==========================================

// 🔔 19. FETCH NOTIFICATIONS (通知一覧の取得)
export async function getNotifications() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return [];
    const userId = (session.user as any).id;

    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20 // 最新20件を取得
    });
  } catch (error) {
    console.error("Fetch Notifications Error:", error);
    return [];
  }
}

// 🔔 20. MARK NOTIFICATION AS READ (通知を既読にする)
export async function markNotificationAsRead(id: string) {
  try {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    return { error: "Failed to mark as read" };
  }
}

// 🔔 21. CREATE NOTIFICATION (システム内部から通知を発行する用)
export async function createNotification(userId: string, type: string, title: string, message: string, link?: string) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, message, link }
    });
  } catch(e) {
    console.error("Create Notification Error:", e);
  }
}


// 🌟 23. AUTO COMPLETE TASK (サブタスク全完了時にタスクをDONEにする)
// 残しておく正しいコード
export async function autoCompleteTask(taskId: string) {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: "DONE" }
    });
    
    // プロジェクトが完了したかチェック
    const completedProjectName = task.projectId ? await checkProjectCompletion(task.projectId) : null;

    revalidatePath("/");
    revalidatePath("/tasks");
    return { success: true, projectCompleted: !!completedProjectName, projectName: completedProjectName };
  } catch (error) {
    return { error: "自動完了に失敗しました" };
  }
}

// ==========================================
// 🏆 プロジェクト達成 ＆ 承認システム
// ==========================================

// 🌟 プロジェクトが完了したかチェックし、完了ならステータスを変えて通知を送る関数
export async function checkProjectCompletion(projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: true, members: true }
    });
    if (!project || project.status !== "ACTIVE") return null;

    const allTasks = project.tasks;
    // 全てのタスクがDONEになっているかチェック
    const allDone = allTasks.length > 0 && allTasks.every(t => t.status === "DONE");

    if (allDone) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "PENDING_APPROVAL" } // 承認待ちに変更
      });

      // ① チームメンバー全員にド派手な通知を送る！
      for (const member of project.members) {
        await createNotification(
          member.id, "PROJECT_COMPLETED", "🏆 プロジェクト達成！",
          `おめでとうございます！「${project.name}」の全タスクが完了し、マネージャーの承認待ちになりました。`, "/"
        );
      }

      // ② 🌟 NEW: マネージャー全員にも「承認依頼」の通知を送る！
      const managers = await prisma.user.findMany({ where: { role: "MANAGER" } });
      for (const manager of managers) {
        // 重複して通知がいかないようにする
        if (!project.members.find(m => m.id === manager.id)) {
          await createNotification(
            manager.id, "PROJECT_COMPLETED", "🔔 プロジェクト承認待ち",
            `「${project.name}」の全タスクが完了しました。ダッシュボードから確認し、アーカイブしてください。`, "/"
          );
        }
      }

      return project.name;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// 🌟 マネージャーがプロジェクトを承認してアーカイブする関数
export async function approveAndArchiveProject(projectId: string) {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "ARCHIVED" }
    });
    revalidatePath("/");
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    return { error: "承認に失敗しました" };
  }
}

// 🌟 プロジェクトをアーカイブから復元（ACTIVEに戻す）関数
export async function unarchiveProject(projectId: string) {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "ACTIVE" }
    });
    revalidatePath("/");
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    return { error: "プロジェクトの復元に失敗しました" };
  }
}