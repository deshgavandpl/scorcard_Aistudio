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
  CheckCircle2,
  Share2,
  Flame,
  Volume2
} from 'lucide-react';
import { Match, MatchInnings, Player, PlayerRole, BatterStats, BowlerStats, BallEvent } from '../types/cricket';
import { useCricketScoring } from '../hooks/useCricketScoring';
import { cn } from '../lib/utils';
import { doc, onSnapshot, setDoc, deleteDoc, updateDoc, increment, getDoc, getDocs, query, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import Scorecard from '../components/Scorecard';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { usePlayerProfile } from '../context/PlayerProfileContext';
import { Tournament, Team } from '../types/cricket';
import TournamentSidebar from '../components/TournamentSidebar';
import LiveChat from '../components/LiveChat';
import { getHypeCommentary, speakHype } from '../lib/audioUtils';

const calculateManOfTheMatch = (match: Match, winningTeamId: string) => {
  if (winningTeamId === 'Draw') return 'N/A';
  
  const points: Record<string, { name: string; score: number }> = {};

  const processBatting = (innings: MatchInnings | undefined) => {
    if (!innings || innings.battingTeamId !== winningTeamId) return;
    Object.values(innings.battingStats).forEach(stat => {
      if (!points[stat.playerId]) points[stat.playerId] = { name: stat.playerName, score: 0 };
      points[stat.playerId].score += stat.runs;
    });
  };

  const processBowlingAndFielding = (innings: MatchInnings | undefined) => {
    if (!innings || innings.bowlingTeamId !== winningTeamId) return;
    
    // Bowling
    Object.values(innings.bowlingStats).forEach(stat => {
      if (!points[stat.playerId]) points[stat.playerId] = { name: stat.playerName, score: 0 };
      points[stat.playerId].score += stat.wickets * 10;
    });

    // Fielding
    innings.ballHistory.forEach(ball => {
      if (ball.isWicket && ball.wicketType === 'Caught' && ball.fielderName) {
        const fielderName = ball.fielderName;
        let found = false;
        Object.keys(points).forEach(id => {
          if (points[id].name === fielderName) {
            points[id].score += 5;
            found = true;
          }
        });
        if (!found) {
          points[`name_${fielderName}`] = { name: fielderName, score: 5 };
        }
      }
    });
  };

  processBatting(match.innings1);
  processBatting(match.innings2);
  processBatting(match.superOverInnings1);
  processBatting(match.superOverInnings2);
  processBowlingAndFielding(match.innings1);
  processBowlingAndFielding(match.innings2);
  processBowlingAndFielding(match.superOverInnings1);
  processBowlingAndFielding(match.superOverInnings2);

  let bestPlayer = { name: 'N/A', score: -1 };
  Object.values(points).forEach(p => {
    if (p.score > bestPlayer.score) {
      bestPlayer = p;
    }
  });

  return bestPlayer.name;
};

export default function MatchScoring() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openPlayerProfile } = usePlayerProfile();
  const [isSettingUp, setIsSettingUp] = useState(id === 'new');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [overs, setOvers] = useState(6);
  const [umpireName, setUmpireName] = useState('');
  const [youtubeLiveUrl, setYoutubeLiveUrl] = useState('');
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'Bat' | 'Bowl'>('Bat');

  // Scoring State
  const { 
    match, 
    addBall, 
    undoLastBall, 
    swapStrike, 
    setMatch, 
    finishMatch, 
    startSecondInnings, 
    startSuperOver,
    loading 
  } = useCricketScoring(id === 'new' ? undefined : id);
  
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [lastInnings, setLastInnings] = useState(1);
  const [isSharing, setIsSharing] = useState(false);
  const [isHypeMuted, setIsHypeMuted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [teamARoster, setTeamARoster] = useState<Player[]>([]);
  const [teamBRoster, setTeamBRoster] = useState<Player[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);

  // Sync youtubeLiveUrl when match loads
  useEffect(() => {
    if (match?.youtubeLiveUrl) {
      setYoutubeLiveUrl(match.youtubeLiveUrl);
    }
  }, [match?.youtubeLiveUrl]);

  // Fetch all teams for selection
  useEffect(() => {
    const q = query(collection(db, 'teams'));
    const unsub = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setAllTeams(teamsData);
    });
    return () => unsub();
  }, []);

  // Fetch rosters when match is loaded
  useEffect(() => {
    if (!match) return;

    const fetchRosters = async () => {
      try {
        let tARoster: Player[] = [];
        let tBRoster: Player[] = [];

        // 1. Try fetching from tournament first (most specific to this match)
        if (match.tournamentId) {
          const tournamentDoc = await getDoc(doc(db, 'tournaments', match.tournamentId));
          if (tournamentDoc.exists()) {
            const tournamentData = tournamentDoc.data() as Tournament;
            const tourTeamA = tournamentData.teams.find(t => t.id === match.teamAId || t.name === match.teamAName);
            const tourTeamB = tournamentData.teams.find(t => t.id === match.teamBId || t.name === match.teamBName);
            
            if (tourTeamA) tARoster = tourTeamA.players || [];
            if (tourTeamB) tBRoster = tourTeamB.players || [];
          }
        }

        // 2. If rosters are still empty, try global teams collection
        if (tARoster.length === 0 || tBRoster.length === 0) {
          const teamsQuery = query(collection(db, 'teams'));
          const teamsSnapshot = await getDocs(teamsQuery);
          const allTeamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
          
          if (tARoster.length === 0) {
            const tA = allTeamsData.find(t => t.id === match.teamAId) || allTeamsData.find(t => t.name === match.teamAName);
            if (tA) tARoster = tA.players || [];
          }
          
          if (tBRoster.length === 0) {
            const tB = allTeamsData.find(t => t.id === match.teamBId) || allTeamsData.find(t => t.name === match.teamBName);
            if (tB) tBRoster = tB.players || [];
          }
        }

        setTeamARoster(tARoster);
        setTeamBRoster(tBRoster);
      } catch (error) {
        console.error("Error fetching rosters:", error);
      }
    };

    fetchRosters();
  }, [match?.id, match?.tournamentId, match?.teamAId, match?.teamBId, match?.teamAName, match?.teamBName]);

  const handleHype = async () => {
    if (!id || !match) return;
    try {
      await updateDoc(doc(db, 'matches', id), {
        hypeCount: increment(1)
      });
    } catch (error) {
      console.error("Hype failed:", error);
    }
  };

  const shareScorecard = async () => {
    const el = document.getElementById('share-card');
    if (!el) return;
    
    setIsSharing(true);
    try {
      const dataUrl = await toPng(el, { quality: 0.95, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'scorecard.png', { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          title: 'Apna Cricket Scorecard',
          text: `${match?.teamAName} vs ${match?.teamBName} Live Score!`,
          files: [file]
        });
      } else {
        const link = document.createElement('a');
        link.download = 'scorecard.png';
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      toast.error('Failed to generate scorecard image');
    } finally {
      setIsSharing(false);
    }
  };

  useEffect(() => {
    if (match?.status === 'Finished' && !showFanfare) {
      setShowFanfare(true);
      const timer = setTimeout(() => setShowFanfare(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [match?.status]);

  useEffect(() => {
    if (match?.currentInnings === 1) {
      const currentInn = match.isSuperOver ? match.superOverInnings1 : match.innings1;
      if (!currentInn) return;
      const maxWickets = match.isSuperOver ? 2 : 10;
      const maxOvers = match.isSuperOver ? 1 : match.oversLimit;
      const isOver = currentInn.wickets === maxWickets || currentInn.overs === maxOvers;
      
      if (isOver && !showInningsOverModal && lastInnings === 1) {
        setShowInningsOverModal(true);
        setLastInnings(2);
      } else if (!isOver && lastInnings === 2) {
        setLastInnings(1);
      }
    }
  }, [match?.innings1, match?.superOverInnings1, match?.oversLimit, match?.isSuperOver, showInningsOverModal, lastInnings]);

  useEffect(() => {
    if (match) {
      setResultMessage(match.resultMessage || '');
      setManOfTheMatch(match.manOfTheMatch || '');
      setWinnerId(match.winnerId || '');
    }
  }, [match]);

  useEffect(() => {
    if (match && match.status === 'Live' && match.currentInnings === 2) {
      const inn1 = match.isSuperOver ? match.superOverInnings1 : match.innings1;
      const inn2 = match.isSuperOver ? match.superOverInnings2 : match.innings2;
      if (inn1 && inn2) {
        const maxWickets = match.isSuperOver ? 2 : 10;
        const maxOvers = match.isSuperOver ? 1 : match.oversLimit;
        const isOver = inn2.wickets === maxWickets || inn2.overs === maxOvers || inn2.runs > inn1.runs;
        if (isOver && !showFinishConfirm) {
          // Calculate winner and MoM automatically
          let finalWinnerId = '';
          let finalResultMessage = '';
          const battingTeamName = inn2.battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
          const bowlingTeamName = inn2.bowlingTeamId === match.teamAId ? match.teamAName : match.teamBName;

          if (inn2.runs > inn1.runs) {
            finalWinnerId = inn2.battingTeamId;
            finalResultMessage = `${battingTeamName} won ${match.isSuperOver ? 'in Super Over ' : ''}by ${maxWickets - inn2.wickets} wickets`;
          } else if (inn1.runs > inn2.runs && (inn2.overs === maxOvers || inn2.wickets === maxWickets)) {
            finalWinnerId = inn1.battingTeamId;
            finalResultMessage = `${bowlingTeamName} won ${match.isSuperOver ? 'in Super Over ' : ''}by ${inn1.runs - inn2.runs} runs`;
          } else if (inn1.runs === inn2.runs && (inn2.overs === maxOvers || inn2.wickets === maxWickets)) {
            finalWinnerId = 'Draw';
            finalResultMessage = 'Match Draw';
          }

          if (finalWinnerId) {
            setWinnerId(finalWinnerId);
            setResultMessage(finalResultMessage);
            const mom = calculateManOfTheMatch(match, finalWinnerId);
            setManOfTheMatch(mom);
            setShowFinishConfirm(true);
          }
        }
      }
    }
  }, [match, showFinishConfirm]);

  const handleFinishMatch = async () => {
    if (!match || !winnerId) return;
    await finishMatch(winnerId, resultMessage, manOfTheMatch);
  };

  useEffect(() => {
    if (match?.status === 'Upcoming' && !isInitialized) {
      setIsSettingUp(true);
      setTeamA(match.teamAName || '');
      setTeamB(match.teamBName || '');
      setTeamAId(match.teamAId || '');
      setTeamBId(match.teamBId || '');
      setOvers(match.oversLimit || 6);
      setIsInitialized(true);
    }
  }, [match?.status, match?.teamAName, match?.teamBName, match?.teamAId, match?.teamBId, match?.oversLimit, isInitialized]);

  useEffect(() => {
    if (match && !isSettingUp && match.status === 'Live') {
      const currentInn = match.isSuperOver
        ? (match.currentInnings === 1 ? match.superOverInnings1 : match.superOverInnings2)
        : (match.currentInnings === 1 ? match.innings1 : match.innings2);
      if (!currentInn) return;

      const maxWickets = match.isSuperOver ? 2 : 10;
      const maxOvers = match.isSuperOver ? 1 : match.oversLimit;

      // Check if match/innings is over
      let isOver = currentInn.wickets === maxWickets || currentInn.overs === maxOvers;
      const inn1 = match.isSuperOver ? match.superOverInnings1 : match.innings1;
      
      if (match.currentInnings === 2 && inn1 && currentInn.runs > inn1.runs) {
        isOver = true;
      }

      if (isOver) {
        if (isSelectingPlayers) setIsSelectingPlayers(false);
        return;
      }

      const striker = (Object.values(currentInn.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
      const nonStriker = (Object.values(currentInn.battingStats || {}) as BatterStats[]).find(b => !b.isStriker && !b.isOut);
      const bowlerId = currentInn.currentBowlerId;
      
      // Sync local names for the modal
      if (striker) setStrikerName(striker.playerName);
      if (nonStriker) setNonStrikerName(nonStriker.playerName);
      if (bowlerId) setBowlerName(bowlerId);

      const needsSomething = !striker || !nonStriker || !bowlerId;
      
      if (needsSomething && !isSelectingPlayers) {
        setIsSelectingPlayers(true);
      } else if (!needsSomething) {
        setIsSelectingPlayers(false);
      }
    }
  }, [match, isSettingUp, isSelectingPlayers]);

  const startMatch = async () => {
    if (!canManage) return;
    
    // Use existing IDs if we are in an existing match, or the selected ones from the setup
    const tAId = match?.teamAId || teamAId || 'team_a_' + Math.random().toString(36).substr(2, 4);
    const tBId = match?.teamBId || teamBId || 'team_b_' + Math.random().toString(36).substr(2, 4);
    
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
      umpireName: umpireName,
      youtubeLiveUrl: youtubeLiveUrl,
      tossWinnerId: tossWinner === teamA ? tAId : tBId,
      tossDecision,
      oversLimit: overs,
      status: 'Live',
      currentInnings: 1,
      hypeCount: 0,
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
    const currentInn = updatedMatch.isSuperOver
      ? (updatedMatch.currentInnings === 1 ? updatedMatch.superOverInnings1 : updatedMatch.superOverInnings2)
      : (updatedMatch.currentInnings === 1 ? updatedMatch.innings1 : updatedMatch.innings2);
    
    if (!currentInn) return;

    // Deep copy stats to avoid mutation issues
    currentInn.battingStats = { ...currentInn.battingStats };
    currentInn.bowlingStats = { ...currentInn.bowlingStats };

    const striker = (Object.values(currentInn.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
    const nonStriker = (Object.values(currentInn.battingStats || {}) as BatterStats[]).find(b => !b.isStriker && !b.isOut);
    const bowlerId = currentInn.currentBowlerId;

    let hasError = false;

    const needsStriker = !striker;
    const needsNonStriker = striker && !nonStriker;
    const needsBowler = striker && nonStriker && !bowlerId;

    // 1. Handle Striker
    if (needsStriker) {
      if (!strikerName.trim()) {
        setError("Please enter striker name");
        return;
      } else if (currentInn.battingStats[strikerName]?.isOut) {
        setError(`${strikerName} is already out`);
        return;
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

    // 2. Handle Non-Striker
    else if (needsNonStriker) {
      if (!nonStrikerName.trim()) {
        setError("Please enter non-striker name");
        return;
      } else if (nonStrikerName === striker.playerName) {
        setError("Striker and Non-Striker cannot be the same person");
        return;
      } else if (currentInn.battingStats[nonStrikerName]?.isOut) {
        setError(`${nonStrikerName} is already out`);
        return;
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

    // 3. Handle Bowler
    else if (needsBowler) {
      if (!bowlerName.trim()) {
        setError("Please enter bowler name");
        return;
      } else {
        // Check if bowler bowled the last over
        if (currentInn.ballHistory.length > 0) {
          const lastBall = currentInn.ballHistory[currentInn.ballHistory.length - 1];
          if (lastBall.bowlerId === bowlerName && currentInn.balls === 0) {
            setError(`${bowlerName} cannot bowl consecutive overs`);
            return;
          }
        }
        
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

    try {
      await setDoc(doc(db, 'matches', match.id), updatedMatch);
      
      // Announce new player if not muted
      if (!isHypeMuted) {
        if (needsStriker) speakHype(`New batter on strike, ${strikerName}`);
        else if (needsNonStriker) speakHype(`New batter at the non-striker end, ${nonStrikerName}`);
        else if (needsBowler) speakHype(`New bowler into the attack, ${bowlerName}`);
      }

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

    if (!finalWinnerId) {
      const inn1 = match.isSuperOver ? match.superOverInnings1 : match.innings1;
      const inn2 = match.isSuperOver ? match.superOverInnings2 : match.innings2;
      
      if (inn1 && inn2) {
        const inn1Runs = inn1.runs;
        const inn2Runs = inn2.runs;
        const inn2Wickets = inn2.wickets;
        const maxWickets = match.isSuperOver ? 2 : 10;
        const battingTeamName = inn2.battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
        const bowlingTeamName = inn2.bowlingTeamId === match.teamAId ? match.teamAName : match.teamBName;

        if (inn2Runs > inn1Runs) {
          finalWinnerId = inn2.battingTeamId;
          finalResultMessage = `${battingTeamName} won ${match.isSuperOver ? 'in Super Over ' : ''}by ${maxWickets - inn2Wickets} wickets`;
        } else if (inn1Runs > inn2Runs) {
          finalWinnerId = inn1.battingTeamId;
          finalResultMessage = `${bowlingTeamName} won ${match.isSuperOver ? 'in Super Over ' : ''}by ${inn1Runs - inn2Runs} runs`;
        } else {
          finalWinnerId = 'Draw';
          finalResultMessage = 'Match Draw';
        }
      }
    }

    const finalMoM = manOfTheMatch || calculateManOfTheMatch(match, finalWinnerId);
    await finishMatch(finalWinnerId, finalResultMessage, finalMoM);
    setShowFinishConfirm(false);
    toast.success('Match finished successfully!');
  };

  const updateMatchResult = async () => {
    if (!match || !canManage) return;
    await finishMatch(winnerId, resultMessage, manOfTheMatch);
    toast.success('Match result updated.');
  };
  const handleBall = (runs: number, isExtra = false, extraType?: any, isWicket = false, wType?: string, fName?: string) => {
    if (!match || !canManage) return;
    const currentInn = match.isSuperOver
      ? (match.currentInnings === 1 ? match.superOverInnings1 : match.superOverInnings2)
      : (match.currentInnings === 1 ? match.innings1 : match.innings2);
      
    if (!currentInn) return;
    
    const isOver = match.isSuperOver 
      ? (currentInn.overs === 1 || currentInn.wickets === 2)
      : (currentInn.overs === match.oversLimit || currentInn.wickets === 10);
    
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

    // Hype Feedback
    const ballEvent: BallEvent = {
      over: currentInn.overs,
      ball: currentInn.balls + 1,
      runs,
      isExtra,
      extraType,
      isWicket,
      wicketType: wType,
      fielderName: fName,
      strikerId: striker.playerId,
      bowlerId: bowler.playerId
    };
    const commentary = getHypeCommentary(ballEvent);
    if (!isHypeMuted) {
      speakHype(commentary);
    }
  };

  const saveResultDetails = async () => {
    if (!match || !id || !canManage) return;
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
    if (!match || !canManage) return;
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
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-brand-red p-8 text-white">
            <h1 className="text-3xl font-black uppercase tracking-tighter transform -skew-x-6">New Match Setup</h1>
            <p className="text-red-200 text-sm font-medium mt-1 uppercase tracking-widest">Step {setupStep} of 2</p>
          </div>

          <div className="p-8 space-y-8">
            {setupStep === 1 ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Team A</label>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={teamA}
                        onChange={(e) => {
                          setTeamA(e.target.value);
                          setTeamAId(''); // Reset ID if name is changed manually
                        }}
                        placeholder="e.g. AP11"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-red focus:ring-2 focus:ring-red-200 outline-none transition-all font-bold"
                      />
                      {allTeams.length > 0 && (
                        <select 
                          value={teamAId}
                          onChange={(e) => {
                            const team = allTeams.find(t => t.id === e.target.value);
                            if (team) {
                              setTeamA(team.name);
                              setTeamAId(team.id);
                            } else {
                              setTeamAId('');
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold bg-slate-50"
                        >
                          <option value="">Select Existing Team</option>
                          {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Team B</label>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={teamB}
                        onChange={(e) => {
                          setTeamB(e.target.value);
                          setTeamBId(''); // Reset ID if name is changed manually
                        }}
                        placeholder="e.g. Cotton11"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-red focus:ring-2 focus:ring-red-200 outline-none transition-all font-bold"
                      />
                      {allTeams.length > 0 && (
                        <select 
                          value={teamBId}
                          onChange={(e) => {
                            const team = allTeams.find(t => t.id === e.target.value);
                            if (team) {
                              setTeamB(team.name);
                              setTeamBId(team.id);
                            } else {
                              setTeamBId('');
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold bg-slate-50"
                        >
                          <option value="">Select Existing Team</option>
                          {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Umpire Name</label>
                  <input 
                    type="text" 
                    value={umpireName}
                    onChange={(e) => setUmpireName(e.target.value)}
                    placeholder="e.g. Nitin Menon"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-red focus:ring-2 focus:ring-red-200 outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">YouTube Live Video URL (Optional)</label>
                  <input 
                    type="text" 
                    value={youtubeLiveUrl}
                    onChange={(e) => setYoutubeLiveUrl(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-red focus:ring-2 focus:ring-red-200 outline-none transition-all font-bold"
                  />
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

                <button 
                  disabled={!teamA || !teamB || teamA === teamB}
                  onClick={() => setSetupStep(2)}
                  className="w-full py-4 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-brand-red/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {teamA === teamB && teamA !== '' ? 'Teams must be different' : 'Next Step'}
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
                        tossWinner === teamA ? "bg-red-50 border-brand-red text-brand-red" : "bg-white border-slate-100 text-slate-400"
                      )}
                    >
                      {teamA}
                    </button>
                    <button
                      onClick={() => setTossWinner(teamB)}
                      className={cn(
                        "py-4 rounded-xl font-black uppercase tracking-widest transition-all border-2",
                        tossWinner === teamB ? "bg-red-50 border-brand-red text-brand-red" : "bg-white border-slate-100 text-slate-400"
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
                          tossDecision === 'Bat' ? "bg-red-50 border-brand-red text-brand-red" : "bg-white border-slate-100 text-slate-400"
                        )}
                      >
                        Batting
                      </button>
                      <button
                        onClick={() => setTossDecision('Bowl')}
                        className={cn(
                          "py-4 rounded-xl font-black uppercase tracking-widest transition-all border-2",
                          tossDecision === 'Bowl' ? "bg-red-50 border-brand-red text-brand-red" : "bg-white border-slate-100 text-slate-400"
                        )}
                      >
                        Bowling
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={() => setSetupStep(1)}
                    className="w-full py-3 rounded-xl border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-[10px]"
                  >
                    Back to Match Details
                  </button>
                  <button 
                    disabled={!tossWinner}
                    onClick={startMatch}
                    className="w-full py-4 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-brand-red/90 transition-all shadow-lg disabled:opacity-50"
                  >
                    Confirm Toss & Start 1st Inning
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isSelectingPlayers && match && match.status === 'Live') {
    const currentInn = match.isSuperOver
      ? (match.currentInnings === 1 ? match.superOverInnings1 : match.superOverInnings2)
      : (match.currentInnings === 1 ? match.innings1 : match.innings2);
    
    const striker = (Object.values(currentInn?.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
    const nonStriker = (Object.values(currentInn?.battingStats || {}) as BatterStats[]).find(b => !b.isStriker && !b.isOut);
    const bowlerId = currentInn?.currentBowlerId;
    
    const isOverStarted = currentInn && currentInn.balls > 0;
    const previousBowlers = currentInn ? (Object.values(currentInn.bowlingStats) as BowlerStats[]).map(b => b.playerName) : [];
    
    let lastOverBowler = '';
    if (currentInn && currentInn.ballHistory.length > 0) {
      const lastBall = currentInn.ballHistory[currentInn.ballHistory.length - 1];
      lastOverBowler = lastBall.bowlerId;
    }

    const needsStriker = !striker;
    const needsNonStriker = striker && !nonStriker;
    const needsBowler = striker && nonStriker && !bowlerId;

    const isTeamABatting = currentInn?.battingTeamId === match.teamAId || currentInn?.battingTeamId === match.teamAName;
    const battingRoster = isTeamABatting ? teamARoster : teamBRoster;
    const bowlingRoster = isTeamABatting ? teamBRoster : teamARoster;

    const getTitle = () => {
      if (needsStriker) return currentInn?.wickets === 0 ? "First Opener" : "New Batsman";
      if (needsNonStriker) return currentInn?.wickets === 0 ? "Second Opener" : "Next Batsman";
      if (needsBowler) return currentInn?.balls === 0 && currentInn?.overs > 0 ? "Next Over" : "New Bowler";
      return "Select Player";
    };

    const getInstruction = () => {
      if (needsStriker) return "Who is taking the strike now?";
      if (needsNonStriker) return "Who is at the other end?";
      if (needsBowler) return "Who will bowl this over?";
      return "Please enter the name below.";
    };

    const isPlayerOut = (name: string) => {
      return currentInn?.battingStats[name]?.isOut;
    };

    const isPlayerOnField = (name: string) => {
      const stats = Object.values(currentInn?.battingStats || {}) as BatterStats[];
      return stats.some(s => s.playerName === name && !s.isOut);
    };

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4 overflow-y-auto">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl space-y-6 my-4"
        >
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <User className="w-6 h-6 text-brand-red" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 italic transform -skew-x-6">
              {getTitle()}
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px]">
              {getInstruction()}
            </p>
          </div>
          
          <div className="space-y-4">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="space-y-3">
              {(needsStriker || needsNonStriker) && (
                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      autoFocus
                      value={needsStriker ? strikerName : nonStrikerName}
                      onChange={(e) => needsStriker ? setStrikerName(e.target.value) : setNonStrikerName(e.target.value)}
                      placeholder="ENTER BATTER NAME"
                      className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 font-black uppercase tracking-widest focus:border-brand-red outline-none transition-all text-center text-xl shadow-sm"
                    />
                    {(needsStriker ? strikerName : nonStrikerName) && (
                      <button 
                        onClick={() => needsStriker ? setStrikerName('') : setNonStrikerName('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>
                  
                  {battingRoster.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select from {isTeamABatting ? match.teamAName : match.teamBName} Roster</p>
                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{battingRoster.length} Players</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {battingRoster
                          .filter(p => !isPlayerOut(p.name) && !isPlayerOnField(p.name))
                          .map((p) => (
                          <button
                            key={p.id}
                            onClick={() => needsStriker ? setStrikerName(p.name) : setNonStrikerName(p.name)}
                            className={cn(
                              "px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all text-left flex items-center gap-2",
                              (needsStriker ? strikerName : nonStrikerName) === p.name 
                                ? "bg-brand-red border-brand-red text-white shadow-lg translate-x-1" 
                                : "bg-white border-slate-100 text-slate-600 hover:border-red-200 hover:bg-red-50/30"
                            )}
                          >
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              (needsStriker ? strikerName : nonStrikerName) === p.name ? "bg-white" : "bg-slate-200"
                            )} />
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-2">
                      <User className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No roster found for this team</p>
                      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Please type the name manually above</p>
                    </div>
                  )}
                </div>
              )}

              {needsBowler && (
                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      autoFocus
                      value={bowlerName}
                      onChange={(e) => setBowlerName(e.target.value)}
                      placeholder="ENTER BOWLER NAME"
                      className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 font-black uppercase tracking-widest focus:border-brand-red outline-none transition-all text-center text-xl shadow-sm"
                    />
                    {bowlerName && (
                      <button 
                        onClick={() => setBowlerName('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {bowlingRoster.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select from {isTeamABatting ? match.teamBName : match.teamAName} Roster</p>
                          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{bowlingRoster.length} Players</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                          {bowlingRoster.map((p) => {
                            const isLastBowler = p.name === lastOverBowler;
                            return (
                              <button
                                key={p.id}
                                disabled={isLastBowler}
                                onClick={() => setBowlerName(p.name)}
                                className={cn(
                                  "px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all text-left flex items-center gap-2",
                                  bowlerName === p.name ? "bg-brand-red border-brand-red text-white shadow-lg translate-x-1" : 
                                  isLastBowler ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50" :
                                  "bg-white border-slate-100 text-slate-600 hover:border-red-200 hover:bg-red-50/30"
                                )}
                              >
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  bowlerName === p.name ? "bg-white" : isLastBowler ? "bg-slate-300" : "bg-slate-200"
                                )} />
                                <span className="truncate">{p.name}</span>
                                {isLastBowler && <span className="ml-auto text-[6px] opacity-60">LAST</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      previousBowlers.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quick Select Previous Bowler</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {previousBowlers.map((bName) => {
                              const isLastBowler = bName === lastOverBowler;
                              return (
                                <button
                                  key={bName}
                                  disabled={isLastBowler}
                                  onClick={() => setBowlerName(bName)}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all",
                                    bowlerName === bName ? "bg-brand-red border-brand-red text-white shadow-lg scale-105" : 
                                    isLastBowler ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" :
                                    "bg-white border-slate-100 text-slate-600 hover:border-red-300"
                                  )}
                                >
                                  {bName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                    
                    {!bowlingRoster.length && !previousBowlers.length && (
                      <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-2">
                        <User className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No bowlers found</p>
                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Please type the name manually above</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={confirmPlayers}
              className="w-full py-5 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-brand-red/90 transition-all shadow-xl text-sm transform active:scale-95"
            >
              Confirm & Continue
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!match) return null;

  const currentInnings = match.isSuperOver
    ? (match.currentInnings === 1 ? match.superOverInnings1 : match.superOverInnings2)
    : (match.currentInnings === 1 ? match.innings1 : match.innings2);
    
  const battingTeamName = currentInnings?.battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
  const bowlingTeamName = currentInnings?.battingTeamId === match.teamAId ? match.teamBName : match.teamAName;

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
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <Trophy className="w-10 h-10 text-brand-red" />
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
                    onChange={(e) => {
                      setWinnerId(e.target.value);
                      const mom = calculateManOfTheMatch(match, e.target.value);
                      setManOfTheMatch(mom);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-black uppercase tracking-tight text-sm outline-none focus:border-brand-red transition-all"
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-brand-red transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Man of the Match</label>
                  <input 
                    type="text" 
                    value={manOfTheMatch}
                    onChange={(e) => setManOfTheMatch(e.target.value)}
                    placeholder="Player Name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-brand-red transition-all"
                  />
                </div>

                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-left">
                  <p className="text-[10px] font-black text-brand-red uppercase tracking-widest mb-2">MoM Selection Rules:</p>
                  <ul className="text-[9px] font-bold text-red-700 space-y-1 list-disc pl-4">
                    <li>1 Run = 1 Point</li>
                    <li>1 Wicket = 10 Points</li>
                    <li>1 Catch = 5 Points</li>
                    <li>Selected from the winning team</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFinishConfirm(false)}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                {winnerId === 'Draw' ? (
                  <button 
                    onClick={() => {
                      startSuperOver();
                      setShowFinishConfirm(false);
                      setIsSelectingPlayers(true);
                    }}
                    className="flex-1 py-4 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest text-xs hover:bg-brand-red/90 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Start Super Over
                  </button>
                ) : (
                  <button 
                    disabled={!winnerId}
                    onClick={onFinishConfirm}
                    className="flex-1 py-4 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest text-xs hover:bg-brand-red/90 transition-all shadow-lg disabled:opacity-50"
                  >
                    Confirm Win
                  </button>
                )}
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
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl border-4 border-brand-red"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-brand-red" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Innings Over</h2>
              <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">1st Innings Score</p>
                <p className="text-2xl font-black text-brand-red">
                  {match.isSuperOver ? match.superOverInnings1?.runs : match.innings1?.runs}/
                  {match.isSuperOver ? match.superOverInnings1?.wickets : match.innings1?.wickets}
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-1">
                  in {match.isSuperOver ? match.superOverInnings1?.overs : match.innings1?.overs}.
                  {match.isSuperOver ? match.superOverInnings1?.balls : match.innings1?.balls} overs
                </p>
              </div>
              
              <div className="bg-brand-red p-6 rounded-3xl mb-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Trophy className="w-12 h-12" />
                </div>
                <p className="text-[10px] font-black text-red-200 uppercase tracking-widest mb-1">Target for 2nd Innings</p>
                <p className="text-4xl font-black italic transform -skew-x-6">
                  {match.isSuperOver ? (match.superOverInnings1?.runs || 0) + 1 : (match.innings1?.runs || 0) + 1}
                </p>
                <p className="text-[10px] font-bold text-red-300 mt-2 uppercase tracking-widest">
                  Req. RR: {match.isSuperOver 
                    ? (match.superOverInnings1 ? (match.superOverInnings1.runs + 1).toFixed(2) : '0.00')
                    : (match.innings1 ? ((match.innings1.runs + 1) / match.oversLimit).toFixed(2) : '0.00')}
                </p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    startSecondInnings();
                    setShowInningsOverModal(false);
                  }}
                  className="w-full py-4 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-brand-red/90 transition-all shadow-lg"
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
            <div className="absolute inset-0 bg-brand-red/20 backdrop-blur-[2px]"></div>
            <motion.div 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="relative z-10 bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[4rem] shadow-2xl border-4 md:border-8 border-brand-red text-center max-w-[90%] md:max-w-none"
            >
              <Trophy className="w-16 h-16 md:w-32 md:h-32 text-red-500 mx-auto mb-4 md:mb-6 animate-bounce" />
              <h1 className="text-3xl md:text-6xl font-black uppercase tracking-tighter text-brand-red transform -skew-x-6">Congratulations!</h1>
              <p className="text-lg md:text-2xl font-bold text-slate-600 mt-2 md:mt-4 uppercase tracking-widest">
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Match Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">YouTube Live Video URL</label>
                <input 
                  type="text" 
                  value={youtubeLiveUrl}
                  onChange={(e) => setYoutubeLiveUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-brand-red transition-all"
                />
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Enter the full YouTube URL to show live video to users.</p>
              </div>

              <button
                onClick={async () => {
                  if (match && id) {
                    try {
                      await updateDoc(doc(db, 'matches', id), { youtubeLiveUrl });
                      toast.success('Settings updated!');
                      setShowSettingsModal(false);
                    } catch (err) {
                      toast.error('Failed to update settings');
                    }
                  }
                }}
                className="w-full py-4 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
              >
                Save Settings
              </button>
            </div>
          </motion.div>
        </div>
      )}

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

      {/* Tournament Sidebar FAB */}
      {match.tournamentId && (
        <div className="fixed bottom-24 right-6 z-[150] md:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="w-14 h-14 bg-brand-red text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
          >
            <Trophy className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest border-2 border-white">
              Center
            </div>
          </button>
        </div>
      )}

      {/* Tournament Sidebar */}
      {match.tournamentId && (
        <TournamentSidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          tournamentId={match.tournamentId}
          currentMatchId={match.id}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-2 sm:p-3 rounded-[1.5rem] border border-slate-200 shadow-sm mb-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => navigate('/live')} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight leading-none">{match.teamAName} vs {match.teamBName}</h2>
              {match.name && (
                <span className="px-1.5 py-0.5 rounded bg-red-100 text-brand-red text-[8px] font-black uppercase tracking-widest">
                  {match.name}
                </span>
              )}
            </div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {match.tournamentId ? 'Tournament' : 'Friendly'} • {match.oversLimit} Overs • {match.status}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => setIsHypeMuted(!isHypeMuted)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isHypeMuted ? "text-slate-300" : "text-brand-red bg-red-50"
            )}
            title="Toggle Commentary Audio"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button 
            onClick={shareScorecard}
            disabled={isSharing}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-brand-red"
            title="Share Scorecard"
          >
            <Share2 className={cn("w-4 h-4", isSharing && "animate-spin")} />
          </button>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400" 
            title="Delete Match"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400" 
            title="Match Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={() => setIsSelectingPlayers(true)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400" title="Change Players">
            <User className="w-4 h-4" />
          </button>
          <button 
            onClick={() => window.open(`#/match/${match.id}`, '_blank')} 
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-brand-red" 
            title="View Public Live Score"
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </div>

      {match.status === 'Finished' && canManage && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden mb-4">
          <div className="bg-emerald-600 p-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <h2 className="text-sm font-black uppercase tracking-tight italic transform -skew-x-6">Match Result Settings</h2>
            </div>
            <CheckCircle2 className="w-4 h-4 opacity-50" />
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Winner</label>
                <select 
                  value={winnerId}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-black uppercase tracking-tight text-xs outline-none focus:border-brand-red transition-all"
                >
                  <option value="">Select Winner</option>
                  <option value={match.teamAId}>{match.teamAName}</option>
                  <option value={match.teamBId}>{match.teamBName}</option>
                  <option value="Draw">Draw</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Result Message</label>
                <input 
                  type="text" 
                  value={resultMessage}
                  onChange={(e) => setResultMessage(e.target.value)}
                  placeholder="e.g. Team A won by 10 runs"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-xs outline-none focus:border-brand-red transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Man of the Match</label>
                <div className="space-y-2">
                  <input 
                    type="text" 
                    value={manOfTheMatch}
                    onChange={(e) => setManOfTheMatch(e.target.value)}
                    placeholder="Enter player name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-xs outline-none focus:border-brand-red transition-all"
                  />
                  {momSuggestions.length > 0 && (
                    <div className="flex gap-1">
                      {momSuggestions.map(p => (
                        <button
                          key={p.name}
                          onClick={() => setManOfTheMatch(p.name)}
                          className={cn(
                            "flex-1 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all border",
                            manOfTheMatch === p.name ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                          )}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={updateMatchResult}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-3 h-3" /> Update Result
              </button>
              {winnerId === 'Draw' && (
                <button 
                  onClick={() => {
                    if (window.confirm('Start a Super Over? This will reset the score for a 1-over tie-breaker.')) {
                      startSuperOver();
                      setIsSelectingPlayers(true);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest text-[10px] hover:bg-brand-red/90 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Zap className="w-3 h-3" /> Start Super Over
                </button>
              )}
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to resume scoring? This will set match status back to Live.')) {
                    setMatch({ ...match, status: 'Live' });
                  }
                }}
                className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
              >
                Resume
              </button>
              <button 
                onClick={() => navigate('/live')}
                className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Scoreboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          {/* Live Score Card - Reduced Size */}
          <div className="bg-brand-red rounded-[2rem] p-4 sm:p-5 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Zap className="w-12 h-12 text-white" />
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-800 border border-red-700 text-[8px] font-black uppercase tracking-[0.1em] text-red-200 mb-1.5">
                    <span className={cn("w-1 h-1 rounded-full bg-white", match.status === 'Live' && "animate-pulse")}></span>
                    {match.status === 'Live' ? 'Live' : 'Final'}
                  </span>
                  <h3 className="text-lg font-black uppercase tracking-tight text-red-100 leading-tight">{battingTeamName}</h3>
                  <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none mt-1">
                    {currentInnings?.runs}<span className="text-2xl text-red-400">/{currentInnings?.wickets}</span>
                  </h1>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-sm font-bold text-red-300">
                      {currentInnings?.overs}.{currentInnings?.balls} 
                      <span className="text-[10px] opacity-50 uppercase tracking-widest ml-1">
                        / {match.isSuperOver ? 1 : match.oversLimit} Overs
                      </span>
                    </p>
                    {match.isSuperOver && (
                      <span className="px-2 py-0.5 rounded bg-yellow-400 text-slate-900 text-[8px] font-black uppercase tracking-widest animate-bounce">
                        Super Over
                      </span>
                    )}
                    {match.umpireName && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-800/50 border border-red-700/50 text-[8px] font-black uppercase tracking-widest text-red-400">
                        <User className="w-2.5 h-2.5" /> {match.umpireName}
                      </div>
                    )}
                  </div>

                  {/* Active Players Info - Consolidated into Red Card */}
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-red-800/50">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Striker</span>
                          <button 
                            onClick={() => openPlayerProfile(striker?.playerId || '', striker?.playerName || '')}
                            className="text-sm font-black text-white hover:text-red-200 transition-colors text-left"
                          >
                            {striker?.playerName} <span className="text-xs text-red-300">({striker?.runs})</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-70">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                          <User className="w-4 h-4 text-red-300" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Non-Striker</span>
                          <button 
                            onClick={() => openPlayerProfile(nonStriker?.playerId || '', nonStriker?.playerName || '')}
                            className="text-sm font-bold text-red-100 hover:text-white transition-colors text-left"
                          >
                            {nonStriker?.playerName} <span className="text-xs opacity-70">({nonStriker?.runs})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-center pl-4 border-l border-red-800/50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                          <Flame className="w-4 h-4 text-red-400 animate-bounce" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Bowler</span>
                          <button 
                            onClick={() => openPlayerProfile(bowler?.playerId || '', bowler?.playerName || '')}
                            className="text-sm font-black text-white hover:text-red-200 transition-colors text-left"
                          >
                            {bowler?.playerName}
                          </button>
                          <p className="text-xs font-bold text-red-300">{bowler?.wickets}-{bowler?.runs} <span className="opacity-50">({bowler?.overs}.{bowler?.balls})</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-0.5">Run Rate</div>
                  <div className="text-xl font-black">
                    {currentInnings && (currentInnings.overs > 0 || currentInnings.balls > 0) 
                      ? (currentInnings.runs / (currentInnings.overs + currentInnings.balls/6)).toFixed(2)
                      : '0.00'}
                  </div>
                  {match.currentInnings === 2 && (match.isSuperOver ? match.superOverInnings1 : match.innings1) && (
                    <div className="mt-2">
                      <div className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-0.5">Target</div>
                      <div className="text-xl font-black">{((match.isSuperOver ? match.superOverInnings1?.runs : match.innings1?.runs) || 0) + 1}</div>
                    </div>
                  )}
                </div>
              </div>

              {match.currentInnings === 2 && (match.isSuperOver ? match.superOverInnings1 : match.innings1) && (
                <div className="bg-red-800/50 rounded-xl p-2 border border-red-700/50 mb-1">
                  <p className="text-[10px] font-black text-center uppercase tracking-tight">
                    {match.teamAId === currentInnings?.battingTeamId ? match.teamAName : match.teamBName} needs {((match.isSuperOver ? match.superOverInnings1?.runs : match.innings1?.runs) || 0) + 1 - (currentInnings?.runs || 0)} runs in {((match.isSuperOver ? 1 : match.oversLimit) * 6) - ((currentInnings?.overs || 0) * 6 + (currentInnings?.balls || 0))} balls
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Balls (Mobile Only) */}
          <div className="lg:hidden bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <History className="w-3 h-3" /> Recent Balls (Over {currentInnings?.overs})
              </h3>
              <button 
                onClick={handleHype}
                className="flex items-center gap-1 px-2 py-1 bg-red-50 text-brand-red rounded-full border border-red-100 active:scale-90"
              >
                <Flame className="w-3 h-3 fill-brand-red" />
                <span className="text-[8px] font-black">{match.hypeCount || 0}</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentInnings?.ballHistory
                .filter(ball => ball.over === currentInnings.overs)
                .slice()
                .reverse()
                .map((ball, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border transition-all",
                      idx === 0 && "ring-2 ring-brand-red ring-offset-1 scale-110",
                      ball.isWicket ? "bg-red-100 border-red-500 text-red-600" :
                      ball.runs === 4 ? "bg-emerald-100 border-emerald-500 text-emerald-600" :
                      ball.runs === 6 ? "bg-purple-100 border-purple-500 text-purple-600" :
                      ball.isExtra ? "bg-amber-100 border-amber-500 text-amber-600" :
                      "bg-slate-50 border-slate-200 text-slate-600"
                    )}
                  >
                    {idx === 0 ? `[${ball.isWicket ? 'W' : ball.isExtra ? `${ball.extraType}${ball.runs > 0 ? '+' + ball.runs : ''}` : ball.runs}]` : (ball.isWicket ? 'W' : ball.isExtra ? `${ball.extraType}${ball.runs > 0 ? '+' + ball.runs : ''}` : ball.runs)}
                  </div>
                ))}
              {(!currentInnings?.ballHistory || currentInnings.ballHistory.filter(ball => ball.over === currentInnings.overs).length === 0) && (
                <p className="text-slate-300 italic text-[8px] py-1">No balls in this over yet.</p>
              )}
            </div>
          </div>

          {/* Scoring Controls */}
          {match.status === 'Live' && (
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-lg space-y-3">
              {/* Scoring Grid - Simplified for Admin - Compact */}
              <div className="space-y-2">
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Live Feed Input</p>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic transform -skew-x-6">Tap to add runs</h3>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((run) => (
                  <motion.button
                    key={run}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleBall(run)}
                    className={cn(
                      "aspect-square rounded-xl border-2 font-black text-xl transition-all shadow-sm flex items-center justify-center",
                      run === 0 ? "bg-slate-50 border-slate-200 text-slate-400" :
                      run === 4 ? "bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-600 hover:text-white" :
                      "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white"
                    )}
                  >
                    {run}
                  </motion.button>
                ))}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleBall(6)}
                  className="aspect-square rounded-xl bg-purple-50 border-2 border-purple-500 text-purple-700 font-black text-xl hover:bg-purple-600 hover:text-white transition-all shadow-lg flex items-center justify-center"
                >
                  6
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowWicketModal(true)}
                  className="aspect-square rounded-xl bg-red-50 border-2 border-red-500 text-red-600 font-black text-xl hover:bg-red-600 hover:text-white transition-all shadow-lg flex items-center justify-center"
                >
                  W
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={undoLastBall}
                  className="aspect-square rounded-xl bg-amber-50 border-2 border-amber-200 text-amber-600 font-black text-xl hover:bg-amber-500 hover:text-white transition-all shadow-lg flex items-center justify-center"
                >
                  <RotateCcw className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={swapStrike}
                  className="aspect-square rounded-xl bg-slate-100 border-2 border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center shadow-sm"
                  title="Swap Strike"
                >
                  <RotateCcw className="w-5 h-5 rotate-180" />
                </motion.button>
              </div>
            </div>

              {/* Extras Section - Compact */}
              <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Extras</h3>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <motion.button
                        key={num}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setExtraRuns(num)}
                        className={cn(
                          "w-6 h-6 rounded-md font-black text-[10px] transition-all",
                          extraRuns === num ? "bg-brand-red text-white" : "bg-white text-slate-400 border border-slate-200"
                        )}
                      >
                        {num}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'WD', type: 'Wd', color: 'bg-red-50 text-brand-red border-red-100' },
                    { label: 'NB', type: 'Nb', color: 'bg-red-50 text-brand-red border-red-100' },
                    { label: 'BYE', type: 'By', color: 'bg-slate-200 text-slate-700 border-slate-300' },
                    { label: 'LB', type: 'Lb', color: 'bg-slate-200 text-slate-700 border-slate-300' }
                  ].map((extra) => (
                    <motion.button
                      key={extra.type}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBall(extraRuns, true, extra.type as any)}
                      className={cn(
                        "py-1.5 rounded-lg font-black text-[8px] transition-all uppercase tracking-widest border",
                        extra.color,
                        "hover:shadow-sm"
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
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">1st Innings</h3>
                <Scorecard match={match} innings={match.innings1} inningsNumber={1} />
              </div>
            )}
            
            {match.innings2 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">2nd Innings</h3>
                <Scorecard match={match} innings={match.innings2} inningsNumber={2} />
              </div>
            )}

            {match.superOverInnings1 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-brand-red px-1 flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Super Over: 1st Innings
                </h3>
                <Scorecard match={match} innings={match.superOverInnings1} inningsNumber={1} />
              </div>
            )}

            {match.superOverInnings2 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-brand-red px-1 flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Super Over: 2nd Innings
                </h3>
                <Scorecard match={match} innings={match.superOverInnings2} inningsNumber={2} />
              </div>
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <History className="w-4 h-4" /> Recent Balls
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleHype}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-brand-red rounded-full border border-red-100 hover:bg-red-100 transition-all active:scale-90"
                >
                  <Flame className="w-4 h-4 fill-brand-red" />
                  <span className="text-xs font-black">{match.hypeCount || 0}</span>
                </button>
              </div>
            </div>
            
            {currentInnings?.ballHistory.length > 0 && (
              <div className="mb-6 p-4 bg-brand-red rounded-2xl text-white shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Flame className="w-12 h-12" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200 mb-1">Live Commentary</p>
                <p className="text-lg font-black italic transform -skew-x-6">
                  {getHypeCommentary(currentInnings.ballHistory[currentInnings.ballHistory.length - 1])}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[400px]">
              {currentInnings?.ballHistory
                .filter(ball => ball.over === currentInnings.overs)
                .slice()
                .reverse()
                .map((ball, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all",
                      idx === 0 && "ring-4 ring-brand-red ring-offset-2 scale-110",
                      ball.isWicket ? "bg-red-100 border-red-500 text-red-600" :
                      ball.runs === 4 ? "bg-emerald-100 border-emerald-500 text-emerald-600" :
                      ball.runs === 6 ? "bg-purple-100 border-purple-500 text-purple-600" :
                      ball.isExtra ? "bg-red-50 border-brand-red text-brand-red" :
                      "bg-slate-50 border-slate-200 text-slate-600"
                    )}
                  >
                    {idx === 0 ? `[${ball.isWicket ? 'W' : ball.isExtra ? `${ball.extraType}${ball.runs > 0 ? '+' + ball.runs : ''}` : ball.runs}]` : (ball.isWicket ? 'W' : ball.isExtra ? `${ball.extraType}${ball.runs > 0 ? '+' + ball.runs : ''}` : ball.runs)}
                  </div>
                ))}
              {(!currentInnings?.ballHistory || currentInnings.ballHistory.filter(ball => ball.over === currentInnings.overs).length === 0) && (
                <p className="text-slate-300 italic text-sm py-4">No balls in this over yet.</p>
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

      {/* Hidden Share Card Template */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          id="share-card" 
          className="w-[1080px] h-[1080px] bg-slate-900 p-16 flex flex-col justify-between relative overflow-hidden"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Neon Accents */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full"></div>
          
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-brand-red rounded-2xl flex items-center justify-center shadow-2xl">
                <span className="text-white font-black italic text-4xl">A</span>
              </div>
              <div>
                <h1 className="text-white text-3xl font-black uppercase tracking-tighter italic transform -skew-x-6">Apna Cricket</h1>
                <p className="text-red-400 text-sm font-black uppercase tracking-widest">Live Match Update</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
              <p className="text-white text-xl font-black uppercase tracking-widest italic">{match.status}</p>
            </div>
          </div>

          <div className="relative z-10 text-center space-y-8">
            <div className="flex justify-center items-center gap-12">
              <div className="text-right flex-1">
                <h2 className="text-white text-6xl font-black uppercase tracking-tighter mb-2">{match.teamAName}</h2>
                {match.currentInnings === 1 && (match.isSuperOver ? match.superOverInnings1 : match.innings1) && (
                  <p className="text-red-400 text-4xl font-black italic">
                    {match.isSuperOver ? match.superOverInnings1?.runs : match.innings1?.runs}/
                    {match.isSuperOver ? match.superOverInnings1?.wickets : match.innings1?.wickets}
                  </p>
                )}
              </div>
              <div className="w-px h-32 bg-white/20"></div>
              <div className="text-left flex-1">
                <h2 className="text-white text-6xl font-black uppercase tracking-tighter mb-2">{match.teamBName}</h2>
                {match.currentInnings === 2 && (match.isSuperOver ? match.superOverInnings2 : match.innings2) && (
                  <p className="text-red-400 text-4xl font-black italic">
                    {match.isSuperOver ? match.superOverInnings2?.runs : match.innings2?.runs}/
                    {match.isSuperOver ? match.superOverInnings2?.wickets : match.innings2?.wickets}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-12 rounded-[3rem] border border-white/10 shadow-2xl">
              {currentInnings?.ballHistory.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-red-400 text-2xl font-black uppercase tracking-[0.3em]">Latest Action</p>
                  <h3 className="text-white text-7xl font-black italic transform -skew-x-6 leading-tight">
                    {getHypeCommentary(currentInnings.ballHistory[currentInnings.ballHistory.length - 1])}
                  </h3>
                </div>
              ) : (
                <h3 className="text-white text-5xl font-black italic transform -skew-x-6">Match is heating up! 🔥</h3>
              )}
            </div>
          </div>

          <div className="relative z-10 flex justify-between items-end">
            <div className="space-y-2">
              <p className="text-white/40 text-sm font-black uppercase tracking-widest">Powered by</p>
              <p className="text-white text-xl font-black uppercase tracking-tighter italic">ApnaCricket.co.in</p>
            </div>
            <div className="flex gap-4">
              <div className="px-6 py-3 bg-brand-red rounded-xl">
                <p className="text-white font-black uppercase tracking-widest text-sm">#GullyCricket</p>
              </div>
              <div className="px-6 py-3 bg-purple-600 rounded-xl">
                <p className="text-white font-black uppercase tracking-widest text-sm">#CricketHype</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Sidebar Trigger (Floating Button) */}
      {match?.tournamentId && (
        <>
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSidebarOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white p-3 rounded-l-2xl shadow-2xl flex flex-col items-center gap-2 border-l-4 border-brand-red group"
          >
            <Trophy className="w-5 h-5 text-brand-red group-hover:animate-bounce" />
            <span className="[writing-mode:vertical-lr] text-[8px] font-black uppercase tracking-widest rotate-180">Tournament</span>
          </motion.button>

          <TournamentSidebar 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            tournamentId={match.tournamentId}
            currentMatchId={match.id}
          />
        </>
      )}

      <LiveChat matchId={match.id} userName="Scorer" />
    </div>
  );
}
