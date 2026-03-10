// "use client";

// import { useState, useEffect } from "react";
// import { useSession, signIn } from "next-auth/react";
// import Link from "next/link";
// import { Folder, AlertCircle, CheckCircle, Clock, Pause, Sparkles, BarChart2, ShieldAlert } from "lucide-react";
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// export default function DashboardRouter() {
//   const { data: session, status } = useSession();

//   if (status === "loading") {
//     return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
//   }

//   // Middleware handles the "No Session" case now! 
//   // If we are here, the user IS logged in.
//   const userName = session?.user?.name || "User";
//   const userRole = (session?.user as any)?.role || "MEMBER";
  
//   const isManager = userRole === "MANAGER";

//   return isManager ? <ManagerDashboard userName={userName} /> : <EmployeeDashboard userName={userName} />;
// }


// // ==========================================
// // 👔 1. THE MANAGER DASHBOARD
// // ==========================================
// function ManagerDashboard({ userName }: { userName: string }) {
//   const [stats, setStats] = useState({ projects: 0, pending: 0, blocked: 0 });
//   const [taskData, setTaskData] = useState<any[]>([]);

//   useEffect(() => {
//     async function fetchManagerData() {
//       const { getDashboardStats } = await import("@/lib/actions");
//       const data = await getDashboardStats();
      
//       setStats({
//         projects: data.projectCount,
//         pending: data.taskStats.todo + data.taskStats.inProgress,
//         blocked: data.taskStats.blocked,
//       });

//       setTaskData([
//         { name: "To Do", value: data.taskStats.todo, color: "#f97316" },
//         { name: "In Progress", value: data.taskStats.inProgress, color: "#3b82f6" },
//         { name: "Blocked", value: data.taskStats.blocked, color: "#ef4444" },
//         { name: "Done", value: data.taskStats.done, color: "#10b981" },
//       ]);
//     }
//     fetchManagerData();
//   }, []);

//   return (
//     <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-700">
//       <div className="flex justify-between items-end mb-10">
//         <div>
//           <p className="text-sm font-black text-blue-600/80 uppercase tracking-widest mb-1">Command Center</p>
//           <h1 className="text-4xl font-black text-slate-900 tracking-tight">Manager Overview</h1>
//         </div>
//         <Link href="/nippo" className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/30 hover:-translate-y-1 transition-all flex items-center gap-2">
//           <Sparkles size={18} /> Generate AI Report
//         </Link>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//         <StatCard icon={<Folder size={24}/>} title="Active Projects" value={stats.projects} trend="View Workspace" color="text-blue-600" link="/projects" />
//         <StatCard icon={<AlertCircle size={24}/>} title="Team Pending" value={stats.pending} trend="In Pipeline" color="text-orange-600" link="/tasks" />
//         <StatCard icon={<ShieldAlert size={24}/>} title="Blocked Tasks" value={stats.blocked} trend={stats.blocked > 0 ? "Requires Attention" : "All Clear"} color={stats.blocked > 0 ? "text-red-600" : "text-emerald-600"} link="/tasks" />
//       </div>

//       <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-[32px] shadow-sm">
//         <div className="flex items-center gap-3 mb-6">
//           <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><BarChart2 size={20} /></div>
//           <h3 className="text-xl font-black text-slate-800 tracking-tight">Company Task Distribution</h3>
//         </div>
//         <div className="h-72 w-full">
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart data={taskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
//               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#64748b' }} />
//               <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#64748b' }} />
//               <Tooltip cursor={{ fill: 'rgba(255,255,255,0.4)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
//               <Bar dataKey="value" radius={[6, 6, 0, 0]}>
//                 {taskData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
//               </Bar>
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ==========================================
// // 👷 2. THE EMPLOYEE DASHBOARD (Persistent Timer)
// // ==========================================
// function EmployeeDashboard({ userName }: { userName: string }) {
//   const [stats, setStats] = useState({ projects: 0, myTasks: 0 });
//   const [seconds, setSeconds] = useState(0);
//   const [isTimerRunning, setIsTimerRunning] = useState(false); // Start paused by default
//   const [isLoaded, setIsLoaded] = useState(false); // Prevent hydration mismatch
//   const [activeProject, setActiveProject] = useState<any>(null);


//   useEffect(() => {
//   async function fetchProjectInfo() {
//     const { getRecentProjects } = await import("@/lib/actions");
//     const data = await getRecentProjects();
//     // Get the most recent project this employee is part of
//     if (data.projects.length > 0) setActiveProject(data.projects[0]);
//   }
//   fetchProjectInfo();
// }, []);

//   useEffect(() => {
//     async function fetchEmployeeData() {
//       const { getDashboardStats } = await import("@/lib/actions");
//       const data = await getDashboardStats();
//       setStats({
//         projects: data.projectCount,
//         myTasks: data.taskStats.todo + data.taskStats.inProgress, 
//       });
//     }
//     fetchEmployeeData();
//   }, []);

//   // 🧠 1. LOAD SAVED TIME ON MOUNT
//   useEffect(() => {
//     const savedTime = localStorage.getItem("nexus_timer");
//     const savedState = localStorage.getItem("nexus_timer_running");
    
//     if (savedTime) setSeconds(parseInt(savedTime, 10));
//     if (savedState === "true") setIsTimerRunning(true);
    
//     setIsLoaded(true); // UI is safe to render now
//   }, []);

//   // 🧠 2. TICK AND SAVE TO MEMORY EVERY SECOND
//   useEffect(() => {
//     let interval: any;
//     if (isTimerRunning && isLoaded) {
//       interval = setInterval(() => {
//         setSeconds((prev) => {
//           const newTime = prev + 1;
//           localStorage.setItem("nexus_timer", newTime.toString());
//           return newTime;
//         });
//       }, 1000);
//       localStorage.setItem("nexus_timer_running", "true");
//     } else if (isLoaded) {
//       localStorage.setItem("nexus_timer_running", "false");
//     }
//     return () => clearInterval(interval);
//   }, [isTimerRunning, isLoaded]);

//   // 🧠 3. RESET TIMER FUNCTION
//   const handleReset = () => {
//     setIsTimerRunning(false);
//     setSeconds(0);
//     localStorage.setItem("nexus_timer", "0");
//     localStorage.setItem("nexus_timer_running", "false");
//   };

//   const formatTime = (totalSeconds: number) => {
//     const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
//     const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
//     const s = (totalSeconds % 60).toString().padStart(2, '0');
//     return `${h}:${m}:${s}`;
//   };

//   if (!isLoaded) return null; // Prevents UI flicker while loading memory

//   return (
//     <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-700">
//       <div className="flex justify-between items-end mb-10">
//         <div>
//           <p className="text-sm font-black text-blue-600/80 uppercase tracking-widest mb-1">Workspace</p>
//           <h1 className="text-4xl font-black text-slate-900 tracking-tight">
//             Welcome back, <span className="text-blue-700">{userName.split(' ')[0]}</span>
//           </h1>
//         </div>
//         <Link href="/tasks" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-sm shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
//           View My Tasks
//         </Link>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
//         {/* LEFT: The Wide Persistent Timer */}
//         <div className="lg:col-span-8">
//           <div className="relative bg-gradient-to-br from-[#1e40af]/90 to-[#4338ca]/90 backdrop-blur-2xl rounded-[40px] p-10 text-white shadow-2xl border border-white/20 overflow-hidden group">
//             <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[100%] bg-white/10 rounded-full blur-[90px] pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
            
//             <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
//               <div className="space-y-6 flex-1">
//                 <div className="flex items-center gap-4">
//                   <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
//                     <span className={`w-2.5 h-2.5 rounded-full ${isTimerRunning ? 'bg-red-400 animate-pulse' : 'bg-slate-400'}`}></span> 
//                     {isTimerRunning ? 'Active Focus' : 'Paused'}
//                   </div>
//                   {/* Added Reset Button */}
//                   {seconds > 0 && (
//                     <button onClick={handleReset} className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors">
//                       Reset Timer
//                     </button>
//                   )}
//                 </div>
                
//                 <h3 className="text-3xl font-black tracking-tight italic leading-tight">Current Task Focus</h3>
//                 <div className="flex items-center gap-6">
//                   <div className="text-7xl font-mono font-light tracking-[0.2em]">{formatTime(seconds)}</div>
//                 </div>
//                 <div className="flex gap-4 pt-2">
//                   <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="px-8 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 rounded-2xl font-black text-sm flex items-center gap-2 transition-all">
//                     <Pause size={18} fill="currentColor" /> {isTimerRunning ? 'Pause' : 'Resume'}
//                   </button>
//                   <button className="px-8 py-3.5 bg-white text-blue-700 rounded-2xl font-black text-sm shadow-xl hover:bg-slate-50 transition-all">Submit Nippo</button>
//                 </div>
//               </div>
//               <div className="hidden md:block">
//                 <div className="w-52 h-52 bg-white/10 backdrop-blur-3xl rounded-[44px] border border-white/20 flex items-center justify-center shadow-inner group-hover:rotate-3 transition-all duration-500">
//                   <Clock size={90} className={`text-white/30 ${isTimerRunning ? 'animate-pulse' : ''}`} strokeWidth={1} />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* RIGHT: Quick Stats */}
//         <div className="lg:col-span-4 space-y-6">
//           <StatCard icon={<AlertCircle size={24}/>} title="My Pending Tasks" value={stats.myTasks} trend="Requires Action" color="text-orange-600" link="/tasks" />
//           <StatCard icon={<CheckCircle size={24}/>} title="Weekly Goal" value="85%" trend="On Track" color="text-emerald-600" link="/nippo" />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ==========================================
// // 🧩 SHARED COMPONENTS
// // ==========================================
// function StatCard({ icon, title, value, trend, color, link }: any) {
//   return (
//     <Link href={link || "#"} className="block bg-white/40 backdrop-blur-xl rounded-[32px] p-8 border border-white/60 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
//       <div className="p-3 bg-white/60 rounded-2xl w-fit mb-6 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">{icon}</div>
//       <p className="text-slate-500 font-bold text-xs uppercase mb-1">{title}</p>
//       <div className="flex items-baseline gap-2">
//         <h2 className="text-5xl font-black text-slate-900">{value}</h2>
//         <span className={`${color} font-bold text-xs tracking-wide`}>{trend}</span>
//       </div>
//     </Link>
//   );
// }

export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardStats, getRecentProjects } from "@/lib/actions";
import DashboardClient from "@/components/DashboardClient";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/api/auth/signin");

  // 🚀 FETCH DATA ON SERVER - No more loading loops!
  const [stats, projectData] = await Promise.all([
    getDashboardStats(),
    getRecentProjects()
  ]);

  return (
    <DashboardClient 
      userName={session.user.name} 
      userRole={(session.user as any).role} 
      stats={stats} 
      projects={projectData.projects} 
    />
  );
}