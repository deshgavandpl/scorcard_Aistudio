import { useState, useEffect } from 'react';
import { Match, MatchInnings, BallEvent, BatterStats, BowlerStats } from '../types/cricket';

export function useCricketScoring(initialMatch: Match) {
  const [match, setMatch] = useState<Match>(initialMatch);

  const saveMatch = (updatedMatch: Match) => {
    setMatch(updatedMatch);
    const matches = JSON.parse(localStorage.getItem('cricket_matches') || '[]');
    const index = matches.findIndex((m: Match) => m.id === updatedMatch.id);
    if (index > -1) {
      matches[index] = updatedMatch;
    } else {
      matches.push(updatedMatch);
    }
    localStorage.setItem('cricket_matches', JSON.stringify(matches));
  };

  const addBall = (event: Omit<BallEvent, 'over' | 'ball'>) => {
    const currentInnings = match.currentInnings === 1 ? match.innings1 : match.innings2;
    if (!currentInnings) return;

    const newInnings = { ...currentInnings };
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
    const striker = newInnings.battingStats[event.strikerId];
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
    }

    // Update bowler stats
    const bowler = newInnings.bowlingStats[event.bowlerId];
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

    // Handle strike change on odd runs
    if (event.runs % 2 !== 0 && !event.isExtra) {
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

    saveMatch(updatedMatch);
  };

  const undoLastBall = () => {
    // Implementation for undo logic
    // This would require popping from ballHistory and recalculating stats
    // For now, let's keep it simple and maybe implement later if needed
  };

  return { match, addBall, undoLastBall, setMatch };
}
