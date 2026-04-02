import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Play, Trophy, History, Trash2 } from 'lucide-react';
import { Match } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function LiveScore() {
  const [matches, setMatches] = useState<Match[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedMatches = JSON.parse(localStorage.getItem('cricket_matches') || '[]');
    setMatches(savedMatches.sort((a: Match, b: Match) => b.createdAt - a.createdAt));
  }, []);

  const deleteMatch = (id: string) => {
    const updated = matches.filter(m => m.id !== id);
    setMatches(updated);
    localStorage.setItem('cricket_matches', JSON.stringify(updated));
  };

  const createNewMatch = () => {
    navigate('/match/new');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">Create Live Score</h1>
          <p className="text-slate-500 font-medium">Manage your matches and tournaments in real-time.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={createNewMatch}
            className="px-6 py-3 rounded-xl bg-blue-900 text-white font-black uppercase tracking-wider hover:bg-blue-800 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Single Match
          </button>
          <Link 
            to="/tournaments/new"
            className="px-6 py-3 rounded-xl bg-amber-500 text-white font-black uppercase tracking-wider hover:bg-amber-600 transition-all shadow-lg flex items-center gap-2"
          >
            <Trophy className="w-5 h-5" /> Tournament
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Matches */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Play className="w-5 h-5 fill-emerald-500 text-emerald-500" /> Recent & Live
          </h2>
          
          {matches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 italic">
              No matches found. Start a new one to see it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {matches.map((match) => (
                <motion.div 
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                        match.status === 'Live' ? "bg-red-100 text-red-600 animate-pulse" : 
                        match.status === 'Finished' ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {match.status}
                      </span>
                      <span className="text-slate-400 text-[10px] font-bold uppercase">{new Date(match.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button 
                      onClick={() => deleteMatch(match.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex-1 text-center">
                      <p className="text-lg font-black text-slate-900 uppercase truncate">{match.teamAName}</p>
                      <p className="text-2xl font-black text-blue-900">
                        {match.innings1?.battingTeamId === match.teamAId ? match.innings1.runs : match.innings2?.runs || 0}
                        <span className="text-sm text-slate-400 font-bold">/{match.innings1?.battingTeamId === match.teamAId ? match.innings1.wickets : match.innings2?.wickets || 0}</span>
                      </p>
                    </div>
                    <div className="text-slate-300 font-black italic text-xl">VS</div>
                    <div className="flex-1 text-center">
                      <p className="text-lg font-black text-slate-900 uppercase truncate">{match.teamBName}</p>
                      <p className="text-2xl font-black text-blue-900">
                        {match.innings1?.battingTeamId === match.teamBId ? match.innings1.runs : match.innings2?.runs || 0}
                        <span className="text-sm text-slate-400 font-bold">/{match.innings1?.battingTeamId === match.teamBId ? match.innings1.wickets : match.innings2?.wickets || 0}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Link 
                      to={`/match/${match.id}`}
                      className="w-full text-center py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-black uppercase tracking-widest text-xs hover:bg-blue-900 hover:text-white hover:border-blue-900 transition-all"
                    >
                      {match.status === 'Finished' ? 'View Scorecard' : 'Resume Scoring'}
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
              <History className="w-5 h-5" /> Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-blue-800 pb-2">
                <span className="text-blue-300 text-xs font-bold uppercase">Total Matches</span>
                <span className="font-black">{matches.length}</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-800 pb-2">
                <span className="text-blue-300 text-xs font-bold uppercase">Live Now</span>
                <span className="font-black text-emerald-400">{matches.filter(m => m.status === 'Live').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-300 text-xs font-bold uppercase">Finished</span>
                <span className="font-black">{matches.filter(m => m.status === 'Finished').length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Scoring Tips</h3>
            <ul className="space-y-3 text-sm text-slate-500 font-medium">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0"></div>
                Auto-strike change happens on odd runs and over completion.
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0"></div>
                Use "Wicket" button to record dismissals and set new batters.
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0"></div>
                Extras like Wide and No Ball add 1 run and don't count as a legal ball.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
