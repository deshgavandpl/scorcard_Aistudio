import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Plus, Calendar, Users, ChevronRight } from 'lucide-react';
import { Tournament } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('cricket_tournaments') || '[]');
    setTournaments(saved);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">Tournaments</h1>
          <p className="text-slate-500 font-medium">Create and manage your cricket leagues.</p>
        </div>
        <Link 
          to="/tournaments/new"
          className="px-6 py-3 rounded-xl bg-amber-500 text-white font-black uppercase tracking-wider hover:bg-amber-600 transition-all shadow-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Create Tournament
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">No Tournaments Yet</h3>
          <p className="text-slate-400 max-w-xs mx-auto mb-8">Start your first league and invite teams to compete for the glory.</p>
          <Link 
            to="/tournaments/new"
            className="inline-flex items-center gap-2 text-amber-600 font-black uppercase text-sm tracking-widest hover:text-amber-700 transition-colors"
          >
            Create Now <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group"
            >
              <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Trophy className="w-20 h-20" />
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-block",
                  t.status === 'Live' ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-300"
                )}>
                  {t.status}
                </span>
                <h3 className="text-2xl font-black uppercase tracking-tight truncate">{t.name}</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    <Users className="w-4 h-4" /> Teams
                  </div>
                  <span className="font-black text-slate-900">{t.teams.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    <Calendar className="w-4 h-4" /> Matches
                  </div>
                  <span className="font-black text-slate-900">{t.matches.length}</span>
                </div>
                
                <Link 
                  to={`/tournament/${t.id}`}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-black uppercase tracking-widest text-xs hover:bg-blue-900 hover:text-white hover:border-blue-900 transition-all"
                >
                  View Tournament <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
