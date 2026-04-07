import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Trophy, Zap, Target, TrendingUp, Shield } from 'lucide-react';
import { usePlayerProfile } from '../context/PlayerProfileContext';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Match, BatterStats, BowlerStats } from '../types/cricket';
import { cn } from '../lib/utils';

export default function PlayerProfileModal() {
  const { selectedPlayer, closePlayerProfile } = usePlayerProfile();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedPlayer) return;

    setLoading(true);
    const q = query(collection(db, 'matches'));
    const unsub = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedPlayer]);

  if (!selectedPlayer) return null;

  const calculateStats = () => {
    const stats = {
      batting: {
        matches: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        highestScore: 0,
        notOuts: 0,
      },
      bowling: {
        innings: 0,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
        bestBowling: { wickets: 0, runs: 0 }
      }
    };

    matches.forEach(m => {
      let playedInMatch = false;
      [m.innings1, m.innings2].forEach(inn => {
        if (!inn) return;

        // Batting
        const batter = (Object.values(inn.battingStats) as BatterStats[]).find(s => s.playerName === selectedPlayer.name || s.playerId === selectedPlayer.id);
        if (batter) {
          playedInMatch = true;
          stats.batting.runs += batter.runs;
          stats.batting.balls += batter.balls;
          stats.batting.fours += batter.fours;
          stats.batting.sixes += batter.sixes;
          if (!batter.isOut) stats.batting.notOuts += 1;
          if (batter.runs > stats.batting.highestScore) stats.batting.highestScore = batter.runs;
        }

        // Bowling
        const bowler = (Object.values(inn.bowlingStats) as BowlerStats[]).find(s => s.playerName === selectedPlayer.name || s.playerId === selectedPlayer.id);
        if (bowler) {
          playedInMatch = true;
          stats.bowling.innings += 1;
          stats.bowling.overs += bowler.overs;
          stats.bowling.balls += bowler.balls;
          stats.bowling.runs += bowler.runs;
          stats.bowling.wickets += bowler.wickets;
          stats.bowling.maidens += bowler.maiden;

          if (bowler.wickets > stats.bowling.bestBowling.wickets || 
             (bowler.wickets === stats.bowling.bestBowling.wickets && bowler.runs < stats.bowling.bestBowling.runs)) {
            stats.bowling.bestBowling = { wickets: bowler.wickets, runs: bowler.runs };
          }
        }
      });
      if (playedInMatch) stats.batting.matches += 1;
    });

    return stats;
  };

  const stats = calculateStats();

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={closePlayerProfile}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-brand-red p-8 text-white relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Shield className="w-32 h-32" />
            </div>
            <button 
              onClick={closePlayerProfile}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center border border-white/30 shadow-xl backdrop-blur-md">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter transform -skew-x-6">{selectedPlayer.name}</h2>
                <p className="text-red-100 text-xs font-black uppercase tracking-[0.2em] mt-1">Career Profile</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Career Stats...</p>
              </div>
            ) : (
              <>
                {/* Batting Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-brand-red fill-brand-red" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Batting Performance</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard label="Matches" value={stats.batting.matches} />
                    <StatCard label="Runs" value={stats.batting.runs} highlight />
                    <StatCard label="Highest" value={stats.batting.highestScore} />
                    <StatCard label="Avg" value={stats.batting.matches > 0 ? (stats.batting.runs / (stats.batting.matches - stats.batting.notOuts || 1)).toFixed(1) : '0.0'} />
                    <StatCard label="S/R" value={stats.batting.balls > 0 ? ((stats.batting.runs / stats.batting.balls) * 100).toFixed(1) : '0.0'} />
                    <StatCard label="4s/6s" value={`${stats.batting.fours}/${stats.batting.sixes}`} />
                  </div>
                </div>

                {/* Bowling Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-red" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Bowling Performance</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard label="Innings" value={stats.bowling.innings} />
                    <StatCard label="Wickets" value={stats.bowling.wickets} highlight />
                    <StatCard label="Best" value={`${stats.bowling.bestBowling.wickets}/${stats.bowling.bestBowling.runs}`} />
                    <StatCard label="Economy" value={stats.bowling.overs > 0 ? (stats.bowling.runs / (stats.bowling.overs + stats.bowling.balls/6)).toFixed(2) : '0.00'} />
                    <StatCard label="Maidens" value={stats.bowling.maidens} />
                    <StatCard label="Runs" value={stats.bowling.runs} />
                  </div>
                </div>

                {stats.batting.matches === 0 && (
                  <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No match data recorded yet</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local League Player Profile • 2026 Season</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-2xl border transition-all",
      highlight ? "bg-red-50 border-red-100 shadow-sm" : "bg-white border-slate-100"
    )}>
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={cn(
        "text-lg font-black tracking-tight",
        highlight ? "text-brand-red" : "text-slate-900"
      )}>{value}</p>
    </div>
  );
}

function History({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
