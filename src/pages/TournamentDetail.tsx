import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Trophy, Calendar, BarChart2, ChevronLeft, ChevronRight, Play, CheckCircle, Trash2, Plus, X, Edit2, Users, UserPlus, User, Target, Zap, Shield, Download, Settings, AlertCircle, RotateCcw } from 'lucide-react';
import { Tournament, Match, Team, Player, BatterStats, BowlerStats } from '../types/cricket';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { generateFixturesPDF } from '../lib/pdfGenerator';

import { doc, onSnapshot, collection, query, where, deleteDoc, setDoc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useAdmin } from '../context/AdminContext';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';
import { usePlayerProfile } from '../context/PlayerProfileContext';

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openPlayerProfile } = usePlayerProfile();
  const { isAdminMode } = useAdmin();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'fixtures' | 'points' | 'teams'>('fixtures');
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditTournament, setShowEditTournament] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'Draft' | 'Live' | 'Finished'>('Draft');
  const [editWinnerId, setEditWinnerId] = useState('');
  const [editResultMessage, setEditResultMessage] = useState('');
  
  // Match Edit State
  const [showEditMatch, setShowEditMatch] = useState<Match | null>(null);
  const [editMatchName, setEditMatchName] = useState('');
  const [editMatchTeamA, setEditMatchTeamA] = useState('');
  const [editMatchTeamB, setEditMatchTeamB] = useState('');
  const [editMatchOrder, setEditMatchOrder] = useState(0);
  const [editMatchOvers, setEditMatchOvers] = useState(6);
  const [editMatchUmpire, setEditMatchUmpire] = useState('');
  const [editMatchStatus, setEditMatchStatus] = useState<'Upcoming' | 'Live' | 'Finished'>('Upcoming');
  const [editInn1Runs, setEditInn1Runs] = useState(0);
  const [editInn1Wickets, setEditInn1Wickets] = useState(0);
  const [editInn1Overs, setEditInn1Overs] = useState(0);
  const [editInn1Balls, setEditInn1Balls] = useState(0);
  const [editInn2Runs, setEditInn2Runs] = useState(0);
  const [editInn2Wickets, setEditInn2Wickets] = useState(0);
  const [editInn2Overs, setEditInn2Overs] = useState(0);
  const [editInn2Balls, setEditInn2Balls] = useState(0);
  const [editMatchWinnerId, setEditMatchWinnerId] = useState('');
  
  // Player Management State
  const [teamPlayerInputs, setTeamPlayerInputs] = useState<Record<string, { name: string, role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper' }>>({});
  
  const handlePlayerInputChange = (teamId: string, field: 'name' | 'role', value: string) => {
    setTeamPlayerInputs(prev => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] || { name: '', role: 'Batsman' }),
        [field]: value
      }
    }));
  };
  
  // Add Match Form State
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [matchName, setMatchName] = useState('');
  const [overs, setOvers] = useState(6);
  const [umpireName, setUmpireName] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');

  // Edit Match State
  const [editMatchDate, setEditMatchDate] = useState('');
  const [editMatchTime, setEditMatchTime] = useState('');
  const [showEditTeamStandings, setShowEditTeamStandings] = useState<Team | null>(null);
  const [manualPoints, setManualPoints] = useState(0);
  const [manualNRR, setManualNRR] = useState(0);
  const [manualPlayed, setManualPlayed] = useState(0);
  const [manualWon, setManualWon] = useState(0);
  const [manualLost, setManualLost] = useState(0);
  const [manualTied, setManualTied] = useState(0);
  const [manualRunsScored, setManualRunsScored] = useState(0);
  const [manualOversFaced, setManualOversFaced] = useState(0);
  const [manualRunsConceded, setManualRunsConceded] = useState(0);
  const [manualOversBowled, setManualOversBowled] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const canManage = isAdminMode;

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'tournaments', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Tournament;
        setTournament({ id: docSnap.id, ...data } as Tournament);
        setEditName(data.name);
        setEditStatus(data.status);
        setEditWinnerId(data.winnerId || '');
        setEditResultMessage(data.resultMessage || '');
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
      // Sort by order first, then by createdAt
      const sortedMatches = matchesData.sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.createdAt - b.createdAt;
      });
      setMatches(sortedMatches);
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
    if (!canManage) return;
    if (!window.confirm('Are you sure you want to delete this match?')) return;
    try {
      await deleteDoc(doc(db, 'matches', matchId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${matchId}`);
    }
  };

  const addPlayerToTeam = async (teamId: string) => {
    const input = teamPlayerInputs[teamId];
    if (!canManage || !id || !tournament || !input?.name.trim()) return;
    
    const newPlayer = { 
      id: Math.random().toString(36).substr(2, 9), 
      name: input.name, 
      role: input.role 
    };

    const updatedTeams = tournament.teams.map(team => {
      if (team.id === teamId) {
        return {
          ...team,
          players: [...(team.players || []), newPlayer]
        };
      }
      return team;
    });

    try {
      // 1. Update Tournament
      await setDoc(doc(db, 'tournaments', id), { ...tournament, teams: updatedTeams });
      
      // 2. Update Global Team if it exists
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const teamData = teamSnap.data() as Team;
        await setDoc(teamRef, {
          ...teamData,
          players: [...(teamData.players || []), newPlayer]
        });
      }

      setTeamPlayerInputs(prev => ({
        ...prev,
        [teamId]: { name: '', role: 'Batsman' }
      }));
      toast.success('Player added successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tournaments/${id}`);
    }
  };

  const removePlayerFromTeam = async (teamId: string, playerId: string) => {
    if (!canManage || !id || !tournament) return;
    
    const updatedTeams = tournament.teams.map(team => {
      if (team.id === teamId) {
        return {
          ...team,
          players: (team.players || []).filter(p => p.id !== playerId)
        };
      }
      return team;
    });

    try {
      // 1. Update Tournament
      await setDoc(doc(db, 'tournaments', id), { ...tournament, teams: updatedTeams });
      
      // 2. Update Global Team if it exists
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        const teamData = teamSnap.data() as Team;
        await setDoc(teamRef, {
          ...teamData,
          players: (teamData.players || []).filter(p => p.id !== playerId)
        });
      }
      
      toast.success('Player removed.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tournaments/${id}`);
    }
  };

  const addCustomMatch = async () => {
    if (!canManage || !id || !teamAId || !teamBId) return;
    
    const teamA = tournament?.teams.find(t => t.id === teamAId);
    const teamB = tournament?.teams.find(t => t.id === teamBId);
    
    if (!teamA || !teamB) return;

    const matchId = Math.random().toString(36).substr(2, 9);
    const finalMatchName = matchName.trim() || `Match ${matches.length + 1}`;
    
    const newMatch: Match = {
      id: matchId,
      name: finalMatchName,
      tournamentId: id,
      teamAId,
      teamBId,
      teamAName: teamA.name,
      teamBName: teamB.name,
      umpireName: umpireName,
      tossWinnerId: '',
      tossDecision: 'Bat',
      oversLimit: overs,
      status: 'Upcoming',
      isKnockout: true,
      currentInnings: 1,
      order: matches.length + 1,
      matchDate,
      matchTime,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'matches', matchId), newMatch);
      setShowAddMatch(false);
      setTeamAId('');
      setTeamBId('');
      setMatchName('');
      setUmpireName('');
      setMatchDate('');
      setMatchTime('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${matchId}`);
    }
  };

  const updateTournament = async () => {
    if (!canManage || !id || !tournament || !editName.trim()) return;
    
    const updatedTournament = {
      ...tournament,
      name: editName,
      status: editStatus,
      winnerId: editWinnerId,
      resultMessage: editResultMessage
    };

    try {
      await setDoc(doc(db, 'tournaments', id), updatedTournament);
      setShowEditTournament(false);
      toast.success('Tournament updated successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tournaments/${id}`);
    }
  };

  const handleEditMatch = (match: Match) => {
    setShowEditMatch(match);
    setEditMatchName(match.name || '');
    setEditMatchTeamA(match.teamAId);
    setEditMatchTeamB(match.teamBId);
    setEditMatchOrder(match.order || 0);
    setEditMatchOvers(match.oversLimit);
    setEditMatchUmpire(match.umpireName || '');
    setEditMatchDate(match.matchDate || '');
    setEditMatchTime(match.matchTime || '');
    setEditMatchStatus(match.status);
    setEditInn1Runs(match.innings1?.runs || 0);
    setEditInn1Wickets(match.innings1?.wickets || 0);
    setEditInn1Overs(match.innings1?.overs || 0);
    setEditInn1Balls(match.innings1?.balls || 0);
    setEditInn2Runs(match.innings2?.runs || 0);
    setEditInn2Wickets(match.innings2?.wickets || 0);
    setEditInn2Overs(match.innings2?.overs || 0);
    setEditInn2Balls(match.innings2?.balls || 0);
    setEditMatchWinnerId(match.winnerId || '');
  };

  const updateMatch = async () => {
    if (!canManage || !showEditMatch) return;
    
    const teamA = tournament?.teams.find(t => t.id === editMatchTeamA);
    const teamB = tournament?.teams.find(t => t.id === editMatchTeamB);
    
    if (!teamA || !teamB) return;

    const updatedMatch: Match = {
      ...showEditMatch,
      name: editMatchName,
      teamAId: editMatchTeamA,
      teamBId: editMatchTeamB,
      teamAName: teamA.name,
      teamBName: teamB.name,
      order: editMatchOrder,
      oversLimit: editMatchOvers,
      umpireName: editMatchUmpire,
      matchDate: editMatchDate,
      matchTime: editMatchTime,
      status: editMatchStatus,
      winnerId: editMatchWinnerId || undefined,
      innings1: {
        ...(showEditMatch.innings1 || {
          extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
          battingStats: {},
          bowlingStats: {},
          fallOfWickets: [],
          ballHistory: []
        }),
        battingTeamId: editMatchTeamA,
        bowlingTeamId: editMatchTeamB,
        runs: editInn1Runs,
        wickets: editInn1Wickets,
        overs: editInn1Overs,
        balls: editInn1Balls
      },
      innings2: {
        ...(showEditMatch.innings2 || {
          extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
          battingStats: {},
          bowlingStats: {},
          fallOfWickets: [],
          ballHistory: []
        }),
        battingTeamId: editMatchTeamB,
        bowlingTeamId: editMatchTeamA,
        runs: editInn2Runs,
        wickets: editInn2Wickets,
        overs: editInn2Overs,
        balls: editInn2Balls
      }
    };

    try {
      await setDoc(doc(db, 'matches', showEditMatch.id), updatedMatch);
      
      // Also update the match in the tournament's matches array
      if (id && tournament) {
        const stripInnings = (inn?: any) => {
          if (!inn) return undefined;
          return { ...inn, ballHistory: [] };
        };
        const strippedMatch = {
          ...updatedMatch,
          innings1: stripInnings(updatedMatch.innings1),
          innings2: stripInnings(updatedMatch.innings2)
        };
        const updatedMatches = (tournament.matches || []).map(m => 
          m.id === showEditMatch.id ? strippedMatch : m
        );
        await updateDoc(doc(db, 'tournaments', id), { matches: updatedMatches });
      }

      setShowEditMatch(null);
      toast.success('Match updated successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${showEditMatch.id}`);
    }
  };

  const handleEditTeamStandings = (team: Team) => {
    setShowEditTeamStandings(team);
    setManualPoints(team.manualPoints || 0);
    setManualNRR(team.manualNRR || 0);
    setManualPlayed(team.manualPlayed || 0);
    setManualWon(team.manualWon || 0);
    setManualLost(team.manualLost || 0);
    setManualTied(team.manualTied || 0);
    setManualRunsScored(team.manualRunsScored || 0);
    setManualOversFaced(team.manualOversFaced || 0);
    setManualRunsConceded(team.manualRunsConceded || 0);
    setManualOversBowled(team.manualOversBowled || 0);
  };

  const updateTeamStandings = async () => {
    if (!canManage || !id || !tournament || !showEditTeamStandings) return;

    const updatedTeams = tournament.teams.map(t => {
      if (t.id === showEditTeamStandings.id) {
        return {
          ...t,
          manualPoints,
          manualNRR,
          manualPlayed,
          manualWon,
          manualLost,
          manualTied,
          manualRunsScored,
          manualOversFaced,
          manualRunsConceded,
          manualOversBowled
        };
      }
      return t;
    });

    try {
      await updateDoc(doc(db, 'tournaments', id), { teams: updatedTeams });
      setShowEditTeamStandings(null);
      toast.success('Team standings updated.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tournaments/${id}`);
    }
  };

  const getPlayerTournamentStats = (playerName: string) => {
    const stats = {
      batting: {
        matches: 0,
        innings: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        notOuts: 0,
        highestScore: 0,
      },
      bowling: {
        innings: 0,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
        bestBowling: { wickets: 0, runs: 0 }
      }
    };

    matches.filter(m => m.status === 'Finished').forEach(match => {
      let playedInMatch = false;

      // Batting Stats
      [match.innings1, match.innings2].forEach(innings => {
        if (!innings) return;
        
        // Find by name since IDs might be inconsistent if manually entered
        const batter = (Object.values(innings.battingStats) as BatterStats[]).find(s => s.playerName === playerName);
        if (batter) {
          playedInMatch = true;
          stats.batting.innings += 1;
          stats.batting.runs += batter.runs;
          stats.batting.balls += batter.balls;
          stats.batting.fours += batter.fours;
          stats.batting.sixes += batter.sixes;
          if (!batter.isOut) stats.batting.notOuts += 1;
          if (batter.runs > stats.batting.highestScore) stats.batting.highestScore = batter.runs;
        }

        const bowler = (Object.values(innings.bowlingStats) as BowlerStats[]).find(s => s.playerName === playerName);
        if (bowler) {
          playedInMatch = true;
          stats.bowling.innings += 1;
          stats.bowling.overs += bowler.overs;
          stats.bowling.balls += bowler.balls;
          stats.bowling.runs += bowler.runs;
          stats.bowling.wickets += bowler.wickets;
          stats.bowling.maidens += bowler.maiden;

          if (bowler.wickets > stats.bowling.bestBowling.wickets || 
             (bowler.wickets === stats.bowling.bestBowling.wickets && bowler.runs < stats.bowling.bestBowling.runs)) {
            stats.bowling.bestBowling = { wickets: bowler.wickets, runs: bowler.runs };
          }
        }
      });

      if (playedInMatch) stats.batting.matches += 1;
    });

    return stats;
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    if (!id || !tournament) return;
    setIsRefreshing(true);
    try {
      // 1. Fetch latest tournament data
      const tournamentDoc = await getDoc(doc(db, 'tournaments', id));
      if (!tournamentDoc.exists()) return;
      const tournamentData = tournamentDoc.data() as Tournament;

      // 2. Fetch all matches for this tournament to get latest scores
      const q = query(collection(db, 'matches'), where('tournamentId', '==', id));
      const snapshot = await getDocs(q);
      const latestMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));

      // 3. Strip heavy data for tournament doc
      const stripInnings = (inn?: any) => {
        if (!inn) return undefined;
        return { ...inn, ballHistory: [] };
      };

      const updatedMatches = latestMatches.map(m => ({
        ...m,
        innings1: stripInnings(m.innings1),
        innings2: stripInnings(m.innings2),
        superOverInnings1: stripInnings(m.superOverInnings1),
        superOverInnings2: stripInnings(m.superOverInnings2)
      })).sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });

      // 4. Update tournament document with latest match data
      await updateDoc(doc(db, 'tournaments', id), { matches: updatedMatches });
      
      setTournament({ ...tournamentData, id: tournamentDoc.id, matches: updatedMatches });
      setMatches(latestMatches.sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.createdAt || 0) - (b.createdAt || 0);
      }));
      setEditName(tournamentData.name);
      setEditStatus(tournamentData.status);
      setEditWinnerId(tournamentData.winnerId || '');
      setEditResultMessage(tournamentData.resultMessage || '');
      
      toast.success('Tournament data synced with latest match scores.');
    } catch (error) {
      console.error("Error refreshing data:", error);
      handleFirestoreError(error, OperationType.GET, 'tournament/matches');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!tournament) return <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Tournament...</div>;

  const leagueMatches = matches.filter(m => {
    const isKnockout = m.isKnockout || 
                      m.name?.toLowerCase().includes('semi') || 
                      m.name?.toLowerCase().includes('final');
    return !isKnockout;
  });

  const allLeagueMatchesFinished = leagueMatches.length > 0 && leagueMatches.every(m => m.status === 'Finished');

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

  const pointsTable = tournament.teams.map(team => {
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

      // Standard cricket NRR rule: If a team is all out, they are deemed to have faced their full quota of overs
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
    
    const calculatedNRR = parseFloat(nrr.toFixed(3)) + (team.manualNRR || 0);
    const cappedNRR = Math.max(-5, Math.min(5, calculatedNRR));
    const finalNRR = cappedNRR.toFixed(3);

    return {
      id: team.id,
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
            <span className="px-3 py-1 rounded-full bg-brand-red text-white text-[10px] font-black uppercase tracking-[0.2em] inline-block">
              {tournament.status}
            </span>
            <div className="flex gap-2">
              {canManage && (
                <button 
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all shadow-lg"
                  title="Refresh Tournament Data"
                >
                  <RotateCcw className={cn("w-6 h-6", isRefreshing && "animate-spin")} />
                </button>
              )}
              {canManage && (
                <button 
                  onClick={() => setShowEditTournament(true)}
                  className="p-3 rounded-2xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg"
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
              activeTab === 'fixtures' ? "bg-brand-red text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Calendar className="w-4 h-4" /> Fixtures
          </button>
          <button 
            onClick={() => setActiveTab('points')}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap",
              activeTab === 'points' ? "bg-brand-red text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <BarChart2 className="w-4 h-4" /> Points
          </button>
          <button 
            onClick={() => setActiveTab('teams')}
            className={cn(
              "flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap",
              activeTab === 'teams' ? "bg-brand-red text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Users className="w-4 h-4" /> Teams
          </button>
        </div>

        {canManage && activeTab === 'fixtures' && (
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => generateFixturesPDF(tournament.name, matches)}
              className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-lg"
            >
              <Download className="w-4 h-4" /> Download Fixtures
            </button>
            <button 
              onClick={() => setShowAddMatch(true)}
              className="flex-1 md:flex-none px-6 py-3 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
            >
              <Plus className="w-4 h-4" /> Add Stage Match
            </button>
          </div>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Date</label>
                    <input 
                      type="date" 
                      value={matchDate}
                      onChange={(e) => setMatchDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Time</label>
                    <input 
                      type="time" 
                      value={matchTime}
                      onChange={(e) => setMatchTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    />
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

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Umpire Name</label>
                  <input 
                    type="text" 
                    value={umpireName}
                    onChange={(e) => setUmpireName(e.target.value)}
                    placeholder="e.g. Nitin Menon"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <button 
                onClick={addCustomMatch}
                className="w-full py-4 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg"
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
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

                {editStatus === 'Finished' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tournament Winner</label>
                      <select 
                        value={editWinnerId}
                        onChange={(e) => setEditWinnerId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                      >
                        <option value="">Select Winner</option>
                        {tournament.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Result Message</label>
                      <input 
                        type="text" 
                        value={editResultMessage}
                        onChange={(e) => setEditResultMessage(e.target.value)}
                        placeholder="e.g. Team A won by 20 runs"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={updateTournament}
                className="w-full py-4 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}

        {showEditTeamStandings && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Edit Standings</h2>
                <button onClick={() => setShowEditTeamStandings(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-sm font-black text-brand-red uppercase tracking-widest italic transform -skew-x-6">Team: {showEditTeamStandings.name}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Played</label>
                    <input type="number" value={manualPlayed} onChange={(e) => setManualPlayed(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Wins</label>
                    <input type="number" value={manualWon} onChange={(e) => setManualWon(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Losses</label>
                    <input type="number" value={manualLost} onChange={(e) => setManualLost(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Draws/Tied</label>
                    <input type="number" value={manualTied} onChange={(e) => setManualTied(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extra Points Adjustment</label>
                  <input 
                    type="number" 
                    value={manualPoints}
                    onChange={(e) => setManualPoints(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    placeholder="e.g. 2 or -2"
                  />
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Added to (Wins*2 + Draws)</p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">NRR Data (Manual Overrides)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Runs Scored</label>
                      <input type="number" value={manualRunsScored} onChange={(e) => setManualRunsScored(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overs Faced</label>
                      <input type="number" step="0.1" value={manualOversFaced} onChange={(e) => setManualOversFaced(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Runs Conceded</label>
                      <input type="number" value={manualRunsConceded} onChange={(e) => setManualRunsConceded(parseInt(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overs Bowled</label>
                      <input type="number" step="0.1" value={manualOversBowled} onChange={(e) => setManualOversBowled(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct NRR Adjustment</label>
                    <input 
                      type="number" 
                      step="0.001"
                      value={manualNRR}
                      onChange={(e) => setManualNRR(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                      placeholder="e.g. 0.500 or -0.500"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={updateTeamStandings}
                className="w-full py-4 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg"
              >
                Update Standings
              </button>
            </div>
          </motion.div>
        )}

        {showEditMatch && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Edit Match</h2>
                <button onClick={() => setShowEditMatch(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Name / Stage</label>
                  <input 
                    type="text" 
                    value={editMatchName}
                    onChange={(e) => setEditMatchName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team A</label>
                    <select 
                      value={editMatchTeamA}
                      onChange={(e) => setEditMatchTeamA(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    >
                      {tournament.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team B</label>
                    <select 
                      value={editMatchTeamB}
                      onChange={(e) => setEditMatchTeamB(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    >
                      {tournament.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Order</label>
                    <input 
                      type="number" 
                      value={editMatchOrder}
                      onChange={(e) => setEditMatchOrder(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overs</label>
                    <input 
                      type="number" 
                      value={editMatchOvers}
                      onChange={(e) => setEditMatchOvers(parseInt(e.target.value) || 6)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Date</label>
                    <input 
                      type="date" 
                      value={editMatchDate}
                      onChange={(e) => setEditMatchDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Time</label>
                    <input 
                      type="time" 
                      value={editMatchTime}
                      onChange={(e) => setEditMatchTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Umpire Name</label>
                  <input 
                    type="text" 
                    value={editMatchUmpire}
                    onChange={(e) => setEditMatchUmpire(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Status</label>
                    <select 
                      value={editMatchStatus}
                      onChange={(e) => setEditMatchStatus(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Live">Live</option>
                      <option value="Finished">Finished</option>
                    </select>
                  </div>

                  {editMatchStatus !== 'Upcoming' && (
                    <>
                      <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Innings 1 Score ({tournament.teams.find(t => t.id === editMatchTeamA)?.name})</p>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" value={editInn1Runs} onChange={e => setEditInn1Runs(parseInt(e.target.value) || 0)} placeholder="Runs" className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" />
                          <input type="number" value={editInn1Wickets} onChange={e => setEditInn1Wickets(parseInt(e.target.value) || 0)} placeholder="Wickets" className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" />
                          <input type="number" value={editInn1Overs} onChange={e => setEditInn1Overs(parseInt(e.target.value) || 0)} placeholder="Overs" className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" />
                          <input type="number" value={editInn1Balls} onChange={e => setEditInn1Balls(parseInt(e.target.value) || 0)} placeholder="Balls" className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" />
                        </div>
                      </div>

                      <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Innings 2 Score ({tournament.teams.find(t => t.id === editMatchTeamB)?.name})</p>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" value={editInn2Runs} onChange={e => setEditInn2Runs(parseInt(e.target.value) || 0)} placeholder="Runs" className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" />
                          <input type="number" value={editInn2Wickets} onChange={e => setEditInn2Wickets(parseInt(e.target.value) || 0)} placeholder="Wickets" className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" />
                          <input type="number" value={editInn2Overs} onChange={e => setEditInn2Overs(parseInt(e.target.value) || 0)} placeholder="Overs" className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" />
                          <input type="number" value={editInn2Balls} onChange={e => setEditInn2Balls(parseInt(e.target.value) || 0)} placeholder="Balls" className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Winner</label>
                        <select 
                          value={editMatchWinnerId}
                          onChange={(e) => setEditMatchWinnerId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold"
                        >
                          <option value="">No Winner / Draw</option>
                          <option value={editMatchTeamA}>{tournament.teams.find(t => t.id === editMatchTeamA)?.name}</option>
                          <option value={editMatchTeamB}>{tournament.teams.find(t => t.id === editMatchTeamB)?.name}</option>
                          <option value="Draw">Draw</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button 
                onClick={updateMatch}
                className="w-full py-4 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg"
              >
                Update Match
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'fixtures' ? (
        <div className="space-y-8">
          {/* Final Winner Banner - GenZ Style */}
          {tournament.status === 'Finished' && tournament.winnerId && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative p-8 rounded-[3rem] bg-slate-900 border-4 border-brand-red overflow-hidden shadow-[0_0_50px_-12px_rgba(239,68,68,0.5)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.15),transparent_70%)]"></div>
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-red/10 blur-[100px] rounded-full"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-red/10 blur-[100px] rounded-full"></div>
              
              <div className="relative z-10 text-center space-y-4">
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-red shadow-[0_0_30px_rgba(239,68,68,0.4)] mb-2"
                >
                  <Trophy className="w-10 h-10 text-white" />
                </motion.div>
                
                <div className="space-y-1">
                  <p className="text-brand-red font-black uppercase tracking-[0.4em] text-xs">Tournament Champions</p>
                  <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic transform -skew-x-6 drop-shadow-2xl">
                    {tournament.teams.find(t => t.id === tournament.winnerId)?.name}
                  </h2>
                </div>
                
                {tournament.resultMessage && (
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm max-w-md mx-auto">
                    {tournament.resultMessage}
                  </p>
                )}
                
                <div className="flex justify-center gap-2 pt-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-brand-red animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {Object.entries(
            matches.reduce((acc, match) => {
              const stage = match.name || 'League Stage';
              if (!acc[stage]) acc[stage] = [];
              acc[stage].push(match);
              return acc;
            }, {} as Record<string, Match[]>)
          ).map(([stage, stageMatches]) => (
            <div key={stage} className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-l-4 border-brand-red pl-3">{stage}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(stageMatches as Match[]).map((match, idx) => (
                  <div key={match.id} className="relative group">
                    <Link 
                      to={canManage ? `/admin/match/${match.id}` : `/match/${match.id}`}
                      className={cn(
                        "block p-6 rounded-[2rem] border transition-all relative",
                        match.status === 'Live' 
                          ? "bg-[#fff5f5] border-red-100 ring-1 ring-red-50" 
                          : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
                      )}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                              Match {match.order || idx + 1}
                            </span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                              {match.name || 'MATCH'}
                            </span>
                          </div>
                          {(match.matchDate || match.matchTime) && (
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {match.matchDate} {match.matchTime && `• ${match.matchTime}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            match.status === 'Live' ? "bg-red-50 text-red-600 animate-pulse" : 
                            match.status === 'Finished' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                          )}>
                            {match.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 text-center">
                          <p className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight mb-1">{match.teamAName}</p>
                          {match.status !== 'Upcoming' && (match.innings1 || match.innings2) && (
                            <p className="text-sm md:text-base font-black text-brand-red">
                              {match.innings2?.battingTeamId === match.teamAId ? `${match.innings2.runs}/${match.innings2.wickets}` : (match.innings1?.battingTeamId === match.teamAId ? `${match.innings1.runs}/${match.innings1.wickets}` : '0/0')}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-[10px] font-black text-slate-200 italic uppercase tracking-widest">VS</div>
                        
                        <div className="flex-1 text-center">
                          <p className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight mb-1">{match.teamBName}</p>
                          {match.status !== 'Upcoming' && (match.innings1 || match.innings2) && (
                            <p className="text-sm md:text-base font-black text-brand-red">
                              {match.innings2?.battingTeamId === match.teamBId ? `${match.innings2.runs}/${match.innings2.wickets}` : (match.innings1?.battingTeamId === match.teamBId ? `${match.innings1.runs}/${match.innings1.wickets}` : '0/0')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100/50 flex justify-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-brand-red transition-colors flex items-center gap-2">
                          {match.status === 'Live' ? 'View Live Score' : match.status === 'Finished' ? 'View Results' : 'View Match Details'}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </Link>

                    {canManage && (
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            handleEditMatch(match);
                          }}
                          className="p-2 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-100 text-slate-400 hover:text-brand-red shadow-sm transition-all"
                          title="Edit Match"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            deleteMatch(match.id);
                          }}
                          className="p-2 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-100 text-slate-400 hover:text-red-500 shadow-sm transition-all"
                          title="Delete Match"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'points' ? (
        <div className="space-y-6">
          {canManage && activeTab === 'points' && (
            <div className="flex justify-end mb-4">
              <button 
                onClick={refreshData}
                disabled={isRefreshing}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <RotateCcw className={cn("w-3 h-3", isRefreshing && "animate-spin")} /> 
                {isRefreshing ? 'Refreshing...' : 'Refresh & Recalculate'}
              </button>
            </div>
          )}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="sticky left-0 bg-slate-50/50 px-4 md:px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 z-10">Team</th>
                  <th className="px-2 md:px-4 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">P</th>
                  <th className="px-2 md:px-4 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">W</th>
                  <th className="px-2 md:px-4 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">L</th>
                  <th className="px-2 md:px-4 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">D</th>
                  <th className="px-2 md:px-4 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">Pts</th>
                  <th className="px-4 md:px-6 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">NRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pointsTable.map((team, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="sticky left-0 bg-white group-hover:bg-slate-50 transition-colors px-4 md:px-6 py-6 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] md:shadow-none">
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-[10px] font-black text-slate-300 w-4">{idx + 1}</span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 uppercase tracking-tight text-xs md:text-sm truncate max-w-[100px] md:max-w-none">{team.name}</span>
                            {idx < 4 && allLeagueMatchesFinished && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-widest">
                                Qualified
                              </span>
                            )}
                            {canManage && (
                              <button 
                                onClick={() => handleEditTeamStandings(tournament.teams.find(t => t.id === team.id)!)}
                                className="p-1 rounded bg-slate-100 text-slate-400 hover:text-brand-red opacity-0 group-hover:opacity-100 transition-all"
                                title="Edit Manual Standings"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-6 text-center font-bold text-slate-600 text-xs md:text-sm">{team.played}</td>
                    <td className="px-2 md:px-4 py-6 text-center font-bold text-emerald-600 text-xs md:text-sm">{team.wins}</td>
                    <td className="px-2 md:px-4 py-6 text-center font-bold text-red-500 text-xs md:text-sm">{team.losses}</td>
                    <td className="px-2 md:px-4 py-6 text-center font-bold text-slate-400 text-xs md:text-sm">{team.draws}</td>
                    <td className="px-2 md:px-4 py-6 text-center font-black text-brand-red text-xs md:text-sm">{team.points}</td>
                    <td className={cn(
                      "px-4 md:px-6 py-6 text-center font-black text-xs md:text-sm",
                      parseFloat(team.nrr) >= 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {parseFloat(team.nrr) > 0 ? '+' : ''}{team.nrr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
            <div className="w-1 h-1 rounded-full bg-slate-300 animate-pulse" />
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Scroll right for full stats & NRR</p>
          </div>
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
                      value={teamPlayerInputs[team.id]?.name || ''}
                      onChange={(e) => handlePlayerInputChange(team.id, 'name', e.target.value)}
                      placeholder="Add player name"
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                    />
                    <select 
                      value={teamPlayerInputs[team.id]?.role || 'Batsman'}
                      onChange={(e) => handlePlayerInputChange(team.id, 'role', e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-widest outline-none"
                    >
                      <option value="Batsman">Bat</option>
                      <option value="Bowler">Bowl</option>
                      <option value="All-Rounder">All</option>
                      <option value="Wicket-Keeper">WK</option>
                    </select>
                    <button 
                      onClick={() => addPlayerToTeam(team.id)}
                      className="p-2 rounded-xl bg-brand-red text-white hover:bg-red-700 transition-all shadow-md"
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
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:bg-slate-100/50 p-1 rounded-lg transition-colors flex-1"
                          onClick={() => openPlayerProfile(player.id, player.name)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 relative">
                            {player.isCaptain && (
                              <div className="absolute -top-1 -right-1 bg-brand-red text-white p-0.5 rounded-full shadow-sm">
                                <Shield className="w-2 h-2" />
                              </div>
                            )}
                            {player.role.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{player.name}</p>
                              {player.isCaptain && (
                                <span className="text-[8px] font-black text-brand-red uppercase tracking-widest bg-red-50 px-1 rounded">Capt</span>
                              )}
                              <BarChart2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
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
