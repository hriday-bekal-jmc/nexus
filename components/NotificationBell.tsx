"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle2, AlertCircle, MessageSquare, Info } from "lucide-react";
import { getNotifications, markNotificationAsRead } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    const data = await getNotifications();
    setNotifications(data);
  };

  // 🌟 改善: Smart Polling (サーバー負荷対策)
  useEffect(() => {
    fetchNotifs(); // 初回フェッチ
    
    // 1. バックグラウンドの定期フェッチは「3分(180秒)」に緩和
    const interval = setInterval(fetchNotifs, 180000); 
    
    // 2. ユーザーが別タブからこのアプリに戻ってきた瞬間にフェッチ (リアルタイム性を担保)
    const onFocus = () => fetchNotifs();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // 枠外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifs(); // 🌟 改善: ベルを開いた瞬間にも最新状態をフェッチ
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    }
    setIsOpen(false);
    if (notif.link) router.push(notif.link);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'REPORT_STATUS': return <AlertCircle size={16} className="text-amber-500" />;
      case 'TASK_ASSIGNED': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'COMMENT': return <MessageSquare size={16} className="text-blue-500" />;
      default: return <Info size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={handleToggleOpen}
        className="p-2.5 bg-white/40 backdrop-blur-md rounded-xl border border-white/60 relative cursor-pointer hover:bg-white/80 transition-colors shadow-sm"
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-[#eef2f9] flex items-center justify-center animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {isOpen && (
        /* 🌟 改善: bg-white と z-[999] を追加し、透明度による重なりを完全に防ぐ */
        <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] z-[999] overflow-hidden animate-in slide-in-from-top-2 origin-top-right">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-black text-slate-800 text-sm">通知センター</h3>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{unreadCount} 未読</span>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-white">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50/50">
                <Bell size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">新しい通知はありません</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50 flex gap-3 ${!notif.isRead ? 'bg-blue-50/40' : 'opacity-80'}`}>
                  <div className="mt-0.5 shrink-0 bg-white p-1.5 rounded-full shadow-sm border border-slate-100 h-fit">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs truncate mb-1 ${!notif.isRead ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>{notif.title}</h4>
                    <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed mb-1.5">{notif.message}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(notif.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {!notif.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}