"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/actions";
import { UserPlus, Mail, Lock, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await registerUser(formData);

    if (result.success) {
      // Redirect to the login page (or api/auth/signin) after successful registration
      router.push("/"); 
    } else {
      setError(result.error || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef2f9] absolute inset-0 z-50">
      <div className="w-full max-w-md bg-white/60 backdrop-blur-2xl border border-white p-10 rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-500">
        
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <UserPlus size={32} className="text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-black text-center text-slate-900 tracking-tight mb-2">Create Account</h2>
        <p className="text-center text-slate-500 text-sm font-bold mb-8">Join the Nexus Workspace</p>

        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold mb-6 text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input name="name" type="text" required placeholder="Full Name (e.g., Yashwan)" className="w-full bg-white/80 border border-white rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 text-slate-800" />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input name="email" type="email" required placeholder="Email Address" className="w-full bg-white/80 border border-white rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 text-slate-800" />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input name="password" type="password" required placeholder="Create Password" className="w-full bg-white/80 border border-white rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 text-slate-800" />
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all mt-4">
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-xs font-bold text-slate-500 mt-8">
          Already have an account? <Link href="/api/auth/signin" className="text-blue-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}