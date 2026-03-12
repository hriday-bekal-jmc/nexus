"use client";

import { useState, useMemo, useEffect } from "react";
import { Sparkles, Send, FileText, MessageSquare, Clock, CheckCircle2, ArrowRightCircle, Lock, CheckCircle, XCircle, Inbox, Copy, UserCircle2, AlertCircle, Edit3, X } from "lucide-react";
import { generateDailyReportDraft, submitDailyReport, addReportComment, updateReportStatus, editDailyReport } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function NippoClient({ initialReports, userId, userRole }: any) {
  const router = useRouter();
  const isManager = userRole === "MANAGER";

  // --- 共通 State ---
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // --- メンバー用 State ---
  const [achievedTasks, setAchievedTasks] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 🌟 NEW: 編集モードの判定

  // --- マネージャー用 State ---
  const [managerTab, setManagerTab] = useState<"INBOX" | "APPROVED">("INBOX");

  // ==========================================
  // 📊 データ処理
  // ==========================================
  
  const myReports = useMemo(() => initialReports.filter((r: any) => r.userId === userId), [initialReports, userId]);

  const myReportForSelectedDate = useMemo(() => {
    return myReports.find((r: any) => {
      const d = new Date(r.createdAt);
      return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
    });
  }, [myReports, selectedDate]);

  const pendingReports = useMemo(() => initialReports.filter((r: any) => r.status !== "APPROVED"), [initialReports]);
  const approvedReports = useMemo(() => initialReports.filter((r: any) => r.status === "APPROVED"), [initialReports]);

  // 🌟 NEW: 日付が変わったり、レポートが更新されたらフォームの内容をリセット/同期する
  useEffect(() => {
    setIsEditing(false);
    if (myReportForSelectedDate) {
      setAchievedTasks(myReportForSelectedDate.achieved_tasks);
      setTomorrowPlan(myReportForSelectedDate.tomorrow_plan);
    } else {
      setAchievedTasks("");
      setTomorrowPlan("");
    }
  }, [selectedDate, myReportForSelectedDate]);

  // ==========================================
  // ⚡ アクションハンドラー
  // ==========================================

  const handleGenerateDraft = async () => {
    setIsDrafting(true);
    const res = await generateDailyReportDraft();
    if (res.success && res.draft) {
      const parseAiText = (data: any) => {
        if (!data) return "";
        if (Array.isArray(data)) return data.join('\n');
        return String(data);
      };
      setAchievedTasks(parseAiText(res.draft.achieved_tasks));
      setTomorrowPlan(parseAiText(res.draft.tomorrow_plan));
    } else {
      alert(res.error || res.text);
    }
    setIsDrafting(false);
  };

  const handleCopyFromYesterday = () => {
    const todayString = new Date().toDateString();
    const lastReport = myReports.find((r: any) => new Date(r.createdAt).toDateString() !== todayString);
    if (lastReport && lastReport.tomorrow_plan) {
      setAchievedTasks(lastReport.tomorrow_plan);
    } else {
      alert("過去の日報データが見つかりませんでした。");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!achievedTasks?.toString().trim() || !tomorrowPlan?.toString().trim()) return;
    setIsSubmitting(true);
    
    let res;
    if (isEditing && myReportForSelectedDate) {
      // 🌟 編集モードの場合は更新アクションを呼ぶ
      res = await editDailyReport(myReportForSelectedDate.id, achievedTasks, tomorrowPlan);
    } else {
      // 新規作成
      res = await submitDailyReport(achievedTasks, tomorrowPlan);
    }

    if (res.success) {
      setIsEditing(false);
      // 新規作成なら今日の日付に戻す（編集ならそのままの日付に留まる）
      if (!isEditing) setSelectedDate(new Date()); 
    } else {
      alert(res.error);
    }
    setIsSubmitting(false);
  };

  const handleComment = async (reportId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInputs[reportId];
    if (!text?.trim()) return;
    setCommentInputs(prev => ({ ...prev, [reportId]: "" }));
    await addReportComment(reportId, text);
  };

  const handleStatusUpdate = async (reportId: string, status: "APPROVED" | "REVISION") => {
    await updateReportStatus(reportId, status);
    router.refresh();
  };

  // ==========================================
  // 📅 カレンダーコンポーネント (共通)
  // ==========================================
  const renderCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 p-6 rounded-[32px] shadow-lg mb-6">
        <div className="flex justify-between items-center mb-4 px-2">
          <button onClick={() => setSelectedDate(new Date(year, month - 1, 1))} className="text-slate-400 hover:text-blue-600 font-bold px-2">&lt;</button>
          <h3 className="text-sm font-black text-slate-800 tracking-widest">{year}年 {month + 1}月</h3>
          <button onClick={() => setSelectedDate(new Date(year, month + 1, 1))} className="text-slate-400 hover:text-blue-600 font-bold px-2">&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['日','月','火','水','木','金','土'].map(d => (
            <div key={d} className="text-[9px] font-black text-slate-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="h-8" />;
            const isSelected = day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
            
            const report = myReports.find((r: any) => {
              const d = new Date(r.createdAt);
              return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
            });

            let statusClass = "bg-transparent text-slate-600 hover:bg-slate-100";
            if (isSelected) statusClass = "bg-blue-600 text-white shadow-md font-black scale-105";
            else if (report?.status === "REVISION") statusClass = "bg-rose-100 text-rose-700 font-bold border border-rose-300 shadow-sm animate-pulse";
            else if (report?.status === "APPROVED") statusClass = "bg-emerald-100 text-emerald-700 font-bold border border-emerald-300 shadow-sm";
            else if (report?.status === "PENDING") statusClass = "bg-slate-200 text-slate-700 font-bold border border-slate-300";

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={`h-8 rounded-xl text-xs transition-all ${statusClass}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================================
  // 🧑‍💼 マネージャー用ビュー (変更なし)
  // ============================================================================
  if (isManager) {
    const displayReports = managerTab === "INBOX" ? pendingReports : approvedReports;

    return (
      <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight drop-shadow-sm flex items-center gap-3">
              <Inbox size={36} className="text-blue-600"/> 日報承認センター
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-2 ml-1">メンバーの日報を確認し、フィードバックと承認を行ってください。</p>
          </div>
          <div className="flex bg-white/40 p-1.5 rounded-2xl border border-white/60 shadow-sm">
            <button 
              onClick={() => setManagerTab("INBOX")}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${managerTab === "INBOX" ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/60'}`}
            >
              <AlertCircle size={16} className={managerTab === "INBOX" ? 'text-white' : 'text-rose-500'}/>
              要確認 <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{pendingReports.length}</span>
            </button>
            <button 
              onClick={() => setManagerTab("APPROVED")}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${managerTab === "APPROVED" ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-white/60'}`}
            >
              <CheckCircle size={16}/> 承認済
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayReports.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white/30 rounded-[40px] border-2 border-dashed border-white/60 shadow-sm">
              <CheckCircle2 size={64} className="mx-auto text-emerald-400 mb-4 opacity-50" />
              <h3 className="text-xl font-black text-slate-700">すべて確認済みです！</h3>
              <p className="text-sm font-bold text-slate-500 mt-2">現在、承認待ちの日報はありません。</p>
            </div>
          ) : (
            displayReports.map((report: any) => (
              <div key={report.id} className={`bg-white/60 backdrop-blur-2xl border border-white/80 p-6 rounded-[32px] shadow-lg hover:shadow-xl transition-all flex flex-col ${report.status === 'REVISION' ? 'ring-2 ring-rose-400 ring-offset-2' : ''}`}>
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white font-black shadow-md">
                      {report.user?.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800 leading-none">{report.user?.name}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(report.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {report.status !== "APPROVED" && (
                      <button onClick={() => handleStatusUpdate(report.id, "APPROVED")} className="bg-emerald-100 hover:bg-emerald-500 hover:text-white text-emerald-700 text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <CheckCircle size={12}/> 承認
                      </button>
                    )}
                    {report.status !== "REVISION" && (
                      <button onClick={() => handleStatusUpdate(report.id, "REVISION")} className="bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-200 text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <XCircle size={12}/> 差戻
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4 mb-4">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">達成したこと</p>
                    <div className="text-xs text-slate-700 bg-blue-50/50 p-3 rounded-xl whitespace-pre-wrap">{report.achieved_tasks}</div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">明日の予定</p>
                    <div className="text-xs text-slate-700 bg-amber-50/50 p-3 rounded-xl whitespace-pre-wrap">{report.tomorrow_plan}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <form onSubmit={(e) => handleComment(report.id, e)} className="flex gap-2">
                    <input 
                      value={commentInputs[report.id] || ""}
                      onChange={(e) => setCommentInputs(prev => ({ ...prev, [report.id]: e.target.value }))}
                      placeholder="フィードバックを入力..." 
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400 shadow-inner text-slate-800" 
                    />
                    <button type="submit" disabled={!commentInputs[report.id]?.trim()} className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50">
                      <Send size={14} className="ml-0.5" />
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 🧑‍💻 メンバー用ビュー (クリーン＆フォーカス・デザイン)
  // ============================================================================
  
  const hasReport = !!myReportForSelectedDate;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight drop-shadow-sm flex items-center gap-3">
          <UserCircle2 size={36} className="text-blue-600"/> マイ・リフレクション
        </h1>
        <p className="text-sm font-bold text-slate-500 mt-2 ml-1">一日の終わりに実績を記録し、AIと共に振り返りましょう。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 📅 LEFT PANE: カレンダーエリア (コンパクトに) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24">
            {renderCalendar()}
            {/* 簡単なステータスガイド */}
            <div className="bg-white/40 p-4 rounded-2xl border border-white flex flex-col gap-2 shadow-sm">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></div> 提出済・確認待ち</div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></div> 承認済</div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><div className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300"></div> 修正が必要</div>
            </div>
          </div>
        </div>

        {/* 📖 RIGHT PANE: メインエリア（ダイナミックに切り替わる） */}
        <div className="lg:col-span-8">
          
          {/* 🚨 修正要求時の特大バナー */}
          {hasReport && myReportForSelectedDate.status === "REVISION" && !isEditing && (
            <div className="bg-rose-500 text-white p-6 rounded-[32px] shadow-xl shadow-rose-500/20 mb-6 flex justify-between items-center animate-in slide-in-from-top-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full"><XCircle size={24}/></div>
                <div>
                  <h3 className="font-black text-lg">マネージャーから修正の依頼があります</h3>
                  <p className="text-xs font-medium opacity-90">フィードバックを確認し、日報を再提出してください。</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-white text-rose-500 font-black px-6 py-3 rounded-xl hover:scale-105 transition-transform shadow-md"
              >
                日報を修正する
              </button>
            </div>
          )}

          {/* 📝 状態による切り替え（閲覧 or 編集/新規作成） */}
          {hasReport && !isEditing ? (
            
            /* --- 🔍 閲覧モード (Read-Only View) --- */
            <div className="bg-white/50 backdrop-blur-xl border border-white/80 p-8 rounded-[40px] shadow-lg animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8 border-b border-slate-200/50 pb-4">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Clock size={20} className="text-blue-500"/> {selectedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} の記録
                </h2>
                <div className="flex items-center gap-3">
                  {myReportForSelectedDate.status === "APPROVED" && <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5"><CheckCircle size={14}/> 承認済</span>}
                  {myReportForSelectedDate.status === "PENDING" && <span className="bg-slate-100 text-slate-500 text-xs font-black px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5"><Clock size={14}/> 確認待ち</span>}
                  
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-white rounded-full text-slate-400 hover:text-blue-600 shadow-sm border border-slate-200 transition-colors"
                    title="編集する"
                  >
                    <Edit3 size={16}/>
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1"><CheckCircle2 size={12}/> 達成したこと</p>
                  <p className="text-sm text-slate-800 bg-white/60 p-5 rounded-2xl border border-white shadow-sm whitespace-pre-wrap leading-relaxed">{myReportForSelectedDate.achieved_tasks}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1"><ArrowRightCircle size={12}/> 明日の予定</p>
                  <p className="text-sm text-slate-800 bg-white/60 p-5 rounded-2xl border border-white shadow-sm whitespace-pre-wrap leading-relaxed">{myReportForSelectedDate.tomorrow_plan}</p>
                </div>
              </div>

              {/* フィードバックセクション */}
              <div className="mt-8 pt-8 border-t border-slate-200/50">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MessageSquare size={16} className="text-indigo-500"/> フィードバックとコメント
                </h4>
                <div className="space-y-4 mb-4">
                  {myReportForSelectedDate.comments?.map((c: any) => (
                    <div key={c.id} className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-black shadow-md shrink-0">
                        {c.user?.name?.charAt(0)}
                      </div>
                      <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex-1">
                        <p className="text-[10px] font-black text-slate-400 mb-1">{c.user?.name}</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {(!myReportForSelectedDate.comments || myReportForSelectedDate.comments.length === 0) && (
                    <p className="text-xs text-slate-400 font-bold italic py-4">まだフィードバックはありません。</p>
                  )}
                </div>
                <form onSubmit={(e) => handleComment(myReportForSelectedDate.id, e)} className="flex gap-2">
                  <input 
                    value={commentInputs[myReportForSelectedDate.id] || ""}
                    onChange={(e) => setCommentInputs(prev => ({ ...prev, [myReportForSelectedDate.id]: e.target.value }))}
                    placeholder="返信を入力..." 
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 shadow-inner text-slate-800" 
                  />
                  <button type="submit" disabled={!commentInputs[myReportForSelectedDate.id]?.trim()} className="bg-slate-900 text-white px-5 rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50 font-black text-xs">
                    <Send size={14} className="mr-1" /> 送信
                  </button>
                </form>
              </div>
            </div>

          ) : (

            /* --- ✍️ 作成・編集モード (Edit/Create Mode) --- */
            <div className="bg-white/60 backdrop-blur-2xl border border-white/80 p-8 rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  {isEditing ? <><Edit3 size={24} className="text-blue-600"/> 日報の修正</> : "✍️ 今日の日報を作成"}
                </h2>
                {isEditing && (
                  <button onClick={() => setIsEditing(false)} className="text-xs font-black text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    <X size={14}/> キャンセル
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isEditing && (
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={handleGenerateDraft}
                      disabled={isDrafting}
                      className="flex-1 text-xs font-black bg-purple-100 text-purple-600 py-3.5 rounded-xl hover:bg-purple-200 transition-colors flex items-center justify-center gap-2 shadow-sm border border-purple-200"
                    >
                      <Sparkles size={16}/> {isDrafting ? "AIが分析中..." : "AIで自動下書き"}
                    </button>
                    <button 
                      type="button"
                      onClick={handleCopyFromYesterday}
                      className="flex-1 text-xs font-black bg-slate-100 text-slate-600 py-3.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-sm border border-slate-200"
                    >
                      <Copy size={16}/> 前回の予定をコピー
                    </button>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <CheckCircle2 size={16}/> 今日完了したこと (Achieved)
                  </label>
                  <textarea 
                    value={achievedTasks}
                    onChange={(e) => setAchievedTasks(e.target.value)}
                    placeholder="今日達成したタスクや成果を記入..."
                    className="w-full text-sm font-medium text-slate-700 leading-relaxed bg-white/80 p-5 rounded-2xl border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none min-h-[150px] resize-y shadow-inner custom-scrollbar"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <ArrowRightCircle size={16}/> 明日の予定 (Tomorrow's Plan)
                  </label>
                  <textarea 
                    value={tomorrowPlan}
                    onChange={(e) => setTomorrowPlan(e.target.value)}
                    placeholder="明日の目標、またはブロックされている課題..."
                    className="w-full text-sm font-medium text-slate-700 leading-relaxed bg-white/80 p-5 rounded-2xl border border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none min-h-[120px] resize-y shadow-inner custom-scrollbar"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting || !achievedTasks?.toString().trim() || !tomorrowPlan?.toString().trim()}
                  className="w-full py-4 bg-slate-900 text-white text-base font-black rounded-2xl shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={18}/> {isSubmitting ? "送信中..." : isEditing ? "日報を再提出する" : "チームに提出する"}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}