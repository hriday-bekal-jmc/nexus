"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Folder, Pause, Play, Sparkles, BarChart2, ShieldAlert, 
  CheckCircle, Clock, LayoutGrid, TrendingUp, Calendar, Target, Zap, Users,
  ArrowRight, Activity, AlertCircle, ListChecks, History, MessageSquare, Send
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { toggleTaskStatus, updateTaskTime, toggleTaskReaction, addTaskComment, generateDashboardInsights } from "@/lib/actions";

export default function DashboardClient({ userName, userId, userRole, stats, projects }: any) {
  const router = useRouter();
  const isManager = userRole === "MANAGER";

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const allTasks = useMemo(() => projects.flatMap((p: any) => p.tasks.map((t: any) => ({ ...t, projectName: p.name }))), [projects]);
  const myTasks = useMemo(() => allTasks.filter((t: any) => t.assigneeId === userId && t.status !== "DONE"), [allTasks, userId]);
  
  const weeklyDone = allTasks.filter((t:any) => t.status === "DONE").length;
  const weeklyTotal = allTasks.length;

  const urgentStats = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return {
      overdue: myTasks.filter((t:any) => t.dueDate && new Date(t.dueDate) < today).length,
      dueToday: myTasks.filter((t:any) => t.dueDate && new Date(t.dueDate).getTime() === today.getTime()).length,
      highPriority: myTasks.filter((t:any) => t.priority === 'HIGH').length
    };
  }, [myTasks]);

  const myRecentFeedback = useMemo(() => {
    const feedback: any[] = [];
    myTasks.forEach((t: any) => {
      t.comments?.forEach((c: any) => {
        if (c.userId !== userId) feedback.push({ type: 'comment', data: c, task: t, time: new Date(c.createdAt) });
      });
      t.reactions?.forEach((r: any) => {
        if (r.userId !== userId) feedback.push({ type: 'reaction', data: r, task: t, time: new Date(r.createdAt) });
      });
    });
    return feedback.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);
  }, [myTasks, userId]);

  const teamDetails = useMemo(() => {
    const usersMap = new Map();
    projects.forEach((p: any) => {
      p.members.forEach((m: any) => {
        if (!usersMap.has(m.id)) usersMap.set(m.id, { ...m, totalTasks: 0, activeTasks: [] });
      });
    });
    allTasks.forEach((t: any) => {
      if (t.assigneeId && usersMap.has(t.assigneeId)) {
        const user = usersMap.get(t.assigneeId);
        user.totalTasks += 1;
        if (t.status !== "DONE") user.activeTasks.push(t);
      }
    });
    return Array.from(usersMap.values());
  }, [projects, allTasks]);

  const activityFeed = useMemo(() => {
    return [...allTasks].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 15);
  }, [allTasks]);

  const [aiReports, setAiReports] = useState<any[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    const recentTasksForAI = allTasks.slice(0, 15).map((t: any) => ({
      title: t.title,
      status: t.status,
      assignee: t.assignee?.name || "未割当"
    }));
    const generatedReports = await generateDashboardInsights(JSON.stringify(recentTasksForAI));
    if (generatedReports && generatedReports.length > 0) setAiReports(generatedReports);
    setIsGeneratingInsights(false);
  };

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const lastSyncTime = useRef<number>(0);

  useEffect(() => {
    if (isManager) return;
    const savedTaskId = localStorage.getItem("nexus_active_task_id");
    const savedStartTimestamp = localStorage.getItem("nexus_timer_start_at");
    const savedRunning = localStorage.getItem("nexus_timer_running") === "true";

    if (savedTaskId) {
      const task = allTasks.find((t: any) => t.id === savedTaskId);
      if (task) {
        setActiveTaskId(savedTaskId);
        setIsTimerRunning(savedRunning);
        let elapsed = task.timeElapsed || 0;
        if (savedRunning && savedStartTimestamp) {
          elapsed += Math.floor((Date.now() - parseInt(savedStartTimestamp)) / 1000);
        }
        setDisplaySeconds(elapsed);
        lastSyncTime.current = elapsed;
      }
    }
  }, [allTasks, isManager]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && activeTaskId) interval = setInterval(() => setDisplaySeconds(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, activeTaskId]);

  const handleToggleTimer = async () => {
    if (!activeTaskId) return;
    if (isTimerRunning) {
      const diff = displaySeconds - lastSyncTime.current;
      if (diff > 0) await updateTaskTime(activeTaskId, diff);
      localStorage.setItem("nexus_timer_running", "false");
    } else {
      localStorage.setItem("nexus_timer_start_at", Date.now().toString());
      localStorage.setItem("nexus_timer_running", "true");
      lastSyncTime.current = displaySeconds;
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const selectTask = (task: any) => {
    if (isTimerRunning) handleToggleTimer();
    setActiveTaskId(task.id);
    setDisplaySeconds(task.timeElapsed || 0);
    lastSyncTime.current = task.timeElapsed || 0;
    localStorage.setItem("nexus_active_task_id", task.id);
    localStorage.setItem("nexus_timer_running", "false");
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const activeTask = allTasks.find((t: any) => t.id === activeTaskId);

  if (!isMounted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-pulse text-blue-500 font-black tracking-widest text-xl">LOADING WORKSPACE...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6 animate-in fade-in duration-700 text-slate-900">
      
      <div className="flex justify-between items-center px-8 py-6 bg-white/30 backdrop-blur-xl border border-white/40 rounded-[32px] shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Zap size={20} fill="currentColor"/>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{isManager ? "マネジメント・コンソール" : `${userName.split(' ')[0]} のワークスペース`}</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{isManager ? "管理者向け全体状況" : "個人タスク状況"}</p>
          </div>
        </div>
        
        {!isManager && (
          <div className="hidden md:flex gap-3">
             <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl flex flex-col items-center justify-center shadow-sm">
                <span className="text-lg font-black text-rose-600 leading-none">{urgentStats.overdue}</span>
                <span className="text-[8px] font-black uppercase text-rose-400 tracking-wider">期限超過</span>
             </div>
             <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl flex flex-col items-center justify-center shadow-sm">
                <span className="text-lg font-black text-amber-600 leading-none">{urgentStats.dueToday}</span>
                <span className="text-[8px] font-black uppercase text-amber-400 tracking-wider">本日期限</span>
             </div>
             <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl flex flex-col items-center justify-center shadow-sm">
                <span className="text-lg font-black text-blue-600 leading-none">{urgentStats.highPriority}</span>
                <span className="text-[8px] font-black uppercase text-blue-400 tracking-wider">優先度(高)</span>
             </div>
          </div>
        )}
        {isManager && (
           <Link href="/projects" className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:scale-105 transition-all flex items-center gap-2 shadow-xl">
             <Folder size={16} className="text-blue-400" /> プロジェクトを管理
           </Link>
        )}
      </div>

      {isManager ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatTile title="総プロジェクト数" value={stats.projectCount} icon={<Folder size={20}/>} color="bg-blue-500" />
            <StatTile title="進行中のタスク" value={stats.taskStats.todo + stats.taskStats.inProgress} icon={<Activity size={20}/>} color="bg-indigo-500" />
            <StatTile title="ブロック中のタスク" value={stats.taskStats.blocked} icon={<ShieldAlert size={20}/>} color="bg-rose-500" />
            <StatTile title="完了したタスク" value={stats.taskStats.done} icon={<CheckCircle size={20}/>} color="bg-emerald-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-white/40 backdrop-blur-2xl border border-white/80 p-8 rounded-[40px] shadow-xl">
                 <h3 className="text-xl font-black text-slate-900 mb-6 italic flex items-center gap-3"><Users className="text-blue-600"/> メンバー別タスク状況</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {teamDetails.map((user: any, i: number) => (
                     <div key={i} className="p-5 bg-white/60 rounded-[30px] border border-white shadow-sm flex flex-col h-full">
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md">
                                {user.name.charAt(0)}
                             </div>
                             <div>
                                <p className="font-black text-slate-900 text-base leading-none">{user.name}</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">割当: {user.totalTasks}件</p>
                             </div>
                          </div>
                       </div>
                       <div className="flex-1 space-y-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">現在着手中:</p>
                          {user.activeTasks.length > 0 ? user.activeTasks.slice(0, 3).map((t: any) => (
                            <div key={t.id} className="flex items-start gap-2 group">
                               <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${t.status === 'IN_PROGRESS' ? 'bg-blue-500 animate-pulse' : t.status === 'BLOCKED' ? 'bg-red-500' : 'bg-slate-300'}`} />
                               <div className="min-w-0">
                                 <p className="text-[11px] font-bold text-slate-800 truncate leading-tight group-hover:text-blue-600 transition-colors">{t.title}</p>
                                 <p className="text-[8px] font-bold text-slate-400 truncate">{t.projectName}</p>
                               </div>
                            </div>
                          )) : (
                            <p className="text-[10px] font-bold text-slate-400 italic">現在担当しているタスクはありません。</p>
                          )}
                       </div>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-[32px] shadow-xl flex flex-col max-h-[350px]">
                 <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest"><TrendingUp size={16} className="text-blue-600"/> プロジェクト進捗</h3>
                 </div>
                 <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {projects.map((p: any) => {
                       const done = p.tasks.filter((t:any) => t.status === "DONE").length;
                       const total = p.tasks.length;
                       const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                       return (
                         <div key={p.id} className="p-4 bg-white/60 rounded-2xl border border-white flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center">
                               <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                               <span className="text-[10px] font-black text-blue-600">{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-500 rounded-full" style={{width: `${progress}%`}}></div>
                            </div>
                         </div>
                       );
                    })}
                 </div>
              </div>

              <div className="bg-white/40 backdrop-blur-2xl border border-white/80 p-8 rounded-[40px] shadow-xl">
                 <h3 className="text-xl font-black text-slate-900 mb-6 italic flex items-center gap-3"><Calendar className="text-indigo-500"/> 期限ヒートマップ</h3>
                 <CalendarHeatmap allTasks={allTasks} />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="bg-blue-600 rounded-[32px] p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={80}/></div>
                 <h4 className="text-[9px] font-black uppercase tracking-[0.3em] mb-4">部門別ステータス</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[9px] font-bold uppercase opacity-60 mb-1">未完了タスク</p>
                     <p className="text-3xl font-black italic">{allTasks.filter((t:any) => t.status !== "DONE").length}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-bold uppercase opacity-60 mb-1">完了タスク</p>
                     <p className="text-3xl font-black italic text-cyan-300">{weeklyDone}</p>
                   </div>
                 </div>
              </div>

              <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden border-b-4 border-purple-500 flex flex-col max-h-[350px]">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={60} /></div>
                 <div className="relative z-10 flex justify-between items-center mb-4">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-400 flex items-center gap-2">
                      <Sparkles size={12}/> AIによる業務要約
                    </h4>
                    <button 
                      onClick={handleGenerateInsights} 
                      disabled={isGeneratingInsights}
                      className="text-[10px] font-black bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full hover:bg-purple-500/40 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {isGeneratingInsights ? "分析中..." : "インサイトを生成"}
                    </button>
                 </div>
                 <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar flex-1 z-10">
                    {aiReports.length === 0 && !isGeneratingInsights ? (
                       <div className="text-center py-6">
                         <p className="text-xs text-slate-400 font-bold">「インサイトを生成」をクリックして、<br/>現在のチーム状況を分析します。</p>
                       </div>
                    ) : (
                      aiReports.map((report, idx) => (
                        <Link href="/nippo" key={idx} className="block p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-[11px] font-black text-white">{report.user}</span>
                             <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${report.status === 'ブロック' ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'}`}>
                               {report.status}
                             </span>
                          </div>
                          <p className="text-[10px] text-slate-300 line-clamp-2 leading-snug">{report.summary}</p>
                        </Link>
                      ))
                    )}
                 </div>
              </div>

              <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-[32px] shadow-md flex flex-col max-h-[300px]">
                <h4 className="text-[10px] font-black text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={14} className="text-rose-500"/> プロジェクト期限一覧</h4>
                <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {allTasks.filter((t:any) => t.dueDate && t.status !== "DONE").sort((a:any, b:any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((t:any, i:number) => {
                      const isUrgent = new Date(t.dueDate).getTime() - Date.now() < 86400000 * 2;
                      return (
                        <div key={i} className="flex items-center gap-3 group">
                          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm ${isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-800'}`}>
                            <span className="text-[6px] font-black uppercase opacity-60">{new Date(t.dueDate).toLocaleString('ja-JP', {month:'short'})}</span>
                            <span className="text-sm font-black leading-none">{new Date(t.dueDate).getDate()}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{t.title}</p>
                            <p className="text-[8px] font-bold text-slate-500 truncate uppercase mt-0.5">{t.assignee?.name || "未割当"} • {t.projectName}</p>
                          </div>
                        </div>
                      )
                  })}
                </div>
              </div>

              <ActivityFeed feed={activityFeed} currentUserId={userId} router={router} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-8 rounded-[40px] shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center md:text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">現在実行中のタスク</span>
                  <h2 className="text-2xl font-black leading-tight text-slate-800 mt-1">{activeTask ? activeTask.title : "着手するタスクを選択してください"}</h2>
                  <p className="text-xs font-bold text-blue-500 mt-1 mb-6">{activeTask ? activeTask.projectName : "以下のタスク一覧から選択"}</p>
                  <div className="flex items-center justify-center md:justify-start gap-5">
                    <button 
                      disabled={!activeTaskId}
                      onClick={handleToggleTimer}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isTimerRunning ? 'bg-white text-rose-500 border border-rose-100 animate-pulse' : 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-blue-500/30 hover:scale-105'}`}
                    >
                      {isTimerRunning ? <Pause size={28} strokeWidth={3} /> : <Play size={28} fill="currentColor" className="ml-1" />}
                    </button>
                    <div className="text-4xl font-mono font-black text-slate-700 tracking-tighter drop-shadow-md">
                      {formatTime(displaySeconds)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/20 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 overflow-hidden flex flex-col max-h-[400px] shadow-lg">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest"><ListChecks className="text-blue-500" size={16}/> 割り当てられたタスク</h3>
                <span className="text-[9px] font-black text-slate-400 uppercase">残り {myTasks.length} 件</span>
              </div>
              <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {myTasks.map((t: any) => (
                  <div 
                    key={t.id} 
                    onClick={() => selectTask(t)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${activeTaskId === t.id ? 'bg-white shadow-md border-blue-300 ring-1 ring-blue-50' : 'bg-white/50 border-white/80 hover:bg-white'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${t.priority === 'HIGH' ? 'bg-rose-500' : t.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div className="min-w-0">
                        <h4 className="font-black text-xs text-slate-800 truncate">{t.title}</h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter truncate">{t.projectName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-600">{formatTime(t.timeElapsed)}</p>
                      </div>
                      <ArrowRight size={12} className={`text-slate-300 ${activeTaskId === t.id ? 'text-blue-500' : ''}`}/>
                    </div>
                  </div>
                ))}
                {myTasks.length === 0 && (
                  <div className="py-8 text-center bg-white/10 rounded-2xl border-2 border-dashed border-white/20">
                    <p className="text-slate-400 font-bold text-[11px]">現在割り当てられているタスクはありません。</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
             
             {/* 🌟 改善: Collaboration Hub の長文対応 */}
             <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden flex flex-col max-h-[400px]">
                <div className="absolute top-0 right-0 p-4 opacity-10"><MessageSquare size={60} /></div>
                <div className="relative z-10 flex flex-col h-full">
                   <h4 className="text-[9px] font-black mb-4 uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-2">
                     <Sparkles size={12}/> コラボレーション・ハブ
                   </h4>
                   <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar flex-1">
                     {myRecentFeedback.length > 0 ? myRecentFeedback.map((fb, i) => (
                        <div key={i} className="p-3 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20 transition-colors">
                           <p className="text-[11px] font-medium text-slate-200 leading-snug">
                             <span className="font-black text-white">{fb.data.user?.name || "チームメンバー"}</span>
                             {fb.type === 'reaction' ? ` がリアクション(${fb.data.emoji})しました ` : ` がコメントしました `}
                             <span className="font-bold text-indigo-300">"{fb.task.title}"</span>
                           </p>
                           {/* 📝 変更: whitespace-pre-wrap で改行を保持し、スクロール可能に */}
                           {fb.type === 'comment' && (
                              <div className="text-[10px] text-slate-300 mt-2 bg-black/30 p-3 rounded-lg border-l-2 border-indigo-500 whitespace-pre-wrap break-words max-h-40 overflow-y-auto custom-scrollbar">
                                {fb.data.text}
                              </div>
                           )}
                        </div>
                     )) : (
                        <p className="text-[10px] text-slate-400 font-bold italic mt-2">新着のフィードバックはありません。</p>
                     )}
                   </div>
                </div>
             </div>

             <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-[32px] shadow-md flex flex-col max-h-[300px]">
                <h4 className="text-[10px] font-black text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={14} className="text-rose-500"/> 個人タスクの期限</h4>
                <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {myTasks.filter((t:any) => t.dueDate).sort((a:any, b:any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((t:any, i:number) => {
                      const isUrgent = new Date(t.dueDate).getTime() - Date.now() < 86400000 * 2;
                      return (
                        <div key={i} className="flex items-center gap-3 group">
                          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm ${isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-800'}`}>
                            <span className="text-[7px] font-black uppercase opacity-60">{new Date(t.dueDate).toLocaleString('ja-JP', {month:'short'})}</span>
                            <span className="text-sm font-black leading-none">{new Date(t.dueDate).getDate()}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{t.title}</p>
                            <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">{t.projectName}</p>
                          </div>
                        </div>
                      )
                  })}
                  {myTasks.filter((t:any) => t.dueDate).length === 0 && (
                    <p className="text-[10px] text-slate-500 font-bold italic">現在、期限が設定されたタスクはありません。</p>
                  )}
                </div>
             </div>

             <ActivityFeed feed={activityFeed} currentUserId={userId} router={router} />

          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// COMPONENT: Compact & Glassy Activity Feed
// ---------------------------------------------------------
function ActivityFeed({ feed, currentUserId, router }: any) {
  return (
    <div className="bg-white/30 backdrop-blur-2xl border border-white/60 p-6 rounded-[32px] shadow-lg flex flex-col max-h-[500px]">
      <h4 className="text-[10px] font-black text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2">
         <History size={14} className="text-blue-500"/> チーム・アクティビティ
      </h4>
      <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar flex-1">
         {feed.map((t: any) => (
           <InteractiveFeedItem key={t.id} task={t} currentUserId={currentUserId} router={router} />
         ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// COMPONENT: Interactive Feed Item (Extremely Compact & Glassy)
// ---------------------------------------------------------
function InteractiveFeedItem({ task, currentUserId, router }: any) {
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState("");
  // 🌟 NEW: すべてのコメントを表示するためのトグルState
  const [showAllComments, setShowAllComments] = useState(false);

  const handleReaction = async (emoji: string) => {
    await toggleTaskReaction(task.id, emoji);
    router.refresh();
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addTaskComment(task.id, commentText);
    setCommentText("");
    setShowCommentBox(false);
    setShowAllComments(true); // コメントしたら全件表示にする
    router.refresh();
  };

  // 🌟 NEW: リアクションした「ユーザー名」も保持するように変更
  const reactionsMap = task.reactions?.reduce((acc: any, r: any) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [] };
    acc[r.emoji].count += 1;
    acc[r.emoji].users.push(r.user?.name || "Unknown");
    return acc;
  }, {}) || {};

  return (
    <div className="relative group bg-white/40 hover:bg-white/60 backdrop-blur-md p-4 rounded-[24px] border border-white/50 shadow-sm transition-all duration-300 flex flex-col">
       
       <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-full shadow-lg z-10 border border-white/20">
          <button onClick={() => handleReaction('🔥')} className="hover:scale-125 transition-transform text-[10px] px-1.5 py-0.5">🔥</button>
          <button onClick={() => handleReaction('👍')} className="hover:scale-125 transition-transform text-[10px] px-1.5 py-0.5">👍</button>
          <button onClick={() => handleReaction('👀')} className="hover:scale-125 transition-transform text-[10px] px-1.5 py-0.5">👀</button>
          <div className="w-[1px] bg-white/20 mx-1"></div>
          <button onClick={() => setShowCommentBox(!showCommentBox)} className="text-white/80 hover:text-white px-2 flex items-center justify-center">
             <MessageSquare size={12}/>
          </button>
       </div>

       <div className="flex gap-3">
          <div className="mt-1 shrink-0">
             <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-inner ${task.status === 'DONE' ? 'bg-emerald-500' : task.status === 'BLOCKED' ? 'bg-rose-500' : 'bg-blue-500'}`}>
                {task.status === 'DONE' ? <CheckCircle size={10}/> : task.status === 'BLOCKED' ? <ShieldAlert size={10}/> : <Activity size={10}/>}
             </div>
          </div>
          <div className="min-w-0 flex-1">
             <p className="text-xs font-medium text-slate-800 leading-tight">
                <span className="font-black text-blue-700">{task.assignee?.name || "未割当"}</span> 
                <span className="text-slate-500">{task.status === 'DONE' ? ' が完了しました ' : task.status === 'BLOCKED' ? ' がブロックされています ' : ' を更新しました '}</span>
                <span className="font-bold text-slate-900">"{task.title}"</span>
             </p>
             <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest truncate">{task.projectName}</p>
             
             {/* 🌟 改善: リアクションにツールチップを追加 */}
             {(Object.keys(reactionsMap).length > 0 || task.comments?.length > 0) && (
               <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(reactionsMap).map(([emoji, data]: any) => (
                    <div key={emoji} className="relative group/tooltip">
                      <button onClick={() => handleReaction(emoji)} className="flex items-center gap-1 bg-white/60 border border-white/40 px-2 py-1 rounded-full text-[10px] font-black hover:bg-white transition-colors shadow-sm">
                         {emoji} <span className="text-slate-600">{data.count}</span>
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tooltip:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
                        {data.users.join(", ")}
                      </div>
                    </div>
                  ))}
                  {task.comments?.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white/40 px-2 py-1 rounded-full border border-white/20">
                      <MessageSquare size={10}/> {task.comments.length}
                    </span>
                  )}
               </div>
             )}

             {/* 🌟 改善: 全てのコメントの表示と、長い文章の折り返し */}
             {task.comments?.length > 0 && !showCommentBox && (
                <div className="mt-3 space-y-2">
                  {(showAllComments ? task.comments : task.comments.slice(-1)).map((comment: any) => (
                    <div key={comment.id} className="bg-white/50 p-3 rounded-2xl border border-white/60 border-l-4 border-l-blue-400 shadow-sm">
                      <div className="flex justify-between items-start mb-1.5">
                        <p className="text-[10px] font-black text-slate-800">{comment.user?.name}</p>
                        <span className="text-[8px] text-slate-400 font-bold">{new Date(comment.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {/* whitespace-pre-wrapで改行維持。max-hで長すぎたらスクロール */}
                      <div className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        {comment.text}
                      </div>
                    </div>
                  ))}
                  {task.comments.length > 1 && (
                    <button onClick={() => setShowAllComments(!showAllComments)} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-1">
                      {showAllComments ? "コメントを折りたたむ" : `他 ${task.comments.length - 1} 件のコメントを見る`}
                    </button>
                  )}
                </div>
             )}

             {showCommentBox && (
                <form onSubmit={handleComment} className="mt-3 flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                   <input 
                     type="text" 
                     autoFocus
                     value={commentText} 
                     onChange={(e) => setCommentText(e.target.value)} 
                     placeholder="返信を入力..." 
                     className="flex-1 bg-white/60 border border-white/80 rounded-xl px-3 py-2 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-400 shadow-inner text-slate-800"
                   />
                   <button type="submit" className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm">
                      <Send size={14}/>
                   </button>
                </form>
             )}
          </div>
       </div>
    </div>
  );
}

// ---------------------------------------------------------
// COMPONENT: StatTile
// ---------------------------------------------------------
function StatTile({ title, value, icon, color }: any) {
  return (
    <div className="bg-white/30 backdrop-blur-xl rounded-[32px] p-5 border border-white shadow-md hover:shadow-lg transition-all group overflow-hidden flex items-center justify-between">
      <div>
         <p className="text-slate-500 font-black text-[9px] uppercase tracking-widest mb-1">{title}</p>
         <h2 className="text-2xl font-black text-slate-800 italic">{value}</h2>
      </div>
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform`}>
        {icon}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// COMPONENT: CalendarHeatmap (Manager Only)
// ---------------------------------------------------------
function CalendarHeatmap({ allTasks }: { allTasks: any[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDayIndex; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(i).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
  }

  const getTasksForDate = (dateStr: string) => {
    return allTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      const ty = d.getFullYear();
      const tm = String(d.getMonth() + 1).padStart(2, '0');
      const td = String(d.getDate()).padStart(2, '0');
      return `${ty}-${tm}-${td}` === dateStr;
    });
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['日','月','火','水','木','金','土'].map(d => (
          <div key={d} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} className="h-8 rounded-xl" />;
          const dayTasks = getTasksForDate(dateStr);
          const count = dayTasks.length;
          let bgClass = "bg-slate-100/50 hover:bg-slate-200 border-white/50";
          let textClass = "text-slate-400";
          if (count === 1) { bgClass = "bg-blue-200 border-blue-300 shadow-sm"; textClass = "text-blue-800"; }
          if (count === 2) { bgClass = "bg-blue-400 border-blue-500 shadow-md"; textClass = "text-white"; }
          if (count >= 3) { bgClass = "bg-indigo-600 border-indigo-700 shadow-lg"; textClass = "text-white"; }
          
          return (
            <div key={dateStr} className={`relative group h-8 rounded-xl border flex items-center justify-center cursor-help transition-all duration-300 hover:scale-110 hover:z-20 ${bgClass}`}>
              <span className={`text-[9px] font-black ${textClass}`}>{parseInt(dateStr.split('-')[2])}</span>
              {count > 0 && (
                <div className="absolute hidden group-hover:flex flex-col bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 text-white p-3 rounded-2xl shadow-2xl z-50">
                  <span className="font-black text-[9px] text-cyan-400 mb-2 border-b border-white/10 pb-1 uppercase tracking-widest">{dateStr}</span>
                  <div className="space-y-2">
                    {dayTasks.map((t: any) => (
                      <div key={t.id} className="leading-tight">
                        <span className="font-bold text-[10px] block mb-0.5 truncate">{t.title}</span>
                        <div className="flex justify-between items-center text-[8px] text-slate-400">
                           <span className="truncate mr-2">{t.projectName}</span>
                           <span className="font-black text-blue-300 shrink-0">{t.assignee?.name || "未割当"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}