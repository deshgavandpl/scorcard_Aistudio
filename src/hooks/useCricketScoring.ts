import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Match, BatterStats, BallEvent } from '../types/cricket';
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
      ...event,
      over,
      ball: event.isExtra && (event.extraType === 'Wd' || event.extraType === 'Nb') ? newInnings.balls : ball
    };

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
    const striker = { ...newInnings.battingStats[event.strikerId] };
    if (striker) {
      striker.runs += (event.isExtra && (event.extraType === 'By' || event.extraType === 'Lb')) ? 0 : event.runs;
      if (!event.isExtra || event.extraType !== 'Wd') {
        striker.balls += 1;
      }
      if (event.runs === 4 && !event.isExtra) striker.fours += 1;
      if (event.runs === 6 && !event.isExtra) striker.sixes += 1;
      if (event.isWicket) {
        striker.isOut = true;
        striker.isStriker = false;
      }
      newInnings.battingStats[event.strikerId] = striker;
    }

    // Update bowler stats
    const bowler = { ...newInnings.bowlingStats[event.bowlerId] };
    if (bowler) {
      bowler.runs += (event.extraType === 'By' || event.extraType === 'Lb') ? 0 : runsToAdd;
      if (!event.isExtra || (event.extraType !== 'Wd' && event.extraType !== 'Nb')) {
        bowler.balls += 1;
        if (bowler.balls === 6) {
          bowler.overs += 1;
          bowler.balls = 0;
        }
      }
      if (event.isWicket) {
        bowler.wickets += 1;
      }
      newInnings.bowlingStats[event.bowlerId] = bowler;
    }

    // Update innings balls/overs
    if (!event.isExtra || (event.extraType !== 'Wd' && event.extraType !== 'Nb')) {
      newInnings.balls += 1;
      if (newInnings.balls === 6) {
        newInnings.overs += 1;
        newInnings.balls = 0;
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

    // Check for innings end
    if (newInnings.wickets === 10 || newInnings.overs === match.oversLimit) {
      if (match.currentInnings === 1) {
        updatedMatch.currentInnings = 2;
        // Initialize 2nd innings
        updatedMatch.innings2 = {
          battingTeamId: match.teamBId === match.innings1?.battingTeamId ? match.teamAId : match.teamBId,
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
      } else {
        updatedMatch.status = 'Finished';
        // Determine winner
        if (updatedMatch.innings1 && updatedMatch.innings2) {
          if (updatedMatch.innings2.runs > updatedMatch.innings1.runs) {
            updatedMatch.winnerId = updatedMatch.innings2.battingTeamId;
          } else if (updatedMatch.innings1.runs > updatedMatch.innings2.runs) {
            updatedMatch.winnerId = updatedMatch.innings1.battingTeamId;
          } else {
            updatedMatch.winnerId = 'Draw';
          }
        }
      }
    } else if (match.currentInnings === 2 && updatedMatch.innings1 && newInnings.runs > updatedMatch.innings1.runs) {
        // Target achieved
        updatedMatch.status = 'Finished';
        updatedMatch.winnerId = newInnings.battingTeamId;
    }

    await saveMatch(updatedMatch);
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
        // Reverse auto strike change at end of over
        (Object.values(newInnings.battingStats) as BatterStats[]).forEach(b => {
          if (!b.isOut) b.isStriker = !b.isStriker;
        });
      } else {
        newInnings.balls -= 1;
      }
    }

    // Reverse strike change on odd runs
    if (lastBall.runs % 2 !== 0 && !lastBall.isExtra) {
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

  return { match, addBall, undoLastBall, setMatch, loading };
}
