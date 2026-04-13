import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Calendar, BarChart2, ChevronRight, Zap, Users } from 'lucide-react';
import { Tournament, Match, Team, BatterStats, BowlerStats } from '../types/cricket';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

interface TournamentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  currentMatchId?: string;
}

export default function TournamentSidebar({ isOpen, onClose, tournamentId, currentMatchId }: TournamentSidebarProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'fixtures' | 'points' | 'teams'>('fixtures');

  useEffect(() => {
    if (!tournamentId || !isOpen) return;

    const unsubTournament = onSnapshot(doc(db, 'tournaments', tournamentId), (docSnap) => {
      if (docSnap.exists()) {
        setTournament({ id: docSnap.id, ...docSnap.data() } as Tournament);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `tournaments/${tournamentId}`);
    });

    const q = query(collection(db, 'matches'), where('tournamentId', '==', tournamentId));
    const unsubMatches = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });

    return () => {
      unsubTournament();
      unsubMatches();
    };
  }, [tournamentId, isOpen]);

  const cricketToDecimal = (overs: number) => {
    const wholeOvers = Math.floor(overs);
    const balls = Math.round((overs - wholeOvers) * 10);
    return wholeOvers + (balls / 6);
  };

  const decimalToCricket = (decimal: number) => {
    const wholeOvers = Math.floor(decimal);
    const balls = Math.round((decimal - wholeOvers) * 6);
    return parseFloat(`${wholeOvers}.${balls}`);
  };

  const pointsTable = React.useMemo(() => {
    if (!tournament) return [];

    return tournament.teams.map(team => {
      const teamMatches = matches.filter(m => {
        const isKnockout = m.isKnockout || 
                          m.name?.toLowerCase().includes('semi') || 
                          m.name?.toLowerCase().includes('final');
        return m.status === 'Finished' && !isKnockout && (m.teamAId === team.id || m.teamBId === team.id);
      });
      const autoWins = teamMatches.filter(m => m.winnerId === team.id).length;
      const autoLosses = teamMatches.filter(m => m.winnerId !== team.id && m.winnerId !== 'Draw' && m.winnerId !== undefined).length;
      const autoDraws = teamMatches.filter(m => m.winnerId === 'Draw').length;
      
      let autoRunsScored = 0;
      let autoOversFaced = 0;
      let autoRunsConceded = 0;
      let autoOversBowled = 0;

      teamMatches.forEach(m => {
        const teamInnings = m.innings1?.battingTeamId === team.id ? m.innings1 : (m.innings2?.battingTeamId === team.id ? m.innings2 : null);
        const oppInnings = m.innings1?.bowlingTeamId === team.id ? m.innings1 : (m.innings2?.bowlingTeamId === team.id ? m.innings2 : null);

        const maxWickets = m.isSuperOver ? 2 : 10;

        if (teamInnings) {
          autoRunsScored += teamInnings.runs;
          if (teamInnings.wickets >= maxWickets) {
            autoOversFaced += m.oversLimit;
          } else {
            autoOversFaced += teamInnings.overs + (teamInnings.balls / 6);
          }
        }

        if (oppInnings) {
          autoRunsConceded += oppInnings.runs;
          if (oppInnings.wickets >= maxWickets) {
            autoOversBowled += m.oversLimit;
          } else {
            autoOversBowled += oppInnings.overs + (oppInnings.balls / 6);
          }
        }
      });

      const totalRunsScored = autoRunsScored + (team.manualRunsScored || 0);
      const totalOversFaced = autoOversFaced + cricketToDecimal(team.manualOversFaced || 0);
      const totalRunsConceded = autoRunsConceded + (team.manualRunsConceded || 0);
      const totalOversBowled = autoOversBowled + cricketToDecimal(team.manualOversBowled || 0);

      const nrr = (totalOversFaced > 0 && totalOversBowled > 0) 
        ? (totalRunsScored / totalOversFaced) - (totalRunsConceded / totalOversBowled)
        : 0;

      const finalPlayed = teamMatches.length + (team.manualPlayed || 0);
      const finalWins = autoWins + (team.manualWon || 0);
      const finalLosses = autoLosses + (team.manualLost || 0);
      const finalDraws = autoDraws + (team.manualTied || 0);
      const finalPoints = (finalWins * 2) + finalDraws + (team.manualPoints || 0);
      
      const finalNRR = (team.manualNRR !== undefined && team.manualNRR !== 0)
        ? team.manualNRR.toFixed(3)
        : Math.max(-5, Math.min(5, nrr)).toFixed(3);

      return {
        name: team.name,
        played: finalPlayed,
        wins: finalWins,
        losses: finalLosses,
        draws: finalDraws,
        points: finalPoints,
        nrr: finalNRR,
        runsScored: totalRunsScored,
        oversFaced: totalOversFaced,
        runsConceded: totalRunsConceded,
        oversBowled: totalOversBowled
      };
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return parseFloat(b.nrr) - parseFloat(a.nrr);
    });
  }, [tournament, matches]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center shadow-lg transform -rotate-6">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight italic transform -skew-x-6">
                    {tournament?.name || 'Tournament'}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tournament Center</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex p-2 bg-slate-100 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('fixtures')}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'fixtures' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/50"
                )}
              >
                <Calendar className="w-3.5 h-3.5" /> Fixtures
              </button>
              <button
                onClick={() => setActiveTab('points')}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'points' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/50"
                )}
              >
                <BarChart2 className="w-3.5 h-3.5" /> Points
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'teams' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/50"
                )}
              >
                <Users className="w-3.5 h-3.5" /> Teams
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {activeTab === 'fixtures' ? (
                <div className="space-y-3">
                  {matches.sort((a, b) => b.createdAt - a.createdAt).map((match) => (
                    <Link
                      key={match.id}
                      to={`/match/${match.id}`}
                      onClick={onClose}
                      className={cn(
                        "block p-6 rounded-[2rem] border transition-all group relative",
                        match.status === 'Live' 
                          ? "bg-[#fff5f5] border-red-100 ring-1 ring-red-50" 
                          : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
                      )}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                          MATCH {matches.length - matches.indexOf(match)}
                        </span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          match.status === 'Live' ? "bg-red-50 text-red-600 animate-pulse" : 
                          match.status === 'Finished' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                        )}>
                          {match.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 text-center">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{match.teamAName}</p>
                          {match.status !== 'Upcoming' && (match.innings1 || match.innings2) && (
                            <p className="text-sm font-black text-brand-red">
                              {match.innings2?.battingTeamId === match.teamAId ? `${match.innings2.runs}/${match.innings2.wickets}` : (match.innings1?.battingTeamId === match.teamAId ? `${match.innings1.runs}/${match.innings1.wickets}` : '0/0')}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-[10px] font-black text-slate-200 italic uppercase tracking-widest">VS</div>
                        
                        <div className="flex-1 text-center">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{match.teamBName}</p>
                          {match.status !== 'Upcoming' && (match.innings1 || match.innings2) && (
                            <p className="text-sm font-black text-brand-red">
                              {match.innings2?.battingTeamId === match.teamBId ? `${match.innings2.runs}/${match.innings2.wickets}` : (match.innings1?.battingTeamId === match.teamBId ? `${match.innings1.runs}/${match.innings1.wickets}` : '0/0')}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : activeTab === 'points' ? (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-[10px] min-w-[450px]">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="sticky left-0 bg-slate-50/50 px-3 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 z-10">Team</th>
                          <th className="px-2 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">P</th>
                          <th className="px-2 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">W</th>
                          <th className="px-2 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Pts</th>
                          <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">NRR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {pointsTable.map((team, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="sticky left-0 bg-white group-hover:bg-slate-50 transition-colors px-3 py-5 font-black text-slate-900 uppercase tracking-tight text-xs truncate max-w-[80px] z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]">{team.name}</td>
                            <td className="px-2 py-5 text-center font-bold text-slate-600 text-xs">{team.played}</td>
                            <td className="px-2 py-5 text-center font-bold text-emerald-600 text-xs">{team.wins}</td>
                            <td className="px-2 py-5 text-center font-black text-brand-red text-xs">{team.points}</td>
                            <td className={cn(
                              "px-3 py-5 text-center font-black text-xs",
                              parseFloat(team.nrr) >= 0 ? "text-emerald-600" : "text-red-500"
                            )}>
                              {parseFloat(team.nrr) > 0 ? '+' : ''}{team.nrr}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em]">Scroll right for NRR</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {tournament?.teams.map((team) => (
                    <div key={team.id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center border border-red-100">
                          <Zap className="w-4 h-4 text-brand-red" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{team.name}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {team.players.slice(0, 4).map((p, idx) => (
                          <div key={idx} className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <div className="w-1 h-1 bg-slate-300 rounded-full" /> {p.name}
                          </div>
                        ))}
                        {team.players.length > 4 && (
                          <div className="text-[9px] font-black text-brand-red uppercase tracking-widest">
                            +{team.players.length - 4} MORE
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <Link
                to={`/tournament/${tournamentId}`}
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-brand-red transition-all"
              >
                View Full Tournament <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
