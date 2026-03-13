import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import { Search } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexus MVP",
  description: "次世代プロジェクト管理システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-[#eef2f9]`}>
        <AuthProvider>
          <div className="flex h-screen overflow-hidden">
            
            <Sidebar />

            <main className="flex-1 flex flex-col overflow-y-auto">
              
              {/* 🌟 修正: z-10 を z-50 に変更し、通知メニューが手前に来るようにしました */}
              <header className="h-16 flex items-center justify-between px-8 py-4 sticky top-0 z-50 bg-[#eef2f9]/80 backdrop-blur-md">
                <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-xl flex items-center px-4 w-96 h-10 shadow-sm">
                  <Search size={18} className="text-slate-400 mr-2" />
                  <input type="text" placeholder="検索..." className="bg-transparent border-none outline-none text-sm w-full" />
                </div>
                
                <div className="flex items-center gap-4">
                  {/* 🔔 通知ベルコンポーネント */}
                  <NotificationBell />
                  
                  <div className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-200 cursor-pointer">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Hriday" alt="avatar" />
                  </div>
                </div>
              </header>
              
              <div className="p-8">
                {children}
              </div>
              
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}