import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Settings, 
  RotateCcw, 
  User, 
  Trophy,
  History,
  Zap,
  AlertCircle
} from 'lucide-react';
import { Match, MatchInnings, Player, PlayerRole, BatterStats, BowlerStats } from '../types/cricket';
import { useCricketScoring } from '../hooks/useCricketScoring';
import { cn } from '../lib/utils';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, User as FirebaseUser, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function MatchScoring() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSettingUp, setIsSettingUp] = useState(id === 'new');
  const [setupStep, setSetupStep] = useState(1);
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isAdminMode, setIsAdminMode] = useState(localStorage.getItem('isAdminMode') === 'true');

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
  
  // Setup State
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [overs, setOvers] = useState(6);
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'Bat' | 'Bowl'>('Bat');

  // Scoring State
  const { match, addBall, undoLastBall, setMatch, loading } = useCricketScoring(id === 'new' ? undefined : id);
  
  const [strikerName, setStrikerName] = useState('');
  const [nonStrikerName, setNonStrikerName] = useState('');
  const [bowlerName, setBowlerName] = useState('');
  const [isSelectingPlayers, setIsSelectingPlayers] = useState(true);

  useEffect(() => {
    if (match && !isSettingUp) {
      // If match is already live, we might not need player selection immediately
      if (match.status === 'Live') {
        const currentInn = match.currentInnings === 1 ? match.innings1 : match.innings2;
        const striker = (Object.values(currentInn?.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
        const nonStriker = (Object.values(currentInn?.battingStats || {}) as BatterStats[]).find(b => !b.isStriker && !b.isOut);
        const bowler = (Object.values(currentInn?.bowlingStats || {}) as BowlerStats[]).find(b => b.balls < 6); // Simple logic
        
        if (striker && nonStriker && bowler) {
          setIsSelectingPlayers(false);
        }
      }
    }
  }, [match, isSettingUp]);

  const startMatch = async () => {
    if (!canManage) return;
    const teamAId = 'team_a';
    const teamBId = 'team_b';
    const battingTeamId = (tossWinner === teamA && tossDecision === 'Bat') || (tossWinner === teamB && tossDecision === 'Bowl') ? teamAId : teamBId;
    const bowlingTeamId = battingTeamId === teamAId ? teamBId : teamAId;

    const matchId = Math.random().toString(36).substr(2, 9);
    const newMatch: Match = {
      id: matchId,
      teamAId,
      teamBId,
      teamAName: teamA,
      teamBName: teamB,
      tossWinnerId: tossWinner === teamA ? teamAId : teamBId,
      tossDecision,
      oversLimit: overs,
      status: 'Live',
      currentInnings: 1,
      createdAt: Date.now(),
      innings1: {
        battingTeamId,
        bowlingTeamId,
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
        battingStats: {},
        bowlingStats: {},
        fallOfWickets: [],
        ballHistory: []
      }
    };
    
    try {
      await setDoc(doc(db, 'matches', matchId), newMatch);
      navigate(`/match/${matchId}`, { replace: true });
      setIsSettingUp(false);
      setIsSelectingPlayers(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${matchId}`);
    }
  };

  const confirmPlayers = async () => {
    if (!canManage || !strikerName || !nonStrikerName || !bowlerName || !match) return;

    const updatedMatch = { ...match };
    const currentInn = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2;
    
    if (currentInn) {
      // Add or update striker
      if (!currentInn.battingStats[strikerName]) {
        currentInn.battingStats[strikerName] = {
          playerId: strikerName,
          playerName: strikerName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          isStriker: true
        };
      } else {
        currentInn.battingStats[strikerName].isStriker = true;
      }

      // Add or update non-striker
      if (!currentInn.battingStats[nonStrikerName]) {
        currentInn.battingStats[nonStrikerName] = {
          playerId: nonStrikerName,
          playerName: nonStrikerName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          isStriker: false
        };
      } else {
        currentInn.battingStats[nonStrikerName].isStriker = false;
      }

      // Add or update bowler
      if (!currentInn.bowlingStats[bowlerName]) {
        currentInn.bowlingStats[bowlerName] = {
          playerId: bowlerName,
          playerName: bowlerName,
          overs: 0,
          balls: 0,
          runs: 0,
          wickets: 0,
          maiden: 0
        };
      }
    }

    try {
      await setDoc(doc(db, 'matches', match.id), updatedMatch);
      setIsSelectingPlayers(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${match.id}`);
    }
  };

  const handleBall = (runs: number, isExtra = false, extraType?: any, isWicket = false) => {
    if (!canManage) return;
    // Get current striker and bowler
    const currentInn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    const striker = (Object.values(currentInn?.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
    const bowler = (Object.values(currentInn?.bowlingStats || {}) as BowlerStats[]).find(b => b.playerName === bowlerName); // Simplified

    if (!striker || !bowler) {
      setIsSelectingPlayers(true);
      return;
    }

    addBall({
      runs,
      isExtra,
      extraType,
      isWicket,
      strikerId: striker.playerId,
      bowlerId: bowler.playerId
    });

    // Check if we need new players
    const updatedInn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (isWicket) {
      setStrikerName('');
      setIsSelectingPlayers(true);
    } else if (updatedInn && updatedInn.balls === 0 && updatedInn.overs > 0) {
      // Over finished
      setBowlerName('');
      setIsSelectingPlayers(true);
    }
  };

  if (loading && id !== 'new') return <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Match...</div>;

  if (!match && id !== 'new' && !isSettingUp) return <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest">Match Not Found</div>;

  if (isSettingUp) {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 font-bold uppercase text-xs tracking-widest transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Live
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-blue-900 p-8 text-white">
            <h1 className="text-3xl font-black uppercase tracking-tighter transform -skew-x-6">New Match Setup</h1>
            <p className="text-blue-300 text-sm font-medium mt-1 uppercase tracking-widest">Step {setupStep} of 2</p>
          </div>

          <div className="p-8 space-y-8">
            {setupStep === 1 ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Team A Name</label>
                    <input 
                      type="text" 
                      value={teamA}
                      onChange={(e) => setTeamA(e.target.value)}
                      placeholder="e.g. AP11"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Team B Name</label>
                    <input 
                      type="text" 
                      value={teamB}
                      onChange={(e) => setTeamB(e.target.value)}
                      placeholder="e.g. Cotton11"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Overs per Innings</label>
                  <div className="flex gap-2">
                    {[2, 4, 6, 8, 10, 12].map((num) => (
                      <button
                        key={num}
                        onClick={() => setOvers(num)}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-black transition-all",
                          overs === num ? "bg-blue-900 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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

                <button 
                  disabled={!teamA || !teamB}
                  onClick={() => setSetupStep(2)}
                  className="w-full py-4 rounded-xl bg-blue-900 text-white font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Step
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Who won the toss?</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTossWinner(teamA)}
                      className={cn(
                        "py-4 rounded-xl font-black uppercase tracking-widest transition-all border-2",
                        tossWinner === teamA ? "bg-blue-50 border-blue-900 text-blue-900" : "bg-white border-slate-100 text-slate-400"
                      )}
                    >
                      {teamA}
                    </button>
                    <button
                      onClick={() => setTossWinner(teamB)}
                      className={cn(
                        "py-4 rounded-xl font-black uppercase tracking-widest transition-all border-2",
                        tossWinner === teamB ? "bg-blue-50 border-blue-900 text-blue-900" : "bg-white border-slate-100 text-slate-400"
                      )}
                    >
                      {teamB}
                    </button>
                  </div>
                </div>

                {tossWinner && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Toss Decision</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setTossDecision('Bat')}
                        className={cn(
                          "py-4 rounded-xl font-black uppercase tracking-widest transition-all border-2",
                          tossDecision === 'Bat' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-100 text-slate-400"
                        )}
                      >
                        Batting
                      </button>
                      <button
                        onClick={() => setTossDecision('Bowl')}
                        className={cn(
                          "py-4 rounded-xl font-black uppercase tracking-widest transition-all border-2",
                          tossDecision === 'Bowl' ? "bg-amber-50 border-amber-500 text-amber-700" : "bg-white border-slate-100 text-slate-400"
                        )}
                      >
                        Bowling
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setSetupStep(1)}
                    className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Back
                  </button>
                  <button 
                    disabled={!tossWinner}
                    onClick={startMatch}
                    className="flex-[2] py-4 rounded-xl bg-blue-900 text-white font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg disabled:opacity-50"
                  >
                    Start Match
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isSelectingPlayers && match) {
    const currentInn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    const striker = (Object.values(currentInn?.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
    const nonStriker = (Object.values(currentInn?.battingStats || {}) as BatterStats[]).find(b => !b.isStriker && !b.isOut);
    
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Select Players</h2>
          
          <div className="space-y-4">
            {!striker && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">New Striker</label>
                <input 
                  type="text" 
                  value={strikerName}
                  onChange={(e) => setStrikerName(e.target.value)}
                  placeholder="Enter batter name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            )}
            
            {!nonStriker && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Non-Striker</label>
                <input 
                  type="text" 
                  value={nonStrikerName}
                  onChange={(e) => setNonStrikerName(e.target.value)}
                  placeholder="Enter batter name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Bowler</label>
              <input 
                type="text" 
                value={bowlerName}
                onChange={(e) => setBowlerName(e.target.value)}
                placeholder="Enter bowler name"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
              />
            </div>
          </div>

          <button 
            onClick={confirmPlayers}
            className="w-full py-4 rounded-xl bg-blue-900 text-white font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg"
          >
            Confirm & Score
          </button>
        </div>
      </div>
    );
  }

  if (!match) return null;

  const currentInnings = match.currentInnings === 1 ? match.innings1 : match.innings2;
  const battingTeamName = currentInnings?.battingTeamId === 'team_a' ? match.teamAName : match.teamBName;
  const bowlingTeamName = currentInnings?.battingTeamId === 'team_a' ? match.teamBName : match.teamAName;

  const striker = (Object.values(currentInnings?.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
  const nonStriker = (Object.values(currentInnings?.battingStats || {}) as BatterStats[]).find(b => !b.isStriker && !b.isOut);
  const bowler = (Object.values(currentInnings?.bowlingStats || {}) as BowlerStats[]).find(b => b.playerName === bowlerName);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Admin Access Warning */}
      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-900 uppercase tracking-tight">Admin Access Required</p>
            <p className="text-xs text-amber-700 font-medium">You are in View-Only mode. To update scores, please login or use Admin PIN.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/live')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">{match.teamAName} vs {match.teamBName}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{match.oversLimit} Overs Match • {match.status}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSelectingPlayers(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400" title="Change Players"><User className="w-5 h-5" /></button>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><Settings className="w-5 h-5" /></button>
        </div>
      </div>

      {match.status === 'Finished' && (
        <div className="bg-emerald-500 p-6 rounded-3xl text-white text-center shadow-lg">
          <Trophy className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-3xl font-black uppercase tracking-tight">Match Finished</h2>
          <p className="text-emerald-100 font-bold mt-2">
            {match.winnerId === 'Draw' ? "Match Drawn" : `${match.winnerId === 'team_a' ? match.teamAName : match.teamBName} Won!`}
          </p>
          <button 
            onClick={() => navigate('/live')}
            className="mt-6 px-8 py-3 rounded-xl bg-white text-emerald-600 font-black uppercase tracking-widest text-sm hover:bg-emerald-50 transition-all"
          >
            Back to Live Center
          </button>
        </div>
      )}

      {/* Main Scoreboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Live Score Card */}
          <div className="bg-blue-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap className="w-32 h-32 text-white" />
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800 border border-blue-700 text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 mb-4">
                    <span className={cn("w-2 h-2 rounded-full bg-red-500", match.status === 'Live' && "animate-pulse")}></span>
                    {match.status === 'Live' ? 'Live Scoring' : 'Final Score'}
                  </span>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-blue-100">{battingTeamName}</h3>
                </div>
                <div className="text-right">
                  <p className="text-6xl font-black tracking-tighter leading-none">
                    {currentInnings?.runs}<span className="text-3xl text-blue-400">/{currentInnings?.wickets}</span>
                  </p>
                  <p className="text-xl font-bold text-blue-300 mt-2">{currentInnings?.overs}.{currentInnings?.balls} <span className="text-sm opacity-50">/ {match.oversLimit} ov</span></p>
                </div>
              </div>

              {/* Target for 2nd Innings */}
              {match.currentInnings === 2 && match.innings1 && (
                <div className="mb-6 p-4 rounded-2xl bg-blue-800/50 border border-blue-700 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-300">Target: {match.innings1.runs + 1}</span>
                  <span className="text-xs font-black uppercase tracking-widest text-blue-300">Need {match.innings1.runs + 1 - (currentInnings?.runs || 0)} runs</span>
                </div>
              )}

              {/* Player Stats */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-blue-800">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Batting</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm truncate max-w-[120px]">{striker?.playerName || 'Striker'} *</span>
                    <span className="font-black text-lg">{striker?.runs || 0} <span className="text-xs text-blue-400 font-bold">({striker?.balls || 0})</span></span>
                  </div>
                  <div className="flex justify-between items-center opacity-60">
                    <span className="font-bold text-sm truncate max-w-[120px]">{nonStriker?.playerName || 'Non-Striker'}</span>
                    <span className="font-black text-lg">{nonStriker?.runs || 0} <span className="text-xs text-blue-400 font-bold">({nonStriker?.balls || 0})</span></span>
                  </div>
                </div>
                <div className="space-y-4 border-l border-blue-800 pl-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Bowling</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm truncate max-w-[120px]">{bowler?.playerName || 'Bowler'}</span>
                    <span className="font-black text-lg">{bowler?.wickets || 0}-{bowler?.runs || 0} <span className="text-xs text-blue-400 font-bold">({bowler?.overs || 0}.{bowler?.balls || 0})</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scoring Buttons */}
          {match.status === 'Live' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                {[0, 1, 2, 3, 4, 6].map((run) => (
                  <button
                    key={run}
                    onClick={() => handleBall(run)}
                    className={cn(
                      "aspect-square rounded-2xl font-black text-2xl transition-all shadow-sm active:scale-95",
                      run === 4 ? "bg-emerald-500 text-white hover:bg-emerald-600" :
                      run === 6 ? "bg-purple-600 text-white hover:bg-purple-700" :
                      "bg-slate-900 text-white hover:bg-slate-800"
                    )}
                  >
                    {run}
                  </button>
                ))}
                <button
                  onClick={() => handleBall(0, false, undefined, true)}
                  className="aspect-square rounded-2xl bg-red-600 text-white font-black text-xl hover:bg-red-700 transition-all shadow-sm active:scale-95"
                >
                  W
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button 
                  onClick={() => handleBall(0, true, 'Wd')}
                  className="py-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-black uppercase tracking-widest text-xs hover:bg-amber-100 transition-all"
                >
                  Wide
                </button>
                <button 
                  onClick={() => handleBall(0, true, 'Nb')}
                  className="py-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-black uppercase tracking-widest text-xs hover:bg-amber-100 transition-all"
                >
                  No Ball
                </button>
                <button 
                  onClick={() => handleBall(0, true, 'By')}
                  className="py-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all"
                >
                  Bye
                </button>
                <button 
                  onClick={() => handleBall(0, true, 'Lb')}
                  className="py-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all"
                >
                  Leg Bye
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Ball History & Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm h-full flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
              <History className="w-4 h-4" /> Recent Balls
            </h3>
            <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[400px]">
              {currentInnings?.ballHistory.slice().reverse().map((ball, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2",
                    ball.isWicket ? "bg-red-100 border-red-500 text-red-600" :
                    ball.runs === 4 ? "bg-emerald-100 border-emerald-500 text-emerald-600" :
                    ball.runs === 6 ? "bg-purple-100 border-purple-500 text-purple-600" :
                    ball.isExtra ? "bg-amber-100 border-amber-500 text-amber-600" :
                    "bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  {ball.isWicket ? 'W' : ball.isExtra ? ball.extraType : ball.runs}
                </div>
              ))}
              {(!currentInnings?.ballHistory || currentInnings.ballHistory.length === 0) && (
                <p className="text-slate-300 italic text-sm py-4">No balls bowled yet.</p>
              )}
            </div>
            
            <div className="mt-auto pt-6 border-t border-slate-100">
               <button 
                onClick={undoLastBall}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
               >
                 <RotateCcw className="w-4 h-4" /> Undo Last Ball
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
