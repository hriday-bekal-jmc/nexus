import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users, Shield, ArrowRight } from "lucide-react";

export default async function MembersListPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any).role;
  const userDept = (session?.user as any).department;

  // 🏛️ フィルタリングのロジック
  // CEO: 全員 / MANAGER: 自部門のみ / MEMBER: 自部門のみ（または全員の基本情報）
  let whereClause = {};
  if (userRole === "MANAGER") {
    whereClause = { department: userDept };
  } else if (userRole === "MEMBER") {
    whereClause = { department: userDept }; // メンバーも同部門が見えたほうがFun
  }
  // CEOの場合は whereClause = {} で全員取得

  const members = await prisma.user.findMany({
    where: whereClause,
    orderBy: { joinedAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-2">組織情報</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">メンバー一覧</h1>
        </div>
        <div className="px-6 py-2 bg-white/40 border border-white rounded-full text-xs font-black text-slate-500 shadow-sm">
          登録エージェント数: {members.length} 名
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <Link href={`/members/${member.id}`} key={member.id} className="group">
            <div className="bg-white/40 backdrop-blur-xl border border-white/80 p-8 rounded-[40px] hover:shadow-2xl transition-all hover:-translate-y-2 relative overflow-hidden">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-2xl font-black group-hover:rotate-6 transition-transform shadow-lg">
                    {member.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none mb-2">{member.name}</h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{member.department || "未割当"}</p>
                  </div>
               </div>
               <div className="mt-8 flex justify-between items-center text-slate-400">
                  <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Shield size={12} className={member.role === 'CEO' ? 'text-amber-500' : 'text-blue-500'}/> {member.role}
                  </span>
                  <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
               </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}