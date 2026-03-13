"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Folder, Pause, Play, Sparkles, BarChart2, ShieldAlert, 
  CheckCircle, Clock, LayoutGrid, TrendingUp, Calendar, Target, Zap, Users,
  ArrowRight, Activity, AlertCircle, ListChecks, History, MessageSquare, Send, CheckSquare, PieChart as PieChartIcon
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import { toggleTaskStatus, updateTaskTime, toggleTaskReaction, addTaskComment, generateDashboardInsights, generatePersonalFocusPlan, updateTaskDescription } from "@/lib/actions";
import confetti from "canvas-confetti";
import { autoCompleteTask } from "@/lib/actions";
import { approveAndArchiveProject } from "@/lib/actions";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#f97316', '#10b981'];

export default function DashboardClient({ userName, userId, userRole, stats, projects }: any) {
  const router = useRouter();
  const isManager = userRole === "MANAGER";

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const allTasks = useMemo(() => projects.flatMap((p: any) => p.tasks.map((t: any) => ({ ...t, projectName: p.name }))), [projects]);
  const myTasks = useMemo(() => allTasks.filter((t: any) => t.assigneeId === userId && t.status !== "DONE"), [allTasks, userId]);
  
  const weeklyDone = allTasks.filter((t:any) => t.status === "DONE").length;

  const urgentStats = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return {
      overdue: myTasks.filter((t:any) => t.dueDate && new Date(t.dueDate) < today).length,
      dueToday: myTasks.filter((t:any) => t.dueDate && new Date(t.dueDate).getTime() === today.getTime()).length,
      highPriority: myTasks.filter((t:any) => t.priority === 'HIGH').length
    };
  }, [myTasks]);

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

  // 🌟 NEW: マウント時にキャッシュからAIレポートを読み込む
  useEffect(() => {
    if (isManager) {
      const cachedInsights = localStorage.getItem(`nexus_ai_insights_${userId}`);
      if (cachedInsights) {
        try { setAiReports(JSON.parse(cachedInsights)); } catch (e) {}
      }
    }
  }, [isManager, userId]);

const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    
    // 🌟 AIが「期限超過」を判定できるように今日の日付を取得
    const todayStr = new Date().toLocaleDateString('ja-JP');
    
    // 🌟 進行中・ブロック中のタスクを抽出し、期限や優先度、作業時間をAIに渡す
    const tasksForAI = allTasks
      .filter((t: any) => t.status !== "DONE")
      .map((t: any) => ({
        assignee: t.assignee?.name || "未割当",
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString('ja-JP') : "期限なし",
        workedMinutes: Math.floor((t.timeElapsed || 0) / 60)
      }));

    const payload = JSON.stringify({ 
      currentDate: todayStr, 
      activeTasks: tasksForAI 
    });

    const generatedReports = await generateDashboardInsights(payload);
    
    if (generatedReports && generatedReports.length > 0) {
      setAiReports(generatedReports);
      localStorage.setItem(`nexus_ai_insights_${userId}`, JSON.stringify(generatedReports));
    }
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
      
      {/* HEADER */}
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
      </div>

      {isManager ? (
        /* 🧑‍💼 MANAGER VIEW */
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatTile title="総プロジェクト数" value={stats.projectCount} icon={<Folder size={20}/>} color="bg-blue-500" />
            <StatTile title="進行中のタスク" value={stats.taskStats.todo + stats.taskStats.inProgress} icon={<Activity size={20}/>} color="bg-indigo-500" />
            <StatTile title="ブロック中のタスク" value={stats.taskStats.blocked} icon={<ShieldAlert size={20}/>} color="bg-rose-500" />
            <StatTile title="完了したタスク" value={stats.taskStats.done} icon={<CheckCircle size={20}/>} color="bg-emerald-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              
              {/* メンバー別タスク状況 */}
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

              {/* 🌟 プロジェクト進捗パネル (アーカイブ承認ボタン付き) */}
              <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-6 rounded-[32px] shadow-xl flex flex-col max-h-[350px]">
                 <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest"><TrendingUp size={16} className="text-blue-600"/> プロジェクト進捗</h3>
                 </div>
                 <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {projects.filter((p:any) => p.status !== "ARCHIVED").map((p: any) => {
                       const done = p.tasks.filter((t:any) => t.status === "DONE").length;
                       const total = p.tasks.length;
                       const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                       return (
                         <Link href="/projects" key={p.id} className="relative block p-4 bg-white/60 rounded-2xl border border-white flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
                            {p.status === "PENDING_APPROVAL" && (
                              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                                 <button 
                                   onClick={async (e) => {
                                     e.preventDefault(); e.stopPropagation();
                                     await approveAndArchiveProject(p.id);
                                     alert("🎉 プロジェクトを承認し、アーカイブに移動しました！");
                                     router.refresh();
                                   }} 
                                   className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-[10px] px-4 py-2.5 rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center gap-1.5"
                                 >
                                   <Sparkles size={14} /> 承認してアーカイブ
                                 </button>
                              </div>
                            )}

                            <div className="flex justify-between items-center">
                               <h4 className="font-bold text-xs text-slate-900">{p.name}</h4>
                               <span className="text-[10px] font-black text-blue-600">{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-500 rounded-full" style={{width: `${progress}%`}}></div>
                            </div>
                         </Link>
                       );
                    })}
                 </div>
              </div>

              {/* 🌟 期限ヒートマップ */}
              <div className="bg-white/40 backdrop-blur-2xl border border-white/80 p-8 rounded-[40px] shadow-xl">
                 <h3 className="text-xl font-black text-slate-900 mb-6 italic flex items-center gap-3"><Calendar className="text-indigo-500"/> 期限ヒートマップ</h3>
                 <CalendarHeatmap allTasks={allTasks} />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              {/* AI業務要約 */}
              <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden border-b-4 border-purple-500 flex flex-col max-h-[350px]">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={60} /></div>
                 <div className="relative z-10 flex justify-between items-center mb-4">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-400 flex items-center gap-2">
                      <Sparkles size={12}/> AIによる業務要約
                    </h4>
                    <button onClick={handleGenerateInsights} disabled={isGeneratingInsights} className="text-[10px] font-black bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full hover:bg-purple-500/40 transition-colors flex items-center gap-1 disabled:opacity-50">
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
                          <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">{report.summary}</p>
                        </Link>
                      ))
                    )}
                 </div>
              </div>
              
              {/* ライブアクティビティフィード（マネージャー用） */}
              <ActivityFeed feed={activityFeed} currentUserId={userId} router={router} />
            </div>
          </div>
        </div>
      ) : (
        /* 🧑‍💻 MEMBER VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* 左カラム：タイマー、タスク、そしてフィード */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* TIMER COMPONENT */}
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

            {/* TASK LIST */}
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
                        <Link href="/projects" onClick={(e) => e.stopPropagation()} className="text-[9px] font-bold text-blue-500 hover:text-blue-700 hover:underline uppercase tracking-tighter truncate block w-fit">
                          {t.projectName}
                        </Link>
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
              </div>
            </div>

            {/* 🔥 完全復活したライブアクティビティフィード（メンバー用） */}
            <ActivityFeed feed={activityFeed} currentUserId={userId} router={router} />

          </div>

          {/* 右カラム：3in1パネルと期限 */}
          <div className="lg:col-span-5 space-y-6">
             
              {/* 🌟 3 in 1 Productivity Panel (NEW) */}
             <ProductivityPanel myTasks={myTasks} activeTask={activeTask} userId={userId} />

             <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-[32px] shadow-md flex flex-col max-h-[300px]">
                <h4 className="text-[10px] font-black text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={14} className="text-rose-500"/> 個人タスクの期限</h4>
                <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {myTasks.filter((t:any) => t.dueDate).sort((a:any, b:any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((t:any, i:number) => {
                        const isUrgent = new Date(t.dueDate).getTime() - Date.now() < 86400000 * 2;
                        return (
                          <Link href="/tasks" key={i} className="flex items-center gap-3 group hover:bg-white/50 p-1.5 -ml-1.5 rounded-xl transition-colors cursor-pointer">
                            <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm ${isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-800'}`}>
                              <span className="text-[7px] font-black uppercase opacity-60">{new Date(t.dueDate).toLocaleString('ja-JP', {month:'short'})}</span>
                              <span className="text-sm font-black leading-none">{new Date(t.dueDate).getDate()}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{t.title}</p>
                              <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">{t.projectName}</p>
                            </div>
                          </Link>
                        );
                    })}
                </div>
             </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// 🌟 NEW COMPONENT: 3 in 1 Productivity Panel
// ---------------------------------------------------------
function ProductivityPanel({ myTasks, activeTask, userId }: { myTasks: any[], activeTask: any, userId: string }) {
  const router = useRouter(); // 🌟 NEW: UI更新用
  const [activeTab, setActiveTab] = useState<"AI_PLAN" | "TIME_CHART" | "SUBTASKS">("SUBTASKS");
  const [aiPlan, setAiPlan] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const cachedPlan = localStorage.getItem(`nexus_ai_plan_${userId}`);
    if (cachedPlan) setAiPlan(cachedPlan);
  }, [userId]);

  const timeChartData = useMemo(() => {
    const map = new Map();
    myTasks.forEach(t => {
      if (t.timeElapsed > 0) map.set(t.projectName, (map.get(t.projectName) || 0) + t.timeElapsed);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [myTasks]);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    const tasksToAnalyze = myTasks.map((t: any) => ({ title: t.title, priority: t.priority, due: t.dueDate }));
    const plan = await generatePersonalFocusPlan(JSON.stringify(tasksToAnalyze));
    setAiPlan(plan);
    localStorage.setItem(`nexus_ai_plan_${userId}`, plan);
    setIsGenerating(false);
  };

  const extractChecklists = (desc: string) => {
    if (!desc) return [];
    return desc.split('\n').filter(line => line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]'));
  };
  const activeSubtasks = extractChecklists(activeTask?.description || "");

  // 🌟 NEW: サブタスク自動完了ロジック
  const handleToggleSubtask = async (line: string) => {
    if (!activeTask) return;
    const isChecked = line.includes('- [x]');
    const newLine = isChecked ? line.replace('- [x]', '- [ ]') : line.replace('- [ ]', '- [x]');
    const newDesc = activeTask.description.replace(line, newLine);
    
    await updateTaskDescription(activeTask.id, newDesc);

    const totalBoxes = (newDesc.match(/- \[[ xX]\]/g) || []).length;
    const doneBoxes = (newDesc.match(/- \[[xX]\]/g) || []).length;
    const isAllDone = totalBoxes > 0 && totalBoxes === doneBoxes;

    if (isAllDone && activeTask.status !== "DONE") {
      // 🎉 紙吹雪アニメーション！
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      await autoCompleteTask(activeTask.id);
      
      // タイマーが動いていたら自動で停止する
      const savedTaskId = localStorage.getItem("nexus_active_task_id");
      if (savedTaskId === activeTask.id) {
        localStorage.setItem("nexus_timer_running", "false");
      }
    }
    router.refresh();
  };
  return (
    <div className="bg-white/50 backdrop-blur-2xl border border-white/80 rounded-[32px] shadow-xl overflow-hidden flex flex-col h-[380px]">
      
      {/* Tabs */}
      <div className="flex bg-slate-100/50 p-2 gap-2 border-b border-white">
        <button onClick={() => setActiveTab("SUBTASKS")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeTab === 'SUBTASKS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:bg-white/50'}`}>
          <CheckSquare size={14}/> 進行中タスク
        </button>
        <button onClick={() => setActiveTab("TIME_CHART")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeTab === 'TIME_CHART' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-white/50'}`}>
          <PieChartIcon size={14}/> タイム投資
        </button>
        <button onClick={() => setActiveTab("AI_PLAN")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeTab === 'AI_PLAN' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/50'}`}>
          <Sparkles size={14}/> AI戦略
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        
        {/* TAB 1: SUBTASKS */}
        {activeTab === "SUBTASKS" && (
          <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
            {activeTask ? (
              <>
                <h4 className="text-[11px] font-black text-slate-800 mb-4">{activeTask.title} のサブタスク</h4>
                {activeSubtasks.length > 0 ? (
                  <div className="space-y-2">
                    {activeSubtasks.map((line, i) => {
                      const isChecked = line.includes('- [x]');
                      const text = line.replace('- [ ] ', '').replace('- [x] ', '');
                      return (
                        <div key={i} onClick={() => handleToggleSubtask(line)} className="flex items-start gap-2.5 p-3 bg-white/60 rounded-xl border border-white shadow-sm cursor-pointer hover:border-blue-300 transition-colors group">
                          <div className={`mt-0.5 shrink-0 transition-colors ${isChecked ? 'text-emerald-500' : 'text-slate-300 group-hover:text-blue-400'}`}>
                            {isChecked ? <CheckCircle size={16} /> : <div className="w-4 h-4 rounded-md border-2 border-current"></div>}
                          </div>
                          <span className={`text-[11px] font-bold leading-tight ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{text}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-70">
                    <CheckSquare size={32} className="mb-2" />
                    <p className="text-[10px] font-bold text-center">タスク詳細にチェックリスト (- [ ]) が<br/>含まれていません。</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-70">
                <Play size={32} className="mb-2" />
                <p className="text-[10px] font-bold">左のリストからタスクを選択して<br/>タイマーを開始してください</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TIME CHART */}
        {activeTab === "TIME_CHART" && (
          <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">プロジェクト別 投資時間</h4>
            {timeChartData.length > 0 ? (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={timeChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {timeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{fill: 'transparent'}} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                   {timeChartData.map((entry, index) => (
                     <div key={index} className="flex items-center gap-1">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                       <span className="text-[8px] font-bold text-slate-600">{entry.name}</span>
                     </div>
                   ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-70">
                <PieChartIcon size={32} className="mb-2" />
                <p className="text-[10px] font-bold">まだ作業時間の記録がありません</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI PLAN */}
        {activeTab === "AI_PLAN" && (
          <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5"><Sparkles size={12}/> Focus Plan</h4>
              <button onClick={handleGeneratePlan} disabled={isGenerating} className="text-[9px] font-black bg-purple-100 text-purple-600 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors disabled:opacity-50">
                {isGenerating ? "生成中..." : aiPlan ? "再生成する" : "プランを作成"}
              </button>
            </div>
            
            {aiPlan ? (
              <div className="flex-1 bg-purple-50/50 p-4 rounded-2xl border border-purple-100/50 overflow-y-auto custom-scrollbar text-[11px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                {aiPlan}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-purple-400/70 bg-purple-50/30 rounded-2xl border border-purple-100/50 border-dashed">
                <Sparkles size={32} className="mb-3" />
                <p className="text-[10px] font-bold text-center leading-relaxed">右上のボタンを押すと、<br/>AIが今日の最適な戦略を提案します。</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}


// ---------------------------------------------------------
// 🌟 COMPONENT: Activity Feed (Interactive for ALL users)
// ---------------------------------------------------------
function ActivityFeed({ feed, currentUserId, router }: any) {
  return (
    <div className="bg-white/30 backdrop-blur-2xl border border-white/60 p-6 rounded-[32px] shadow-lg flex flex-col max-h-[500px]">
      <h4 className="text-[10px] font-black text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2">
         <History size={14} className="text-blue-500"/> ライブ・アクティビティ
      </h4>
      <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar flex-1">
         {feed.map((t: any) => (
           <InteractiveFeedItem key={t.id} task={t} currentUserId={currentUserId} router={router} />
         ))}
      </div>
    </div>
  );
}

function InteractiveFeedItem({ task, currentUserId, router }: any) {
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState("");
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
    setShowAllComments(true);
    router.refresh();
  };

  const reactionsMap = task.reactions?.reduce((acc: any, r: any) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [] };
    acc[r.emoji].count += 1;
    acc[r.emoji].users.push(r.user?.name || "Unknown");
    return acc;
  }, {}) || {};

  return (
    <div className="relative group bg-white/60 backdrop-blur-md p-5 rounded-[28px] border border-white/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
       
       <div className="absolute -top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 bg-slate-900/90 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-xl z-10 border border-white/20 scale-95 group-hover:scale-100">
          {['🔥', '👍', '👀'].map(emoji => (
             <button key={emoji} onClick={() => handleReaction(emoji)} className="hover:scale-125 transition-transform text-xs px-1">
               {emoji}
             </button>
          ))}
          <div className="w-[1px] bg-white/20 mx-1"></div>
          <button onClick={() => setShowCommentBox(!showCommentBox)} className="text-white/80 hover:text-white px-1 flex items-center justify-center">
             <MessageSquare size={14}/>
          </button>
       </div>

       <div className="flex items-start gap-4">
          <div className="mt-1 shrink-0">
             <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-inner ${task.status === 'DONE' ? 'bg-emerald-500' : task.status === 'BLOCKED' ? 'bg-rose-500' : 'bg-blue-500'}`}>
                {task.status === 'DONE' ? <CheckCircle size={14}/> : task.status === 'BLOCKED' ? <ShieldAlert size={14}/> : <Activity size={14}/>}
             </div>
          </div>
          
          <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                <span className="font-black text-slate-900">{task.assignee?.name || "未割当"}</span> 
                {task.status === 'DONE' ? ' がタスクを完了しました ' : task.status === 'BLOCKED' ? ' がブロックされています ' : ' がタスクを進行中です '}
             </p>
             {/* 🌟 修正: Linkコンポーネントにして hover:underline を追加 */}
             <Link href="/tasks" className="font-black text-sm text-slate-800 mt-0.5 hover:text-blue-600 hover:underline block w-fit">"{task.title}"</Link>
             <Link href="/projects" className="text-[9px] font-bold text-blue-500 mt-1.5 uppercase tracking-widest flex items-center gap-1 hover:text-blue-700 hover:underline w-fit">
               <Folder size={10}/> {task.projectName}
             </Link>
             
             {(Object.keys(reactionsMap).length > 0 || task.comments?.length > 0) && (
               <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200/60">
                  {Object.entries(reactionsMap).map(([emoji, data]: any) => (
                    <div key={emoji} className="relative group/tooltip">
                      <button onClick={() => handleReaction(emoji)} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-black hover:bg-slate-50 transition-colors shadow-sm">
                         {emoji} <span className="text-slate-500">{data.count}</span>
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                        {data.users.join(", ")}
                      </div>
                    </div>
                  ))}
                  {task.comments?.length > 0 && (
                    <button onClick={() => setShowAllComments(!showAllComments)} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg border border-slate-200 transition-colors">
                      <MessageSquare size={12}/> {task.comments.length} 件のコメント
                    </button>
                  )}
               </div>
             )}

             {task.comments?.length > 0 && !showCommentBox && (
                <div className="mt-4 space-y-3">
                  {(showAllComments ? task.comments : task.comments.slice(-1)).map((comment: any) => (
                    <div key={comment.id} className="bg-white/80 p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-black text-slate-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[8px]">{comment.user?.name?.charAt(0)}</span>
                          {comment.user?.name}
                        </p>
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{new Date(comment.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.text}
                      </div>
                    </div>
                  ))}
                </div>
             )}

             {showCommentBox && (
                <form onSubmit={handleComment} className="mt-4 flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                   <input 
                     type="text" 
                     autoFocus
                     value={commentText} 
                     onChange={(e) => setCommentText(e.target.value)} 
                     placeholder="コメントを入力..." 
                     className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 shadow-inner text-slate-800"
                   />
                   <button type="submit" className="w-10 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center transition-colors shadow-md">
                      <Send size={14} className="ml-0.5" />
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

// ---------------------------------------------------------
// 🌟 NEW: Custom Tooltip for Recharts (チャートのガクガクを完全に防止)
// ---------------------------------------------------------
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white p-3 rounded-2xl shadow-xl pointer-events-none">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-400">{payload[0].name}</p>
        <p className="text-lg font-black">{Math.floor(payload[0].value / 60)} <span className="text-[10px]">分</span></p>
      </div>
    );
  }
  return null;
};