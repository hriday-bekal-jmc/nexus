"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Folder, CheckSquare, BarChart2, Users, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export default function Sidebar() {
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();

  const menuItems = [
    { name: "ダッシュボード", icon: <LayoutDashboard size={20} />, href: "/" },
    { name: "プロジェクト", icon: <Folder size={20} />, href: "/projects" },
    { name: "タスク", icon: <CheckSquare size={20} />, href: "/tasks" },
    { name: "レポート", icon: <BarChart2 size={20} />, href: "/nippo" },
    { name: "メンバー", icon: <Users size={20} />, href: "/members" },
  ];

  return (
    <aside className="w-64 bg-white/50 backdrop-blur-2xl border-r border-white/40 flex flex-col p-6 z-20 h-screen sticky top-0 shrink-0">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30">N</div>
        <span className="text-2xl font-black tracking-tighter text-slate-800">Nexus</span>
      </div>
      
      {/* flex-1 pushes the logout button to the bottom */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-500 hover:bg-white/60'
              }`}
            >
              {item.icon} <span className="font-bold text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* 🔴 RESTORED LOGOUT BUTTON */}
      <div className="pt-4 mt-auto border-t border-white/60">
        <button 
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-red-400 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <LogOut size={20} /> ログアウト
        </button>
      </div>
    </aside>
  );
}