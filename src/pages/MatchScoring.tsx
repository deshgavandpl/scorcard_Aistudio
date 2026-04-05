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
  AlertCircle,
  X,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { Match, MatchInnings, Player, PlayerRole, BatterStats, BowlerStats } from '../types/cricket';
import { useCricketScoring } from '../hooks/useCricketScoring';
import { cn } from '../lib/utils';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import Scorecard from '../components/Scorecard';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';

export default function MatchScoring() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSettingUp, setIsSettingUp] = useState(id === 'new');
  const [setupStep, setSetupStep] = useState(1);
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isAdminMode, setIsAdminMode] = useState(localStorage.getItem('isAdminMode') === 'true');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  const { match, addBall, undoLastBall, swapStrike, setMatch, finishMatch, loading } = useCricketScoring(id === 'new' ? undefined : id);
  
  const [strikerName, setStrikerName] = useState('');
  const [nonStrikerName, setNonStrikerName] = useState('');
  const [bowlerName, setBowlerName] = useState('');
  const [isSelectingPlayers, setIsSelectingPlayers] = useState(true);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState('Bowled');
  const [fielderName, setFielderName] = useState('');
  const [extraRuns, setExtraRuns] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Result State
  const [resultMessage, setResultMessage] = useState('');
  const [manOfTheMatch, setManOfTheMatch] = useState('');
  const [winnerId, setWinnerId] = useState('');
  const [showFanfare, setShowFanfare] = useState(false);
  const [showInningsOverModal, setShowInningsOverModal] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [lastInnings, setLastInnings] = useState(1);

  useEffect(() => {
    if (match?.status === 'Finished' && !showFanfare) {
      setShowFanfare(true);
      const timer = setTimeout(() => setShowFanfare(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [match?.status]);

  useEffect(() => {
    if (match?.currentInnings === 2 && lastInnings === 1) {
      setShowInningsOverModal(true);
      setLastInnings(2);
    }
  }, [match?.currentInnings, lastInnings]);

  useEffect(() => {
    if (match) {
      setResultMessage(match.resultMessage || '');
      setManOfTheMatch(match.manOfTheMatch || '');
      setWinnerId(match.winnerId || '');
    }
  }, [match]);

  useEffect(() => {
    if (match && match.status === 'Live' && match.currentInnings === 2) {
      const inn1 = match.innings1;
      const inn2 = match.innings2;
      if (inn1 && inn2) {
        const isOver = inn2.wickets === 10 || inn2.overs === match.oversLimit || inn2.runs > inn1.runs;
        if (isOver && !showFinishConfirm) {
          setShowFinishConfirm(true);
        }
      }
    }
  }, [match, showFinishConfirm]);

  const handleFinishMatch = async () => {
    if (!match || !winnerId) return;
    
    const { finishMatch } = useCricketScoring(id); // We need to use the function from the hook
    // Wait, useCricketScoring is already called at the top level
  };

  useEffect(() => {
    if (match && !isSettingUp) {
      const currentInn = match.currentInnings === 1 ? match.innings1 : match.innings2;
      if (!currentInn) return;

      const striker = (Object.values(currentInn.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
      const nonStriker = (Object.values(currentInn.battingStats || {}) as BatterStats[]).find(b => !b.isStriker && !b.isOut);
      const bowlerId = currentInn.currentBowlerId;
      
      // Sync local names for the modal
      if (striker && striker.playerName !== strikerName) setStrikerName(striker.playerName);
      if (nonStriker && nonStriker.playerName !== nonStrikerName) setNonStrikerName(nonStriker.playerName);
      if (bowlerId && bowlerId !== bowlerName) setBowlerName(bowlerId);

      if (!striker || !nonStriker || !bowlerId) {
        setIsSelectingPlayers(true);
      } else {
        setIsSelectingPlayers(false);
      }
    }
  }, [match, isSettingUp]);

  const startMatch = async () => {
    if (!canManage) return;
    
    // Use existing IDs if we are in an existing match
    const tAId = match?.teamAId || 'team_a';
    const tBId = match?.teamBId || 'team_b';
    
    const battingTeamId = (tossWinner === teamA && tossDecision === 'Bat') || (tossWinner === teamB && tossDecision === 'Bowl') ? tAId : tBId;
    const bowlingTeamId = battingTeamId === tAId ? tBId : tAId;

    const mId = id === 'new' ? Math.random().toString(36).substr(2, 9) : id;
    const updatedMatch: Match = {
      ...(match || {}),
      id: mId as string,
      teamAId: tAId,
      teamBId: tBId,
      teamAName: teamA,
      teamBName: teamB,
      tossWinnerId: tossWinner === teamA ? tAId : tBId,
      tossDecision,
      oversLimit: overs,
      status: 'Live',
      currentInnings: 1,
      createdAt: match?.createdAt || Date.now(),
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
      await setDoc(doc(db, 'matches', updatedMatch.id), updatedMatch);
      setIsSettingUp(false);
      setIsSelectingPlayers(true);
      if (id === 'new') {
        navigate(`/match/${updatedMatch.id}`, { replace: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${updatedMatch.id}`);
    }
  };

  const confirmPlayers = async () => {
    if (!canManage || !match) return;

    const updatedMatch = { ...match };
    const currentInn = updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2;
    if (!currentInn) return;

    // Deep copy stats to avoid mutation issues
    currentInn.battingStats = { ...currentInn.battingStats };
    currentInn.bowlingStats = { ...currentInn.bowlingStats };

    const striker = (Object.values(currentInn.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
    const nonStriker = (Object.values(currentInn.battingStats || {}) as BatterStats[]).find(b => !b.isStriker && !b.isOut);
    const bowlerId = currentInn.currentBowlerId;

    let hasError = false;

    // 1. Handle Striker
    if (!striker) {
      if (!strikerName.trim()) {
        setError("Please enter striker name");
        hasError = true;
      } else if (currentInn.battingStats[strikerName]?.isOut) {
        setError(`${strikerName} is already out`);
        hasError = true;
      } else {
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
      }
    }

    if (hasError) return;

    // 2. Handle Non-Striker
    if (!nonStriker) {
      const currentStrikerName = striker?.playerName || strikerName;
      if (!nonStrikerName.trim()) {
        setError("Please enter non-striker name");
        hasError = true;
      } else if (nonStrikerName === currentStrikerName) {
        setError("Striker and Non-Striker cannot be the same person");
        hasError = true;
      } else if (currentInn.battingStats[nonStrikerName]?.isOut) {
        setError(`${nonStrikerName} is already out`);
        hasError = true;
      } else {
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
      }
    }

    if (hasError) return;

    // 3. Handle Bowler
    if (!bowlerId) {
      if (!bowlerName.trim()) {
        setError("Please enter bowler name");
        hasError = true;
      } else {
        // Check if bowler bowled the last over
        if (currentInn.ballHistory.length > 0) {
          const lastBall = currentInn.ballHistory[currentInn.ballHistory.length - 1];
          if (lastBall.bowlerId === bowlerName && currentInn.balls === 0) {
            setError(`${bowlerName} cannot bowl consecutive overs`);
            hasError = true;
          }
        }
        
        if (!hasError) {
          currentInn.currentBowlerId = bowlerName;
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
      }
    }

    if (hasError) return;

    try {
      await setDoc(doc(db, 'matches', match.id), updatedMatch);
      
      // Clear local states
      setStrikerName('');
      setNonStrikerName('');
      setBowlerName('');
      setError(null);
      
      // The useEffect will handle closing the modal via setIsSelectingPlayers(false)
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${match.id}`);
    }
  };

  const onFinishConfirm = async () => {
    if (!match) return;
    
    // Determine winner if not set
    let finalWinnerId = winnerId;
    let finalResultMessage = resultMessage;

    if (!finalWinnerId && match.innings1 && match.innings2) {
      const inn1Runs = match.innings1.runs;
      const inn2Runs = match.innings2.runs;
      const inn2Wickets = match.innings2.wickets;
      const battingTeamName = match.innings2.battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
      const bowlingTeamName = match.innings2.bowlingTeamId === match.teamAId ? match.teamAName : match.teamBName;

      if (inn2Runs > inn1Runs) {
        finalWinnerId = match.innings2.battingTeamId;
        finalResultMessage = `${battingTeamName} won by ${10 - inn2Wickets} wickets`;
      } else if (inn1Runs > inn2Runs) {
        finalWinnerId = match.innings1.battingTeamId;
        finalResultMessage = `${bowlingTeamName} won by ${inn1Runs - inn2Runs} runs`;
      } else {
        finalWinnerId = 'Draw';
        finalResultMessage = 'Match Draw';
      }
    }

    await finishMatch(finalWinnerId, finalResultMessage, manOfTheMatch);
    setShowFinishConfirm(false);
    toast.success('Match finished successfully!');
  };

  const updateMatchResult = async () => {
    if (!match || !canManage) return;
    await finishMatch(winnerId, resultMessage, manOfTheMatch);
    toast.success('Match result updated.');
  };
  const handleBall = (runs: number, isExtra = false, extraType?: any, isWicket = false, wType?: string, fName?: string) => {
    if (!match) return;
    const currentInn = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!currentInn) return;
    
    const striker = (Object.values(currentInn.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
    const bowler = currentInn.currentBowlerId ? currentInn.bowlingStats[currentInn.currentBowlerId] : null;

    if (!striker || !bowler) {
      setIsSelectingPlayers(true);
      return;
    }

    addBall({
      runs,
      isExtra,
      extraType,
      isWicket,
      wicketType: wType,
      fielderName: fName,
      strikerId: striker.playerId,
      bowlerId: bowler.playerId
    });
  };

  const saveResultDetails = async () => {
    if (!match || !id) return;
    try {
      await setDoc(doc(db, 'matches', id), {
        ...match,
        winnerId,
        resultMessage,
        manOfTheMatch
      });
      toast.success('Match result details updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${id}`);
    }
  };

  const deleteMatch = async () => {
    if (!match) return;
    try {
      await deleteDoc(doc(db, 'matches', match.id));
      toast.success('Match deleted successfully.');
      navigate(-1);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${match.id}`);
    }
  };

  useEffect(() => {
    if (!loading && match && !canManage) {
      navigate(`/match/${id}`);
    }
  }, [match, canManage, loading, navigate, id]);

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
    
    // Bowler logic
    const isOverStarted = currentInn && currentInn.balls > 0;
    const previousBowlers = currentInn ? (Object.values(currentInn.bowlingStats) as BowlerStats[]).map(b => b.playerName) : [];
    
    let lastOverBowler = '';
    if (currentInn && currentInn.ballHistory.length > 0) {
      const lastBall = currentInn.ballHistory[currentInn.ballHistory.length - 1];
      lastOverBowler = lastBall.bowlerId;
    }

    const getBatsmanLabel = () => {
      if (!striker && !nonStriker && currentInn?.wickets === 0) return "First Opener";
      if (striker && !nonStriker && currentInn?.wickets === 0) return "Second Opener";
      if (!striker || !nonStriker) {
        const wickets = currentInn?.wickets || 0;
        const downs = ["Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh"];
        const index = wickets + 1; // if 1 wicket down, it's the 3rd batter (index 0 in downs is "Third")
        return `${downs[wickets - 1] || (wickets + 2) + 'th'} Down`;
      }
      return "New Bowler";
    };

    const needsBatter = !striker || !nonStriker;
    const needsBowler = !currentInn?.currentBowlerId;

    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
            {getBatsmanLabel()}
          </h2>
          
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Sequential Entry: Only show one input at a time if possible, or clear labels */}
            {!striker && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {currentInn?.wickets === 0 ? 'First Opener' : `${(currentInn?.wickets || 0) + 2}th Batter`}
                </label>
                <input 
                  type="text" 
                  value={strikerName}
                  onChange={(e) => setStrikerName(e.target.value)}
                  placeholder="Enter batter name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>
            )}
            
            {striker && !nonStriker && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {currentInn?.wickets === 0 ? 'Second Opener' : 'Next Batsman'}
                </label>
                <input 
                  type="text" 
                  value={nonStrikerName}
                  onChange={(e) => setNonStrikerName(e.target.value)}
                  placeholder="Enter batter name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>
            )}

            {/* Bowler selection is separate or shown when batters are set */}
            {striker && nonStriker && needsBowler && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {isOverStarted ? 'Current Bowler (Locked)' : 'Enter New Bowler'}
                </label>
                <input 
                  type="text" 
                  value={bowlerName}
                  onChange={(e) => setBowlerName(e.target.value)}
                  disabled={isOverStarted}
                  placeholder="Enter new bowler name"
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border border-slate-200 font-bold focus:border-blue-500 outline-none transition-all",
                    isOverStarted && "bg-slate-50 text-slate-400 cursor-not-allowed"
                  )}
                />
                {!isOverStarted && previousBowlers.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previous Bowlers</p>
                    <div className="flex flex-wrap gap-2">
                      {previousBowlers.map((bName) => {
                        const isLastBowler = bName === lastOverBowler;
                        return (
                          <button
                            key={bName}
                            disabled={isLastBowler}
                            onClick={() => setBowlerName(bName)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                              bowlerName === bName ? "bg-blue-900 border-blue-900 text-white" : 
                              isLastBowler ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" :
                              "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                            )}
                          >
                            {bName} {isLastBowler && '(Last Over)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={confirmPlayers}
            className="w-full py-4 rounded-xl bg-blue-900 text-white font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg"
          >
            Confirm & Continue
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

  // Auto-generate Man of the Match suggestions
  const getMoMSuggestions = () => {
    if (!match.winnerId || match.winnerId === 'Draw') return [];
    
    const winningTeamId = match.winnerId;
    const allPlayers: { name: string; score: number; wickets: number; total: number }[] = [];

    // Check both innings for winning team players
    [match.innings1, match.innings2].forEach(inn => {
      if (!inn) return;
      
      // Batting
      if (inn.battingTeamId === winningTeamId) {
        (Object.values(inn.battingStats) as BatterStats[]).forEach(b => {
          const existing = allPlayers.find(p => p.name === b.playerName);
          if (existing) {
            existing.score += b.runs;
            existing.total = existing.score + (existing.wickets * 20);
          } else {
            allPlayers.push({ name: b.playerName, score: b.runs, wickets: 0, total: b.runs });
          }
        });
      }

      // Bowling
      if (inn.bowlingTeamId === winningTeamId) {
        (Object.values(inn.bowlingStats) as BowlerStats[]).forEach(b => {
          const existing = allPlayers.find(p => p.name === b.playerName);
          if (existing) {
            existing.wickets += b.wickets;
            existing.total = existing.score + (existing.wickets * 20);
          } else {
            allPlayers.push({ name: b.playerName, score: 0, wickets: b.wickets, total: b.wickets * 20 });
          }
        });
      }
    });

    return allPlayers.sort((a, b) => b.total - a.total).slice(0, 2);
  };

  const momSuggestions = getMoMSuggestions();

  return (
    <div className="max-w-5xl mx-auto space-y-6 relative">
      {/* Finish Confirmation Modal */}
      <AnimatePresence>
        {showFinishConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6 text-center"
            >
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-10 h-10 text-amber-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 italic transform -skew-x-6">Match Over!</h2>
                <p className="text-slate-500 font-medium tracking-tight">The match has reached its conclusion. Please confirm the winner.</p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Winner</label>
                  <select 
                    value={winnerId}
                    onChange={(e) => setWinnerId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-black uppercase tracking-tight text-sm outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Winner</option>
                    <option value={match?.teamAId}>{match?.teamAName}</option>
                    <option value={match?.teamBId}>{match?.teamBName}</option>
                    <option value="Draw">Draw</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Result Message</label>
                  <input 
                    type="text" 
                    value={resultMessage}
                    onChange={(e) => setResultMessage(e.target.value)}
                    placeholder="e.g. Team A won by 10 runs"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFinishConfirm(false)}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={!winnerId}
                  onClick={onFinishConfirm}
                  className="flex-1 py-4 rounded-2xl bg-blue-900 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-800 transition-all shadow-lg disabled:opacity-50"
                >
                  Confirm Win
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Innings Over Modal */}
      <AnimatePresence>
        {showInningsOverModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl border-4 border-blue-900"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Innings Over</h2>
              <p className="text-slate-500 font-bold mb-8">First inning is over now. Completed successfully.</p>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowInningsOverModal(false)}
                  className="w-full py-4 rounded-xl bg-blue-900 text-white font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg"
                >
                  Start Second Innings
                </button>
                <button 
                  onClick={() => {
                    setShowInningsOverModal(false);
                    // Scroll to scorecard section
                    const el = document.getElementById('full-scorecard');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  Review Scorecard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fanfare Overlay */}
      <AnimatePresence>
        {showFanfare && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-[2px]"></div>
            <motion.div 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="relative z-10 bg-white p-12 rounded-[4rem] shadow-2xl border-8 border-blue-900 text-center"
            >
              <Trophy className="w-32 h-32 text-amber-500 mx-auto mb-6 animate-bounce" />
              <h1 className="text-6xl font-black uppercase tracking-tighter text-blue-900 transform -skew-x-6">Congratulations!</h1>
              <p className="text-2xl font-bold text-slate-600 mt-4 uppercase tracking-widest">
                {match.winnerId === 'team_a' ? match.teamAName : match.teamBName} Wins!
              </p>
            </motion.div>
            
            {/* Simple Confetti Particles */}
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth, 
                  y: -20, 
                  rotate: 0,
                  backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]
                }}
                animate={{ 
                  y: window.innerHeight + 20,
                  rotate: 360,
                  x: (Math.random() - 0.5) * 200 + (Math.random() * window.innerWidth)
                }}
                transition={{ 
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  ease: "linear",
                  delay: Math.random() * 2
                }}
                className="absolute w-3 h-3 rounded-sm opacity-60"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wicket Modal */}
      {showWicketModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Wicket!</h2>
              <button onClick={() => setShowWicketModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setWicketType(type)}
                    className={cn(
                      "py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all border-2",
                      wicketType === type ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-slate-100 text-slate-400"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {(wicketType === 'Caught' || wicketType === 'Run Out' || wicketType === 'Stumped') && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {wicketType === 'Caught' ? 'Fielder Name' : 'Who did run out?'}
                  </label>
                  <input 
                    type="text" 
                    value={fielderName}
                    onChange={(e) => setFielderName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              )}

              <button
                onClick={() => {
                  handleBall(0, false, undefined, true, wicketType, fielderName);
                  setShowWicketModal(false);
                  setFielderName('');
                }}
                className="w-full py-4 rounded-xl bg-red-600 text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg"
              >
                Confirm Wicket
              </button>
            </div>
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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">{match.teamAName} vs {match.teamBName}</h2>
              {match.name && (
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                  {match.name}
                </span>
              )}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {match.tournamentId ? 'Tournament Match' : 'Friendly Match'} • {match.oversLimit} Overs • {match.status}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-400" 
            title="Delete Match"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button onClick={() => setIsSelectingPlayers(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400" title="Change Players">
            <User className="w-5 h-5" />
          </button>
          <button 
            onClick={() => window.open(`#/match/${match.id}`, '_blank')} 
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-400" 
            title="View Public Live Score"
          >
            <Zap className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {match.status === 'Finished' && canManage && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-emerald-600 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight italic transform -skew-x-6">Match Result Settings</h2>
            </div>
            <CheckCircle2 className="w-6 h-6 opacity-50" />
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Winner</label>
                <select 
                  value={winnerId}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-black uppercase tracking-tight text-sm outline-none focus:border-blue-500 transition-all"
                >
                  <option value="">Select Winner</option>
                  <option value={match.teamAId}>{match.teamAName}</option>
                  <option value={match.teamBId}>{match.teamBName}</option>
                  <option value="Draw">Draw</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Result Message</label>
                <input 
                  type="text" 
                  value={resultMessage}
                  onChange={(e) => setResultMessage(e.target.value)}
                  placeholder="e.g. Team A won by 10 runs"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Man of the Match</label>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={manOfTheMatch}
                    onChange={(e) => setManOfTheMatch(e.target.value)}
                    placeholder="Enter player name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all"
                  />
                  {momSuggestions.length > 0 && (
                    <div className="flex gap-2">
                      {momSuggestions.map(p => (
                        <button
                          key={p.name}
                          onClick={() => setManOfTheMatch(p.name)}
                          className={cn(
                            "flex-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                            manOfTheMatch === p.name ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                          )}
                        >
                          {p.name} ({p.score}r, {p.wickets}w)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={updateMatchResult}
                className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Update Result
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to resume scoring? This will set match status back to Live.')) {
                    setMatch({ ...match, status: 'Live' });
                  }
                }}
                className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                Resume Scoring
              </button>
              <button 
                onClick={() => navigate('/live')}
                className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                Back to Live
              </button>
            </div>
          </div>
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
                  <h1 className="text-6xl font-black tracking-tighter leading-none mt-2">
                    {currentInnings?.runs}<span className="text-3xl text-blue-400">/{currentInnings?.wickets}</span>
                  </h1>
                  <p className="text-xl font-bold text-blue-300 mt-2">{currentInnings?.overs}.{currentInnings?.balls} <span className="text-sm opacity-50">/ {match.oversLimit} ov</span></p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Run Rate</div>
                  <div className="text-2xl font-black">
                    {currentInnings && (currentInnings.overs > 0 || currentInnings.balls > 0) 
                      ? (currentInnings.runs / (currentInnings.overs + currentInnings.balls/6)).toFixed(2)
                      : '0.00'}
                  </div>
                  {match.currentInnings === 2 && match.innings1 && (
                    <div className="mt-4">
                      <div className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Target</div>
                      <div className="text-2xl font-black">{match.innings1.runs + 1}</div>
                    </div>
                  )}
                </div>
              </div>

              {match.currentInnings === 2 && match.innings1 && (
                <div className="bg-blue-800/50 rounded-2xl p-4 border border-blue-700/50 mb-8">
                  <p className="text-sm font-bold text-center">
                    {match.teamAId === match.innings2?.battingTeamId ? match.teamAName : match.teamBName} needs {match.innings1.runs + 1 - (match.innings2?.runs || 0)} runs in {(match.oversLimit * 6) - ((match.innings2?.overs || 0) * 6 + (match.innings2?.balls || 0))} balls
                  </p>
                </div>
              )}

              {/* Target for 2nd Innings */}
              {match.currentInnings === 2 && match.innings1 && (
                <div className="mb-6 p-4 rounded-2xl bg-blue-800/50 border border-blue-700 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-300">Target: {match.innings1.runs + 1}</span>
                  <span className="text-xs font-black uppercase tracking-widest text-blue-300">Need {match.innings1.runs + 1 - (currentInnings?.runs || 0)} runs</span>
                </div>
              )}

            </div>
          </div>

          {/* Scoring Controls */}
          {match.status === 'Live' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-8">
              {/* Active Players Summary */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div 
                  initial={false}
                  animate={{ backgroundColor: striker?.isStriker ? 'rgb(239 246 255)' : 'rgb(248 250 252)' }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all",
                    striker?.isStriker ? "border-blue-200 ring-2 ring-blue-500/20 shadow-sm" : "border-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Striker</span>
                    {striker?.isStriker && <Zap className="w-3 h-3 text-blue-500 fill-blue-500" />}
                  </div>
                  <p className="text-lg font-black text-slate-900 truncate">{striker?.playerName || 'Select Batter'}</p>
                  <p className="text-xs font-bold text-blue-600 mt-1">{striker?.runs || 0} <span className="text-slate-400 font-medium">({striker?.balls || 0})</span></p>
                </motion.div>

                <motion.div 
                  initial={false}
                  animate={{ backgroundColor: nonStriker?.isStriker ? 'rgb(239 246 255)' : 'rgb(248 250 252)' }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all",
                    nonStriker?.isStriker ? "border-blue-200 ring-2 ring-blue-500/20 shadow-sm" : "border-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Non-Striker</span>
                    {nonStriker?.isStriker && <Zap className="w-3 h-3 text-blue-500 fill-blue-500" />}
                  </div>
                  <p className="text-lg font-black text-slate-900 truncate">{nonStriker?.playerName || 'Select Batter'}</p>
                  <p className="text-xs font-bold text-blue-600 mt-1">{nonStriker?.runs || 0} <span className="text-slate-400 font-medium">({nonStriker?.balls || 0})</span></p>
                </motion.div>
              </div>

              {/* Bowler & Strike Swap */}
              <div className="flex gap-4">
                <div className="flex-1 p-4 rounded-2xl bg-slate-900 text-white flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Current Bowler</span>
                    <p className="text-lg font-black">{bowler?.playerName || 'Select Bowler'}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">{bowler?.wickets || 0} - {bowler?.runs || 0} <span className="opacity-50">({bowler?.overs || 0}.{bowler?.balls || 0})</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Econ</p>
                    <p className="text-xl font-black">
                      {bowler && (bowler.overs > 0 || bowler.balls > 0) 
                        ? (bowler.runs / (bowler.overs + bowler.balls/6)).toFixed(2)
                        : '0.00'}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={swapStrike}
                  className="px-6 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-all flex flex-col items-center justify-center gap-1"
                  title="Swap Strike"
                >
                  <RotateCcw className="w-5 h-5 rotate-180" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Swap</span>
                </motion.button>
              </div>

              {/* Main Scoring Grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((run) => (
                    <motion.button
                      key={run}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBall(run)}
                      className="h-20 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-black text-2xl hover:bg-blue-900 hover:text-white hover:border-blue-900 transition-all shadow-sm flex items-center justify-center"
                    >
                      {run}
                    </motion.button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[4, 6].map((run) => (
                    <motion.button
                      key={run}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBall(run)}
                      className={cn(
                        "h-20 rounded-2xl border-2 font-black text-2xl transition-all shadow-md flex items-center justify-center",
                        run === 4 ? "bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-600 hover:text-white" : 
                        "bg-purple-50 border-purple-500 text-purple-700 hover:bg-purple-600 hover:text-white"
                      )}
                    >
                      {run}
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowWicketModal(true)}
                    className="h-20 rounded-2xl bg-red-50 border-2 border-red-500 text-red-600 font-black text-2xl hover:bg-red-600 hover:text-white transition-all shadow-md flex items-center justify-center"
                  >
                    W
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={undoLastBall}
                    className="h-20 rounded-2xl bg-amber-50 border-2 border-amber-500 text-amber-600 font-black text-2xl hover:bg-amber-600 hover:text-white transition-all shadow-md flex items-center justify-center"
                  >
                    <RotateCcw className="w-8 h-8" />
                  </motion.button>
                </div>
              </div>

              {/* Extras Section */}
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Extras & Penalties</h3>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <motion.button
                        key={num}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setExtraRuns(num)}
                        className={cn(
                          "w-8 h-8 rounded-lg font-black text-xs transition-all",
                          extraRuns === num ? "bg-blue-900 text-white" : "bg-white text-slate-400 border border-slate-200"
                        )}
                      >
                        {num}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Wide', type: 'Wd', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                    { label: 'No Ball', type: 'Nb', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                    { label: 'Bye', type: 'By', color: 'bg-slate-200 text-slate-700 border-slate-300' },
                    { label: 'Leg Bye', type: 'Lb', color: 'bg-slate-200 text-slate-700 border-slate-300' }
                  ].map((extra) => (
                    <motion.button
                      key={extra.type}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBall(extraRuns, true, extra.type as any)}
                      className={cn(
                        "py-4 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest border",
                        extra.color,
                        "hover:shadow-md"
                      )}
                    >
                      {extra.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Full Scorecard View */}
          <div id="full-scorecard" className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200"></div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Scorecard</h2>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>

            {match.innings1 && (
              <Scorecard match={match} innings={match.innings1} inningsNumber={1} />
            )}
            
            {match.innings2 && (
              <Scorecard match={match} innings={match.innings2} inningsNumber={2} />
            )}
          </div>
        </div>

        {/* Sidebar - Match Info & Results */}
        <div className="space-y-6">
          {match.status === 'Finished' && match.resultMessage && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="font-black uppercase tracking-tight">Result</h3>
              </div>
              <p className="text-2xl font-black text-slate-900 leading-tight">
                {match.resultMessage}
              </p>
              {match.manOfTheMatch && (
                <div className="pt-4 border-t border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Man of the Match</p>
                  <p className="font-bold text-slate-900">{match.manOfTheMatch}</p>
                </div>
              )}
            </div>
          )}

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
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={deleteMatch}
        title="Delete Match?"
        message="This will permanently delete this match and all its scoring data. This action cannot be undone."
        confirmText="Delete Now"
        isDestructive={true}
      />
    </div>
  );
}
