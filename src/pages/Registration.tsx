import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Search, Trophy, Shield, Users, Smartphone, Globe, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAdmin } from '../context/AdminContext';
import { toast } from 'sonner';

export default function Registration() {
  const [activeTab, setActiveTab] = useState<'global' | 'tournament'>('global');
  const { isAdminMode } = useAdmin();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red opacity-10 blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-amber-400">
              <Shield className="w-3 h-3 fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Official Registration</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none">
              Build Your <span className="text-brand-red italic">Identity.</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-lg">
              Every legend starts somewhere. Join the Apna Cricket ecosystem and track your career across every tournament in the region.
            </p>
          </div>
          <div className="flex gap-4">
             <div className="w-16 h-16 md:w-24 md:h-24 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
               <UserPlus className="w-8 h-8 md:w-12 md:h-12 text-brand-red" />
             </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full max-w-2xl mx-auto">
        <button
          onClick={() => setActiveTab('global')}
          className={cn(
            "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'global' ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Global Registry
        </button>
        <button
          onClick={() => setActiveTab('tournament')}
          className={cn(
            "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'tournament' ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Tournament Linked
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'global' ? (
          <motion.div
            key="global"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Player Registration Info */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Global Player ID</h3>
                <p className="text-slate-500 text-sm font-medium">Create a permanent profile that follows you from project to project. Career stats, photos, and achievements, all in one place.</p>
              </div>

              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 group hover:bg-white hover:border-brand-red transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-all">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-xs">Digital Identity</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mobile-linked account verification</p>
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 group hover:bg-white hover:border-brand-red transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-all">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-xs">Universal Stats</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Batting, Bowling, and POM records</p>
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 group hover:bg-white hover:border-brand-red transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-all">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-xs">Talent Scouting</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Get discovered by franchise owners</p>
                  </div>
                </div>
              </div>

              <button className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-brand-red transition-all shadow-xl shadow-slate-900/10">
                Launch Registration Form
              </button>
            </div>

            {/* Registration Preview/Image */}
            <div className="bg-brand-red rounded-[2rem] p-8 md:p-12 text-white flex flex-col justify-end min-h-[400px] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-full h-full opacity-10 scale-150 rotate-12">
                 <Trophy className="w-full h-full text-white" />
               </div>
               <div className="relative z-10 space-y-4">
                  <div className="w-20 h-2 bg-white/30 rounded-full"></div>
                  <h3 className="text-4xl font-black uppercase leading-none tracking-tighter">Join the<br /> Elite Registry.</h3>
                  <p className="text-red-100 text-sm font-medium">Coming soon for all regional enthusiasts. Be part of the first 1000 players.</p>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tournament"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
             <div className="md:col-span-2 bg-amber-50 rounded-[2rem] p-8 md:p-12 border border-amber-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-amber-200 flex items-center justify-center shrink-0">
                  <Trophy className="w-12 h-12 md:w-16 md:h-16 text-amber-600" />
                </div>
                <div className="space-y-4 text-center md:text-left">
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Active Tournament Registration</h3>
                  <p className="text-slate-600 font-medium max-w-xl">Register your squad for an official Apna Cricket tournament. Linked registrations ensure player stats update automatically across the leaderboard.</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <button className="px-8 py-4 rounded-xl bg-amber-600 text-white font-black uppercase tracking-widest text-xs hover:bg-amber-700 transition-all">
                      Find Open Tournaments
                    </button>
                    <button className="px-8 py-4 rounded-xl bg-white border border-amber-200 text-amber-600 font-black uppercase tracking-widest text-xs hover:bg-amber-50 transition-all">
                      Check Invitation
                    </button>
                  </div>
                </div>
             </div>

             <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-6">
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Squad Management</h4>
                <p className="text-slate-400 text-xs font-bold leading-relaxed">TEAM ADMINS: Manage your playing 11, submit substitutions, and track player availability in real-time before each toss.</p>
                <div className="h-40 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
                  <Users className="w-12 h-12 text-slate-200" />
                </div>
             </div>

             <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-6">
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Player Form Helper</h4>
                <p className="text-slate-400 text-xs font-bold leading-relaxed">STUDENT & EMPLOYEES: Special registration forms for corporate or university leagues. Secure and verified data entry.</p>
                <div className="grid grid-cols-2 gap-4">
                   <div className="h-20 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center text-emerald-600 font-black uppercase text-[10px] tracking-widest">Univ. Form</div>
                   <div className="h-20 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center text-blue-600 font-black uppercase text-[10px] tracking-widest">Corp. Form</div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
