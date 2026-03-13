"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import { CheckSquare, Activity, ShieldAlert, LayoutGrid, Calendar, AlertCircle, Play, Pause, AlignLeft, MessageSquare, X, ArrowDownWideNarrow, Sparkles, Send, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { updateTaskStatusDrag } from "./actions";
import { updateTaskTime, generateSubtasks, updateTaskDescription, reportBlocker, addTaskComment, deleteTaskComment, toggleCommentReaction } from "@/lib/actions";
import confetti from "canvas-confetti";

const MANAGER_COLUMNS = [
  { id: "TODO", label: "未着手", icon: <CheckSquare size={18} />, color: "text-slate-500", glow: "ring-slate-400" },
  { id: "IN_PROGRESS", label: "進行中", icon: <Activity size={18} />, color: "text-blue-500", glow: "ring-blue-400" },
  { id: "BLOCKED", label: "ブロック", icon: <ShieldAlert size={18} />, color: "text-rose-500", glow: "ring-rose-400" },
  { id: "DONE", label: "完了", icon: <LayoutGrid size={18} />, color: "text-emerald-500", glow: "ring-emerald-400" }
];

const MEMBER_COLUMNS = [
  { id: "TODO", label: "未着手", icon: <CheckSquare size={18} />, color: "text-slate-500", glow: "ring-slate-400" },
  { id: "IN_PROGRESS", label: "進行中", icon: <Activity size={18} />, color: "text-blue-500", glow: "ring-blue-400" },
  { id: "DONE", label: "完了", icon: <LayoutGrid size={18} />, color: "text-emerald-500", glow: "ring-emerald-400" }
];

export default function TasksClient({ initialTasks, userId, userRole }: any) {
  const router = useRouter();
  const isManager = userRole === "MANAGER";
  const COLUMNS = isManager ? MANAGER_COLUMNS : MEMBER_COLUMNS;
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // 1. タブが再び表示された（visibleになった）瞬間に、サーバーへ最新データを要求する
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        router.refresh(); // 画面をリロードせずに、裏側でデータだけを最新化
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);

  // 2. サーバーから最新の initialTasks が降ってきたら、画面のタスク一覧(State)を更新する
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const [tasks, setTasks] = useState(initialTasks);
  const [sortBy, setSortBy] = useState<"default" | "deadline" | "priority">("default");

  // 🌟 NEW: コンパクトモードの状態
  const [isCompact, setIsCompact] = useState(false);

  // 🌟 NEW: プロジェクト達成モーダルと特大紙吹雪
  const [celebration, setCelebration] = useState<{show: boolean, projectName: string}>({show: false, projectName: ""});

  const fireMassiveConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'] });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

//モーダルから直接ステータスを変更する関数
  const handleStatusChangeFromModal = async (newStatus: string) => {
    if (!selectedTask) return;
    const taskId = selectedTask.id;
    
    // 即座に画面に反映 (Optimistic UI)
    setTasks((prev: any) => prev.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t));
    setSelectedTask((prev: any) => ({ ...prev, status: newStatus }));

    // サーバーに送信
    const res = await updateTaskStatusDrag(taskId, newStatus);
    if (!res.success) {
      alert("ステータス更新に失敗しました");
      router.refresh();
    } else if (res.projectCompleted) {
      // 🏆 プロジェクト全完了時のド派手な演出！！
      fireMassiveConfetti();
      setCelebration({show: true, projectName: res.projectName});
    }
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a: any, b: any) => {
      if (sortBy === "deadline") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === "priority") {
        const pLevel: any = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return pLevel[b.priority] - pLevel[a.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, sortBy]);

  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  
  // Modal & AI States
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [commentText, setCommentText] = useState("");

  // チャットの自動スクロール用のRef
  const chatEndRef = useRef<HTMLDivElement>(null);

  // コメントが追加されたら一番下まで自動スクロール
  useEffect(() => {
    if (selectedTask && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTask?.comments]);

  // コメントへのリアクション機能
  const handleCommentReaction = async (commentId: string, emoji: string) => {
    // 楽観的UI更新（押した瞬間に反映させる）
    setSelectedTask((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: prev.comments.map((c: any) => {
          if (c.id === commentId) {
            const existing = c.reactions?.find((r: any) => r.emoji === emoji && r.userId === userId);
            let newReactions = c.reactions ? [...c.reactions] : [];
            if (existing) {
              newReactions = newReactions.filter((r: any) => r.id !== existing.id);
            } else {
              newReactions.push({ id: Math.random().toString(), emoji, userId, user: { name: "あなた" } });
            }
            return { ...c, reactions: newReactions };
          }
          return c;
        })
      };
    });
    await toggleCommentReaction(commentId, emoji);
    router.refresh();
  };

  // Blocker States
  const [blockingTask, setBlockingTask] = useState<any | null>(null);
  const [blockerReason, setBlockerReason] = useState("");
  const [isReportingBlock, setIsReportingBlock] = useState(false);
  const [askAI, setAskAI] = useState(false);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const lastSyncTime = useRef<number>(0);
  const displaySecondsRef = useRef(displaySeconds);

  useEffect(() => { displaySecondsRef.current = displaySeconds; }, [displaySeconds]);

  useEffect(() => {
    if (selectedTask) setEditDescription(selectedTask.description || "");
  }, [selectedTask?.id]);

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

  useEffect(() => {
    let autosaveInterval: any;
    if (isTimerRunning && activeTaskId) {
      autosaveInterval = setInterval(() => {
        const diff = displaySecondsRef.current - lastSyncTime.current;
        if (diff > 0) {
          updateTaskTime(activeTaskId, diff).catch(console.error);
          lastSyncTime.current = displaySecondsRef.current;
          localStorage.setItem("nexus_timer_start_at", Date.now().toString()); 
        }
      }, 15000);
    }
    return () => clearInterval(autosaveInterval);
  }, [isTimerRunning, activeTaskId]);

  const toggleTimerForTask = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (activeTaskId === task.id && isTimerRunning) {
      const diff = displaySeconds - lastSyncTime.current;
      if (diff > 0) await updateTaskTime(task.id, diff);
      localStorage.setItem("nexus_timer_running", "false");
      setIsTimerRunning(false);
    } else {
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

  // --- AI Subtasks & Details ---
  const handleGenerateSubtasks = async () => {
    setIsGeneratingSubtasks(true);
    const res = await generateSubtasks(selectedTask.title, editDescription);
    if (res.success) {
      const newDesc = editDescription 
        ? `${editDescription}\n\n### ✨ AI生成サブタスク\n${res.text}`
        : `### ✨ AI生成サブタスク\n${res.text}`;
      setEditDescription(newDesc);
    } else {
      alert(res.error);
    }
    setIsGeneratingSubtasks(false);
  };

const handleSaveDescription = async () => {
    setIsSavingDesc(true);
    
    // サブタスクの自動完了チェック機能
    const totalBoxes = (editDescription.match(/- \[[ xX]\]/g) || []).length;
    const doneBoxes = (editDescription.match(/- \[[xX]\]/g) || []).length;
    const isAllDone = totalBoxes > 0 && totalBoxes === doneBoxes;

    const res = await updateTaskDescription(selectedTask.id, editDescription);
    
    if (res.success) {
      if (isAllDone && selectedTask.status !== "DONE") {
        // ステータスを自動でDONEに変更
        const updatedTask = { ...selectedTask, description: editDescription, status: "DONE" };
        setSelectedTask(updatedTask);
        setTasks((prev: any) => prev.map((t: any) => t.id === selectedTask.id ? updatedTask : t));
        
        const statusRes = await updateTaskStatusDrag(selectedTask.id, "DONE");
        
        if (statusRes.projectCompleted) {
          // 🏆 プロジェクト全完了時のド派手な演出！！
          fireMassiveConfetti();
          setCelebration({show: true, projectName: statusRes.projectName});
        } else {
          // プロジェクト完了じゃなくてもタスク単体の完了なら通常の紙吹雪
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
      } else {
        // 通常の保存
        const updatedTask = { ...selectedTask, description: editDescription };
        setSelectedTask(updatedTask);
        setTasks((prev: any) => prev.map((t: any) => t.id === selectedTask.id ? updatedTask : t));
      }
    } else {
      alert(res.error);
    }
    setIsSavingDesc(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;
    
    const text = commentText;
    setCommentText("");

    const optimisticComment = {
      id: Math.random().toString(),
      text: text,
      userId: userId,
      user: { name: "送信中..." },
      createdAt: new Date().toISOString()
    };
    setSelectedTask((prev: any) => ({ ...prev, comments: [...(prev.comments || []), optimisticComment] }));

    await addTaskComment(selectedTask.id, text);
    router.refresh();
  };

  // 🌟 NEW: コメント削除機能
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("このコメントを削除してもよろしいですか？")) return;
    
    // 楽観的UI更新（即座に画面から消す）
    setSelectedTask((prev: any) => ({
      ...prev,
      comments: prev.comments.filter((c: any) => c.id !== commentId)
    }));

    const res = await deleteTaskComment(commentId);
    if (!res.success) {
      alert(res.error);
      router.refresh(); // エラー時は元に戻す
    } else {
      router.refresh();
    }
  };

  // --- Blocker ---
  const toggleBlockedStatus = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.status === "BLOCKED") {
      const newStatus = "IN_PROGRESS";
      setTasks((prev: any) => prev.map((t: any) => t.id === task.id ? { ...t, status: newStatus } : t));
      await updateTaskStatusDrag(task.id, newStatus);
      router.refresh();
    } else {
      setBlockingTask(task);
      setBlockerReason("");
      setAskAI(false); // モーダルを開く時はAIオプションを毎回OFFにする
    }
  };

  const submitBlocker = async () => {
    if (!blockerReason.trim()) return;
    setIsReportingBlock(true);
    setTasks((prev: any) => prev.map((t: any) => t.id === blockingTask.id ? { ...t, status: "BLOCKED" } : t));
    
    //  引数に askAI を追加
    const res = await reportBlocker(blockingTask.id, blockingTask.title, blockerReason, askAI);
    
    if (!res.success) {
      alert(res.error);
      router.refresh();
    }
    setIsReportingBlock(false);
    setBlockingTask(null);
  };


  // --- DnD ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    setDraggingTaskId(taskId);
    setTimeout(() => setDraggingTaskId(taskId), 0); 
  };
  const handleDragEnd = () => { setDraggingTaskId(null); setDragOverCol(null); };
const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    setDragOverCol(null);
    setDraggingTaskId(null);
    if (!taskId) return;
    const task = tasks.find((t:any) => t.id === taskId);
    if (task?.status === colId) return;

    if (taskId === activeTaskId && colId !== "IN_PROGRESS" && isTimerRunning) {
       const diff = displaySecondsRef.current - lastSyncTime.current;
       if (diff > 0) await updateTaskTime(activeTaskId, diff);
       setIsTimerRunning(false);
       setActiveTaskId(null);
       localStorage.removeItem("nexus_active_task_id");
       localStorage.removeItem("nexus_timer_running");
    }
    setTasks((prev: any) => prev.map((t: any) => t.id === taskId ? { ...t, status: colId } : t));
    
    const res = await updateTaskStatusDrag(taskId, colId);
    if (!res.success) {
      alert("タスクの移動に失敗しました");
      router.refresh(); 
    } else if (res.projectCompleted) {
      // 🏆 プロジェクト全完了時のド派手な演出！！
      fireMassiveConfetti();
      setCelebration({show: true, projectName: res.projectName});
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-pulse text-blue-500 font-black tracking-widest text-xl">LOADING TASKS...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <p className="text-sm font-black text-blue-600 uppercase tracking-widest mb-1">
            {isManager ? "Team Tasks Kanban" : "My Tasks Kanban"}
          </p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight drop-shadow-sm">
            {isManager ? "チームタスク管理" : "マイタスク管理"}
          </h1>
        </div>
        
        <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md border border-white/60 p-2 rounded-2xl shadow-sm">
          {/* 🌟 NEW: コンパクトモード切替ボタン（マネージャーのみ） */}
          {isManager && (
            <button 
              onClick={() => setIsCompact(!isCompact)}
              className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${isCompact ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 hover:border-blue-300'}`}
            >
              {isCompact ? <><Maximize2 size={12}/> 詳細表示 </> : <><Minimize2 size={12}/> 俯瞰モード </>}
            </button>
          )}

          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-1">
            <ArrowDownWideNarrow size={14}/> 並び替え
          </span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white text-xs font-bold text-slate-700 px-3 py-2 rounded-xl outline-none shadow-sm cursor-pointer border border-white/80 hover:border-blue-300 transition-colors"
          >
            <option value="default">追加された順</option>
            <option value="deadline">⏳ 期限が近い順</option>
            <option value="priority">🔥 優先度が高い順</option>
          </select>
        </div>
      </div>

      {/* 🌟 改善: グリッドレイアウトの動的切り替え */}
      <div className={`grid gap-8 transition-all duration-500 ease-in-out ${
        isManager 
          ? (isCompact ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-2') 
          : 'grid-cols-1 lg:grid-cols-3'
      }`}>
        {COLUMNS.map(col => {
          const colTasks = sortedTasks.filter((t: any) => {
            if (!isManager && col.id === "IN_PROGRESS") return t.status === "IN_PROGRESS" || t.status === "BLOCKED";
            return t.status === col.id;
          });
          const isDragOver = dragOverCol === col.id;
          
          return (
            <div 
              key={col.id} 
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              // 🌟 改善: 2列モードの時は縦に長くなりすぎないように高さを制限、4列の時は下まで伸ばす
              className={`flex flex-col ${isManager && !isCompact ? 'h-[55vh]' : 'h-[75vh]'} rounded-[40px] p-5 transition-all duration-500 ease-out border border-white/20
                ${isDragOver ? `bg-white/20 scale-[1.02] ring-4 shadow-2xl ${col.glow}` : 'bg-white/10 backdrop-blur-2xl shadow-lg'}
              `}
            >
              <div className="flex items-center justify-between mb-6 px-2">
                 <div className={`flex items-center gap-2 font-black text-sm ${col.color} drop-shadow-md`}>
                    {col.icon} {col.label}
                 </div>
                 <span className="px-3 py-1 rounded-full text-xs font-black bg-white/40 text-slate-700 shadow-inner">
                   {colTasks.length}
                 </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
                {colTasks.map((task: any) => {
                  const isDragging = draggingTaskId === task.id;
                  const isBlocked = task.status === "BLOCKED";
                  const isUrgent = task.dueDate && new Date(task.dueDate).getTime() - Date.now() < 86400000 * 2 && task.status !== "DONE";
                  
                  let cardStyle = "bg-white/40 backdrop-blur-md border-white/50 hover:bg-white/60 shadow-lg";
                  if (isBlocked) cardStyle = "bg-rose-500/10 backdrop-blur-md border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse";
                  else if (isUrgent) cardStyle = "bg-amber-500/10 backdrop-blur-md border-amber-500/50 shadow-md";
                  if (isDragging) cardStyle = "bg-blue-500/20 backdrop-blur-xl border-blue-500 ring-4 ring-blue-500/50 scale-95 opacity-60";

                  return (
                    <div 
                      key={task.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedTask(task)} 
                      className={`group relative ${isCompact ? 'p-3 rounded-[20px]' : 'p-5 rounded-[28px]'} border transition-all duration-300 cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-xl ${cardStyle}`}
                    >
                      <div className={`flex justify-between items-start ${isCompact ? 'mb-2' : 'mb-3'}`}>
                        <span className={`text-[9px] font-black px-3 py-1 rounded-xl shadow-inner border border-white/40 ${
                          task.priority === 'HIGH' ? 'bg-rose-500 text-white' : 
                          task.priority === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                          {task.priority === 'HIGH' ? '優先度: 高' : task.priority === 'MEDIUM' ? '優先度: 中' : '優先度: 低'}
                        </span>
                        {!isManager && (task.status === "IN_PROGRESS" || task.status === "BLOCKED") && (
                          <button 
                            onClick={(e) => toggleBlockedStatus(task, e)}
                            className={`p-1.5 rounded-xl transition-all ${isBlocked ? 'bg-rose-500 text-white shadow-lg' : 'bg-white/50 text-slate-400 hover:text-rose-500 hover:bg-white'}`}
                            title={isBlocked ? "ブロックを解除" : "障害を報告"}
                          >
                            <ShieldAlert size={14} />
                          </button>
                        )}
                      </div>

                      <h3 className={`font-black ${isCompact ? 'text-xs' : 'text-sm'} mb-2 leading-snug drop-shadow-sm ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                        {task.title}
                      </h3>
                      
                      {/* 🌟 詳細モードの時のみ表示 */}
                      {!isCompact && (
                        <>
                          {task.description && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mb-4">
                              <AlignLeft size={12} /> 詳細あり
                            </div>
                          )}

                          {task.status === "IN_PROGRESS" && task.assigneeId === userId && (
                            <div className="mb-4 bg-white/50 backdrop-blur-sm border border-white/60 rounded-2xl p-3 flex justify-between items-center shadow-inner group/timer hover:bg-white/80 transition-colors">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={(e) => toggleTimerForTask(task, e)}
                                  className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all shadow-md ${isTimerRunning && activeTaskId === task.id ? 'bg-rose-500 text-white animate-pulse' : 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white group-hover/timer:scale-110'}`}
                                >
                                  {isTimerRunning && activeTaskId === task.id ? <Pause size={14} fill="currentColor"/> : <Play size={14} fill="currentColor" className="ml-0.5"/>}
                                </button>
                              </div>
                              <span className="font-mono font-black text-lg text-slate-800 tracking-tighter drop-shadow-sm">
                                {activeTaskId === task.id ? formatTime(displaySeconds) : formatTime(task.timeElapsed || 0)}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-4 border-t border-slate-400/20">
                            <div className="flex items-center gap-2">
                               <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-200 to-white flex items-center justify-center text-[10px] font-black text-slate-600 shadow-md border border-white">
                                 {task.assignee?.name?.charAt(0) || "?"}
                               </div>
                               <div className="flex flex-col">
                                  {isManager && <span className="text-[9px] font-bold text-slate-700">{task.assignee?.name || "未割当"}</span>}
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{task.project?.name}</span>
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {task.comments?.length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                  <MessageSquare size={12}/> {task.comments.length}
                                </span>
                              )}
                              {task.dueDate && (
                                <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg bg-white/40 shadow-sm ${isUrgent ? 'text-rose-500' : 'text-slate-600'}`}>
                                  <AlertCircle size={10}/>
                                  {new Date(task.dueDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* 🌟 コンパクトモード用のフッター */}
                      {isCompact && (
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-300/30">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-slate-200 to-white flex items-center justify-center text-[8px] font-black text-slate-600 shadow-sm border border-white">{task.assignee?.name?.charAt(0) || "?"}</div>
                            {task.comments?.length > 0 && <span className="text-[8px] font-bold text-slate-400 flex items-center gap-0.5"><MessageSquare size={8}/> {task.comments.length}</span>}
                          </div>
                          {task.dueDate && <div className={`text-[8px] font-black ${isUrgent ? 'text-rose-500' : 'text-slate-400'}`}>{new Date(task.dueDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className={`h-32 border-2 border-dashed rounded-[28px] flex flex-col items-center justify-center transition-all duration-300 ${isDragOver ? 'border-blue-400 bg-blue-500/10 text-blue-600 scale-105' : 'border-white/40 text-slate-400/60'}`}>
                    <div className={isDragOver ? 'animate-bounce' : ''}>{col.icon}</div>
                    <p className="text-[10px] font-black mt-2 tracking-widest">{isDragOver ? "ここにドロップ！" : "タスクなし"}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* --- 🧊 TASK DETAIL MODAL (Split-Pane Layout) --- */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setSelectedTask(null)}></div>
          
          <div className="relative w-full max-w-5xl h-[85vh] bg-white/80 backdrop-blur-3xl border border-white/80 rounded-[40px] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* 🛑 LEFT PANE: Task Details & AI Editor */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10 border-r border-white/40 bg-gradient-to-br from-white/40 to-transparent">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-blue-100 text-blue-600 border border-blue-200 shadow-sm inline-block">
                    {selectedTask.project?.name || "プロジェクト情報なし"}
                  </span>
                  
                  {/* 🌟 NEW: ステータスを直接変更できるドロップダウン */}
                  <select 
                    value={selectedTask.status}
                    onChange={(e) => handleStatusChangeFromModal(e.target.value)}
                    className={`text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm outline-none cursor-pointer transition-colors border ${
                      selectedTask.status === 'TODO' ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200' :
                      selectedTask.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600' :
                      selectedTask.status === 'BLOCKED' ? 'bg-rose-500 text-white border-rose-600 hover:bg-rose-600' :
                      'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                    }`}
                  >
                    <option value="TODO" className="bg-white text-slate-800">未着手 (TODO)</option>
                    <option value="IN_PROGRESS" className="bg-white text-slate-800">進行中 (IN PROGRESS)</option>
                    <option value="BLOCKED" className="bg-white text-slate-800">🚨 ブロック (BLOCKED)</option>
                    <option value="DONE" className="bg-white text-slate-800">✅ 完了 (DONE)</option>
                  </select>
                </div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight drop-shadow-sm">{selectedTask.title}</h2>
              </div>

              <div className="bg-white/60 rounded-[24px] p-6 shadow-sm border border-white mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <AlignLeft size={16}/> タスク詳細 / サブタスク
                  </h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const appendText = editDescription && !editDescription.endsWith('\n') ? '\n- [ ] ' : '- [ ] ';
                        setEditDescription(prev => prev + appendText);
                      }}
                      className="text-[10px] font-black bg-white text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm border border-slate-200"
                    >
                      <CheckSquare size={14}/> サブタスク追加
                    </button>

                    <button 
                      onClick={handleGenerateSubtasks}
                      disabled={isGeneratingSubtasks}
                      className="text-[10px] font-black bg-purple-100 text-purple-600 px-3 py-2 rounded-xl hover:bg-purple-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm border border-purple-200"
                    >
                      <Sparkles size={14}/> {isGeneratingSubtasks ? "生成中..." : "AIアシスト"}
                    </button>
                    <button
                      onClick={handleSaveDescription}
                      disabled={isSavingDesc || editDescription === selectedTask.description}
                      className="text-[10px] font-black bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                    >
                      {isSavingDesc ? "保存中..." : "変更を保存"}
                    </button>
                  </div>
                </div>
                
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.currentTarget;
                      const start = target.selectionStart;
                      const val = target.value;
                      
                      const lastNewline = val.lastIndexOf('\n', start - 1);
                      const currentLine = val.substring(lastNewline + 1, start);

                      if (currentLine.startsWith('- [ ] ') || currentLine.startsWith('- [x] ')) {
                        e.preventDefault();
                        
                        if (currentLine.trim() === '- [ ]' || currentLine.trim() === '- [x]') {
                          const newVal = val.substring(0, lastNewline + 1) + '\n' + val.substring(start);
                          setEditDescription(newVal);
                          setTimeout(() => { target.selectionStart = target.selectionEnd = lastNewline + 2; }, 0);
                        } else {
                          const insert = '\n- [ ] ';
                          const newVal = val.substring(0, start) + insert + val.substring(start);
                          setEditDescription(newVal);
                          setTimeout(() => { target.selectionStart = target.selectionEnd = start + insert.length; }, 0);
                        }
                      }
                    }
                  }}
                  placeholder="タスクの詳細やチェックリストを記入...&#10;リストの末尾でEnterを押すと、自動的に次のサブタスクが追加されます。"
                  className="w-full text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed bg-white/70 p-4 rounded-xl border border-white/80 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none min-h-[250px] resize-y shadow-inner transition-all custom-scrollbar"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 p-4 rounded-2xl border border-white shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">担当者</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-sm font-black text-white shadow-md border-2 border-white">
                      {selectedTask.assignee?.name?.charAt(0) || "?"}
                    </div>
                    <span className="text-sm font-bold text-slate-800">{selectedTask.assignee?.name || "未割当"}</span>
                  </div>
                </div>
                <div className="bg-white/50 p-4 rounded-2xl border border-white shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">累計作業時間</p>
                  <p className="text-3xl font-mono font-black text-slate-800 tracking-tighter">{formatTime(selectedTask.timeElapsed || 0)}</p>
                </div>
              </div>
            </div>

            {/* 💬 RIGHT PANE: Chat & Activity Feed */}
            <div className="w-full md:w-[400px] flex flex-col bg-slate-50/50 backdrop-blur-xl relative">
              <div className="p-6 border-b border-slate-200/50 flex justify-between items-center bg-white/30 backdrop-blur-md z-10">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <MessageSquare size={16} className="text-blue-500"/> コミュニケーション
                </h4>
                <button onClick={() => setSelectedTask(null)} className="p-2 bg-white/60 hover:bg-white text-slate-500 rounded-full transition-colors shadow-sm border border-slate-200">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-slate-100/30">
                {selectedTask.comments?.map((c: any) => {
                  const isMine = c.userId === userId;
                  const isAI = c.user?.name === "AI" || c.text.includes("【AI アシスト】");
                  // 削除できる権限があるか（自分 or マネージャー）
                  const canDelete = isMine || isManager;
                  
                  const reactionsMap = c.reactions?.reduce((acc: any, r: any) => {
                    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [] };
                    acc[r.emoji].count += 1;
                    acc[r.emoji].users.push(r.user?.name || "Unknown");
                    return acc;
                  }, {}) || {};

                  return (
                    <div key={c.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group/comment w-full`}>
                      
                      {/* ゴミ箱アイコンはここから削除し、純粋なヘッダーにする */}
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[9px] font-black text-slate-400">
                          {isMine ? "あなた" : (isAI ? "🤖 AI アシスタント" : c.user?.name)} • {new Date(c.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="relative max-w-[90%] flex flex-col">
                        
                        {/* リアクションと削除ボタンを1つのフローティングメニューに合体！ */}
                        <div className={`absolute -top-10 ${isMine ? 'right-0' : 'left-0'} opacity-0 group-hover/comment:opacity-100 transition-all flex items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl p-1.5 rounded-2xl z-20 scale-95 group-hover/comment:scale-100 origin-bottom`}>
                          {/* リアクションピッカー */}
                          {['👍', '❤️', '🔥', '👀'].map(emoji => (
                            <button 
                              key={emoji} 
                              onClick={() => handleCommentReaction(c.id, emoji)} 
                              className="hover:scale-125 hover:-translate-y-1 transition-all text-[14px] px-1.5"
                            >
                              {emoji}
                            </button>
                          ))}
                          
                          {/* 削除権限がある場合のみ、仕切り線とゴミ箱アイコンを表示 */}
                          {canDelete && (
                            <>
                              <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
                              <button 
                                onClick={() => handleDeleteComment(c.id)} 
                                className="text-slate-400 hover:text-rose-500 hover:scale-110 transition-all px-1.5"
                                title="コメントを削除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>

                        {/* 吹き出し本体 */}
                        <div className={`px-4 py-3 rounded-2xl shadow-sm text-xs font-medium leading-relaxed whitespace-pre-wrap break-words border w-fit ${
                          isMine 
                            ? 'ml-auto bg-blue-600 text-white rounded-br-sm border-blue-700' 
                            : isAI
                              ? 'mr-auto bg-purple-100 text-purple-900 rounded-bl-sm border-purple-200'
                              : 'mr-auto bg-white text-slate-700 rounded-bl-sm border-slate-200'
                        }`}>
                          {c.text}
                        </div>

                        {/* 🌟 修正: リアクション表示エリア（美しいカスタムツールチップ） */}
                        {Object.keys(reactionsMap).length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1.5 w-max max-w-full ${isMine ? 'self-end justify-end' : 'self-start justify-start'}`}>
                            {Object.entries(reactionsMap).map(([emoji, data]: any) => {
                              const iReacted = data.users.includes("あなた");
                              return (
                                // ツールチップを表示するための group/reactTooltip ラッパーを追加
                                <div key={emoji} className="relative group/reactTooltip flex items-center">
                                  <button 
                                    onClick={() => handleCommentReaction(c.id, emoji)} 
                                    className={`text-[10px] border px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 transition-colors ${
                                      iReacted 
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                                    }`}
                                  >
                                    {emoji} <span className="font-bold">{data.count}</span>
                                  </button>

                                  {/* カスタムツールチップ UI */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/reactTooltip:block bg-slate-800/95 backdrop-blur-sm border border-slate-700 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-30 pointer-events-none animate-in zoom-in-95 duration-150 origin-bottom">
                                    {data.users.join(", ")}
                                    {/* ツールチップの下の小さな三角形（しっぽ） */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800/95"></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <MessageSquare size={32} className="mb-2" />
                    <p className="text-[10px] font-bold">まだコメントはありません</p>
                  </div>
                )}
                <div ref={chatEndRef} className="h-1" />
              </div>

              {/* Chat Input Area */}
              <div className="p-4 bg-white/60 backdrop-blur-md border-t border-slate-200/50">
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input 
                    name="commentText" 
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="チームにメッセージを送信..." 
                    className="flex-1 bg-white/80 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 shadow-inner text-slate-800 transition-all" 
                  />
                  <button type="submit" disabled={!commentText.trim()} className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:hover:scale-100 hover:scale-105">
                    <Send size={16} className="ml-0.5" />
                  </button>
                </form>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* --- 🏆 PROJECT CELEBRATION MODAL --- */}
      {celebration.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-500">
           <div className="bg-white p-10 rounded-[40px] shadow-2xl text-center max-w-lg transform animate-in zoom-in bounce-in duration-500 border-4 border-blue-500/20">
              <div className="text-7xl mb-6 animate-bounce">🏆</div>
              <h2 className="text-3xl font-black text-slate-800 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">プロジェクト達成！</h2>
              <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
                「<span className="text-slate-800">{celebration.projectName}</span>」の全タスクが完了しました。<br/>
                マネージャーの最終承認をお待ちください。本当にお疲れ様でした！
              </p>
              <button onClick={() => setCelebration({show: false, projectName: ""})} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black px-10 py-4 rounded-2xl shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform text-lg w-full">
                最高！
              </button>
           </div>
        </div>
      )}

      {/* --- 🚨 BLOCKER REPORT MODAL --- */}
      {blockingTask && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => !isReportingBlock && setBlockingTask(null)}></div>
          <div className="relative w-full max-w-lg bg-rose-50/90 backdrop-blur-2xl border border-rose-200 rounded-[32px] shadow-[0_0_50px_rgba(244,63,94,0.3)] p-8 animate-in zoom-in-95 duration-300">
            <button onClick={() => !isReportingBlock && setBlockingTask(null)} className="absolute top-6 right-6 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-full transition-colors">
              <X size={20} />
            </button>
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-2xl font-black text-rose-900 leading-tight">タスクがブロックされましたか？</h2>
              <p className="text-xs font-bold text-rose-600 mt-2">"{blockingTask.title}"</p>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">何が原因で進められないのか教えてください</label>
              <textarea 
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                autoFocus
                placeholder="例: AWSのアクセス権限がなくて進められません... / ○〇のエラーが解決できません..."
                className="w-full text-sm font-bold text-slate-800 bg-white/80 p-4 rounded-2xl border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none min-h-[100px] resize-none shadow-inner"
              />
              
              {/* 🌟 NEW: AIオプションのチェックボックス */}
              <label className="flex items-center gap-2 p-3 bg-white/60 border border-rose-100 rounded-xl cursor-pointer hover:bg-white transition-colors shadow-sm">
                <input 
                  type="checkbox" 
                  checked={askAI} 
                  onChange={(e) => setAskAI(e.target.checked)}
                  className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-500"/> AIにも解決のヒントを求める
                </span>
              </label>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setBlockingTask(null)} disabled={isReportingBlock} className="flex-1 py-3 bg-white text-rose-500 font-black rounded-xl hover:bg-rose-50 transition-colors border border-rose-100 disabled:opacity-50">キャンセル</button>
              <button onClick={submitBlocker} disabled={isReportingBlock || !blockerReason.trim()} className="flex-[2] py-3 bg-rose-500 text-white font-black rounded-xl shadow-lg hover:bg-rose-600 hover:shadow-rose-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isReportingBlock ? (
                  <span className="animate-pulse flex items-center gap-2">
                    {askAI ? <><Sparkles size={16}/> AIがアドバイスを考案中...</> : <><ShieldAlert size={16}/> チームに報告中...</>}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldAlert size={16}/> 障害を報告する
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}