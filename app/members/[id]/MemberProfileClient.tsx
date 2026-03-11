"use client";

import { useState } from "react";
import { Zap, Mail, Building2, Calendar, Folder, CheckCircle, Edit3, Save, X, User } from "lucide-react";
import { updateUserProfile } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const DEPARTMENTS = ["DX事業推進室", "JMC", "企画推進室", "保健情報部", "総務部", "美容決済部"];

export default function MemberProfileClient({ user, isOwnProfile, viewerRole }: any) {
  const router = useRouter();
  const { update } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    department: user.department || "",
  });

  const handleSave = async () => {
    setLoading(true);
    const res = await updateUserProfile(user.id, formData);
    if (res.success) {
      setIsEditing(false);
      await update({ department: formData.department }); // セッションを即時更新
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 🧊 Profile Card */}
      <div className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[50px] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 text-blue-600"><User size={200} /></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-start">
          {/* Left: Avatar & Role */}
          <div className="flex flex-col items-center gap-6 shrink-0">
            <div className="w-40 h-40 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-[45px] flex items-center justify-center text-white text-6xl font-black shadow-2xl shadow-blue-500/30">
              {user.name?.charAt(0) || "?"}
            </div>
            <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${
              user.role === 'CEO' ? 'bg-slate-900 text-amber-400 border-amber-400/30' :
              user.role === 'MANAGER' ? 'bg-indigo-600 text-white border-white/20' : 'bg-white/60 text-slate-500 border-white'
            }`}>
              {user.role === 'CEO' ? '最高経営責任者' : user.role === 'MANAGER' ? 'マネージャー' : '一般メンバー'}
            </span>
          </div>

          {/* Right: Details */}
          <div className="flex-1 space-y-8">
            <div className="flex justify-between items-start">
              <div>
                {isEditing ? (
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="text-5xl font-black bg-white/50 border-b-2 border-blue-500 outline-none w-full italic tracking-tighter" />
                ) : (
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">{user.name}</h1>
                )}
                <div className="flex items-center gap-2 text-slate-500 font-bold mt-4">
                  <Mail size={16} /> <span>{user.email}</span>
                </div>
              </div>
              {isOwnProfile && (
                <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} disabled={loading}
                  className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-xl ${
                    isEditing ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-900 text-white'
                  }`}>
                  {isEditing ? <><Save size={16}/> 保存する</> : <><Edit3 size={16}/> プロフィールを編集</>}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/40">
              {/* Department */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Building2 size={12}/> 所属部門</p>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    {DEPARTMENTS.map(d => (
                      <button key={d} onClick={() => setFormData({...formData, department: d})} 
                        className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${formData.department === d ? 'bg-blue-600 text-white' : 'bg-white/50 text-slate-500'}`}>{d}</button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xl font-black text-blue-600">{user.department || "未設定"}</div>
                )}
              </div>

              {/* Joined Date */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12}/> 入社日</p>
                <div className="text-xl font-black text-slate-800">{new Date(user.joinedAt).toLocaleDateString('ja-JP')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 Logs & Work History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Project History */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-10 rounded-[40px] shadow-lg">
          <h3 className="text-xl font-black text-slate-900 mb-8 italic flex items-center gap-3"><Folder size={24} className="text-blue-500"/> 参加プロジェクト履歴</h3>
          <div className="space-y-4">
            {user.projects.map((p: any) => (
              <div key={p.id} className="p-4 bg-white/60 rounded-2xl border border-white flex justify-between items-center">
                <span className="font-bold text-slate-800">{p.name}</span>
                <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase">参加中</span>
              </div>
            ))}
            {user.projects.length === 0 && (
              <p className="text-xs text-slate-500 font-bold italic">参加したプロジェクトはまだありません。</p>
            )}
          </div>
        </div>

        {/* Recently Secured Tasks */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-10 rounded-[40px] shadow-lg">
          <h3 className="text-xl font-black text-slate-900 mb-8 italic flex items-center gap-3"><CheckCircle size={24} className="text-emerald-500"/> 完了したタスク</h3>
          <div className="space-y-4">
            {user.tasks.map((t: any) => (
              <div key={t.id} className="p-4 bg-white/60 rounded-2xl border border-white flex justify-between items-center group">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 truncate">{t.title}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase">{t.projectName}</p>
                </div>
                <div className="text-right text-emerald-500"><CheckCircle size={18} /></div>
              </div>
            ))}
            {user.tasks.length === 0 && (
              <p className="text-xs text-slate-500 font-bold italic">完了したタスクはまだありません。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}