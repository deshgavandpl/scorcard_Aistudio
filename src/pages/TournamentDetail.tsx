import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Trophy, Calendar, BarChart2, ChevronLeft, Play, CheckCircle } from 'lucide-react';
import { Tournament, Match } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'fixtures' | 'points'>('fixtures');

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'tournaments', id), (docSnap) => {
      if (docSnap.exists()) {
        setTournament({ id: docSnap.id, ...docSnap.data() } as Tournament);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `tournaments/${id}`);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'matches'), where('tournamentId', '==', id));
    const unsub = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });
    return () => unsub();
  }, [id]);

  if (!tournament) return <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Tournament...</div>;

  const pointsTable = tournament.teams.map(team => {
    const teamMatches = matches.filter(m => m.status === 'Finished' && (m.teamAId === team.id || m.teamBId === team.id));
    const wins = teamMatches.filter(m => m.winnerId === team.id).length;
    const losses = teamMatches.filter(m => m.winnerId !== team.id && m.winnerId !== 'Draw').length;
    const draws = teamMatches.filter(m => m.winnerId === 'Draw').length;
    
    return {
      name: team.name,
      played: teamMatches.length,
      wins,
      losses,
      draws,
      points: (wins * 2) + draws
    };
  }).sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-8">
      <button onClick={() => navigate('/tournaments')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold uppercase text-xs tracking-widest transition-colors">
        <ChevronLeft className="w-4 h-4" /> All Tournaments
      </button>

      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Trophy className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-block">
            {tournament.status}
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight transform -skew-x-6">{tournament.name}</h1>
          <div className="flex gap-6 mt-6">
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Teams</span>
              <span className="text-2xl font-black">{tournament.teams.length}</span>
            </div>
            <div className="flex flex-col border-l border-slate-800 pl-6">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Matches</span>
              <span className="text-2xl font-black">{tournament.matches.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <button 
          onClick={() => setActiveTab('fixtures')}
          className={cn(
            "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'fixtures' ? "bg-blue-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <Calendar className="w-4 h-4" /> Fixtures
        </button>
        <button 
          onClick={() => setActiveTab('points')}
          className={cn(
            "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'points' ? "bg-blue-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <BarChart2 className="w-4 h-4" /> Points Table
        </button>
      </div>

      {activeTab === 'fixtures' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((match, idx) => (
            <div key={match.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match {idx + 1}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                  match.status === 'Live' ? "bg-red-100 text-red-600 animate-pulse" : 
                  match.status === 'Finished' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                )}>
                  {match.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex-1 text-center font-black uppercase text-slate-900 truncate">{match.teamAName}</div>
                <div className="text-slate-300 font-black italic">VS</div>
                <div className="flex-1 text-center font-black uppercase text-slate-900 truncate">{match.teamBName}</div>
              </div>

              {match.status !== 'Finished' ? (
                <Link 
                  to={`/match/${match.id}`}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-900 transition-all"
                >
                  <Play className="w-3 h-3 fill-white" /> {match.status === 'Live' ? 'Resume Scoring' : 'Start Scoring'}
                </Link>
              ) : (
                <div className="w-full py-3 rounded-xl bg-emerald-50 text-emerald-700 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                  <CheckCircle className="w-3 h-3" /> Match Completed
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Team</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">P</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">W</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">L</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">D</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pointsTable.map((team, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-300 w-4">{idx + 1}</span>
                        <span className="font-bold text-slate-900 uppercase tracking-tight">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-600">{team.played}</td>
                    <td className="px-6 py-4 text-center font-bold text-emerald-600">{team.wins}</td>
                    <td className="px-6 py-4 text-center font-bold text-red-500">{team.losses}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-400">{team.draws}</td>
                    <td className="px-6 py-4 text-center font-black text-blue-900">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
