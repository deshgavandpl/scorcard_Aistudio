import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Calendar, BarChart2, ChevronRight, Zap } from 'lucide-react';
import { Tournament, Match, Team } from '../types/cricket';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

interface TournamentWidgetProps {
  tournamentId: string;
}

export default function TournamentWidget({ tournamentId }: TournamentWidgetProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'fixtures' | 'points'>('fixtures');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!tournamentId) return;
    setError(false);

    const unsubTournament = onSnapshot(doc(db, 'tournaments', tournamentId), (docSnap) => {
      if (docSnap.exists()) {
        setTournament({ id: docSnap.id, ...docSnap.data() } as Tournament);
        setError(false);
      }
    }, (err) => {
      console.error("TournamentWidget Fetch Error:", err);
      setError(true);
      handleFirestoreError(err, OperationType.GET, `tournaments/${tournamentId}`);
    });

    const q = query(collection(db, 'matches'), where('tournamentId', '==', tournamentId));
    const unsubMatches = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
    }, (err) => {
      console.error("TournamentWidget Matches Fetch Error:", err);
      handleFirestoreError(err, OperationType.LIST, 'matches');
    });

    return () => {
      unsubTournament();
      unsubMatches();
    };
  }, [tournamentId]);

  const pointsTable = tournament ? tournament.teams.map(team => {
    const teamMatches = matches.filter(m => m.status === 'Finished' && (m.teamAId === team.id || m.teamBId === team.id));
    const wins = teamMatches.filter(m => m.winnerId === team.id).length;
    const losses = teamMatches.filter(m => m.winnerId !== team.id && m.winnerId !== 'Draw').length;
    const draws = teamMatches.filter(m => m.winnerId === 'Draw').length;
    
    let runsScored = 0;
    let oversFaced = 0;
    let runsConceded = 0;
    let oversBowled = 0;

    teamMatches.forEach(m => {
      const teamInnings = m.innings1?.battingTeamId === team.id ? m.innings1 : (m.innings2?.battingTeamId === team.id ? m.innings2 : null);
      const oppInnings = m.innings1?.bowlingTeamId === team.id ? m.innings1 : (m.innings2?.bowlingTeamId === team.id ? m.innings2 : null);

      if (teamInnings) {
        runsScored += teamInnings.runs;
        if (teamInnings.wickets >= 10) {
          oversFaced += m.oversLimit;
        } else {
          oversFaced += teamInnings.overs + (teamInnings.balls / 6);
        }
      }

      if (oppInnings) {
        runsConceded += oppInnings.runs;
        if (oppInnings.wickets >= 10) {
          oversBowled += m.oversLimit;
        } else {
          oversBowled += oppInnings.overs + (oppInnings.balls / 6);
        }
      }
    });

    const nrr = (oversFaced > 0 && oversBowled > 0) 
      ? (runsScored / oversFaced) - (runsConceded / oversBowled)
      : 0;

    return {
      name: team.name,
      played: teamMatches.length,
      wins,
      losses,
      draws,
      points: (wins * 2) + draws,
      nrr: nrr.toFixed(3)
    };
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return parseFloat(b.nrr) - parseFloat(a.nrr);
  }) : [];

  if (error) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-24 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Tournament Error</p>
          <p className="text-[10px] text-slate-400 font-medium">Failed to load standings</p>
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full sticky top-24">
      {/* Header */}
      <div className="p-6 bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center shadow-lg transform -rotate-6">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight italic transform -skew-x-6">
              {tournament.name}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tournament Center</p>
          </div>
        </div>
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
          <BarChart2 className="w-3.5 h-3.5" /> Points Table
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 max-h-[500px]">
        {activeTab === 'fixtures' ? (
          <div className="space-y-3">
            {[...matches].sort((a, b) => {
              // Priority: Live > Upcoming > Finished
              const statusOrder = { 'Live': 0, 'Upcoming': 1, 'Finished': 2 };
              if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
              }
              
              // Within same status:
              if (a.status === 'Finished') {
                // Latest finished at top
                if (a.order !== undefined && b.order !== undefined) return b.order - a.order;
                return b.createdAt - a.createdAt;
              }
              
              // Upcoming: Match 1, 2, 3... order
              if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
              return a.createdAt - b.createdAt;
            }).map((match) => (
              <Link
                key={match.id}
                to={`/match/${match.id}`}
                className={cn(
                  "block p-4 rounded-2xl border transition-all group relative",
                  match.status === 'Live' 
                    ? "bg-[#fff5f5] border-red-100 ring-1 ring-red-50" 
                    : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
                )}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">
                    {match.order ? `MATCH ${match.order}` : 'MATCH'}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                    match.status === 'Live' ? "bg-red-50 text-red-600 animate-pulse" : 
                    match.status === 'Finished' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                  )}>
                    {match.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">{match.teamAName}</p>
                    {match.status !== 'Upcoming' && (match.innings1 || match.innings2) && (
                      <p className="text-[10px] font-black text-brand-red">
                        {match.innings2?.battingTeamId === match.teamAId ? `${match.innings2.runs}/${match.innings2.wickets}` : (match.innings1?.battingTeamId === match.teamAId ? `${match.innings1.runs}/${match.innings1.wickets}` : '0/0')}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-[8px] font-black text-slate-200 italic uppercase tracking-widest">VS</div>
                  
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">{match.teamBName}</p>
                    {match.status !== 'Upcoming' && (match.innings1 || match.innings2) && (
                      <p className="text-[10px] font-black text-brand-red">
                        {match.innings2?.battingTeamId === match.teamBId ? `${match.innings2.runs}/${match.innings2.wickets}` : (match.innings1?.battingTeamId === match.teamBId ? `${match.innings1.runs}/${match.innings1.wickets}` : '0/0')}
                      </p>
                    )}
                  </div>
                </div>

                {match.status === 'Finished' && match.resultMessage && (
                  <div className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                    <p className="text-[8px] font-black text-emerald-600 text-center uppercase tracking-wider">
                      {match.resultMessage}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-[9px] min-w-[280px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="sticky left-0 bg-slate-50/50 px-3 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 z-10">Team</th>
                    <th className="px-1 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">P</th>
                    <th className="px-1 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">W</th>
                    <th className="px-1 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Pts</th>
                    <th className="px-2 py-3 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">NRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pointsTable.map((team, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="sticky left-0 bg-white group-hover:bg-slate-50 transition-colors px-3 py-4 font-black text-slate-900 uppercase tracking-tight text-[10px] truncate max-w-[80px] z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]">{team.name}</td>
                      <td className="px-1 py-4 text-center font-bold text-slate-600 text-[10px]">{team.played}</td>
                      <td className="px-1 py-4 text-center font-bold text-emerald-600 text-[10px]">{team.wins}</td>
                      <td className="px-1 py-4 text-center font-black text-brand-red text-[10px]">{team.points}</td>
                      <td className={cn(
                        "px-2 py-4 text-center font-bold text-[10px]",
                        parseFloat(team.nrr) >= 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        {team.nrr}
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
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <Link
          to={`/tournament/${tournamentId}`}
          className="w-full py-3 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-brand-red transition-all"
        >
          View Full Tournament <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
