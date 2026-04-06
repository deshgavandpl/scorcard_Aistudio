import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Trophy, Zap, AlertCircle, LogIn } from 'lucide-react';
import { Team, Tournament, Match } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';

export default function TournamentSetup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [teamNames, setTeamNames] = useState(['', '', '', '']);
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isAdminMode, setIsAdminMode] = useState(localStorage.getItem('isAdminMode') === 'true');
  const [step, setStep] = useState<'setup' | 'preview'>('setup');
  const [generatedMatches, setGeneratedMatches] = useState<Match[]>([]);
  const [openingMatchId, setOpeningMatchId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournamentId, setTournamentId] = useState<string>('');

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
  };

  const removeTeamField = (index: number) => {
    if (teamNames.length <= 2) return;
    const updated = [...teamNames];
    updated.splice(index, 1);
    setTeamNames(updated);
  };

  const updateTeamName = (index: number, value: string) => {
    const updated = [...teamNames];
    updated[index] = value;
    setTeamNames(updated);
  };

  const generateFixtures = (teams: Team[], tournamentId: string, tournamentName: string): Match[] => {
    let allPairs: { teamA: Team; teamB: Team }[] = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        allPairs.push({ teamA: teams[i], teamB: teams[j] });
      }
    }

    // Shuffle pairs initially
    allPairs = allPairs.sort(() => Math.random() - 0.5);

    const orderedMatches: Match[] = [];
    let lastTeams: string[] = [];

    while (allPairs.length > 0) {
      let foundIndex = allPairs.findIndex(pair => 
        !lastTeams.includes(pair.teamA.id) && !lastTeams.includes(pair.teamB.id)
      );

      if (foundIndex === -1) {
        // If no match found without consecutive teams, just pick the first one
        foundIndex = 0;
      }

      const pair = allPairs.splice(foundIndex, 1)[0];
      orderedMatches.push({
        id: Math.random().toString(36).substr(2, 9),
        name: `${pair.teamA.name} vs ${pair.teamB.name}`,
        tournamentId,
        tournamentName,
        teamAId: pair.teamA.id,
        teamBId: pair.teamB.id,
        teamAName: pair.teamA.name,
        teamBName: pair.teamB.name,
        tossWinnerId: '',
        tossDecision: 'Bat',
        oversLimit: 6,
        status: 'Upcoming',
        currentInnings: 1,
        createdAt: Date.now() + orderedMatches.length,
      });
      lastTeams = [pair.teamA.id, pair.teamB.id];
    }
    return orderedMatches;
  };

  const handleGenerate = () => {
    const validTeams = teamNames.filter(n => n.trim() !== '');
    if (validTeams.length < 2) return;

    const newTeams: Team[] = validTeams.map(n => ({
      id: Math.random().toString(36).substr(2, 9),
      name: n,
      players: []
    }));

    const newTournamentId = Math.random().toString(36).substr(2, 9);
    const fixtures = generateFixtures(newTeams, newTournamentId, name);
    
    setTeams(newTeams);
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
    
    // Update createdAt to maintain order
    const now = Date.now();
    const orderedMatches = finalMatches.map((m, idx) => ({
      ...m,
      createdAt: now + idx
    }));

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
                      className="flex gap-2"
                    >
                      <div className="flex-grow relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Team {idx + 1}</div>
                        <input 
                          type="text" 
                          value={team}
                          onChange={(e) => updateTeamName(idx, e.target.value)}
                          placeholder="Enter team name"
                          className="w-full pl-20 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-brand-red outline-none transition-all font-bold"
                        />
                      </div>
                      <button 
                        onClick={() => removeTeamField(idx)}
                        className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ))}
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
