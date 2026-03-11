import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import MemberProfileClient from "./MemberProfileClient";

// params を Promise として定義します
export default async function MemberPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 🛡️ 1. params を await して id を取得します
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // 🛡️ 2. 取得した id を使用して検索します
  const user = await prisma.user.findUnique({
    where: { id: id },
    include: {
      projects: { include: { tasks: true } },
      tasks: { 
        where: { status: "DONE" }, 
        orderBy: { updatedAt: 'desc' }, 
        take: 10 
      }
    }
  });

  if (!user) return notFound();

  const isOwnProfile = (session.user as any).id === user.id;
  const viewerRole = (session.user as any).role;

  return (
    <div className="p-8">
      <MemberProfileClient 
        user={JSON.parse(JSON.stringify(user))} 
        isOwnProfile={isOwnProfile} 
        viewerRole={viewerRole} 
      />
    </div>
  );
}