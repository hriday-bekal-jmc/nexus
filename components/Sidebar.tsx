"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Folder, CheckSquare, BarChart2, Users, LogOut, Zap, Flame 
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "ダッシュボード", icon: <LayoutDashboard size={22} />, color: "text-cyan-400", glow: "shadow-cyan-500/40", href: "/" },
    { name: "プロジェクト", icon: <Folder size={22} />, color: "text-indigo-400", glow: "shadow-indigo-500/40", href: "/projects" },
    { name: "タスク管理", icon: <CheckSquare size={22} />, color: "text-emerald-400", glow: "shadow-emerald-500/40", href: "/tasks" },
    { name: "業務報告・分析", icon: <BarChart2 size={22} />, color: "text-amber-400", glow: "shadow-amber-500/40", href: "/nippo" },
    { name: "メンバー一覧", icon: <Users size={22} />, color: "text-rose-400", glow: "shadow-rose-500/40", href: "/members" },
  ];

  return (
    <aside className="w-64 bg-slate-950/90 backdrop-blur-3xl border-r border-white/5 flex flex-col p-6 z-20 h-screen sticky top-0 shrink-0">
      {/* ⚡ LOGO: 動的な輝きを追加 */}
      <div className="flex items-center gap-4 mb-14 px-2 group cursor-default">
        <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl flex items-center justify-center text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] group-hover:rotate-12 transition-transform duration-500">
          <Zap size={24} fill="currentColor" className="animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tighter text-white leading-none">NEXUS</span>
          <span className="text-[10px] font-black text-cyan-400 tracking-[0.3em]">コア・システム</span>
        </div>
      </div>
      
      <nav className="flex-1 space-y-3">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 group relative ${
                isActive 
                  ? `bg-white/10 text-white shadow-xl border-l-4 border-blue-500` 
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className={`transition-all duration-300 transform ${isActive ? `${item.color} scale-110` : 'group-hover:scale-125 group-hover:rotate-6'}`}>
                {item.icon}
              </div>
              <span className={`text-sm tracking-wide ${isActive ? 'font-black' : 'font-bold'}`}>{item.name}</span>
              
              {/* ホバー時の輝き */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none`} />
            </Link>
          );
        })}
      </nav>

      {/* 🔴 LOGOUT: 直感的なデザイン */}
      <div className="pt-6 mt-auto border-t border-white/10">
        <button 
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-sm text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-300"
        >
          <LogOut size={20} /> ログアウト
        </button>
      </div>
    </aside>
  );
}