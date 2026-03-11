"use client";

import { useState, useEffect, useRef } from "react";
import { CheckSquare, Clock, ShieldAlert, Activity, LayoutGrid, Calendar, AlertCircle, Play, Pause } from "lucide-react";
import { updateTaskStatusDrag } from "./actions";
import { updateTaskTime } from "@/lib/actions";
import { useRouter } from "next/navigation";

const COLUMNS = [
  { id: "TODO", label: "未着手", icon: <CheckSquare size={18} />, color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200" },
  { id: "IN_PROGRESS", label: "進行中", icon: <Activity size={18} />, color: "text-blue-500", bg: "bg-blue-100", border: "border-blue-200" },
  { id: "BLOCKED", label: "ブロック", icon: <ShieldAlert size={18} />, color: "text-rose-500", bg: "bg-rose-100", border: "border-rose-200" },
  { id: "DONE", label: "完了", icon: <LayoutGrid size={18} />, color: "text-emerald-500", bg: "bg-emerald-100", border: "border-emerald-200" }
];

export default function TasksClient({ initialTasks, userId, userRole }: any) {
  const router = useRouter();
  const isManager = userRole === "MANAGER";
  
  const [tasks, setTasks] = useState(initialTasks);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // --- タイマー連携ロジック（ダッシュボードと共通） ---
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const lastSyncTime = useRef<number>(0);

  useEffect(() => {
    const savedTaskId = localStorage.getItem("nexus_active_task_id");
    const savedStartTimestamp = localStorage.getItem("nexus_timer_start_at");
    const savedRunning = localStorage.getItem("nexus_timer_running") === "true";

    if (savedTaskId) {
      const task = tasks.find((t: any) => t.id === savedTaskId);
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
  }, [tasks]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && activeTaskId) interval = setInterval(() => setDisplaySeconds(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, activeTaskId]);

  const toggleTimerForTask = async (task: any) => {
    // 停止処理
    if (activeTaskId === task.id && isTimerRunning) {
      const diff = displaySeconds - lastSyncTime.current;
      if (diff > 0) await updateTaskTime(task.id, diff);
      localStorage.setItem("nexus_timer_running", "false");
      setIsTimerRunning(false);
    } else {
      // 開始処理（他のタイマーが動いていたら止める）
      if (activeTaskId && isTimerRunning) {
        const diff = displaySeconds - lastSyncTime.current;
        if (diff > 0) await updateTaskTime(activeTaskId, diff);
      }
      setActiveTaskId(task.id);
      setDisplaySeconds(task.timeElapsed || 0);
      lastSyncTime.current = task.timeElapsed || 0;
      setIsTimerRunning(true);
      localStorage.setItem("nexus_active_task_id", task.id);
      localStorage.setItem("nexus_timer_start_at", Date.now().toString());
      localStorage.setItem("nexus_timer_running", "true");
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };
  // ----------------------------------------------------

  // --- ドラッグ＆ドロップ処理 ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const task = tasks.find((t:any) => t.id === taskId);
    if (task?.status === colId) return; // 同じカラムなら何もしない

    // 楽観的UI更新（即座に移動）
    setTasks((prev: any) => prev.map((t: any) => t.id === taskId ? { ...t, status: colId } : t));

    // バックエンド更新
    const res = await updateTaskStatusDrag(taskId, colId);
    if (!res.success) {
      alert("タスクの移動に失敗しました");
      router.refresh(); // エラー時は元に戻す
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-sm font-black text-blue-600 uppercase tracking-widest mb-1">
            {isManager ? "Team Tasks Kanban" : "My Tasks Kanban"}
          </p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            {isManager ? "チームタスク管理" : "マイタスク管理"}
          </h1>
        </div>
        <div className="px-6 py-2 bg-white/60 border border-white rounded-full text-xs font-black text-slate-500 shadow-sm">
          {isManager ? `全チームタスク: ${tasks.length}件` : `担当タスク: ${tasks.length}件`}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter((t: any) => t.status === col.id);
          const isDragOver = dragOverCol === col.id;
          
          return (
            <div 
              key={col.id} 
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col h-[75vh] rounded-[32px] p-2 transition-all duration-300 ${isDragOver ? `bg-white/60 ring-2 ring-blue-400 shadow-xl` : 'bg-transparent'}`}
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between p-4 mb-4 rounded-2xl border ${col.border} shadow-sm backdrop-blur-md bg-white/60`}>
                 <div className="flex items-center gap-2 font-black text-sm text-slate-800">
                    <span className={`${col.color}`}>{col.icon}</span> {col.label}
                 </div>
                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${col.bg} ${col.color}`}>
                   {colTasks.length}
                 </span>
              </div>

              {/* Task List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
                {colTasks.map((task: any) => {
                  const isUrgent = task.dueDate && new Date(task.dueDate).getTime() - Date.now() < 86400000 * 2 && task.status !== "DONE";
                  
                  return (
                    <div 
                      key={task.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`group relative p-5 rounded-[24px] border shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-grab active:cursor-grabbing ${isUrgent ? 'bg-rose-50/90 border-rose-200' : 'bg-white/80 border-white/80 backdrop-blur-lg'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg ${
                          task.priority === 'HIGH' ? 'bg-rose-100 text-rose-600' : 
                          task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {task.priority === 'HIGH' ? '優先度: 高' : task.priority === 'MEDIUM' ? '優先度: 中' : '優先度: 低'}
                        </span>
                        
                        {/* アサイン状況の表示（マネージャーが他人のタスクを見る場合などに便利） */}
                        {!task.assigneeId && (
                          <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-slate-200 text-slate-500">未割当</span>
                        )}
                      </div>

                      <h3 className={`font-black text-sm mb-1 leading-snug ${task.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {task.title}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 truncate">
                        {task.project?.name || "プロジェクト未定"}
                      </p>

                      {/* 🔥 IN_PROGRESS の場合かつ自分のタスクの時のみタイマーを表示 */}
                      {task.status === "IN_PROGRESS" && task.assigneeId === userId && (
                        <div className="mb-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-3 flex justify-between items-center shadow-inner">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleTimerForTask(task)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-transform ${isTimerRunning && activeTaskId === task.id ? 'bg-rose-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:scale-110'}`}
                            >
                              {isTimerRunning && activeTaskId === task.id ? <Pause size={14}/> : <Play size={14} className="ml-0.5"/>}
                            </button>
                            <span className="text-[10px] font-bold text-blue-600">作業時間</span>
                          </div>
                          <span className="font-mono font-black text-base text-slate-700 tracking-tighter">
                            {activeTaskId === task.id ? formatTime(displaySeconds) : formatTime(task.timeElapsed || 0)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-3 border-t border-slate-200/50">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shadow-inner border border-white">
                             {task.assignee?.name?.charAt(0) || "?"}
                           </div>
                           {/* マネージャー画面用に名前も表示 */}
                           {isManager && <span className="text-[9px] font-bold text-slate-500">{task.assignee?.name || "未割当"}</span>}
                        </div>
                        
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 text-[10px] font-black ${isUrgent ? 'text-rose-500' : 'text-slate-400'}`}>
                            {isUrgent ? <AlertCircle size={12}/> : <Calendar size={12}/>}
                            {new Date(task.dueDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Drop Zone Placeholder */}
                {colTasks.length === 0 && (
                  <div className={`border-2 border-dashed rounded-[24px] p-8 text-center flex flex-col items-center justify-center transition-all ${isDragOver ? 'border-blue-400 bg-blue-50/50 text-blue-500' : 'border-slate-300/50 text-slate-400 opacity-60'}`}>
                    {col.icon}
                    <p className="text-[10px] font-bold mt-2">{isDragOver ? "ここにドロップ" : "タスクなし"}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}