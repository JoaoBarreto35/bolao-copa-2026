import { FALLBACK_BRAZIL_MATCHES, TEAMS } from '../data';
import { Match, MatchStatus, Team } from '../types';

/**
 * Integração GRATUITA com TheSportsDB.
 *
 * Motivo da troca:
 * - API-FOOTBALL/API-Sports costuma exigir plano/chave com limite comercial.
 * - TheSportsDB tem chave pública gratuita "123" para API v1.
 * - Ela fornece agenda, placar quando disponível e URLs de badges/logos.
 *
 * Observação honesta:
 * - API gratuita pode ter atraso e limite.
 * - Se ela falhar, o app usa FALLBACK_BRAZIL_MATCHES e continua funcionando.
 */
const SPORTS_DB_BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const SPORTS_DB_KEY = process.env.REACT_APP_THESPORTSDB_API_KEY ?? '123';
const WORLD_CUP_LEAGUE_ID = process.env.REACT_APP_THESPORTSDB_WORLD_CUP_LEAGUE_ID ?? '4429';
const SEASON = process.env.REACT_APP_WORLD_CUP_SEASON ?? '2026';

const SPORTS_DB_URL = `${SPORTS_DB_BASE_URL}/${SPORTS_DB_KEY}`;

type SportsDbEvent = {
  idEvent?: string | null;
  strEvent?: string | null;
  strLeague?: string | null;
  strSeason?: string | null;
  strRound?: string | null;
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  dateEvent?: string | null;
  strTime?: string | null;
  strTimestamp?: string | null;
  strVenue?: string | null;
  strCity?: string | null;
  strStatus?: string | null;
  strProgress?: string | null;
};

type SportsDbEventsResponse = {
  events?: SportsDbEvent[] | null;
  event?: SportsDbEvent[] | null;
};

function compactImage(url?: string | null): string | null {
  if (!url) return null;
  if (url.endsWith('/preview')) return url;
  return `${url}/preview`;
}

function guessTeam(name: string, logoUrl?: string | null): Team {
  const normalized = name.toLowerCase();

  if (normalized.includes('brazil') || normalized.includes('brasil')) {
    return { ...TEAMS.BRA, logoUrl: compactImage(logoUrl) };
  }

  if (normalized.includes('morocco') || normalized.includes('marrocos')) {
    return { ...TEAMS.MAR, logoUrl: compactImage(logoUrl) };
  }

  if (normalized.includes('haiti')) {
    return { ...TEAMS.HAI, logoUrl: compactImage(logoUrl) };
  }

  if (normalized.includes('scotland') || normalized.includes('escócia') || normalized.includes('escocia')) {
    return { ...TEAMS.SCO, logoUrl: compactImage(logoUrl) };
  }

  return {
    name,
    shortName: name,
    code: 'UNK',
    flag: '🏳️',
    logoUrl: compactImage(logoUrl)
  };
}

function parseScore(score?: string | null): number | null {
  if (score === undefined || score === null || score === '') return null;
  const parsed = Number(score);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStartsAt(event: SportsDbEvent): string {
  if (event.strTimestamp) return event.strTimestamp;

  const date = event.dateEvent ?? '2026-06-13';
  const time = event.strTime?.slice(0, 8) ?? '22:00:00';

  return `${date}T${time}Z`;
}

function statusFromEvent(event: SportsDbEvent): MatchStatus {
  const status = `${event.strStatus ?? ''} ${event.strProgress ?? ''}`.toLowerCase();
  const homeScore = parseScore(event.intHomeScore);
  const awayScore = parseScore(event.intAwayScore);
  const startsAt = new Date(parseStartsAt(event));
  const now = new Date();

  if (status.includes('match finished') || status.includes('finished') || status.includes('ft')) return 'finished';
  if (status.includes('live') || status.includes('1h') || status.includes('2h') || status.includes('half')) return 'live';

  if (homeScore !== null && awayScore !== null && now.getTime() > startsAt.getTime() + 2 * 60 * 60 * 1000) {
    return 'finished';
  }

  if (now >= startsAt && now.getTime() <= startsAt.getTime() + 2 * 60 * 60 * 1000) {
    return 'live';
  }

  return 'scheduled';
}

function minuteFromEvent(event: SportsDbEvent): number | null {
  if (!event.strProgress) return null;
  const match = event.strProgress.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function mapSportsDbEvent(event: SportsDbEvent): Match | null {
  const homeName = event.strHomeTeam ?? '';
  const awayName = event.strAwayTeam ?? '';

  if (!homeName || !awayName) return null;

  const homeTeam = guessTeam(homeName, event.strHomeTeamBadge);
  const awayTeam = guessTeam(awayName, event.strAwayTeamBadge);

  return {
    id: event.idEvent ? `sportsdb-${event.idEvent}` : `${homeName}-${awayName}-${event.dateEvent}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    apiFixtureId: event.idEvent ? Number(event.idEvent) : undefined,
    homeTeam,
    awayTeam,
    startsAt: parseStartsAt(event),
    stadium: event.strVenue ?? 'Estádio a confirmar',
    city: event.strCity ?? 'Cidade a confirmar',
    status: statusFromEvent(event),
    minute: minuteFromEvent(event),
    homeScore: parseScore(event.intHomeScore),
    awayScore: parseScore(event.intAwayScore),
    round: event.strRound ?? event.strLeague ?? 'Copa do Mundo 2026'
  };
}

function isBrazilMatch(match: Match): boolean {
  return match.homeTeam.code === 'BRA' || match.awayTeam.code === 'BRA';
}

function mergeMatches(apiMatches: Match[], fallbackMatches: Match[]): Match[] {
  const merged = [...fallbackMatches];

  apiMatches.forEach((apiMatch) => {
    const index = merged.findIndex((fallbackMatch) => {
      const sameHome = fallbackMatch.homeTeam.code === apiMatch.homeTeam.code;
      const sameAway = fallbackMatch.awayTeam.code === apiMatch.awayTeam.code;
      const fallbackDay = fallbackMatch.startsAt.slice(0, 10);
      const apiDay = apiMatch.startsAt.slice(0, 10);
      return sameHome && sameAway && fallbackDay === apiDay;
    });

    if (index >= 0) {
      merged[index] = {
        ...merged[index],
        ...apiMatch,
        id: merged[index].id,
        homeTeam: { ...merged[index].homeTeam, logoUrl: apiMatch.homeTeam.logoUrl ?? merged[index].homeTeam.logoUrl },
        awayTeam: { ...merged[index].awayTeam, logoUrl: apiMatch.awayTeam.logoUrl ?? merged[index].awayTeam.logoUrl }
      };
    } else {
      merged.push(apiMatch);
    }
  });

  return merged.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

async function fetchJson(url: string): Promise<SportsDbEventsResponse | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as SportsDbEventsResponse;
  } catch {
    return null;
  }
}

async function fetchSeasonBrazilMatches(): Promise<Match[]> {
  const url = `${SPORTS_DB_URL}/eventsseason.php?id=${WORLD_CUP_LEAGUE_ID}&s=${SEASON}`;
  const json = await fetchJson(url);
  const events = json?.events ?? json?.event ?? [];

  return events
    .map(mapSportsDbEvent)
    .filter((match): match is Match => Boolean(match))
    .filter(isBrazilMatch);
}

async function fetchBrazilMatchesByFallbackDays(): Promise<Match[]> {
  const days = Array.from(new Set(FALLBACK_BRAZIL_MATCHES.map((match) => match.startsAt.slice(0, 10))));
  const requests = days.map(async (day) => {
    const url = `${SPORTS_DB_URL}/eventsday.php?d=${day}&l=${WORLD_CUP_LEAGUE_ID}`;
    const json = await fetchJson(url);
    return json?.events ?? json?.event ?? [];
  });

  const results = await Promise.all(requests);

  return results
    .flat()
    .map(mapSportsDbEvent)
    .filter((match): match is Match => Boolean(match))
    .filter(isBrazilMatch);
}

export async function fetchBrazilMatches(): Promise<Match[]> {
  const [seasonMatches, dayMatches] = await Promise.all([
    fetchSeasonBrazilMatches(),
    fetchBrazilMatchesByFallbackDays()
  ]);

  const apiMatches = [...seasonMatches, ...dayMatches];

  if (apiMatches.length === 0) {
    return FALLBACK_BRAZIL_MATCHES;
  }

  return mergeMatches(apiMatches, FALLBACK_BRAZIL_MATCHES);
}
