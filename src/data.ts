import { Match, Team } from './types';

export const PRICE_PER_GUESS = 10;

export const TEAMS: Record<string, Team> = {
  BRA: { name: 'Brasil', shortName: 'Brasil', code: 'BRA', flag: '🇧🇷' },
  MAR: { name: 'Marrocos', shortName: 'Marrocos', code: 'MAR', flag: '🇲🇦' },
  HAI: { name: 'Haiti', shortName: 'Haiti', code: 'HAI', flag: '🇭🇹' },
  SCO: { name: 'Escócia', shortName: 'Escócia', code: 'SCO', flag: '🏴' }
};

export const FALLBACK_BRAZIL_MATCHES: Match[] = [
  {
    id: 'bra-mar-2026-06-13',
    homeTeam: TEAMS.BRA,
    awayTeam: TEAMS.MAR,
    startsAt: '2026-06-13T19:00:00-03:00',
    stadium: 'MetLife Stadium',
    city: 'New York/New Jersey',
    status: 'scheduled',
    minute: null,
    homeScore: null,
    awayScore: null,
    round: 'Fase de grupos'
  },
  {
    id: 'bra-hai-2026-06-19',
    homeTeam: TEAMS.BRA,
    awayTeam: TEAMS.HAI,
    startsAt: '2026-06-19T21:30:00-03:00',
    stadium: 'Philadelphia Stadium',
    city: 'Philadelphia',
    status: 'finished',
    minute: null,
    homeScore: 3,
    awayScore: 0,
    round: 'Fase de grupos'
  },
  {
    id: 'sco-bra-2026-06-24',
    homeTeam: TEAMS.SCO,
    awayTeam: TEAMS.BRA,
    startsAt: '2026-06-24T19:00:00-03:00',
    stadium: 'Miami Stadium',
    city: 'Miami',
    status: 'scheduled',
    minute: null,
    homeScore: 0,
    awayScore: 2,
    round: 'Fase de grupos'
  }
];
