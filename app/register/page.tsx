"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/actions";
import { Mail, Lock, User, ShieldCheck, ArrowRight, Building2 } from "lucide-react";

const DEPARTMENTS = [
  "DX事業推進室", "JMC", "企画推進室", 
  "保健情報部", "総務部", "美容決済部"
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [selectedDept, setSelectedDept] = useState("DX事業推進室");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 🛡️ ドメイン制限の強制
    if (!email.toLowerCase().endsWith("@jmc-ltd.co.jp")) {
       setError("アクセス制限: @jmc-ltd.co.jp ドメインのメールアドレスを使用してください。");
       setLoading(false);
       return;
    }

    const formData = new FormData(e.currentTarget);
    formData.append("department", selectedDept);

    const result = await registerUser(formData);

    if (result.success) {
      router.push("/login?registered=true");
    } else {
      setError(result.error || "登録処理中にエラーが発生しました。");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef2f9] relative overflow-hidden py-12">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>

      <div className="w-full max-w-xl relative z-10 p-4">
        <div className="bg-white/40 backdrop-blur-[40px] border border-white/60 p-12 rounded-[50px] shadow-2xl animate-in zoom-in-95 duration-700">
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl mb-5">
              <ShieldCheck size={28} className="text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">新規ユーザー登録</h2>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">JMC 社員専用ネットワーク</p>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl text-xs font-black mb-8 text-center animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dept Selection Grid */}
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 ml-1">
                 <Building2 size={12} className="text-blue-500"/> 所属部門を選択してください
               </label>
               <div className="grid grid-cols-2 gap-2">
                  {DEPARTMENTS.map((dept) => (
                    <button 
                      key={dept} 
                      type="button"
                      onClick={() => setSelectedDept(dept)}
                      className={`px-4 py-3 rounded-xl text-[11px] font-black transition-all border ${
                        selectedDept === dept 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.02]' 
                        : 'bg-white/40 text-slate-600 border-white hover:bg-white hover:shadow-md'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
               </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/40">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input name="name" type="text" required placeholder="氏名 (例: 日本 太郎)" 
                  className="w-full bg-white/50 border border-white rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-slate-400 transition-all shadow-inner" 
                />
              </div>

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input name="email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="name@jmc-ltd.co.jp" 
                  className="w-full bg-white/50 border border-white rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-slate-400 transition-all shadow-inner" 
                />
              </div>
              
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input name="password" type="password" required placeholder="パスワード" 
                  className="w-full bg-white/50 border border-white rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-slate-400 transition-all shadow-inner" 
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-5 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[24px] font-black shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? "登録処理中..." : "アカウントを作成する"} 
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-white/40 pt-6">
            <p className="text-xs font-bold text-slate-500">
              すでにアカウントをお持ちの方はこちら{" "}
              <Link href="/login" className="text-slate-900 hover:text-blue-600 ml-1 font-black transition-colors hover:underline">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}