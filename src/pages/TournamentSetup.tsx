import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Trophy, Zap, AlertCircle, LogIn, Shield } from 'lucide-react';
import { Team, Tournament, Match } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { collection, doc, setDoc, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { useAdmin } from '../context/AdminContext';
import { toast } from 'sonner';

export default function TournamentSetup() {
  const navigate = useNavigate();
  const { isAdminMode, login } = useAdmin();
  const [adminId, setAdminId] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(adminId, adminPass)) {
      toast.success('Admin Mode Unlocked');
    } else {
      setLoginError('Invalid ID or PIN');
      toast.error('Invalid credentials');
    }
  };

  if (!isAdminMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 space-y-8">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 mx-auto rotate-3">
              <Shield className="w-10 h-10 text-brand-red" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Tournament Setup</h1>
            <p className="text-slate-500 font-medium">Enter admin credentials to create tournament.</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Admin ID</label>
              <input 
                type="text" 
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 outline-none font-bold transition-all"
                placeholder="Enter ID"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PIN / Password</label>
              <input 
                type="password" 
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 outline-none font-bold transition-all"
                placeholder="Enter PIN"
                required
              />
            </div>
            
            {loginError && (
              <p className="text-brand-red text-[10px] font-black uppercase tracking-widest text-center animate-bounce">
                {loginError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full py-5 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-brand-red/20 active:scale-95"
            >
              Unlock Setup
            </button>
          </form>

          <div className="pt-4 text-center">
            <button 
              onClick={() => navigate('/tournaments')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              ← Back to Tournaments
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [name, setName] = useState('');
  const [teamNames, setTeamNames] = useState(['', '', '', '']);
  const [teamIds, setTeamIds] = useState(['', '', '', '']);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [step, setStep] = useState<'setup' | 'preview'>('setup');
  const [generatedMatches, setGeneratedMatches] = useState<Match[]>([]);
  const [openingMatchId, setOpeningMatchId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournamentId, setTournamentId] = useState<string>('');
  const [overs, setOvers] = useState(6);

  useEffect(() => {
    const q = query(collection(db, 'teams'));
    const unsub = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setAllTeams(teamsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teams');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const canManage = isAdminMode;

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const addTeamField = () => {
    setTeamNames([...teamNames, '']);
    setTeamIds([...teamIds, '']);
  };

  const removeTeamField = (index: number) => {
    if (teamNames.length <= 2) return;
    const updatedNames = [...teamNames];
    const updatedIds = [...teamIds];
    updatedNames.splice(index, 1);
    updatedIds.splice(index, 1);
    setTeamNames(updatedNames);
    setTeamIds(updatedIds);
  };

  const updateTeamName = (index: number, value: string) => {
    const updatedNames = [...teamNames];
    const updatedIds = [...teamIds];
    updatedNames[index] = value;
    
    // If the name matches an existing team exactly, set its ID
    const existingTeam = allTeams.find(t => t.name.toLowerCase() === value.toLowerCase());
    if (existingTeam) {
      updatedIds[index] = existingTeam.id;
    } else {
      updatedIds[index] = ''; // Reset ID if it's a new name
    }
    
    setTeamNames(updatedNames);
    setTeamIds(updatedIds);
  };

  const selectExistingTeam = (index: number, teamId: string) => {
    const team = allTeams.find(t => t.id === teamId);
    if (!team) return;
    
    const updatedNames = [...teamNames];
    const updatedIds = [...teamIds];
    updatedNames[index] = team.name;
    updatedIds[index] = team.id;
    setTeamNames(updatedNames);
    setTeamIds(updatedIds);
  };

  const generateFixtures = (teams: Team[], tournamentId: string, tournamentName: string): Match[] => {
    let allPairs: { teamA: Team; teamB: Team }[] = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        allPairs.push({ teamA: teams[i], teamB: teams[j] });
      }
    }

    const orderedMatches: Match[] = [];
    const teamLastPlayed: Record<string, number> = {};
    teams.forEach(t => teamLastPlayed[t.id] = -2);

    let currentMatchIndex = 0;
    while (allPairs.length > 0) {
      // Sort pairs to prioritize those with the most "rest"
      allPairs.sort((a, b) => {
        const restA = Math.min(currentMatchIndex - teamLastPlayed[a.teamA.id], currentMatchIndex - teamLastPlayed[a.teamB.id]);
        const restB = Math.min(currentMatchIndex - teamLastPlayed[b.teamA.id], currentMatchIndex - teamLastPlayed[b.teamB.id]);
        
        if (restA !== restB) return restB - restA;
        return Math.random() - 0.5;
      });

      const pair = allPairs.shift()!;
      const matchNumber = orderedMatches.length + 1;
      orderedMatches.push({
        id: Math.random().toString(36).substr(2, 9),
        name: `Match ${matchNumber}: ${pair.teamA.name} vs ${pair.teamB.name}`,
        tournamentId,
        tournamentName,
        teamAId: pair.teamA.id,
        teamBId: pair.teamB.id,
        teamAName: pair.teamA.name,
        teamBName: pair.teamB.name,
        tossWinnerId: '',
        tossDecision: 'Bat',
        oversLimit: overs,
        status: 'Upcoming',
        currentInnings: 1,
        order: matchNumber,
        createdAt: Date.now() + orderedMatches.length,
      });

      teamLastPlayed[pair.teamA.id] = currentMatchIndex;
      teamLastPlayed[pair.teamB.id] = currentMatchIndex;
      currentMatchIndex++;
    }
    return orderedMatches;
  };

  const handleGenerate = () => {
    const validTeamEntries = teamNames
      .map((name, idx) => ({ name: name.trim(), id: teamIds[idx] }))
      .filter(entry => entry.name !== '');
      
    if (validTeamEntries.length < 2) return;

    const finalTeams: Team[] = validTeamEntries.map(entry => {
      const existingTeam = allTeams.find(t => t.id === entry.id || t.name.toLowerCase() === entry.name.toLowerCase());
      if (existingTeam) return existingTeam;
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: entry.name,
        players: []
      };
    });

    const newTournamentId = Math.random().toString(36).substr(2, 9);
    const fixtures = generateFixtures(finalTeams, newTournamentId, name);
    
    setTeams(finalTeams);
    setTournamentId(newTournamentId);
    setGeneratedMatches(fixtures);
    if (fixtures.length > 0) setOpeningMatchId(fixtures[0].id);
    setStep('preview');
  };

  const createTournament = async () => {
    // Reorder matches so the opening match is first
    const openingMatch = generatedMatches.find(m => m.id === openingMatchId);
    const otherMatches = generatedMatches.filter(m => m.id !== openingMatchId);
    
    const finalMatches = openingMatch ? [openingMatch, ...otherMatches] : generatedMatches;
    
    // Update order and createdAt to maintain order
    const now = Date.now();
    const orderedMatches = finalMatches.map((m, idx) => ({
      ...m,
      order: idx + 1,
      createdAt: now + idx
    }));

    // Ensure all teams are saved to the global teams collection if they are new
    for (const team of teams) {
      const exists = allTeams.some(t => t.id === team.id);
      if (!exists) {
        try {
          await setDoc(doc(db, 'teams', team.id), team);
        } catch (error) {
          console.error("Error saving new team during tournament setup:", error);
        }
      }
    }

    const tournament: Tournament = {
      id: tournamentId,
      name,
      teams,
      matches: orderedMatches,
      status: 'Live'
    };

    try {
      // Save tournament
      await setDoc(doc(db, 'tournaments', tournamentId), tournament);
      
      // Save each match to the matches collection for real-time scoring
      for (const match of orderedMatches) {
        await setDoc(doc(db, 'matches', match.id), match);
      }

      navigate('/tournaments');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tournaments/${tournamentId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold uppercase text-xs tracking-widest transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-brand-red p-8 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-20">
              <Trophy className="w-24 h-24" />
            </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter transform -skew-x-6 relative z-10">Create Tournament</h1>
          <p className="text-red-100 text-sm font-medium mt-1 uppercase tracking-widest relative z-10">Setup your league and fixtures</p>
        </div>

        <div className="p-8 space-y-8">
          {step === 'setup' ? (
            <>
              {!canManage && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-red-900">Admin Access Required</p>
                    <p className="text-xs text-red-700">You must be logged in or use Admin PIN to save tournament data to the cloud.</p>
                    <button 
                      onClick={handleLogin}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                    >
                      <LogIn className="w-4 h-4" /> Login with Google
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tournament Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Deshgavhan Premier League"
                  className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-brand-red focus:ring-2 focus:ring-red-200 outline-none transition-all font-black text-xl uppercase tracking-tight"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Teams</label>
                  <button 
                    onClick={addTeamField}
                    className="text-xs font-black text-brand-red uppercase tracking-widest hover:text-red-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Team
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {teamNames.map((team, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Team {idx + 1}</span>
                        {teamNames.length > 2 && (
                          <button 
                            onClick={() => removeTeamField(idx)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          value={team}
                          onChange={(e) => updateTeamName(idx, e.target.value)}
                          placeholder="Enter team name"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-brand-red outline-none transition-all font-bold text-sm"
                        />
                        {allTeams.length > 0 && (
                          <select 
                            value={teamIds[idx]}
                            onChange={(e) => selectExistingTeam(idx, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white text-slate-500"
                          >
                            <option value="">Or Select Existing Team</option>
                            {allTeams.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Overs per Match</label>
                <div className="flex gap-2">
                  {[2, 4, 6, 8, 10, 12].map((num) => (
                    <button
                      key={num}
                      onClick={() => setOvers(num)}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-black transition-all",
                        overs === num ? "bg-brand-red text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                  <input 
                    type="number" 
                    value={overs}
                    onChange={(e) => setOvers(parseInt(e.target.value) || 0)}
                    className="w-20 px-4 py-3 rounded-xl border border-slate-200 text-center font-black"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={!canManage || !name || teamNames.filter(n => n.trim() !== '').length < 2}
                  onClick={handleGenerate}
                  className="w-full py-4 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-brand-red transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5 fill-red-400 text-red-400" /> {canManage ? 'Generate Fixtures' : 'Admin Access Required'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Opening Match</h3>
                <button onClick={() => setStep('setup')} className="text-[10px] font-black text-brand-red uppercase tracking-widest hover:underline">Back to Setup</button>
              </div>
              
              <div className="space-y-3">
                {generatedMatches.map((match) => (
                  <button 
                    key={match.id}
                    onClick={() => setOpeningMatchId(match.id)}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 transition-all text-left flex justify-between items-center group",
                      openingMatchId === match.id 
                        ? "border-brand-red bg-red-50 shadow-md" 
                        : "border-slate-100 hover:border-slate-200 bg-white"
                    )}
                  >
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Match Fixture</p>
                      <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{match.name}</p>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      openingMatchId === match.id ? "border-brand-red bg-brand-red" : "border-slate-200"
                    )}>
                      {openingMatchId === match.id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <button 
                  onClick={createTournament}
                  className="w-full py-4 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Trophy className="w-5 h-5" /> Confirm & Start Tournament
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
