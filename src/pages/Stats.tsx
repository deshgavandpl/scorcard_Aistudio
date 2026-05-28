import React, { useState, useEffect } from 'react';
import { BarChart2, Trophy, User, Zap, TrendingUp, Target, Users, CheckCircle2, ChevronDown, Calendar, AlertCircle } from 'lucide-react';
import { Match, MatchInnings, BatterStats, BowlerStats, Tournament, Team } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { usePlayerProfile } from '../context/PlayerProfileContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function Stats() {
  const { openPlayerProfile } = usePlayerProfile();
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'teams' | 'achievements'>('batting');

  useEffect(() => {
    const qMatches = query(collection(db, 'matches'));
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });

    const qTournaments = query(collection(db, 'tournaments'));
    const unsubTournaments = onSnapshot(qTournaments, (snapshot) => {
      const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setTournaments(tournamentsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tournaments');
    });

    const qTeams = query(collection(db, 'teams'));
    const unsubTeams = onSnapshot(qTeams, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teams');
    });

    return () => {
      unsubMatches();
      unsubTournaments();
      unsubTeams();
    };
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

  const getTeamWinLossData = () => {
    const filteredMatches = matches.filter(m => {
      if (selectedTournamentId === 'all') {
        return m.status === 'Finished';
      }
      return m.status === 'Finished' && m.tournamentId === selectedTournamentId;
    });

    let teamsToProcess: Array<{ id: string; name: string; manualWon?: number; manualLost?: number; manualTied?: number; manualPlayed?: number }> = [];

    if (selectedTournamentId === 'all') {
      teamsToProcess = teams.map(t => ({
        id: t.id,
        name: t.name,
        manualWon: 0,
        manualLost: 0,
        manualTied: 0,
        manualPlayed: 0
      }));
      filteredMatches.forEach(m => {
        if (m.teamAId && !teamsToProcess.some(t => t.id === m.teamAId)) {
          teamsToProcess.push({ id: m.teamAId, name: m.teamAName });
        }
        if (m.teamBId && !teamsToProcess.some(t => t.id === m.teamBId)) {
          teamsToProcess.push({ id: m.teamBId, name: m.teamBName });
        }
      });
    } else {
      const selectedTourney = tournaments.find(t => t.id === selectedTournamentId);
      if (selectedTourney) {
        teamsToProcess = selectedTourney.teams.map(t => ({
          id: t.id,
          name: t.name,
          manualWon: t.manualWon || 0,
          manualLost: t.manualLost || 0,
          manualTied: t.manualTied || 0,
          manualPlayed: t.manualPlayed || 0
        }));
      }
    }

    const data = teamsToProcess.map(team => {
      const teamMatches = filteredMatches.filter(m => {
        return m.teamAId === team.id || m.teamBId === team.id;
      });

      const autoWins = teamMatches.filter(m => m.winnerId === team.id).length;
      const autoLosses = teamMatches.filter(m => m.winnerId !== team.id && m.winnerId !== 'Draw' && m.winnerId !== undefined).length;
      const autoDraws = teamMatches.filter(m => m.winnerId === 'Draw').length;

      const wins = autoWins + (team.manualWon || 0);
      const losses = autoLosses + (team.manualLost || 0);
      const draws = autoDraws + (team.manualTied || 0);
      const played = wins + losses + draws;

      return {
        id: team.id,
        name: team.name,
        Wins: wins,
        Losses: losses,
        Draws: draws,
        Played: played,
        WinRate: played > 0 ? (wins / played) * 100 : 0
      };
    });

    return data
      .filter(t => t.Played > 0 || selectedTournamentId !== 'all')
      .sort((a, b) => b.Wins - a.Wins || b.WinRate - a.WinRate);
  };

  const teamWinLossData = getTeamWinLossData();

  return (
    <div className="space-y-6 px-2 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 md:px-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">Player Stats</h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium uppercase tracking-wider">Performance tracking for local legends.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('batting')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === 'batting' ? "bg-brand-red text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Batting
          </button>
          <button 
            onClick={() => setActiveTab('bowling')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === 'bowling' ? "bg-brand-red text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Bowling
          </button>
          <button 
            onClick={() => setActiveTab('teams')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === 'teams' ? "bg-brand-red text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Teams
          </button>
          <button 
            onClick={() => setActiveTab('achievements')}
            className={cn(
              "flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === 'achievements' ? "bg-brand-red text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Achievements
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
                <button 
                  onClick={() => openPlayerProfile('', (activeTab === 'batting' ? battingStats : bowlingStats)[0].name)}
                  className="text-left group/name"
                >
                  <p className="text-xl font-black uppercase tracking-tight leading-none group-hover/name:text-white/80 transition-colors">{(activeTab === 'batting' ? battingStats : bowlingStats)[0].name}</p>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">
                    {activeTab === 'batting' ? 'Leading Scorer' : 'Top Wicket Taker'}
                  </p>
                </button>
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
      {(activeTab === 'batting' || activeTab === 'bowling') && (
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
                      <button 
                        onClick={() => openPlayerProfile('', s.name)}
                        className="flex items-center gap-2 group/row text-left"
                      >
                        <span className="text-[10px] font-black text-slate-300 w-3">{idx + 1}</span>
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight group-hover/row:text-brand-red transition-colors truncate max-w-[80px] md:max-w-none">{s.name}</span>
                      </button>
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
      )}

      {activeTab === 'teams' && (() => {
        const getMostSuccessfulTeam = () => {
          if (teamWinLossData.length === 0) return { name: '-', rate: 0 };
          const activeOnly = teamWinLossData.filter(t => t.Played > 0);
          if (activeOnly.length === 0) return { name: '-', rate: 0 };
          const sorted = [...activeOnly].sort((a, b) => b.WinRate - a.WinRate || b.Wins - a.Wins);
          return { name: sorted[0].name, rate: sorted[0].WinRate };
        };

        const getHighestTeamTotal = () => {
          let highestRuns = 0;
          let teamName = '-';
          const filteredMatches = matches.filter(m => {
            if (selectedTournamentId === 'all') return m.status === 'Finished';
            return m.status === 'Finished' && m.tournamentId === selectedTournamentId;
          });
          filteredMatches.forEach(m => {
            [m.innings1, m.innings2].forEach(inn => {
              if (inn && inn.runs > highestRuns) {
                highestRuns = inn.runs;
                const isTeamA = inn.battingTeamId === m.teamAId;
                teamName = isTeamA ? m.teamAName : m.teamBName;
              }
            });
          });
          return { runs: highestRuns, team: teamName };
        };

        const mostSuccessful = getMostSuccessfulTeam();
        const highestTotal = getHighestTeamTotal();

        return (
          <div className="space-y-6">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Most Successful Team</h3>
                <p className="text-xl font-black text-brand-red uppercase italic transform -skew-x-6 truncate max-w-full">
                  {mostSuccessful.name}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  {mostSuccessful.name !== '-' ? `Win rate: ${mostSuccessful.rate.toFixed(1)}%` : 'Based on finished matches'}
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Highest Team Total</h3>
                <p className="text-xl font-black text-emerald-600 uppercase italic transform -skew-x-6 truncate max-w-full">
                  {highestTotal.runs > 0 ? `${highestTotal.runs} Runs` : '-'}
                </p>
                <p className="text-[10px] font-bold text-slate-400 truncate max-w-full">
                  {highestTotal.runs > 0 ? `By ${highestTotal.team}` : 'No innings recorded yet'}
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Match Participation</h3>
                <p className="text-xl font-black text-blue-600 uppercase italic transform -skew-x-6">
                  {matches.filter(m => selectedTournamentId === 'all' ? true : m.tournamentId === selectedTournamentId).length}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  Total matches in selection
                </p>
              </div>
            </div>

            {/* Win/Loss Bar Chart Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Win / Loss Records</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visual comparison of match outcomes by team</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tournament:</span>
                  <div className="relative">
                    <select
                      value={selectedTournamentId}
                      onChange={(e) => setSelectedTournamentId(e.target.value)}
                      className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider py-1.5 pl-3 pr-8 rounded-lg outline-none focus:border-brand-red transition-all cursor-pointer"
                    >
                      <option value="all">🏆 All Tournaments</option>
                      {tournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          🏏 {t.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {teamWinLossData.length > 0 && teamWinLossData.some(t => t.Played > 0) ? (
                <div className="h-[320px] w-full pt-4 font-sans text-[10px] font-bold">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={teamWinLossData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                      barGap={4}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fontFamily: 'sans-serif', fontWeight: 800, fill: '#64748b' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fontFamily: 'sans-serif', fontWeight: 700, fill: '#94a3b8' }} 
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg font-sans">
                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight mb-2">{label}</p>
                                <div className="space-y-1 text-[11px] font-bold">
                                  <p className="text-emerald-600 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Wins: {payload[0]?.value}
                                  </p>
                                  <p className="text-rose-600 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                    Losses: {payload[1]?.value}
                                  </p>
                                  {payload[2]?.value > 0 && (
                                    <p className="text-slate-500 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                      Draws: {payload[2]?.value}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                      />
                      <Bar dataKey="Wins" fill="#10b981" radius={[4, 4, 0, 0]} name="WINS" />
                      <Bar dataKey="Losses" fill="#ef4444" radius={[4, 4, 0, 0]} name="LOSSES" />
                      <Bar dataKey="Draws" fill="#94a3b8" radius={[4, 4, 0, 0]} name="DRAWS" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle className="w-10 h-10 text-slate-300 mb-2 animate-bounce" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No finished matches found</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">Matches must be completed and marked 'Finished' to calculate win/loss data for the chart.</p>
                </div>
              )}
            </div>

            {/* Team Performance Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Team Performance Standings</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Wins, losses, and calculated win rate</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                  {teamWinLossData.length} Teams
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30">
                      <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Team</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Played</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center text-emerald-600">Wins</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center text-red-500">Losses</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center text-slate-500">Tied/Draw</th>
                      <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                    {teamWinLossData.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-300 w-3">{idx + 1}</span>
                            <span className="font-bold text-slate-900 uppercase tracking-tight">{t.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-black text-slate-600">{t.Played}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-black text-[10px] min-w-[22px]">
                            {t.Wins}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-red-50 text-red-700 font-black text-[10px] min-w-[22px]">
                            {t.Losses}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-400">{t.Draws}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-black text-slate-900 text-xs mb-1">{t.WinRate.toFixed(1)}%</span>
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${t.WinRate}%` }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {teamWinLossData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs italic uppercase tracking-widest">No team data available for this tournament selection yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'achievements' && (
        <div className="space-y-8">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red opacity-10 blur-[100px] -mr-32 -mt-32"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                 <div className="w-24 h-24 rounded-3xl bg-brand-red flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                    <Trophy className="w-12 h-12" />
                 </div>
                 <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter transform -skew-x-6">Hall of Fame</h3>
                    <p className="text-slate-400 text-sm font-medium">Tracking the legendary performances that define Apna Cricket.</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 rounded-3xl bg-white border border-slate-200 flex items-center gap-6 group hover:border-brand-red transition-all">
                 <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:bg-brand-red group-hover:text-white transition-all">
                    <Zap className="w-6 h-6 fill-current" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Century Club</p>
                    <p className="font-black text-slate-900 uppercase">Coming Soon</p>
                 </div>
              </div>
              <div className="p-8 rounded-3xl bg-white border border-slate-200 flex items-center gap-6 group hover:border-brand-red transition-all">
                 <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-brand-red group-hover:text-white transition-all">
                    <CheckCircle2 className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">5-Wicket Hauls</p>
                    <p className="font-black text-slate-900 uppercase">Coming Soon</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function RecordItem({ label, value, player }: any) {
  const { openPlayerProfile } = usePlayerProfile();
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <button 
          onClick={() => openPlayerProfile('', player)}
          className="font-bold text-slate-900 text-sm uppercase hover:text-brand-red transition-colors text-left"
        >
          {player}
        </button>
      </div>
      <span className="text-xl font-black text-brand-red">{value}</span>
    </div>
  );
}
