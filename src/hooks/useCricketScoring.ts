import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Match, BatterStats, BallEvent, Tournament } from '../types/cricket';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

export function useCricketScoring(matchId: string | undefined) {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'matches', matchId), (docSnap) => {
      if (docSnap.exists()) {
        setMatch(docSnap.data() as Match);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `matches/${matchId}`);
      setLoading(false);
    });

    return () => unsub();
  }, [matchId]);

  const saveMatch = async (updatedMatch: Match) => {
    if (!matchId) return;
    try {
      await setDoc(doc(db, 'matches', matchId), updatedMatch);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${matchId}`);
    }
  };

  const addBall = async (event: Omit<BallEvent, 'over' | 'ball'>) => {
    if (!match) return;
    const currentInnings = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!currentInnings) return;

    const newInnings = { ...currentInnings };
    // Deep copy objects within innings to avoid mutation issues
    newInnings.battingStats = { ...newInnings.battingStats };
    newInnings.bowlingStats = { ...newInnings.bowlingStats };
    newInnings.extras = { ...newInnings.extras };
    newInnings.ballHistory = [...newInnings.ballHistory];
    newInnings.fallOfWickets = [...newInnings.fallOfWickets];

    const over = newInnings.overs;
    const ball = newInnings.balls + 1;

    const ballEvent: BallEvent = {
      runs: event.runs,
      isExtra: event.isExtra,
      isWicket: event.isWicket,
      strikerId: event.strikerId,
      bowlerId: event.bowlerId,
      over,
      ball: event.isExtra && (event.extraType === 'Wd' || event.extraType === 'Nb') ? newInnings.balls : ball
    };

    if (event.isExtra && event.extraType) ballEvent.extraType = event.extraType;
    if (event.isWicket && event.wicketType) ballEvent.wicketType = event.wicketType;
    if (event.fielderName) ballEvent.fielderName = event.fielderName;

    // Update runs and extras
    let runsToAdd = event.runs;
    if (event.isExtra) {
      if (event.extraType === 'Wd') {
        newInnings.extras.wide += 1;
        runsToAdd += 1;
      } else if (event.extraType === 'Nb') {
        newInnings.extras.noBall += 1;
        runsToAdd += 1;
      } else if (event.extraType === 'By') {
        newInnings.extras.bye += event.runs;
        runsToAdd = 0; // Batter doesn't get runs
      } else if (event.extraType === 'Lb') {
        newInnings.extras.legBye += event.runs;
        runsToAdd = 0; // Batter doesn't get runs
      }
    }
    newInnings.runs += runsToAdd;

    // Update batter stats
    const striker = newInnings.battingStats[event.strikerId];
    if (striker) {
      const updatedStriker = { ...striker };
      updatedStriker.runs += (event.isExtra && (event.extraType === 'By' || event.extraType === 'Lb')) ? 0 : event.runs;
      if (!event.isExtra || event.extraType !== 'Wd') {
        updatedStriker.balls += 1;
      }
      if (event.runs === 4 && !event.isExtra) updatedStriker.fours += 1;
      if (event.runs === 6 && !event.isExtra) updatedStriker.sixes += 1;
      if (event.isWicket) {
        updatedStriker.isOut = true;
        updatedStriker.isStriker = false;
        updatedStriker.howOut = event.wicketType || 'Out';
        if (event.fielderName) {
          updatedStriker.howOut += ` (${event.fielderName})`;
        }
      }
      newInnings.battingStats[event.strikerId] = updatedStriker;
    }

    // Update bowler stats
    const bowler = newInnings.bowlingStats[event.bowlerId];
    if (bowler) {
      const updatedBowler = { ...bowler };
      updatedBowler.runs += (event.extraType === 'By' || event.extraType === 'Lb') ? 0 : runsToAdd;
      if (!event.isExtra || (event.extraType !== 'Wd' && event.extraType !== 'Nb')) {
        updatedBowler.balls += 1;
        if (updatedBowler.balls === 6) {
          updatedBowler.overs += 1;
          updatedBowler.balls = 0;
        }
      }
      if (event.isWicket) {
        updatedBowler.wickets += 1;
      }
      newInnings.bowlingStats[event.bowlerId] = updatedBowler;
    }

    // Update innings balls/overs
    if (!event.isExtra || (event.extraType !== 'Wd' && event.extraType !== 'Nb')) {
      newInnings.balls += 1;
      if (newInnings.balls === 6) {
        newInnings.overs += 1;
        newInnings.balls = 0;
        delete newInnings.currentBowlerId; // Clear bowler at end of over
        // Auto strike change at end of over
        (Object.values(newInnings.battingStats) as BatterStats[]).forEach(b => {
          if (!b.isOut) b.isStriker = !b.isStriker;
        });
      }
    }

    // Handle strike change on odd runs (including runs on extras)
    if (event.runs % 2 !== 0) {
       (Object.values(newInnings.battingStats) as BatterStats[]).forEach(b => {
          if (!b.isOut) b.isStriker = !b.isStriker;
        });
    }

    newInnings.ballHistory.push(ballEvent);
    if (event.isWicket) {
      newInnings.wickets += 1;
      newInnings.fallOfWickets.push({ runs: newInnings.runs, wickets: newInnings.wickets, over: `${newInnings.overs}.${newInnings.balls}` });
    }

    const updatedMatch = { ...match };
    if (match.currentInnings === 1) updatedMatch.innings1 = newInnings;
    else updatedMatch.innings2 = newInnings;

    // Check for match end (Innings 2 only)
    if (match.currentInnings === 2 && updatedMatch.innings1 && updatedMatch.innings2) {
      const inn1Runs = updatedMatch.innings1.runs;
      const inn2Runs = updatedMatch.innings2.runs;
      const inn2Wickets = updatedMatch.innings2.wickets;
      const battingTeamName = updatedMatch.innings2.battingTeamId === updatedMatch.teamAId ? updatedMatch.teamAName : updatedMatch.teamBName;
      const bowlingTeamName = updatedMatch.innings2.bowlingTeamId === updatedMatch.teamAId ? updatedMatch.teamAName : updatedMatch.teamBName;

      if (inn2Runs > inn1Runs) {
        updatedMatch.winnerId = updatedMatch.innings2.battingTeamId;
        updatedMatch.resultMessage = `${battingTeamName} won by ${10 - inn2Wickets} wickets`;
      } else if (inn2Wickets === 10 || newInnings.overs === match.oversLimit) {
        if (inn1Runs > inn2Runs) {
          updatedMatch.winnerId = updatedMatch.innings1.battingTeamId;
          updatedMatch.resultMessage = `${bowlingTeamName} won by ${inn1Runs - inn2Runs} runs`;
        } else {
          updatedMatch.winnerId = 'Draw';
          updatedMatch.resultMessage = 'Match Draw';
        }
      }
    }

    await saveMatch(updatedMatch);
  };

  const startSecondInnings = async () => {
    if (!match || match.currentInnings !== 1) return;
    
    const updatedMatch = { ...match };
    updatedMatch.currentInnings = 2;
    updatedMatch.innings2 = {
      battingTeamId: match.teamBId === (match.innings1?.battingTeamId || '') ? match.teamAId : match.teamBId,
      bowlingTeamId: match.innings1?.battingTeamId || '',
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 },
      battingStats: {},
      bowlingStats: {},
      fallOfWickets: [],
      ballHistory: []
    };

    await saveMatch(updatedMatch);
  };

  const finishMatch = async (winnerId: string, resultMessage: string, manOfTheMatch?: string) => {
    if (!match || !matchId) return;
    const updatedMatch: Match = { 
      ...match, 
      status: 'Finished' as const, 
      winnerId, 
      resultMessage,
      manOfTheMatch
    };
    
    try {
      await saveMatch(updatedMatch);
      
      // If part of a tournament, update the tournament document
      if (match.tournamentId) {
        const tournamentRef = doc(db, 'tournaments', match.tournamentId);
        const tournamentSnap = await getDoc(tournamentRef);
        if (tournamentSnap.exists()) {
          const tournamentData = tournamentSnap.data() as Tournament;
          
          // Update the match in the tournament's matches array
          const updatedMatches = tournamentData.matches.map(m => m.id === matchId ? updatedMatch : m);
          
          // Update team points
          const updatedTeams = tournamentData.teams.map(team => {
            if (team.id === winnerId) {
              return { ...team, points: (team.points || 0) + 2 };
            }
            if (winnerId === 'Draw' && (team.id === match.teamAId || team.id === match.teamBId)) {
              return { ...team, points: (team.points || 0) + 1 };
            }
            return team;
          });

          await setDoc(tournamentRef, {
            ...tournamentData,
            matches: updatedMatches,
            teams: updatedTeams
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${matchId}`);
    }
  };

  const undoLastBall = async () => {
    if (!match) return;
    const currentInnings = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!currentInnings || currentInnings.ballHistory.length === 0) return;

    const newInnings = { ...currentInnings };
    newInnings.battingStats = { ...newInnings.battingStats };
    newInnings.bowlingStats = { ...newInnings.bowlingStats };
    newInnings.extras = { ...newInnings.extras };
    newInnings.ballHistory = [...newInnings.ballHistory];
    newInnings.fallOfWickets = [...newInnings.fallOfWickets];

    const lastBall = newInnings.ballHistory.pop()!;

    // Reverse runs and extras
    let runsToRemove = lastBall.runs;
    if (lastBall.isExtra) {
      if (lastBall.extraType === 'Wd') {
        newInnings.extras.wide -= 1;
        runsToRemove += 1;
      } else if (lastBall.extraType === 'Nb') {
        newInnings.extras.noBall -= 1;
        runsToRemove += 1;
      } else if (lastBall.extraType === 'By') {
        newInnings.extras.bye -= lastBall.runs;
        runsToRemove = 0;
      } else if (lastBall.extraType === 'Lb') {
        newInnings.extras.legBye -= lastBall.runs;
        runsToRemove = 0;
      }
    }
    newInnings.runs -= runsToRemove;

    // Reverse batter stats
    const striker = { ...newInnings.battingStats[lastBall.strikerId] };
    if (striker) {
      striker.runs -= (lastBall.isExtra && (lastBall.extraType === 'By' || lastBall.extraType === 'Lb')) ? 0 : lastBall.runs;
      if (!lastBall.isExtra || lastBall.extraType !== 'Wd') {
        striker.balls -= 1;
      }
      if (lastBall.runs === 4 && !lastBall.isExtra) striker.fours -= 1;
      if (lastBall.runs === 6 && !lastBall.isExtra) striker.sixes -= 1;
      if (lastBall.isWicket) {
        striker.isOut = false;
        striker.isStriker = true;
      }
      newInnings.battingStats[lastBall.strikerId] = striker;
    }

    // Reverse bowler stats
    const bowler = { ...newInnings.bowlingStats[lastBall.bowlerId] };
    if (bowler) {
      bowler.runs -= (lastBall.extraType === 'By' || lastBall.extraType === 'Lb') ? 0 : runsToRemove;
      if (!lastBall.isExtra || (lastBall.extraType !== 'Wd' && lastBall.extraType !== 'Nb')) {
        if (bowler.balls === 0) {
          bowler.overs -= 1;
          bowler.balls = 5;
        } else {
          bowler.balls -= 1;
        }
      }
      if (lastBall.isWicket) {
        bowler.wickets -= 1;
      }
      newInnings.bowlingStats[lastBall.bowlerId] = bowler;
    }

    // Reverse innings balls/overs
    if (!lastBall.isExtra || (lastBall.extraType !== 'Wd' && lastBall.extraType !== 'Nb')) {
      if (newInnings.balls === 0) {
        newInnings.overs -= 1;
        newInnings.balls = 5;
        newInnings.currentBowlerId = lastBall.bowlerId; // Restore bowler on undo over end
        // Reverse auto strike change at end of over
        (Object.values(newInnings.battingStats) as BatterStats[]).forEach(b => {
          if (!b.isOut) b.isStriker = !b.isStriker;
        });
      } else {
        newInnings.balls -= 1;
      }
    }

    // Reverse strike change on odd runs (including runs on extras)
    if (lastBall.runs % 2 !== 0) {
       (Object.values(newInnings.battingStats) as BatterStats[]).forEach(b => {
          if (!b.isOut) b.isStriker = !b.isStriker;
        });
    }

    if (lastBall.isWicket) {
      newInnings.wickets -= 1;
      newInnings.fallOfWickets.pop();
    }

    const updatedMatch = { ...match };
    if (match.currentInnings === 1) updatedMatch.innings1 = newInnings;
    else updatedMatch.innings2 = newInnings;

    // Reset status if it was finished
    if (updatedMatch.status === 'Finished') {
      updatedMatch.status = 'Live';
      delete updatedMatch.winnerId;
    }

    await saveMatch(updatedMatch);
  };

  const swapStrike = async () => {
    if (!match) return;
    const currentInnings = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!currentInnings) return;

    const newInnings = { ...currentInnings };
    newInnings.battingStats = { ...newInnings.battingStats };

    (Object.values(newInnings.battingStats) as BatterStats[]).forEach(b => {
      if (!b.isOut) b.isStriker = !b.isStriker;
    });

    const updatedMatch = { ...match };
    if (match.currentInnings === 1) updatedMatch.innings1 = newInnings;
    else updatedMatch.innings2 = newInnings;

    await saveMatch(updatedMatch);
  };

  return { match, addBall, undoLastBall, swapStrike, setMatch, finishMatch, startSecondInnings, loading };
}
