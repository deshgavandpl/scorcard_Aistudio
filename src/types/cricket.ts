export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  isCaptain?: boolean;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  points?: number;
}

export interface MatchInnings {
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: {
    wide: number;
    noBall: number;
    bye: number;
    legBye: number;
  };
  battingStats: Record<string, BatterStats>;
  bowlingStats: Record<string, BowlerStats>;
  fallOfWickets: { runs: number; wickets: number; over: string }[];
  ballHistory: BallEvent[];
  currentBowlerId?: string;
}

export interface BatterStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  howOut?: string;
  isStriker: boolean;
}

export interface BowlerStats {
  playerId: string;
  playerName: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  maiden: number;
}

export interface BallEvent {
  over: number;
  ball: number;
  runs: number;
  isExtra: boolean;
  extraType?: 'Wd' | 'Nb' | 'By' | 'Lb';
  isWicket: boolean;
  wicketType?: string;
  fielderName?: string;
  strikerId: string;
  bowlerId: string;
}

export interface Match {
  id: string;
  name?: string;
  tournamentId?: string;
  tournamentName?: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  tossWinnerId: string;
  tossDecision: 'Bat' | 'Bowl';
  oversLimit: number;
  status: 'Upcoming' | 'Live' | 'Finished';
  currentInnings: 1 | 2;
  innings1?: MatchInnings;
  innings2?: MatchInnings;
  superOverInnings1?: MatchInnings;
  superOverInnings2?: MatchInnings;
  isSuperOver?: boolean;
  winnerId?: string;
  resultMessage?: string;
  manOfTheMatch?: string;
  umpireName?: string;
  hypeCount?: number;
  order?: number;
  matchDate?: string;
  matchTime?: string;
  createdAt: number;
}

export interface Tournament {
  id: string;
  name: string;
  teams: Team[];
  matches: Match[];
  status: 'Draft' | 'Live' | 'Finished';
  winnerId?: string;
  resultMessage?: string;
}
