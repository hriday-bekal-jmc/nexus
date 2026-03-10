// "use client";

// import { useState, useEffect } from "react";
// import { useSession } from "next-auth/react";
// import { Plus, X, Folder, Link as LinkIcon, Edit3, Check, UserPlus, ListTodo, Trash2, Clock, CheckCircle2, Circle } from "lucide-react";
// import { updateProject, deleteProject, toggleTaskStatus } from "@/lib/actions";

// export default function ProjectsPage() {
//   const { data: session } = useSession();
//   const [projects, setProjects] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   // --- Modal States ---
//   const [isNewModalOpen, setIsNewModalOpen] = useState(false);
//   const [selectedProject, setSelectedProject] = useState<any | null>(null);
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // --- Form States ---
//   const [useAI, setUseAI] = useState(false);
//   const [manualTasks, setManualTasks] = useState<any[]>([{ title: "", description: "", priority: "MEDIUM", dueDate: "" }]);
//   const [editAddedTasks, setEditAddedTasks] = useState<any[]>([]); // Tasks added during Edit Mode
  
//   const [dbUsers, setDbUsers] = useState<any[]>([]);
//   const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

// const fetchProjectsAndUsers = async () => {
//     setLoading(true);
//     const { getRecentProjects, getAllUsers } = await import("@/lib/actions");
    
//     // Fetch both at the same time
//     const projectData = await getRecentProjects();
//     const usersData = await getAllUsers();
    
//     setProjects(projectData.projects);
//     setDbUsers(usersData); // Store the real users in state
//     setLoading(false);
//   };

//   useEffect(() => {
//     fetchProjectsAndUsers();
//   }, []);

//   // --- Open Project Details (Fixes Highlighted Members) ---
// const handleOpenProject = (proj: any) => {
//     // This safely reads the teamNames from the DB and puts them into the editable state
//     const parsedMembers = proj.teamNames && proj.teamNames !== "[]" ? JSON.parse(proj.teamNames) : [];
//     setSelectedMembers(parsedMembers);
//     setSelectedProject(proj);
//     setEditAddedTasks([]); 
//     setIsEditMode(false);
//   };

//   // --- Toggle Task (Fixes Progress Bar) ---
//   const handleToggleTask = async (taskId: string, currentStatus: string) => {
//     const result = await toggleTaskStatus(taskId, currentStatus);
//     if (result.success) {
//       fetchProjects(); // Update background grid
//       // Optimistically update the open modal
//       setSelectedProject((prev: any) => ({
//         ...prev,
//         tasks: prev.tasks.map((t: any) => t.id === taskId ? { ...t, status: result.newStatus } : t)
//       }));
//     }
//   };

//   // --- Handle Edit Submission (Fixes Avatar updates & New Tasks) ---
//   const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     setIsSubmitting(true);
    
//     const formData = new FormData(event.currentTarget);
//     formData.append("members", JSON.stringify(selectedMembers)); // Send updated members
//     formData.append("newTasks", JSON.stringify(editAddedTasks)); // Send newly added tasks
    
//     const result = await updateProject(formData);
    
//     if (result.success) {
//       setIsEditMode(false);
//       setSelectedProject(null);
//       fetchProjects();
//     } else {
//       alert("Failed to update project");
//     }
//     setIsSubmitting(false);
//   };

//   const handleDelete = async (id: string) => {
//     if (window.confirm("Delete this project?")) {
//       await deleteProject(id);
//       setSelectedProject(null);
//       fetchProjects();
//     }
//   };

//   const toggleMember = (member: string) => {
//     setSelectedMembers(prev => prev.includes(member) ? prev.filter(m => m !== member) : [...prev, member]);
//   };

//   // --- Handle New Project Submission ---
//   const handleNewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
//     event.preventDefault();
//     setIsSubmitting(true);
//     const formData = new FormData(event.currentTarget);
//     formData.append("members", JSON.stringify(selectedMembers));
//     formData.append("tasks", JSON.stringify(manualTasks));
//     const { createProject } = await import("@/lib/actions");
//     const result = await createProject(formData);
//     if (result?.success) {
//       setIsNewModalOpen(false);
//       setManualTasks([{ title: "", description: "", priority: "MEDIUM", dueDate: "" }]);
//       setSelectedMembers([]);
//       fetchProjects(); 
//     }
//     setIsSubmitting(false);
//   };

//   const getProgress = (tasks: any[]) => {
//     if (!tasks || tasks.length === 0) return 0;
//     const done = tasks.filter(t => t.status === "DONE").length;
//     return Math.round((done / tasks.length) * 100);
//   };

//   return (
//     <div className="animate-in fade-in duration-500">
//       <div className="flex justify-between items-end mb-10">
//         <div>
//           <p className="text-sm font-black text-blue-600/80 uppercase tracking-widest mb-1">Workspace</p>
//           <h1 className="text-4xl font-black text-slate-900 tracking-tight">Project Management</h1>
//         </div>
//           <button onClick={() => { setIsNewModalOpen(true); setSelectedMembers([]); }}>          
//             <Plus size={18} strokeWidth={3} /> Launch New Project
//           </button>
//       </div>

//       {loading ? (
//         <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {projects.length > 0 ? (
//             projects.map((proj) => {
//               const progress = getProgress(proj.tasks);
//               const displayMembers = proj.teamNames && proj.teamNames !== "[]" ? JSON.parse(proj.teamNames) : ["Hriday"];
//               return (
//                 <div key={proj.id} onClick={() => handleOpenProject(proj)} className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-[32px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full">
//                   <div className="flex justify-between items-start mb-4">
//                     <div className="p-3 bg-blue-100/50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Folder size={24} /></div>
//                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full">{new Date(proj.createdAt).toLocaleDateString()}</span>
//                   </div>
//                   <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">{proj.name}</h3>
//                   <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">{proj.description || "No description."}</p>
                  
//                   <div className="mb-4">
//                     <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
//                       <span>Progress</span><span>{progress}%</span>
//                     </div>
//                     <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
//                       <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
//                     </div>
//                   </div>

//                   <div className="flex items-center justify-between pt-4 border-t border-white/60">
//                     <div className="flex flex-col">
//                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tasks</span>
//                        <span className="text-xs font-bold text-slate-700">{proj.tasks?.length || 0} Total</span>
//                     </div>
//                     <div className="flex -space-x-2">
//                       {displayMembers.slice(0, 4).map((m: string, i: number) => (
//                         <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m}`} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100" title={m} />
//                       ))}
//                       {displayMembers.length > 4 && (
//                         <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">+{displayMembers.length - 4}</div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               );
//             })
//           ) : (
//             <div className="col-span-full py-20 flex flex-col items-center justify-center"><Folder size={32} className="text-slate-400 mb-4" /><h3 className="text-xl font-black text-slate-700">No Projects Found</h3></div>
//           )}
//         </div>
//       )}

//       {/* --- 🟢 VIEW/EDIT PROJECT MODAL --- */}
//       {selectedProject && (
//         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-md animate-in fade-in" onClick={() => setSelectedProject(null)}></div>
//           <div className="relative w-full max-w-3xl bg-white/80 backdrop-blur-[40px] border border-white rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
//             <div className="flex justify-between items-start mb-8">
//               <div className="flex-1 pr-4">
//                 {isEditMode ? (
//                   <p className="text-blue-600 font-bold text-sm mb-2">Editing Project</p>
//                 ) : (
//                   <div className="flex items-center gap-4 mb-2">
//                     <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedProject.name}</h2>
//                     <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black">{getProgress(selectedProject.tasks)}% Done</span>
//                   </div>
//                 )}
//               </div>
              
//               <div className="flex gap-2">
//                 <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2 rounded-full transition-all ${isEditMode ? 'bg-blue-100 text-blue-600' : 'bg-white/50 text-slate-400 hover:text-blue-500'}`}>
//                   {isEditMode ? <Check size={20} /> : <Edit3 size={20} />}
//                 </button>
//                 <button onClick={() => setSelectedProject(null)} className="p-2 bg-white/50 text-slate-400 hover:text-red-500 rounded-full"><X size={20} /></button>
//               </div>
//             </div>

//             {isEditMode ? (
//               <form onSubmit={handleEditSubmit} className="space-y-6">
//                 <input type="hidden" name="id" value={selectedProject.id} />
//                 <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Name</label><input name="name" defaultValue={selectedProject.name} className="w-full bg-white/50 border border-white/60 rounded-xl px-4 py-3 outline-none font-bold text-slate-900" required /></div>
//                 <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Description</label><textarea name="description" defaultValue={selectedProject.description} rows={2} className="w-full bg-white/50 border border-white/60 rounded-xl px-4 py-3 outline-none text-slate-700" /></div>
                
//                 {/* Fixed: Editable Members Highlight correctly */}
//                 <div>
//                   <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Assigned Members</label>
//                 <div className="flex flex-wrap gap-2">
//                     {dbUsers.map((user) => (
//                       <button 
//                         key={user.id} 
//                         type="button" 
//                         onClick={() => toggleMember(user.name)} 
//                         className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
//                           selectedMembers.includes(user.name) 
//                             ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30" 
//                             : "bg-white/50 text-slate-500 border-white/60"
//                         }`}
//                       >
//                         {user.name}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 {/* Fixed: Add New Tasks in Edit Mode */}
//                 <div className="bg-slate-50/50 border border-white/60 p-4 rounded-2xl">
//                   <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block flex items-center gap-2"><Plus size={14}/> Add New Tasks</label>
//                   <div className="space-y-3">
//                     {editAddedTasks.map((task, idx) => (
//                       <div key={idx} className="flex gap-2">
//                         <input value={task.title} onChange={(e) => {
//                           const nt = [...editAddedTasks]; nt[idx].title = e.target.value; setEditAddedTasks(nt);
//                         }} placeholder={`New Task Title...`} className="flex-1 bg-white/80 border border-white/60 rounded-xl px-3 py-2 text-sm font-bold outline-none" required />
//                       </div>
//                     ))}
//                     <button type="button" onClick={() => setEditAddedTasks([...editAddedTasks, { title: "", priority: "MEDIUM", dueDate: "" }])} className="text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors w-fit"><Plus size={14} strokeWidth={3} /> Add task</button>
//                   </div>
//                 </div>

//                 <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">
//                   {isSubmitting ? "Saving..." : "Save Changes"}
//                 </button>
//               </form>
//             ) : (
//               <div className="space-y-8">
//                 <div>
//                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Description</h4>
//                   <p className="text-slate-700 text-sm leading-relaxed">{selectedProject.description || "No description provided."}</p>
//                 </div>

//                 <div>
//                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 flex items-center gap-2"><UserPlus size={14}/> Assigned Team</h4>
//                   <div className="flex flex-wrap gap-3">
//                     {selectedMembers.map((m: string, i: number) => (
//                       <div key={i} className="flex items-center gap-2 bg-white/60 border border-white/60 px-3 py-1.5 rounded-full shadow-sm">
//                         <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m}`} className="w-6 h-6 rounded-full bg-white" />
//                         <span className="text-xs font-bold text-slate-700">{m}</span>
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//                 {/* Fixed: Clickable Tasks */}
//                 <div>
//                   <div className="flex justify-between items-center mb-4">
//                     <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><ListTodo size={14}/> Project Tasks</h4>
//                     <span className="text-xs font-bold text-slate-500">{selectedProject.tasks?.length || 0} items</span>
//                   </div>
//                   <div className="space-y-2">
//                     {selectedProject.tasks && selectedProject.tasks.length > 0 ? (
//                       selectedProject.tasks.map((task: any) => (
//                         <div key={task.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${task.status === "DONE" ? "bg-white/40 border-transparent opacity-60" : "bg-white/80 border-white/60 shadow-sm"}`}>
//                           <div className="flex items-center gap-3">
//                             <button onClick={() => handleToggleTask(task.id, task.status)} className="hover:scale-110 transition-transform focus:outline-none">
//                               {task.status === "DONE" ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} className="text-slate-300 hover:text-blue-500" />}
//                             </button>
//                             <p className={`text-sm font-bold ${task.status === "DONE" ? "text-slate-500 line-through" : "text-slate-800"}`}>{task.title}</p>
//                           </div>
//                           <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider bg-slate-100 text-slate-500">{task.priority}</span>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-slate-400 py-4 italic font-medium">No tasks added to this project yet.</p>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* (New Project Modal logic remains unchanged but ensure your isNewModalOpen block is here!) */}
//     </div>
//   );
// }

export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecentProjects, getAllUsers } from "@/lib/actions";
import ProjectClientContent from "@/components/ProjectClientContent";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) redirect("/api/auth/signin");

  // 🚀 Fetch everything on the server. No more "Loading..." spinners!
  const [projectData, users] = await Promise.all([
    getRecentProjects(),
    getAllUsers()
  ]);

  return (
    <ProjectClientContent 
      initialProjects={projectData.projects || []} 
      allUsers={users || []} 
    />
  );
}