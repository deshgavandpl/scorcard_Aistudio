import React, { useState, useEffect } from 'react';
import { BarChart2, Trophy, User, Zap, TrendingUp, Target } from 'lucide-react';
import { Match, MatchInnings, BatterStats, BowlerStats } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

export default function Stats() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling'>('batting');

  useEffect(() => {
    const q = query(collection(db, 'matches'));
    const unsub = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });
    return () => unsub();
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

  const getTournamentRecords = () => {
    let highestScore = { runs: 0, player: '-' };
    let bestBowling = { wickets: 0, runs: 0, player: '-' };
    let mostSixes = { count: 0, player: '-' };

    const playerSixes: Record<string, number> = {};

    matches.forEach(m => {
      [m.innings1, m.innings2].forEach(inn => {
        if (!inn) return;
        
        // Batting Records
        (Object.values(inn.battingStats) as BatterStats[]).forEach(b => {
          if (b.runs > highestScore.runs) {
            highestScore = { runs: b.runs, player: b.playerName };
          }
          playerSixes[b.playerName] = (playerSixes[b.playerName] || 0) + b.sixes;
        });

        // Bowling Records
        (Object.values(inn.bowlingStats) as BowlerStats[]).forEach(b => {
          if (b.wickets > bestBowling.wickets || (b.wickets === bestBowling.wickets && b.runs < bestBowling.runs)) {
            bestBowling = { wickets: b.wickets, runs: b.runs, player: b.playerName };
          }
        });
      });
    });

    // Find player with most sixes
    Object.entries(playerSixes).forEach(([player, count]) => {
      if (count > mostSixes.count) {
        mostSixes = { count, player };
      }
    });

    return { highestScore, bestBowling, mostSixes };
  };

  const battingStats = getAggregatedBattingStats();
  const bowlingStats = getAggregatedBowlingStats();
  const records = getTournamentRecords();

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 md:px-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">Player Stats</h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium uppercase tracking-wider">Performance tracking for local legends.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('batting')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'batting' ? "bg-brand-red text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Batting
          </button>
          <button 
            onClick={() => setActiveTab('bowling')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'bowling' ? "bg-brand-red text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Bowling
          </button>
        </div>
      </div>

      {/* Top Highlights Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Performer / Leading Scorer */}
        <div className="bg-brand-red rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
            <Zap className="w-4 h-4 fill-white text-white" /> Top Performer
          </h3>
          
          {(activeTab === 'batting' ? battingStats : bowlingStats).length > 0 ? (
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xl font-black uppercase tracking-tight leading-none">{(activeTab === 'batting' ? battingStats : bowlingStats)[0].name}</p>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">
                    {activeTab === 'batting' ? 'Leading Scorer' : 'Top Wicket Taker'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/60 mb-0.5">
                    {activeTab === 'batting' ? 'Total Runs' : 'Wickets'}
                  </p>
                  <p className="text-xl font-black">
                    {activeTab === 'batting' ? battingStats[0].runs : bowlingStats[0].wickets}
                  </p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/60 mb-0.5">
                    {activeTab === 'batting' ? 'Strike Rate' : 'Economy'}
                  </p>
                  <p className="text-xl font-black">
                    {activeTab === 'batting' 
                      ? ((battingStats[0].runs / battingStats[0].balls) * 100).toFixed(1)
                      : (bowlingStats[0].overs > 0 ? (bowlingStats[0].runs / (bowlingStats[0].overs + bowlingStats[0].balls/6)).toFixed(2) : '0.00')
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-white/60 italic text-xs">Waiting for match results...</p>
          )}
        </div>

        {/* Tournament Records */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-brand-red" /> Tournament Records
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <RecordItem 
              label="Highest Score" 
              value={records.highestScore.runs} 
              player={records.highestScore.player} 
            />
            <RecordItem 
              label="Best Bowling" 
              value={`${records.bestBowling.wickets}/${records.bestBowling.runs}`} 
              player={records.bestBowling.player} 
            />
            <RecordItem 
              label="Most Sixes" 
              value={records.mostSixes.count} 
              player={records.mostSixes.player} 
            />
          </div>
        </div>
      </div>

      {/* All Player List - Moved to Bottom */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">All Player Rankings</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {(activeTab === 'batting' ? battingStats : bowlingStats).length} Players
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="px-3 md:px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Player</th>
                {activeTab === 'batting' ? (
                  <>
                    <th className="px-2 md:px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Runs</th>
                    <th className="px-2 md:px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Balls</th>
                    <th className="px-2 md:px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">S/R</th>
                    <th className="px-2 md:px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">4s/6s</th>
                  </>
                ) : (
                  <>
                    <th className="px-2 md:px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Wkts</th>
                    <th className="px-2 md:px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Overs</th>
                    <th className="px-2 md:px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Econ</th>
                    <th className="px-2 md:px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Runs</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(activeTab === 'batting' ? battingStats : bowlingStats).map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-3 md:px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-300 w-3">{idx + 1}</span>
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-tight group-hover:text-brand-red transition-colors truncate max-w-[80px] md:max-w-none">{s.name}</span>
                    </div>
                  </td>
                  {activeTab === 'batting' ? (
                    <>
                      <td className="px-2 md:px-6 py-3 text-center text-xs font-black text-slate-900">{s.runs}</td>
                      <td className="px-2 md:px-6 py-3 text-center text-[10px] text-slate-500 font-bold">{s.balls}</td>
                      <td className="px-2 md:px-6 py-3 text-center text-[10px] font-black text-brand-red">
                        {s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(1) : '0.0'}
                      </td>
                      <td className="px-2 md:px-6 py-3 text-center text-slate-400 text-[10px] font-black">{s.fours}/{s.sixes}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 md:px-6 py-3 text-center text-xs font-black text-emerald-600">{s.wickets}</td>
                      <td className="px-2 md:px-6 py-3 text-center text-[10px] text-slate-500 font-bold">{s.overs}.{s.balls}</td>
                      <td className="px-2 md:px-6 py-3 text-center text-[10px] font-black text-brand-red">
                        {s.overs > 0 ? (s.runs / (s.overs + s.balls/6)).toFixed(2) : '0.00'}
                      </td>
                      <td className="px-2 md:px-6 py-3 text-center text-slate-400 text-[10px] font-black">{s.runs}</td>
                    </>
                  )}
                </tr>
              ))}
              {(activeTab === 'batting' ? battingStats : bowlingStats).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs italic uppercase tracking-widest">No data available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
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
      <span className="text-xl font-black text-brand-red">{value}</span>
    </div>
  );
}
