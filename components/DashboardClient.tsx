"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Folder, Pause, Play, Sparkles, BarChart2, ShieldAlert, 
  CheckCircle, Clock, LayoutGrid, TrendingUp, Calendar, Target, Zap, Users,
  ArrowRight, Activity, AlertCircle, ListChecks
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, LineChart, Line, CartesianGrid, AreaChart, Area
} from "recharts";
import { toggleTaskStatus, updateTaskTime } from "@/lib/actions";

export default function DashboardClient({ userName, userId, userRole, stats, projects }: any) {
  const router = useRouter();
  const isManager = userRole === "MANAGER";

  // --- データ計算 ---
  const allTasks = useMemo(() => projects.flatMap((p: any) => p.tasks.map((t: any) => ({ ...t, projectName: p.name }))), [projects]);
  const myTasks = useMemo(() => allTasks.filter((t: any) => t.assigneeId === userId && t.status !== "DONE"), [allTasks, userId]);
  
  const weeklyTotal = allTasks.length;
  const weeklyDone = allTasks.filter((t:any) => t.status === "DONE").length;
  const weeklyGoalPercent = weeklyTotal > 0 ? Math.round((weeklyDone / weeklyTotal) * 100) : 0;

  const teamPerformanceData = useMemo(() => {
    const memberStats: any = {};
    projects.forEach((p: any) => {
      p.members.forEach((m: any) => {
        if (!memberStats[m.id]) memberStats[m.id] = { name: m.name, done: 0, total: 0 };
      });
      p.tasks.forEach((t: any) => {
        if (t.assigneeId && memberStats[t.assigneeId]) {
          memberStats[t.assigneeId].total += 1;
          if (t.status === "DONE") memberStats[t.assigneeId].done += 1;
        }
      });
    });
    return Object.values(memberStats);
  }, [projects]);

  const velocityData = useMemo(() => {
    return projects.map((p: any) => {
      const total = p.tasks.length;
      const completed = p.tasks.filter((t: any) => t.status === "DONE").length;
      return { name: p.name, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });
  }, [projects]);

  // --- タイマー ---
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const lastSyncTime = useRef<number>(0);

  useEffect(() => {
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
  }, [allTasks]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && activeTaskId) {
      interval = setInterval(() => setDisplaySeconds(prev => prev + 1), 1000);
    }
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

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const activeTask = allTasks.find((t: any) => t.id === activeTaskId);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6 animate-in fade-in duration-700 text-slate-900">
      
      {/* HEADER: コンパクト化 */}
      <div className="flex justify-between items-center px-8 py-6 bg-white/30 backdrop-blur-xl border border-white/40 rounded-[32px] shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Zap size={20} fill="currentColor"/>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{isManager ? "HQ Command" : `Mission Log: ${userName.split(' ')[0]}`}</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{isManager ? "Administrative Control" : "Operational Stream"}</p>
          </div>
        </div>
        {!isManager && (
          <Link href="/nippo" className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:scale-105 transition-all flex items-center gap-2 shadow-xl">
            <Sparkles size={16} className="text-blue-400" /> AI Report
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: メインコンテンツ */}
        <div className="lg:col-span-8 space-y-6">
          
          {!isManager && (
            <>
              {/* COMPACT TIMER SECTION */}
              <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-8 rounded-[40px] shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currently Active</span>
                      <h2 className="text-2xl font-black leading-tight text-slate-800">{activeTask ? activeTask.title : "Ready for Mission Selection"}</h2>
                      <p className="text-xs font-bold text-blue-500 mt-1">{activeTask ? activeTask.projectName : "Select from the queue below"}</p>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-4">
                      <button 
                        disabled={!activeTaskId}
                        onClick={handleToggleTimer}
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isTimerRunning ? 'bg-white text-rose-500 border border-rose-100' : 'bg-blue-600 text-white shadow-blue-500/30'}`}
                      >
                        {isTimerRunning ? <Pause size={28} strokeWidth={3} /> : <Play size={28} fill="currentColor" className="ml-1" />}
                      </button>
                      <div className="text-3xl font-mono font-black text-slate-700 tracking-tighter">
                        {formatTime(displaySeconds)}
                      </div>
                    </div>
                  </div>
                  
                  {/* QUICK STATS IN TIMER */}
                  <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                    <div className="p-4 bg-white/60 rounded-2xl border border-white text-center min-w-[100px]">
                       <p className="text-[9px] font-black text-slate-400 uppercase">Assigned</p>
                       <p className="text-xl font-black">{myTasks.length}</p>
                    </div>
                    <div className="p-4 bg-white/60 rounded-2xl border border-white text-center min-w-[100px]">
                       <p className="text-[9px] font-black text-slate-400 uppercase">Session</p>
                       <p className="text-xl font-black text-blue-600">{Math.floor(displaySeconds / 60)}<span className="text-[10px] ml-0.5">m</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* MISSION QUEUE: 高密度リスト */}
              <div className="bg-white/20 backdrop-blur-xl border border-white/60 rounded-[40px] p-8 overflow-hidden flex flex-col max-h-[500px]">
                <div className="flex justify-between items-center mb-6 px-2">
                  <h3 className="text-lg font-black flex items-center gap-2 italic"><ListChecks className="text-blue-500" size={20}/> Mission Queue</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase">{myTasks.length} Operations Pending</span>
                </div>
                <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {myTasks.map((t: any) => (
                    <div 
                      key={t.id} 
                      onClick={() => {
                        if (isTimerRunning) handleToggleTimer();
                        setActiveTaskId(t.id);
                        setDisplaySeconds(t.timeElapsed || 0);
                        localStorage.setItem("nexus_active_task_id", t.id);
                        localStorage.setItem("nexus_timer_running", "false");
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${activeTaskId === t.id ? 'bg-white shadow-lg border-blue-400 ring-2 ring-blue-50' : 'bg-white/40 border-white hover:bg-white/80'}`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${t.priority === 'HIGH' ? 'bg-rose-500' : t.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-slate-800 truncate">{t.title}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t.projectName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-600">{formatTime(t.timeElapsed)}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Logged</p>
                        </div>
                        <ArrowRight size={14} className={`text-slate-300 ${activeTaskId === t.id ? 'text-blue-500 translate-x-1' : ''} transition-all`}/>
                      </div>
                    </div>
                  ))}
                  {myTasks.length === 0 && (
                    <div className="py-12 text-center bg-white/10 rounded-3xl border-2 border-dashed border-white/20">
                      <p className="text-slate-400 font-bold text-sm">No missions assigned. Standing by.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {isManager && (
            <div className="space-y-6">
              <div className="bg-white/30 backdrop-blur-3xl border border-white p-8 rounded-[40px] shadow-xl">
                 <h3 className="text-xl font-black text-slate-900 mb-6 italic">Team Operational Load</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamPerformanceData.map((m: any, i: number) => (
                      <div key={i} className="p-5 bg-white/60 rounded-3xl border border-white shadow-sm">
                         <div className="flex justify-between items-center mb-3">
                            <span className="font-black text-sm text-slate-800">{m.name}</span>
                            <span className="text-[10px] font-black text-indigo-600">{m.done}/{m.total}</span>
                         </div>
                         <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{width: m.total > 0 ? `${(m.done/m.total)*100}%` : '0%'}} />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: サイドバーパネル */}
        <div className="lg:col-span-4 space-y-6">
           
           {/* PERFORMANCE TILE: コンパクト化 */}
           <div className="bg-slate-950 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden border-b-4 border-cyan-500">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={60} /></div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-4">Weekly Output</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-black italic">{weeklyGoalPercent}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Efficiency</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000" style={{width: `${weeklyGoalPercent}%`}} />
              </div>
           </div>

           {/* DEADLINES: 高密度スクロールリスト */}
           <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-[40px] shadow-md flex flex-col max-h-[400px]">
              <h4 className="text-xs font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={16} className="text-rose-500"/> Critical Deadlines</h4>
              <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {allTasks.filter((t:any) => t.dueDate && t.status !== "DONE")
                  .sort((a:any, b:any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .map((t:any, i:number) => {
                    const isUrgent = new Date(t.dueDate).getTime() - Date.now() < 86400000 * 2;
                    return (
                      <div key={i} className="flex items-center gap-4 group">
                        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm ${isUrgent ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
                          <span className="text-[7px] font-black uppercase opacity-60">{new Date(t.dueDate).toLocaleString('en-us', {month:'short'})}</span>
                          <span className="text-sm font-black leading-none">{new Date(t.dueDate).getDate()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{t.title}</p>
                          <p className="text-[9px] font-bold text-slate-400 truncate uppercase mt-0.5">{t.projectName}</p>
                        </div>
                      </div>
                    )
                })}
              </div>
           </div>

           {/* SUMMARY TILE */}
           <div className="bg-blue-600 rounded-[32px] p-6 text-white shadow-xl shadow-blue-500/20">
              <h4 className="text-[9px] font-black uppercase tracking-[0.2em] mb-4">Department Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-bold uppercase opacity-60">Total Active</p>
                  <p className="text-xl font-black italic">{allTasks.filter((t:any) => t.status !== "DONE").length}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase opacity-60">Secured</p>
                  <p className="text-xl font-black italic">{weeklyDone}</p>
                </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}

function StatTile({ title, value, icon, color }: any) {
  return (
    <div className="bg-white/30 backdrop-blur-xl rounded-[32px] p-6 border border-white shadow-md hover:shadow-lg transition-all group overflow-hidden">
      <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">{title}</p>
      <h2 className="text-3xl font-black text-slate-800 italic">{value}</h2>
    </div>
  );
}