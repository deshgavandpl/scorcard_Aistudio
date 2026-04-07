import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Trophy, Zap, Target, TrendingUp, Shield } from 'lucide-react';
import { usePlayerProfile } from '../context/PlayerProfileContext';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Match, BatterStats, BowlerStats } from '../types/cricket';
import { cn } from '../lib/utils';

export default function PlayerProfileModal() {
  const { selectedPlayer, closePlayerProfile, allMatches, loadingMatches } = usePlayerProfile();

  const calculateStats = () => {
    if (!selectedPlayer) return null;
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

    allMatches.forEach(m => {
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
    <AnimatePresence mode="wait">
      {selectedPlayer && (
        <motion.div 
          key="player-profile-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          onClick={closePlayerProfile}
        >
          <motion.div 
            key="player-profile-content"
            initial={{ scale: 0.9, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-[3rem] w-full max-w-lg shadow-[0_32px_64px_-15px_rgba(0,0,0,0.3)] overflow-hidden border border-white/20"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Shield className="w-48 h-48" />
              </div>
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-red/20 rounded-full blur-3xl" />
              
              <button 
                onClick={closePlayerProfile}
                className="absolute top-6 right-6 p-2.5 hover:bg-white/10 rounded-full transition-all active:scale-90 z-20"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-8 relative z-10">
                <motion.div 
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  className="w-24 h-24 bg-brand-red rounded-[2rem] flex items-center justify-center shadow-2xl transform -rotate-6 border-4 border-white/10"
                >
                  <User className="w-12 h-12 text-white" />
                </motion.div>
                <div>
                  <motion.h2 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-4xl font-black uppercase tracking-tighter italic transform -skew-x-6 leading-none"
                  >
                    {selectedPlayer.name}
                  </motion.h2>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-3 py-1 rounded-full bg-brand-red/20 text-brand-red text-[10px] font-black uppercase tracking-widest border border-brand-red/20">
                      Pro League
                    </span>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Season 2026</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="p-8 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
              {loadingMatches ? (
                <div className="py-20 text-center space-y-6">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 border-4 border-brand-red/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Career Data...</p>
                </div>
              ) : stats && (
                <>
                  {/* Batting Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-brand-red fill-brand-red" />
                        </div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Batting Power</h3>
                      </div>
                      <div className="h-px flex-1 bg-slate-200 ml-4" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <StatCard label="Matches" value={stats.batting.matches} />
                      <StatCard label="Runs" value={stats.batting.runs} highlight />
                      <StatCard label="Highest" value={stats.batting.highestScore} />
                      <StatCard label="Avg" value={stats.batting.matches > 0 ? (stats.batting.runs / (stats.batting.matches - stats.batting.notOuts || 1)).toFixed(1) : '0.0'} />
                      <StatCard label="S/R" value={stats.batting.balls > 0 ? ((stats.batting.runs / stats.batting.balls) * 100).toFixed(1) : '0.0'} />
                      <StatCard label="4s/6s" value={`${stats.batting.fours}/${stats.batting.sixes}`} />
                    </div>
                  </div>

                  {/* Bowling Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                          <Target className="w-4 h-4 text-slate-900" />
                        </div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Bowling Skill</h3>
                      </div>
                      <div className="h-px flex-1 bg-slate-200 ml-4" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <StatCard label="Innings" value={stats.bowling.innings} />
                      <StatCard label="Wickets" value={stats.bowling.wickets} highlight />
                      <StatCard label="Best" value={`${stats.bowling.bestBowling.wickets}/${stats.bowling.bestBowling.runs}`} />
                      <StatCard label="Econ" value={stats.bowling.overs > 0 ? (stats.bowling.runs / (stats.bowling.overs + stats.bowling.balls/6)).toFixed(2) : '0.00'} />
                      <StatCard label="Maidens" value={stats.bowling.maidens} />
                      <StatCard label="Runs" value={stats.bowling.runs} />
                    </div>
                  </div>

                  {stats.batting.matches === 0 && (
                    <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No match history found</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 bg-white border-t border-slate-100 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Performance Verified by Apna Cricket</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
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
