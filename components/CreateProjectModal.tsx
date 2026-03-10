"use client";

import { useState, useEffect } from "react";
import { X, Plus, Sparkles, Link as LinkIcon, Trash2, CheckCircle2 } from "lucide-react";
import { createProject, updateProject } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function CreateProjectModal({ isOpen, onClose, allUsers, editProject }: any) {
  const router = useRouter();
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  
  const [useAI, setUseAI] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // ⏳ ラグ対策のローディング状態

  // モーダルが開くたびに初期値をセット
  useEffect(() => {
    if (isOpen) {
      setSelectedMemberIds(editProject?.members?.map((m:any) => m.id) || []);
      setTasks(editProject?.tasks || []);
      setNewTaskTitle("");
      setUseAI(false);
      setIsSubmitting(false);
    }
  }, [isOpen, editProject]);

  if (!isOpen) return null;

  const handleAIIdentify = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setTasks(prev => [
        ...prev,
        { title: "Review Initial Intel", priority: "HIGH" },
        { title: "Define Core Database Schema", priority: "MEDIUM" }
      ]);
      setIsGenerating(false);
      setUseAI(false);
    }, 1500);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    setTasks([...tasks, { title: newTaskTitle, priority: "MEDIUM" }]);
    setNewTaskTitle("");
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true); // 🚀 送信開始
    
    const formData = new FormData(e.currentTarget);
    formData.append("memberIds", JSON.stringify(selectedMemberIds));
    formData.append("tasks", JSON.stringify(tasks));
    
    const result = editProject ? await updateProject(formData) : await createProject(formData);
    
    if (result.success) { 
      onClose(); 
      router.refresh(); 
    } else {
      setIsSubmitting(false); // エラー時はボタンを戻す
      alert(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={onClose}></div>
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-10 max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter">{editProject ? "Modify Intelligence" : "Launch Mission"}</h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"><X size={20}/></button>
        </div>

        <div className="space-y-8">
          <input type="hidden" name="id" value={editProject?.id} />
          <input name="name" defaultValue={editProject?.name} placeholder="Mission Identity" className="w-full text-2xl font-black border-b-4 border-slate-50 focus:border-blue-500 outline-none pb-2" required />
          <textarea name="description" defaultValue={editProject?.description} placeholder="Objective Briefing..." className="w-full bg-slate-50 rounded-[24px] p-5 text-sm font-medium outline-none" rows={3} />
          
          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-5 py-4 border-2 border-transparent focus-within:border-blue-100">
            <LinkIcon size={18} className="text-slate-400" />
            <input name="drive_url" defaultValue={editProject?.drive_url} placeholder="Google Drive / Workspace Intel Link" className="bg-transparent w-full text-xs font-bold outline-none" />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block">Deployment Team</label>
            <div className="flex flex-wrap gap-2">
              {allUsers?.map((user: any) => {
                const isSelected = selectedMemberIds.includes(user.id);
                return (
                  <button key={user.id} type="button" onClick={() => setSelectedMemberIds(prev => isSelected ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 border-2 ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 opacity-60'}`}
                  >
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-5 h-5 rounded-full" />
                    {user.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 📝 タスク管理セクション (手動追加 & 編集) */}
          <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
            <div className="flex justify-between items-center mb-4">
               <label className="text-[10px] font-black uppercase text-slate-400">Mission Tasks</label>
               <button type="button" onClick={() => setUseAI(!useAI)} className="text-[10px] font-black flex items-center gap-1 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-all">
                  <Sparkles size={12}/> {useAI ? "Close AI" : "AI Assist"}
               </button>
            </div>

            {/* AI Brain-Dump */}
            {useAI && (
              <div className="mb-6 space-y-3 animate-in fade-in zoom-in duration-300">
                <textarea value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} placeholder="Paste notes here to generate tasks..." className="w-full bg-white rounded-2xl p-4 text-sm outline-none border-2 border-indigo-100 focus:border-indigo-300 min-h-[100px]" />
                <button type="button" disabled={!aiNotes || isGenerating} onClick={handleAIIdentify} className="w-full py-2 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {isGenerating ? "Analyzing Patterns..." : "Generate Tasks"}
                </button>
              </div>
            )}

            {/* タスク一覧と手動追加 */}
            <div className="space-y-3">
              {tasks.map((t, i) => (
                <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <input value={t.title} onChange={(e) => {
                    const newTasks = [...tasks]; newTasks[i].title = e.target.value; setTasks(newTasks);
                  }} className="flex-1 bg-transparent text-sm font-bold outline-none text-slate-700" />
                  <select value={t.priority} onChange={(e) => {
                    const newTasks = [...tasks]; newTasks[i].priority = e.target.value; setTasks(newTasks);
                  }} className="text-[10px] font-black bg-slate-100 text-slate-600 p-2 rounded-lg outline-none cursor-pointer">
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                  <button type="button" onClick={() => setTasks(tasks.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              ))}

              {/* 手動追加行 */}
              <div className="flex items-center gap-3 bg-white/50 p-2 rounded-xl border border-dashed border-slate-300">
                <input placeholder="Add a new task manually..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); } }} className="flex-1 bg-transparent text-sm font-bold outline-none px-2" />
                <button type="button" onClick={handleAddTask} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"><Plus size={16}/></button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[24px] font-black shadow-xl hover:shadow-blue-500/50 transition-all text-lg italic tracking-tight disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? "💾 Synchronizing..." : (editProject ? "💾 Save Strategic Changes" : "🚀 Launch Mission Now")}
          </button>
        </div>
      </form>
    </div>
  );
}