import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Trophy, Calendar, BarChart2, ChevronLeft, Play, CheckCircle, Trash2, Plus, X, Edit2, Users, UserPlus } from 'lucide-react';
import { Tournament, Match, Team } from '../types/cricket';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import { doc, onSnapshot, collection, query, where, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'fixtures' | 'points' | 'teams'>('fixtures');
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isAdminMode, setIsAdminMode] = useState(localStorage.getItem('isAdminMode') === 'true');
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditTournament, setShowEditTournament] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'Draft' | 'Live' | 'Finished'>('Draft');
  
  // Player Management State
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper'>('Batsman');
  
  // Add Match Form State
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [matchName, setMatchName] = useState('');
  const [overs, setOvers] = useState(6);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    const handleStorageChange = () => {
      setIsAdminMode(localStorage.getItem('isAdminMode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const canManage = user || isAdminMode;

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'tournaments', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Tournament;
        setTournament({ id: docSnap.id, ...data } as Tournament);
        setEditName(data.name);
        setEditStatus(data.status);
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

  const deleteTournament = async () => {
    if (!id || !canManage) return;
    
    try {
      // 1. Delete all matches associated with this tournament
      const deletePromises = matches.map(match => 
        deleteDoc(doc(db, 'matches', match.id))
      );
      await Promise.all(deletePromises);

      // 2. Delete the tournament itself
      await deleteDoc(doc(db, 'tournaments', id));
      
      toast.success('Tournament and all associated matches deleted successfully.');
      navigate('/tournaments');
    } catch (error) {
      console.error("Error deleting tournament:", error);
      handleFirestoreError(error, OperationType.DELETE, `tournaments/${id}`);
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!window.confirm('Are you sure you want to delete this match?')) return;
    try {
      await deleteDoc(doc(db, 'matches', matchId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${matchId}`);
    }
  };

  const addPlayerToTeam = async (teamId: string) => {
    if (!id || !tournament || !newPlayerName.trim()) return;
    
    const updatedTeams = tournament.teams.map(team => {
      if (team.id === teamId) {
        return {
          ...team,
          players: [
            ...team.players,
            { id: Math.random().toString(36).substr(2, 9), name: newPlayerName, role: newPlayerRole }
          ]
        };
      }
      return team;
    });

    try {
      await setDoc(doc(db, 'tournaments', id), { ...tournament, teams: updatedTeams });
      setNewPlayerName('');
      toast.success('Player added successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tournaments/${id}`);
    }
  };

  const removePlayerFromTeam = async (teamId: string, playerId: string) => {
    if (!id || !tournament) return;
    
    const updatedTeams = tournament.teams.map(team => {
      if (team.id === teamId) {
        return {
          ...team,
          players: team.players.filter(p => p.id !== playerId)
        };
      }
      return team;
    });

    try {
      await setDoc(doc(db, 'tournaments', id), { ...tournament, teams: updatedTeams });
      toast.success('Player removed.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tournaments/${id}`);
    }
  };

  const addCustomMatch = async () => {
    if (!id || !teamAId || !teamBId || !matchName) return;
    
    const teamA = tournament?.teams.find(t => t.id === teamAId);
    const teamB = tournament?.teams.find(t => t.id === teamBId);
    
    if (!teamA || !teamB) return;

    const matchId = Math.random().toString(36).substr(2, 9);
    const newMatch: Match = {
      id: matchId,
      name: matchName,
      tournamentId: id,
      teamAId,
      teamBId,
      teamAName: teamA.name,
      teamBName: teamB.name,
      tossWinnerId: '',
      tossDecision: 'Bat',
      oversLimit: overs,
      status: 'Upcoming',
      currentInnings: 1,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'matches', matchId), newMatch);
      setShowAddMatch(false);
      setTeamAId('');
      setTeamBId('');
      setMatchName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${matchId}`);
    }
  };

  const updateTournament = async () => {
    if (!id || !tournament || !editName.trim()) return;
    
    const updatedTournament = {
      ...tournament,
      name: editName,
      status: editStatus
    };

    try {
      await setDoc(doc(db, 'tournaments', id), updatedTournament);
      setShowEditTournament(false);
      toast.success('Tournament updated successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tournaments/${id}`);
    }
  };

  if (!tournament) return <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Tournament...</div>;

  const pointsTable = tournament.teams.map(team => {
    const teamMatches = matches.filter(m => m.status === 'Finished' && (m.teamAId === team.id || m.teamBId === team.id));
    const wins = teamMatches.filter(m => m.winnerId === team.id).length;
    const losses = teamMatches.filter(m => m.winnerId !== team.id && m.winnerId !== 'Draw').length;
    const draws = teamMatches.filter(m => m.winnerId === 'Draw').length;
    
    let runsScored = 0;
    let oversFaced = 0;
    let runsConceded = 0;
    let oversBowled = 0;

    teamMatches.forEach(m => {
      const isTeamA = m.teamAId === team.id;
      const teamInnings = isTeamA ? m.innings1 : m.innings2;
      const oppInnings = isTeamA ? m.innings2 : m.innings1;

      if (teamInnings) {
        runsScored += teamInnings.runs;
        // If all out, count full overs
        if (teamInnings.wickets === 10) {
          oversFaced += m.oversLimit;
        } else {
          oversFaced += teamInnings.overs + (teamInnings.balls / 6);
        }
      }

      if (oppInnings) {
        runsConceded += oppInnings.runs;
        // If opponent all out, count full overs
        if (oppInnings.wickets === 10) {
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
    return parseFloat(b.nrr) - parseFloat(a.nrr);
  });

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
          <div className="flex justify-between items-start mb-4">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] inline-block">
              {tournament.status}
            </span>
            <div className="flex gap-2">
              {canManage && (
                <button 
                  onClick={() => setShowEditTournament(true)}
                  className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                  title="Edit Tournament"
                >
                  <Edit2 className="w-6 h-6" />
                </button>
              )}
              {canManage && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-3 rounded-2xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  title="Delete Tournament"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight transform -skew-x-6">{tournament.name}</h1>
          <div className="flex gap-6 mt-6">
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Teams</span>
              <span className="text-2xl font-black">{tournament.teams.length}</span>
            </div>
            <div className="flex flex-col border-l border-slate-800 pl-6">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Matches</span>
              <span className="text-2xl font-black">{matches.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full md:w-fit overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('fixtures')}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap",
              activeTab === 'fixtures' ? "bg-blue-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Calendar className="w-4 h-4" /> Fixtures
          </button>
          <button 
            onClick={() => setActiveTab('points')}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap",
              activeTab === 'points' ? "bg-blue-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <BarChart2 className="w-4 h-4" /> Points
          </button>
          <button 
            onClick={() => setActiveTab('teams')}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap",
              activeTab === 'teams' ? "bg-blue-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Users className="w-4 h-4" /> Teams
          </button>
        </div>

        {canManage && activeTab === 'fixtures' && (
          <button 
            onClick={() => setShowAddMatch(true)}
            className="w-full md:w-auto px-6 py-3 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
          >
            <Plus className="w-4 h-4" /> Add Stage Match
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddMatch && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Add Stage Match</h2>
                <button onClick={() => setShowAddMatch(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Name (e.g. Semi Final 1)</label>
                  <input 
                    type="text" 
                    value={matchName}
                    onChange={(e) => setMatchName(e.target.value)}
                    placeholder="Enter stage name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team A</label>
                    <select 
                      value={teamAId}
                      onChange={(e) => setTeamAId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    >
                      <option value="">Select Team</option>
                      {tournament.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team B</label>
                    <select 
                      value={teamBId}
                      onChange={(e) => setTeamBId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    >
                      <option value="">Select Team</option>
                      {tournament.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overs</label>
                  <input 
                    type="number" 
                    value={overs}
                    onChange={(e) => setOvers(parseInt(e.target.value) || 6)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <button 
                onClick={addCustomMatch}
                className="w-full py-4 rounded-2xl bg-blue-900 text-white font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg"
              >
                Create Match
              </button>
            </div>
          </motion.div>
        )}

        {showEditTournament && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Edit Tournament</h2>
                <button onClick={() => setShowEditTournament(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tournament Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                  <select 
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Live">Live</option>
                    <option value="Finished">Finished</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={updateTournament}
                className="w-full py-4 rounded-2xl bg-blue-900 text-white font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'fixtures' ? (
        <div className="space-y-8">
          {Object.entries(
            matches.reduce((acc, match) => {
              const stage = match.name || 'League Stage';
              if (!acc[stage]) acc[stage] = [];
              acc[stage].push(match);
              return acc;
            }, {} as Record<string, Match[]>)
          ).map(([stage, stageMatches]) => (
            <div key={stage} className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-l-4 border-blue-900 pl-3">{stage}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(stageMatches as Match[]).map((match, idx) => (
                  <div key={match.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match {idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                          match.status === 'Live' ? "bg-red-100 text-red-600 animate-pulse" : 
                          match.status === 'Finished' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                        )}>
                          {match.status}
                        </span>
                        {canManage && (
                          <button 
                            onClick={() => deleteMatch(match.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Match"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="flex-1 text-center">
                        <div className="font-black uppercase text-slate-900 truncate">{match.teamAName}</div>
                        {match.status !== 'Upcoming' && match.innings1 && (
                          <div className="text-xs font-bold text-blue-600 mt-1">
                            {match.innings1.battingTeamId === match.teamAId ? `${match.innings1.runs}/${match.innings1.wickets}` : 
                             match.innings2 ? `${match.innings2.runs}/${match.innings2.wickets}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="text-slate-300 font-black italic">VS</div>
                      <div className="flex-1 text-center">
                        <div className="font-black uppercase text-slate-900 truncate">{match.teamBName}</div>
                        {match.status !== 'Upcoming' && match.innings1 && (
                          <div className="text-xs font-bold text-blue-600 mt-1">
                            {match.innings1.battingTeamId === match.teamBId ? `${match.innings1.runs}/${match.innings1.wickets}` : 
                             match.innings2 ? `${match.innings2.runs}/${match.innings2.wickets}` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {match.status !== 'Finished' ? (
                      <Link 
                        to={canManage ? `/admin/match/${match.id}` : `/match/${match.id}`}
                        className="w-full py-3 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-900 transition-all"
                      >
                        <Play className="w-3 h-3 fill-white" /> {match.status === 'Live' ? (canManage ? 'Resume Scoring' : 'View Live Score') : (canManage ? 'Start Scoring' : 'View Match')}
                      </Link>
                    ) : (
                      <Link 
                        to={`/match/${match.id}`}
                        className="w-full py-3 rounded-xl bg-emerald-50 text-emerald-700 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-3 h-3" /> Match Completed
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'points' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[600px] md:min-w-0">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Team</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">P</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">W</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">L</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">D</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Pts</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">NRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pointsTable.map((team, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-[10px] md:text-xs font-black text-slate-300 w-4">{idx + 1}</span>
                        <span className="font-bold text-slate-900 uppercase tracking-tight text-xs md:text-sm">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-2 md:px-6 py-4 text-center font-bold text-slate-600 text-xs md:text-sm">{team.played}</td>
                    <td className="px-2 md:px-6 py-4 text-center font-bold text-emerald-600 text-xs md:text-sm">{team.wins}</td>
                    <td className="px-2 md:px-6 py-4 text-center font-bold text-red-500 text-xs md:text-sm">{team.losses}</td>
                    <td className="px-2 md:px-6 py-4 text-center font-bold text-slate-400 text-xs md:text-sm">{team.draws}</td>
                    <td className="px-2 md:px-6 py-4 text-center font-black text-blue-900 text-xs md:text-sm">{team.points}</td>
                    <td className={cn(
                      "px-4 md:px-6 py-4 text-center font-bold text-[10px] md:text-xs",
                      parseFloat(team.nrr) >= 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {parseFloat(team.nrr) > 0 ? '+' : ''}{team.nrr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tournament.teams.map(team => (
            <div key={team.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{team.name}</h3>
                <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                  {team.players.length} Players
                </span>
              </div>
              
              <div className="p-6 space-y-4">
                {canManage && (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={selectedTeamId === team.id ? newPlayerName : ''}
                      onChange={(e) => {
                        setSelectedTeamId(team.id);
                        setNewPlayerName(e.target.value);
                      }}
                      placeholder="Add player name"
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                    />
                    <select 
                      value={selectedTeamId === team.id ? newPlayerRole : 'Batsman'}
                      onChange={(e) => {
                        setSelectedTeamId(team.id);
                        setNewPlayerRole(e.target.value as any);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-widest outline-none"
                    >
                      <option value="Batsman">Bat</option>
                      <option value="Bowler">Bowl</option>
                      <option value="All-Rounder">All</option>
                      <option value="Wicket-Keeper">WK</option>
                    </select>
                    <button 
                      onClick={() => addPlayerToTeam(team.id)}
                      className="p-2 rounded-xl bg-blue-900 text-white hover:bg-blue-800 transition-all shadow-md"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {team.players.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest italic">No players added yet</p>
                  ) : (
                    team.players.map(player => (
                      <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">
                            {player.role.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{player.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{player.role}</p>
                          </div>
                        </div>
                        {canManage && (
                          <button 
                            onClick={() => removePlayerFromTeam(team.id, player.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={deleteTournament}
        title="Delete Tournament?"
        message="This will permanently delete the tournament and all its associated matches. This action cannot be undone."
        confirmText="Delete Now"
        isDestructive={true}
      />
    </div>
  );
}
