import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma }  from "@/lib/prisma";
import NippoClient from "./NippoClient";

export default async function NippoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  // 全ての日報を最新順に取得（コメントとユーザー情報も含める）
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      comments: {
        include: { user: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-8 pt-24 font-sans selection:bg-blue-200">
      <NippoClient initialReports={reports} userId={userId} userRole={userRole} />
    </div>
  );
}