// ---------------------
// Standings
// ---------------------

export interface StandingsResponse {
  standings: StandingsTeam[];
}

export interface StandingsTeam {
  teamAbbrev: { default: string };
  teamName: { default: string };
  teamLogo: string;
}

// ---------------------
// Roster
// ---------------------

export interface RosterResponse {
  forwards: RosterPlayer[];
  defensemen: RosterPlayer[];
  goalies: RosterPlayer[];
}

export interface RosterPlayer {
  id: number;
  firstName: { default: string };
  lastName: { default: string };
  positionCode: string; // "C", "L", "R", "D", "G"
  sweaterNumber?: number;
  headshot?: string;
}

// ---------------------
// Score / Schedule
// ---------------------

export interface ScoreResponse {
  games: ScoreGame[];
}

export interface ScoreGame {
  id: number;
  gameState: string; // "OFF", "FINAL", "LIVE", "FUT", "PRE"
  gameDate: string;
  awayTeam: { id: number; abbrev: string; score?: number };
  homeTeam: { id: number; abbrev: string; score?: number };
}

// ---------------------
// Boxscore
// ---------------------

export interface BoxscoreResponse {
  id: number;
  gameDate: string;
  playerByGameStats: {
    awayTeam: TeamGameStats;
    homeTeam: TeamGameStats;
  };
}

export interface TeamGameStats {
  forwards: SkaterGameStats[];
  defense: SkaterGameStats[];
  goalies: GoalieGameStats[];
}

export interface SkaterGameStats {
  playerId: number;
  name: { default: string };
  position: string;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  sog: number; // shots on goal
  hits: number;
  blockedShots: number;
  powerPlayGoals: number;
}

export interface GoalieGameStats {
  playerId: number;
  name: { default: string };
  position: string;
  saves: number;
  goalsAgainst: number;
  savePctg?: number;
  decision?: string; // "W", "L", or undefined
  starter?: boolean;
}
