export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type TeamCode = 'BRA' | 'MAR' | 'HAI' | 'SCO' | 'UNK';

export type Team = {
  name: string;
  shortName: string;
  code: TeamCode;
  flag: string;
  logoUrl?: string | null;
};

export type Match = {
  id: string;
  apiFixtureId?: number;
  homeTeam: Team;
  awayTeam: Team;
  startsAt: string;
  stadium: string;
  city: string;
  status: MatchStatus;
  minute?: number | null;
  homeScore: number | null;
  awayScore: number | null;
  round: string;
};

export type Guess = {
  id: string;
  match_id: string;
  person_name: string;
  home_score: number;
  away_score: number;
  paid: boolean;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type NewGuess = {
  match_id: string;
  person_name: string;
  home_score: number;
  away_score: number;
  paid: boolean;
  notes?: string | null;
};

export type BoardSummary = {
  totalGuesses: number;
  paidGuesses: number;
  totalPot: number;
  paidPot: number;
  winners: Guess[];
  prizePerWinner: number;
};
