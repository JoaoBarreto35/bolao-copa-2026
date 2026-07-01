import { Match, Team } from './types';

export const PRICE_PER_GUESS = 10;

export const TEAMS: Record<string, Team> = {
  BRA: {
    name: 'Brasil',
    shortName: 'Brasil',
    code: 'BRA',
    flag: '🇧🇷'
  },

  MAR: {
    name: 'Marrocos',
    shortName: 'Marrocos',
    code: 'MAR',
    flag: '🇲🇦'
  },

  HAI: {
    name: 'Haiti',
    shortName: 'Haiti',
    code: 'HAI',
    flag: '🇭🇹'
  },

  SCO: {
    name: 'Escócia',
    shortName: 'Escócia',
    code: 'SCO',
    flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  },
  JPN: {
    name: 'Japão',
    shortName: 'Japão',
    code: 'JPN',
    flag: '🇯🇵'
  },
  NOR: {
    name: 'Noruega',
    shortName: 'Noruega',
    code: 'NOR',
    flag: '🇧🇻'
  },

  TBD: {
    name: 'Adversário a definir',
    shortName: 'A definir',
    code: 'UNK',
    flag: '🏳️'
  }
};

/**
 * Essa lista é a agenda-base do aplicativo.
 *
 * Jogos encerrados:
 * - não são mais consultados na API;
 * - ficam salvos definitivamente aqui;
 * - continuam disponíveis no histórico.
 *
 * Próximo jogo:
 * - deve ser cadastrado previamente com a data correta;
 * - pode ter o adversário como "A definir";
 * - a API localizará o evento do Brasil naquele dia;
 * - depois de localizado, o idEvent será salvo no localStorage.
 *
 * Importante:
 * Nunca altere o ID local de um jogo que já recebeu palpites.
 */
export const FALLBACK_BRAZIL_MATCHES: Match[] = [
  {
    id: 'bra-mar-2026-06-13',
    homeTeam: TEAMS.BRA,
    awayTeam: TEAMS.MAR,
    startsAt: '2026-06-13T19:00:00-03:00',
    stadium: 'MetLife Stadium',
    city: 'New York/New Jersey',
    status: 'finished',
    minute: null,
    homeScore: 1,
    awayScore: 1,
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
    status: 'finished',
    minute: null,
    homeScore: 0,
    awayScore: 3,
    round: 'Fase de grupos'
  },

  {
    /**
     * Não troque esse ID depois que começarem os palpites.
     *
     * A API substituirá automaticamente:
     * - adversário;
     * - escudo;
     * - horário;
     * - estádio;
     * - placar;
     * - status;
     * - minuto;
     * - apiFixtureId.
     */
    id: 'bra-jpn-2026-06-29',
    homeTeam: TEAMS.BRA,
    awayTeam: TEAMS.TBD,
    startsAt: '2026-06-29T14:00:00-03:00',
    stadium: 'Houston Stadium',
    city: 'Houston',
    status: 'finished',
    minute: null,
    homeScore: 2,
    awayScore: 1,
    round: 'Fase de 32'
  },
  {
    id: 'bra-nor-2026-07-05',
    homeTeam: TEAMS.BRA,
    awayTeam: TEAMS.TBD,
    startsAt: '2026-07-05T17:00:00-03:00',
    stadium: 'Houston Stadium',
    city: 'NY',
    status: 'scheduled',
    minute: null,
    homeScore: null,
    awayScore: null,
    round: 'Oitavas'
  }
];
