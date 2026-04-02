import React, { useState, useEffect } from 'react';
import { BarChart2, Trophy, User, Zap, TrendingUp, Target } from 'lucide-react';
import { Match, MatchInnings, BatterStats, BowlerStats } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Stats() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling'>('batting');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('cricket_matches') || '[]');
    setMatches(saved);
  }, []);

  const getAggregatedBattingStats = () => {
    const stats: Record<string, any> = {};
    matches.forEach(m => {
      [m.innings1, m.innings2].forEach(inn => {
        if (!inn) return;
        (Object.values(inn.battingStats) as BatterStats[]).forEach(b => {
          if (!stats[b.playerName]) {
            stats[b.playerName] = { name: b.playerName, runs: 0, balls: 0, fours: 0, sixes: 0, matches: 0 };
          }
          stats[b.playerName].runs += b.runs;
          stats[b.playerName].balls += b.balls;
          stats[b.playerName].fours += b.fours;
          stats[b.playerName].sixes += b.sixes;
          stats[b.playerName].matches += 1;
        });
      });
    });
    return Object.values(stats).sort((a: any, b: any) => b.runs - a.runs);
  };

  const getAggregatedBowlingStats = () => {
    const stats: Record<string, any> = {};
    matches.forEach(m => {
      [m.innings1, m.innings2].forEach(inn => {
        if (!inn) return;
        (Object.values(inn.bowlingStats) as BowlerStats[]).forEach(b => {
          if (!stats[b.playerName]) {
            stats[b.playerName] = { name: b.playerName, wickets: 0, runs: 0, overs: 0, balls: 0, matches: 0 };
          }
          stats[b.playerName].wickets += b.wickets;
          stats[b.playerName].runs += b.runs;
          stats[b.playerName].overs += b.overs;
          stats[b.playerName].balls += b.balls;
          stats[b.playerName].matches += 1;
        });
      });
    });
    return Object.values(stats).sort((a: any, b: any) => b.wickets - a.wickets);
  };

  const battingStats = getAggregatedBattingStats();
  const bowlingStats = getAggregatedBowlingStats();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">Player Stats</h1>
          <p className="text-slate-500 font-medium">Performance tracking for all local legends.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('batting')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'batting' ? "bg-blue-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Batting
          </button>
          <button 
            onClick={() => setActiveTab('bowling')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'bowling' ? "bg-blue-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Bowling
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leaderboard */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Player</th>
                    {activeTab === 'batting' ? (
                      <>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Runs</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Balls</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">S/R</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">4s/6s</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Wkts</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Overs</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Econ</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Runs</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(activeTab === 'batting' ? battingStats : bowlingStats).map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-slate-300 w-4">{idx + 1}</span>
                          <span className="font-bold text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{s.name}</span>
                        </div>
                      </td>
                      {activeTab === 'batting' ? (
                        <>
                          <td className="px-6 py-4 text-center font-black text-slate-900">{s.runs}</td>
                          <td className="px-6 py-4 text-center text-slate-500 font-medium">{s.balls}</td>
                          <td className="px-6 py-4 text-center font-bold text-blue-600">
                            {s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(1) : '0.0'}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-400 text-xs font-bold">{s.fours}/{s.sixes}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-center font-black text-emerald-600">{s.wickets}</td>
                          <td className="px-6 py-4 text-center text-slate-500 font-medium">{s.overs}.{s.balls}</td>
                          <td className="px-6 py-4 text-center font-bold text-amber-600">
                            {s.overs > 0 ? (s.runs / (s.overs + s.balls/6)).toFixed(2) : '0.00'}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-400 font-bold">{s.runs}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {(activeTab === 'batting' ? battingStats : bowlingStats).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No data available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Highlights */}
        <div className="space-y-6">
          <div className="bg-blue-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-20 h-20" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2 relative z-10">
              <Zap className="w-5 h-5 fill-amber-400 text-amber-400" /> Top Performer
            </h3>
            
            {battingStats.length > 0 ? (
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-800 rounded-2xl flex items-center justify-center border border-blue-700 shadow-lg">
                    <User className="w-8 h-8 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-black uppercase tracking-tight leading-none">{battingStats[0].name}</p>
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1">Leading Scorer</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-800/50 p-4 rounded-2xl border border-blue-700">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Total Runs</p>
                    <p className="text-2xl font-black">{battingStats[0].runs}</p>
                  </div>
                  <div className="bg-blue-800/50 p-4 rounded-2xl border border-blue-700">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Strike Rate</p>
                    <p className="text-2xl font-black">
                      {((battingStats[0].runs / battingStats[0].balls) * 100).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-blue-300 italic text-sm">Waiting for match results...</p>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Tournament Records</h3>
            <div className="space-y-4">
              <RecordItem label="Highest Score" value="0" player="-" />
              <RecordItem label="Best Bowling" value="0/0" player="-" />
              <RecordItem label="Most Sixes" value="0" player="-" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordItem({ label, value, player }: any) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="font-bold text-slate-900 text-sm uppercase">{player}</p>
      </div>
      <span className="text-xl font-black text-blue-900">{value}</span>
    </div>
  );
}
