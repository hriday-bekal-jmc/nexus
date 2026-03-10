"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder, Pause, Sparkles, BarChart2, ShieldAlert, Link as LinkIcon, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { toggleTaskStatus } from "@/lib/actions";

export default function DashboardClient({ userName, userId, userRole, stats, projects }: any) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const isManager = userRole === "MANAGER";

  const myTasks = projects.flatMap((p: any) => 
    p.tasks
      .filter((t: any) => t.assigneeId === userId && t.status !== "DONE")
      .map((t: any) => ({ ...t, projectName: p.name }))
  );

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const activeTask = myTasks.find((t: any) => t.id === activeTaskId) || myTasks[0];

  useEffect(() => {
    const savedTime = localStorage.getItem("nexus_timer");
    const savedState = localStorage.getItem("nexus_timer_running");
    if (savedTime) setSeconds(parseInt(savedTime, 10));
    if (savedState === "true") setIsTimerRunning(true);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && isLoaded && activeTask) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const newTime = prev + 1;
          localStorage.setItem("nexus_timer", newTime.toString());
          return newTime;
        });
      }, 1000);
      localStorage.setItem("nexus_timer_running", "true");
    } else if (isLoaded) {
      localStorage.setItem("nexus_timer_running", "false");
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isLoaded, activeTask]);

  const handleCompleteTask = async () => {
    if (!activeTask) return;
    const result = await toggleTaskStatus(activeTask.id, activeTask.status);
    if (result.success) {
      setIsTimerRunning(false);
      setActiveTaskId(null);
      router.refresh();
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  if (!isLoaded) return null;

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <p className="text-sm font-black text-blue-600/80 uppercase tracking-widest mb-1">
            {isManager ? "Command Center" : "Workspace"}
          </p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            {isManager ? "Manager Overview" : `Welcome back, ${userName.split(' ')[0]}`}
          </h1>
        </div>
        {/* 重複していた Launch Project を削除し、リンクに変更 */}
        <Link href={isManager ? "/projects" : "/tasks"} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/30 hover:-translate-y-1 transition-all flex items-center gap-2">
          {isManager ? <><Folder size={18} /> View Projects</> : "View My Tasks"}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {isManager ? (
            <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-[32px] shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><BarChart2 /> Task Distribution</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "To Do", value: stats.taskStats.todo, color: "#f97316" },
                    { name: "In Progress", value: stats.taskStats.inProgress, color: "#3b82f6" },
                    { name: "Blocked", value: stats.taskStats.blocked, color: "#ef4444" },
                    { name: "Done", value: stats.taskStats.done, color: "#10b981" },
                  ]}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      <Cell fill="#f97316"/><Cell fill="#3b82f6"/><Cell fill="#ef4444"/><Cell fill="#10b981"/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <>
              {/* Timer Section */}
              <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-[40px] p-10 text-white shadow-2xl border border-white/20">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight mb-2">
                      {activeTask ? `Focus: ${activeTask.title}` : "No active tasks"}
                    </h3>
                    {activeTask && <p className="text-blue-200 text-sm line-clamp-2">{activeTask.description}</p>}
                  </div>
                  {activeTask && (
                    <button onClick={handleCompleteTask} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105">
                      <CheckCircle size={18}/> Complete Task
                    </button>
                  )}
                </div>

                <div className="text-7xl font-mono font-light tracking-widest mb-8">{formatTime(seconds)}</div>
                
                <div className="flex gap-4">
                  <button onClick={() => setIsTimerRunning(!isTimerRunning)} disabled={!activeTask} className="px-8 py-3 bg-white/10 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Pause size={18} fill="currentColor" /> {isTimerRunning ? 'Pause Timer' : 'Start Work'}
                  </button>
                </div>
              </div>

              {/* My Task Queue */}
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-[32px] shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-6">My Task Queue</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {myTasks.length > 0 ? myTasks.map((task: any) => (
                    <div key={task.id} onClick={() => setActiveTaskId(task.id)} className={`p-5 rounded-2xl border cursor-pointer transition-all ${activeTask?.id === task.id ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-100' : 'bg-white border-slate-100 hover:border-blue-300 hover:shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 leading-tight pr-4">{task.title}</h4>
                        <span className={`text-[9px] font-black px-2 py-1 rounded-md shrink-0 ${task.priority === 'HIGH' ? 'bg-red-100 text-red-600' : task.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{task.priority}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{task.description || "No description provided."}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100/80">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                          <Folder size={12} className="text-blue-500"/> {task.projectName}
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400">
                            <Clock size={12}/> Due: {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10">
                      <p className="text-slate-500 text-sm font-bold">You have no pending tasks. Great job! 🎉</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Stats */}
        <div className="lg:col-span-4 space-y-6">
          <StatCard title={isManager ? "Active Projects" : "My Tasks"} value={isManager ? stats.projectCount : (stats.taskStats.todo + stats.taskStats.inProgress)} icon={<Folder />} />
          <StatCard title="Blocked" value={stats.taskStats.blocked} icon={<ShieldAlert />} color="text-red-500" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-[32px] p-8 border border-white/60 shadow-sm">
      <div className="text-blue-600 mb-4">{icon}</div>
      <p className="text-slate-500 font-bold text-xs uppercase mb-1">{title}</p>
      <h2 className={`text-5xl font-black text-slate-900 ${color}`}>{value}</h2>
    </div>
  );
}