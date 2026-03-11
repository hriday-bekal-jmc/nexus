"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Zap, ArrowRight } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered");
  const authError = searchParams.get("error");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 🛡️ ドメインチェック (クライアントサイド)
    if (!email.toLowerCase().endsWith("@jmc-ltd.co.jp")) {
      setError("アクセス制限: @jmc-ltd.co.jp ドメインのメールアドレスを使用してください。");
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", {
      email, password, redirect: false,
    });

    if (res?.error) {
      setError("認証に失敗しました。メールアドレスとパスワードを確認してください。");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
    else {
  router.push("/");
}
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef2f9] relative overflow-hidden">
      {/* 🔮 背景の光の玉 */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-[100px] animate-pulse delay-700"></div>

      <div className="w-full max-w-md relative z-10 p-4">
        <div className="bg-white/40 backdrop-blur-[40px] border border-white/60 p-10 rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-700">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-6 rotate-3 hover:rotate-12 transition-transform cursor-default">
              <Zap size={32} fill="currentColor" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">NEXUS システム</h2>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">セキュア認証が必要です</p>
          </div>

          {/* 通知メッセージ */}
          {isRegistered && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl text-[11px] font-black mb-6 text-center animate-in slide-in-from-top-2">
              登録が完了しました。システムにアクセスしています...
            </div>
          )}

          {(error || authError) && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl text-[11px] font-black mb-6 text-center animate-in shake duration-500">
              {error || (authError === "AccessDenied" ? "ドメインへのアクセスが制限されています。" : "システムエラーが発生しました。")}
            </div>
          )}

          {/* 🌐 Google SSO Button */}
          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 mb-8 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-sm shadow-sm hover:shadow-md hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Googleでサインイン
          </button>

          <div className="relative flex items-center justify-center mb-8">
             <div className="border-t border-slate-200 w-full opacity-50"></div>
             <span className="bg-[#f0f4f9] px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] absolute">社内プロトコル</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input name="email" type="email" required placeholder="社用メールアドレス" 
                className="w-full bg-white/50 border border-white rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all shadow-inner" 
              />
            </div>
            
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input name="password" type="password" required placeholder="パスワード" 
                className="w-full bg-white/50 border border-white rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all shadow-inner" 
              />
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 mt-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? "認証中..." : "システムへアクセス"} 
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-10 text-center border-t border-white/40 pt-8">
            <p className="text-xs font-bold text-slate-500">
              初めてご利用の方はこちら{" "}
              <Link href="/register" className="text-blue-600 hover:text-indigo-600 ml-1 font-black transition-colors hover:underline">
                新規登録
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#eef2f9]" />}>
      <LoginContent />
    </Suspense>
  );
}