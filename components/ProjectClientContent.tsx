"use client";

import { useState, useEffect } from "react";
import { Plus, X, Folder, Edit3, Trash2, UserPlus, ListTodo, Link as LinkIcon, Sparkles, CheckCircle2, Circle, Clock } from "lucide-react";
import { createProject, updateProject, deleteProject, generateTasksFromAI, toggleTaskStatus } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function ProjectClientContent({ initialProjects, allUsers, userRole, userId }: { initialProjects: any[], allUsers: any[], userRole: string, userId: string }) {
  const router = useRouter();
  const isManager = userRole === "MANAGER";

  // プロジェクトを即座に画面に反映するためのState
  const [projects, setProjects] = useState(initialProjects);
  useEffect(() => { setProjects(initialProjects); }, [initialProjects]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  
  // フォーム用State
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [useAI, setUseAI] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split('T')[0];
  };

  const openNewProject = () => {
    setSelectedProject(null);
    setIsEditMode(true); // 新規作成時は強制的に編集モード
    setTasks([]);
    setSelectedMemberIds([]);
    setUseAI(false);
    setIsModalOpen(true);
  };

  const openViewProject = (proj: any) => {
    setSelectedProject(proj);
    setIsEditMode(false); // 開いた時は「閲覧モード」
    setSelectedMemberIds(proj.members.map((m:any) => m.id) || []);
    setTasks(proj.tasks.map((t:any) => ({
      ...t,
      startDate: formatDateForInput(t.startDate),
      dueDate: formatDateForInput(t.dueDate)
    })) || []);
    setIsModalOpen(true);
  };

  const handleAIIdentify = async () => {
    setIsGenerating(true);
    const generated = await generateTasksFromAI(aiNotes);
    setTasks(prev => [...prev, ...generated]);
    setIsGenerating(false);
    setUseAI(false);
    setAiNotes("");
  };

  const handleAddTask = () => {
    setTasks([...tasks, { title: "", description: "", priority: "MEDIUM", assigneeId: "", startDate: "", dueDate: "" }]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      formData.append("memberIds", JSON.stringify(selectedMemberIds));
      formData.append("tasks", JSON.stringify(tasks));

      const result = selectedProject 
        ? await updateProject(formData) 
        : await createProject(formData);

      if (result?.success) {
        setIsModalOpen(false); // 成功したらモーダルを閉じる
        router.refresh();
      } else {
        // 🚨 失敗した場合、エラーメッセージをポップアップで表示する！
        alert(`エラー: ${result?.error || "プロジェクトの保存に失敗しました。"}`);
      }
    } catch (err) {
      alert("保存中にネットワークエラーが発生しました。");
    } finally {
      setIsSubmitting(false); // ボタンのローディング状態を元に戻す
    }
  };

  // タスク完了の切り替え（即座にUIを更新するOptimistic UI）
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    
    // 即座に見た目を変える
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setProjects(projects.map(p => ({
      ...p, tasks: p.tasks.map((t:any) => t.id === taskId ? { ...t, status: newStatus } : t)
    })));

    // 裏でデータベースを更新
    await toggleTaskStatus(taskId, currentStatus);
    router.refresh();
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const getProgress = (projTasks: any[]) => {
    if (!projTasks || projTasks.length === 0) return 0;
    const done = projTasks.filter(t => t.status === "DONE").length;
    return Math.round((done / projTasks.length) * 100);
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-10">
        <div>
          <p className="text-sm font-black text-blue-600 uppercase tracking-widest mb-1">Nexus ワークスペース</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">プロジェクト管理</h1>
        </div>
        {/* マネージャーのみ新規作成ボタンを表示 */}
        {isManager && (
          <button onClick={openNewProject} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
            <Plus size={18} /> 新規プロジェクト作成
          </button>
        )}
      </div>

      {/* Grid of Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj) => {
          const progress = getProgress(proj.tasks);
          return (
            <div key={proj.id} onClick={() => openViewProject(proj)} className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-[32px] hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full">
              <div className="flex justify-between mb-4">
                 <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Folder size={24} /></div>
                 <div className="flex -space-x-2">
                   {proj.members?.slice(0, 4).map((m: any) => (
                     <img key={m.id} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100" title={m.name} />
                   ))}
                 </div>
              </div>
              <h3 className="text-xl font-black text-slate-800">{proj.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 mt-2 mb-6">{proj.description}</p>
              
              <div className="mt-auto pt-4 border-t border-white/60">
                 <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                   <span>進捗状況</span><span>{progress}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                 </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* --- THE MASTER MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-4xl bg-[#eef2f9] rounded-[40px] shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
            
            {/* 【閲覧モード】(メンバーはこれしか見れない, マネージャーも最初はこれ) */}
            {!isEditMode && selectedProject ? (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-3xl font-black text-slate-900">{selectedProject.name}</h2>
                      <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-black">完了率 {getProgress(tasks)}%</span>
                    </div>
                    {selectedProject.drive_url && (
                      <a href={selectedProject.drive_url} target="_blank" className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:underline"><LinkIcon size={14}/> Google Driveを開く</a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {/* マネージャーのみ編集と削除が可能 */}
                    {isManager && (
                      <>
                        <button onClick={() => setIsEditMode(true)} className="p-3 text-blue-600 bg-white rounded-full shadow-sm hover:bg-blue-50 transition-colors"><Edit3 size={20} /></button>
                        <button onClick={async () => { if(confirm("このプロジェクトを削除してもよろしいですか？")) { await deleteProject(selectedProject.id); setIsModalOpen(false); router.refresh(); }}} className="p-3 text-red-500 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors"><Trash2 size={20} /></button>
                      </>
                    )}
                    <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-500 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors"><X size={20} /></button>
                  </div>
                </div>

                <p className="text-slate-600 mb-8 bg-white/60 p-4 rounded-2xl border border-white">{selectedProject.description}</p>

                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><ListTodo size={20}/> プロジェクト・タスク一覧</h3>
                <div className="space-y-3">
                  {tasks.map((task: any) => {
                    // 完了ボタンを押せるのは、マネージャーか、そのタスクの担当者だけ
                    const canComplete = isManager || task.assigneeId === userId;
                    const isDone = task.status === "DONE";

                    return (
                      <div key={task.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isDone ? 'bg-white/40 border-transparent opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="flex items-center gap-4">
                          {canComplete ? (
                            <button onClick={() => handleToggleTask(task.id, task.status)} className="hover:scale-110 transition-transform">
                              {isDone ? <CheckCircle2 size={26} className="text-emerald-500" /> : <Circle size={26} className="text-slate-300 hover:text-emerald-500" />}
                            </button>
                          ) : (
                            <div className="opacity-50 cursor-not-allowed">
                              {isDone ? <CheckCircle2 size={26} className="text-emerald-500" /> : <Circle size={26} className="text-slate-300" />}
                            </div>
                          )}
                          <div>
                            <p className={`font-bold text-lg ${isDone ? 'line-through text-slate-500' : 'text-slate-800'}`}>{task.title}</p>
                            {task.description && <p className="text-xs text-slate-500 mt-1">{task.description}</p>}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {task.dueDate && (
                            <span className="text-[10px] font-bold text-red-400 flex items-center gap-1"><Clock size={12}/> {task.dueDate}</span>
                          )}
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md ${task.priority === 'HIGH' ? 'bg-red-100 text-red-600' : task.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {task.priority === 'HIGH' ? '高' : task.priority === 'MEDIUM' ? '中' : '低'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* 【編集モード】(マネージャーのみアクセス可能) */
              <form onSubmit={handleSubmit} className="animate-in fade-in duration-300">
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-3xl font-black text-slate-900">{selectedProject ? "プロジェクトの編集" : "新規プロジェクトの作成"}</h2>
                  <div className="flex gap-2">
                    {selectedProject && (
                      <button type="button" onClick={() => setIsEditMode(false)} className="p-2 text-slate-500 bg-white rounded-full shadow-sm hover:bg-slate-100">キャンセル</button>
                    )}
                    {!selectedProject && (
                      <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 bg-white rounded-full shadow-sm hover:bg-slate-100"><X size={20} /></button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* 左カラム：プロジェクト情報 */}
                  <div className="md:col-span-1 space-y-6">
                    <input type="hidden" name="id" value={selectedProject?.id} />
                    <input name="name" defaultValue={selectedProject?.name} placeholder="プロジェクト名" className="w-full text-xl font-bold bg-white rounded-2xl px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                    <textarea name="description" defaultValue={selectedProject?.description} placeholder="プロジェクトの目的や概要を入力..." className="w-full bg-white rounded-2xl p-4 text-sm outline-none shadow-sm" rows={4} />
                    <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-sm">
                      <LinkIcon size={16} className="text-slate-400" />
                      <input name="drive_url" defaultValue={selectedProject?.drive_url} placeholder="Google DriveのURL" className="bg-transparent w-full text-xs font-bold outline-none" />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block flex items-center gap-2"><UserPlus size={14}/> アサインするメンバー</label>
                      <div className="flex flex-wrap gap-2">
                        {allUsers.map(user => (
                          <button key={user.id} type="button" onClick={() => toggleMember(user.id)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${selectedMemberIds.includes(user.id) ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
                            {user.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/30 hover:-translate-y-1 transition-all mt-6 disabled:opacity-50">
                      {isSubmitting ? "保存中..." : "プロジェクトを保存"}
                    </button>
                  </div>

                  {/* 右カラム：タスクマネージャー */}
                  <div className="md:col-span-2">
                    <div className="bg-white/60 p-6 rounded-[32px] border border-white shadow-sm h-full">
                      <div className="flex justify-between items-center mb-6">
                        <label className="text-sm font-black text-slate-800 flex items-center gap-2"><ListTodo size={18} className="text-blue-600"/> タスクの登録</label>
                        <button type="button" onClick={() => setUseAI(!useAI)} className={`text-xs font-black px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${useAI ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                           <Sparkles size={14} /> {useAI ? "AIアシストを閉じる" : "AIでタスクを自動生成"}
                        </button>
                      </div>
                      
                      {/* AI テキストボックス */}
                      {useAI && (
                        <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 animate-in fade-in zoom-in duration-300">
                          <p className="text-xs font-bold text-purple-600 mb-2">会議のメモや議事録、メールの本文を貼り付けてください:</p>
                          <textarea value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} placeholder="例: 『来週の金曜日までにYashwanさんにデータベースのセットアップをお願いします...』" className="w-full bg-white rounded-xl p-3 text-sm outline-none border border-purple-200 focus:ring-2 focus:ring-purple-400 min-h-[80px] mb-3" />
                          <button type="button" disabled={!aiNotes || isGenerating} onClick={handleAIIdentify} className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-xs shadow-md hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {isGenerating ? <span className="animate-pulse">内容を分析中...</span> : "タスクを瞬時に抽出"}
                          </button>
                        </div>
                      )}

                      {/* タスクリスト（編集可能） */}
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {tasks.map((t, i) => (
                          <div key={i} className="flex flex-col gap-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group">
                            <div className="flex items-center gap-3">
                              <input value={t.title} onChange={(e) => { const newTasks = [...tasks]; newTasks[i].title = e.target.value; setTasks(newTasks); }} placeholder="タスクのタイトル..." className="flex-1 bg-transparent text-base font-black outline-none text-slate-800 border-b border-transparent focus:border-slate-300 pb-1 transition-colors" />
                              <button type="button" onClick={() => setTasks(tasks.filter((_, idx) => idx !== i))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                            </div>
                            
                            <textarea value={t.description || ""} onChange={(e) => { const newTasks = [...tasks]; newTasks[i].description = e.target.value; setTasks(newTasks); }} placeholder="タスクの詳細や手順を追加..." rows={2} className="w-full bg-slate-50 border border-slate-100 focus:border-blue-200 rounded-xl p-3 text-xs outline-none resize-none" />
                            
                            <div className="flex flex-wrap items-center gap-3">
                              <select value={t.assigneeId || ""} onChange={(e) => { const newTasks = [...tasks]; newTasks[i].assigneeId = e.target.value; setTasks(newTasks); }} className="text-xs font-bold bg-slate-50 text-slate-600 p-2.5 rounded-xl border border-slate-100 outline-none cursor-pointer">
                                <option value="">👤 未割当</option>
                                {allUsers.filter(u => selectedMemberIds.includes(u.id)).map(u => (
                                   <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>

                              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                <input type="date" title="開始日" value={t.startDate || ""} onChange={(e) => { const newTasks = [...tasks]; newTasks[i].startDate = e.target.value; setTasks(newTasks); }} className="bg-transparent text-[11px] font-bold text-slate-500 outline-none cursor-pointer" />
                                <span className="text-slate-300 font-black">›</span>
                                <input type="date" title="期限日" value={t.dueDate || ""} onChange={(e) => { const newTasks = [...tasks]; newTasks[i].dueDate = e.target.value; setTasks(newTasks); }} className="bg-transparent text-[11px] font-bold text-slate-500 outline-none cursor-pointer" />
                              </div>

                              <div className="flex bg-slate-100 p-1 rounded-xl ml-auto border border-slate-200">
                                {([{val: "LOW", label: "低"}, {val: "MEDIUM", label: "中"}, {val: "HIGH", label: "高"}] as const).map(p => (
                                   <button key={p.val} type="button" onClick={() => { const newTasks = [...tasks]; newTasks[i].priority = p.val; setTasks(newTasks); }} 
                                   className={`text-[9px] font-black px-3 py-1.5 rounded-lg transition-all ${
                                      t.priority === p.val 
                                      ? p.val === "HIGH" ? "bg-red-500 text-white shadow-sm" : p.val === "MEDIUM" ? "bg-orange-500 text-white shadow-sm" : "bg-blue-500 text-white shadow-sm"
                                      : "text-slate-400 hover:bg-slate-200"
                                   }`}>
                                     {p.label}
                                   </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <button type="button" onClick={handleAddTask} className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-2xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                           <Plus size={18} /> 空のタスクを追加
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}