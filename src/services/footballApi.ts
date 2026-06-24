import { FALLBACK_BRAZIL_MATCHES, TEAMS } from '../data';
import { Match, MatchStatus, Team, TeamCode } from '../types';

/**
 * Integração gratuita com TheSportsDB.
 *
 * Regras:
 * - Usa a chave pública gratuita "123" por padrão.
 * - Busca jogos da temporada e por data.
 * - Busca Brasil x Haiti e Escócia x Brasil pelo ID exato.
 * - Eventos buscados pelo ID exato têm prioridade.
 * - Reconhece a partida mesmo se mandante e visitante estiverem invertidos.
 * - Escócia x Brasil está temporariamente com placar manual forçado.
 * - Se a API falhar, o app continua usando o fallback local.
 */

const SPORTS_DB_BASE_URL =
  'https://www.thesportsdb.com/api/v1/json';

const SPORTS_DB_KEY =
  process.env.REACT_APP_THESPORTSDB_API_KEY ??
  '123';

const WORLD_CUP_LEAGUE_ID =
  process.env.REACT_APP_THESPORTSDB_WORLD_CUP_LEAGUE_ID ??
  '4429';

const SEASON =
  process.env.REACT_APP_WORLD_CUP_SEASON ??
  '2026';

const BRAZIL_HAITI_EVENT_ID =
  process.env.REACT_APP_THESPORTSDB_BRAZIL_HAITI_EVENT_ID ??
  '2391748';

const SCOTLAND_BRAZIL_EVENT_ID =
  process.env.REACT_APP_THESPORTSDB_SCOTLAND_BRAZIL_EVENT_ID ??
  '2391765';

const SPORTS_DB_URL =
  `${SPORTS_DB_BASE_URL}/${SPORTS_DB_KEY}`;

/**
 * Override temporário para Escócia x Brasil.
 *
 * Enquanto estiver true, a API não consegue sobrescrever
 * o placar definido manualmente abaixo.
 *
 * Depois, quando quiser voltar a usar somente a API,
 * basta trocar para false.
 */
const FORCE_SCOTLAND_BRAZIL_MATCH = true;

const FORCED_SCOTLAND_SCORE = 0;
const FORCED_BRAZIL_SCORE = 3;

const FORCED_SCOTLAND_BRAZIL_STATUS: MatchStatus =
  'finished';

const FORCED_SCOTLAND_BRAZIL_MINUTE = 90;

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

type SportsDbTeam = {
  strTeam?: string | null;
  strTeamBadge?: string | null;
  strTeamLogo?: string | null;
};

type SportsDbTeamsResponse = {
  teams?: SportsDbTeam[] | null;
};

const KNOWN_TEAM_NAMES: Record<
  TeamCode,
  string[]
> = {
  BRA: ['Brazil', 'Brasil'],
  MAR: ['Morocco', 'Marrocos'],
  HAI: ['Haiti'],
  SCO: [
    'Scotland',
    'Escócia',
    'Escocia'
  ],
  UNK: []
};

const teamLogoCache =
  new Map<TeamCode, string | null>();

function compactImage(
  url?: string | null
): string | null {
  if (!url) {
    return null;
  }

  if (url.endsWith('/preview')) {
    return url;
  }

  return `${url}/preview`;
}

function identifyTeamCode(
  name: string
): TeamCode {
  const normalized =
    name.toLowerCase();

  if (
    normalized.includes('brazil') ||
    normalized.includes('brasil')
  ) {
    return 'BRA';
  }

  if (
    normalized.includes('morocco') ||
    normalized.includes('marrocos')
  ) {
    return 'MAR';
  }

  if (
    normalized.includes('haiti')
  ) {
    return 'HAI';
  }

  if (
    normalized.includes('scotland') ||
    normalized.includes('escócia') ||
    normalized.includes('escocia')
  ) {
    return 'SCO';
  }

  return 'UNK';
}

function guessTeam(
  name: string,
  logoUrl?: string | null
): Team {
  const code =
    identifyTeamCode(name);

  const compactLogo =
    compactImage(logoUrl);

  if (code === 'BRA') {
    return {
      ...TEAMS.BRA,
      logoUrl:
        compactLogo ??
        TEAMS.BRA.logoUrl
    };
  }

  if (code === 'MAR') {
    return {
      ...TEAMS.MAR,
      logoUrl:
        compactLogo ??
        TEAMS.MAR.logoUrl
    };
  }

  if (code === 'HAI') {
    return {
      ...TEAMS.HAI,
      logoUrl:
        compactLogo ??
        TEAMS.HAI.logoUrl
    };
  }

  if (code === 'SCO') {
    return {
      ...TEAMS.SCO,
      logoUrl:
        compactLogo ??
        TEAMS.SCO.logoUrl
    };
  }

  return {
    name,
    shortName: name,
    code: 'UNK',
    flag: '🏳️',
    logoUrl: compactLogo
  };
}

function parseScore(
  score?: string | null
): number | null {
  if (
    score === undefined ||
    score === null ||
    score === ''
  ) {
    return null;
  }

  const parsed =
    Number(score);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

/**
 * Mantém o horário da API em UTC.
 *
 * Não deve subtrair três horas aqui.
 * A conversão para Brasília deve ser feita
 * apenas no componente de exibição.
 */
function parseStartsAt(
  event: SportsDbEvent
): string {
  if (event.strTimestamp) {
    const timestamp =
      event.strTimestamp.trim();

    const hasTimezone =
      timestamp.endsWith('Z') ||
      /[+-]\d{2}:\d{2}$/.test(
        timestamp
      );

    const normalizedTimestamp =
      hasTimezone
        ? timestamp
        : `${timestamp}Z`;

    const parsedDate =
      new Date(normalizedTimestamp);

    if (
      !Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return parsedDate.toISOString();
    }
  }

  const date =
    event.dateEvent ??
    '2026-06-13';

  const time =
    event.strTime?.slice(0, 8) ??
    '19:00:00';

  return new Date(
    `${date}T${time}Z`
  ).toISOString();
}

function statusFromEvent(
  event: SportsDbEvent
): MatchStatus {
  const status =
    `${event.strStatus ?? ''} ${event.strProgress ?? ''}`
      .trim()
      .toLowerCase();

  const homeScore =
    parseScore(
      event.intHomeScore
    );

  const awayScore =
    parseScore(
      event.intAwayScore
    );

  const startsAt =
    new Date(
      parseStartsAt(event)
    );

  const now =
    new Date();

  const finishedStatuses = [
    'match finished',
    'finished',
    'full time',
    'ft',
    'aet',
    'after extra time',
    'pen',
    'penalties'
  ];

  if (
    finishedStatuses.some(
      (value) =>
        status.includes(value)
    )
  ) {
    return 'finished';
  }

  const liveStatuses = [
    'live',
    '1h',
    '2h',
    'ht',
    'half time',
    'halftime',
    'et',
    'extra time',
    'break',
    'paused'
  ];

  if (
    liveStatuses.some(
      (value) =>
        status.includes(value)
    )
  ) {
    return 'live';
  }

  const matchStartTime =
    startsAt.getTime();

  const currentTime =
    now.getTime();

  const threeHours =
    3 * 60 * 60 * 1000;

  if (
    homeScore !== null &&
    awayScore !== null &&
    currentTime >
      matchStartTime +
        threeHours
  ) {
    return 'finished';
  }

  if (
    currentTime >=
      matchStartTime &&
    currentTime <=
      matchStartTime +
        threeHours
  ) {
    return 'live';
  }

  return 'scheduled';
}

function minuteFromEvent(
  event: SportsDbEvent
): number | null {
  if (!event.strProgress) {
    return null;
  }

  const match =
    event.strProgress.match(
      /\d+/
    );

  if (!match) {
    return null;
  }

  return Number(match[0]);
}

function mapSportsDbEvent(
  event: SportsDbEvent
): Match | null {
  const homeName =
    event.strHomeTeam ??
    '';

  const awayName =
    event.strAwayTeam ??
    '';

  if (
    !homeName ||
    !awayName
  ) {
    return null;
  }

  const homeTeam =
    guessTeam(
      homeName,
      event.strHomeTeamBadge
    );

  const awayTeam =
    guessTeam(
      awayName,
      event.strAwayTeamBadge
    );

  const generatedId =
    `${homeName}-${awayName}-${event.dateEvent}`
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-'
      );

  return {
    id: event.idEvent
      ? `sportsdb-${event.idEvent}`
      : generatedId,

    apiFixtureId:
      event.idEvent
        ? Number(
            event.idEvent
          )
        : undefined,

    homeTeam,
    awayTeam,

    startsAt:
      parseStartsAt(event),

    stadium:
      event.strVenue ??
      'Estádio a confirmar',

    city:
      event.strCity ??
      'Cidade a confirmar',

    status:
      statusFromEvent(event),

    minute:
      minuteFromEvent(event),

    homeScore:
      parseScore(
        event.intHomeScore
      ),

    awayScore:
      parseScore(
        event.intAwayScore
      ),

    round:
      event.strRound ??
      event.strLeague ??
      'Copa do Mundo 2026'
  };
}

function isBrazilMatch(
  match: Match
): boolean {
  return (
    match.homeTeam.code === 'BRA' ||
    match.awayTeam.code === 'BRA'
  );
}

/**
 * Reconhece o mesmo confronto mesmo que
 * a ordem de mandante e visitante esteja invertida.
 *
 * Exemplo:
 * - fallback: Brasil x Escócia
 * - API: Escócia x Brasil
 */
function sameMatchup(
  a: Match,
  b: Match
): boolean {
  const sameOrder =
    a.homeTeam.code ===
      b.homeTeam.code &&
    a.awayTeam.code ===
      b.awayTeam.code;

  const reversedOrder =
    a.homeTeam.code ===
      b.awayTeam.code &&
    a.awayTeam.code ===
      b.homeTeam.code;

  return (
    sameOrder ||
    reversedOrder
  );
}

function sameDayOrClose(
  a: Match,
  b: Match
): boolean {
  const aTime =
    new Date(
      a.startsAt
    ).getTime();

  const bTime =
    new Date(
      b.startsAt
    ).getTime();

  const threeDaysMs =
    3 *
    24 *
    60 *
    60 *
    1000;

  return (
    Math.abs(
      aTime - bTime
    ) <= threeDaysMs
  );
}

/**
 * Caso o confronto venha invertido,
 * ajusta o placar e os times para a ordem da API.
 */
function normalizeMatchOrientation(
  fallbackMatch: Match,
  apiMatch: Match
): Match {
  const sameOrder =
    fallbackMatch.homeTeam.code ===
      apiMatch.homeTeam.code &&
    fallbackMatch.awayTeam.code ===
      apiMatch.awayTeam.code;

  if (sameOrder) {
    return apiMatch;
  }

  const reversedOrder =
    fallbackMatch.homeTeam.code ===
      apiMatch.awayTeam.code &&
    fallbackMatch.awayTeam.code ===
      apiMatch.homeTeam.code;

  if (!reversedOrder) {
    return apiMatch;
  }

  return {
    ...apiMatch,
    homeTeam:
      apiMatch.awayTeam,
    awayTeam:
      apiMatch.homeTeam,
    homeScore:
      apiMatch.awayScore,
    awayScore:
      apiMatch.homeScore
  };
}

/**
 * Os itens que aparecem por último em apiMatches
 * têm prioridade.
 */
function mergeMatches(
  apiMatches: Match[],
  fallbackMatches: Match[]
): Match[] {
  const merged = [
    ...fallbackMatches
  ];

  apiMatches.forEach(
    (apiMatch) => {
      const index =
        merged.findIndex(
          (fallbackMatch) => {
            return (
              sameMatchup(
                fallbackMatch,
                apiMatch
              ) &&
              sameDayOrClose(
                fallbackMatch,
                apiMatch
              )
            );
          }
        );

      if (index < 0) {
        merged.push(apiMatch);
        return;
      }

      const fallbackMatch =
        merged[index];

      const normalizedApiMatch =
        normalizeMatchOrientation(
          fallbackMatch,
          apiMatch
        );

      merged[index] = {
        ...fallbackMatch,
        ...normalizedApiMatch,

        id:
          fallbackMatch.id,

        homeTeam: {
          ...fallbackMatch.homeTeam,
          ...normalizedApiMatch.homeTeam,

          logoUrl:
            normalizedApiMatch
              .homeTeam
              .logoUrl ??
            fallbackMatch
              .homeTeam
              .logoUrl
        },

        awayTeam: {
          ...fallbackMatch.awayTeam,
          ...normalizedApiMatch.awayTeam,

          logoUrl:
            normalizedApiMatch
              .awayTeam
              .logoUrl ??
            fallbackMatch
              .awayTeam
              .logoUrl
        }
      };
    }
  );

  return merged.sort(
    (a, b) =>
      new Date(
        a.startsAt
      ).getTime() -
      new Date(
        b.startsAt
      ).getTime()
  );
}

async function fetchJson<T>(
  url: string
): Promise<T | null> {
  try {
    const response =
      await fetch(url, {
        cache: 'no-store'
      });

    if (!response.ok) {
      return null;
    }

    return (
      await response.json()
    ) as T;
  } catch {
    return null;
  }
}

async function fetchTeamLogoByCode(
  code: TeamCode
): Promise<string | null> {
  if (code === 'UNK') {
    return null;
  }

  if (
    teamLogoCache.has(code)
  ) {
    return (
      teamLogoCache.get(code) ??
      null
    );
  }

  const names =
    KNOWN_TEAM_NAMES[code];

  for (
    const name of names
  ) {
    const url =
      `${SPORTS_DB_URL}/searchteams.php?t=${encodeURIComponent(name)}`;

    const json =
      await fetchJson<SportsDbTeamsResponse>(
        url
      );

    const team =
      json?.teams?.[0];

    const logo =
      compactImage(
        team?.strTeamBadge ??
          team?.strTeamLogo ??
          null
      );

    if (logo) {
      teamLogoCache.set(
        code,
        logo
      );

      return logo;
    }
  }

  teamLogoCache.set(
    code,
    null
  );

  return null;
}

async function hydrateMissingTeamLogos(
  matches: Match[]
): Promise<Match[]> {
  const neededCodes =
    Array.from(
      new Set(
        matches
          .flatMap(
            (match) => [
              match.homeTeam,
              match.awayTeam
            ]
          )
          .filter(
            (team) =>
              !team.logoUrl &&
              team.code !==
                'UNK'
          )
          .map(
            (team) =>
              team.code
          )
      )
    );

  await Promise.all(
    neededCodes.map(
      fetchTeamLogoByCode
    )
  );

  return matches.map(
    (match) => {
      const homeLogo =
        match.homeTeam.logoUrl ??
        teamLogoCache.get(
          match.homeTeam.code
        ) ??
        null;

      const awayLogo =
        match.awayTeam.logoUrl ??
        teamLogoCache.get(
          match.awayTeam.code
        ) ??
        null;

      return {
        ...match,

        homeTeam: {
          ...match.homeTeam,
          logoUrl:
            homeLogo
        },

        awayTeam: {
          ...match.awayTeam,
          logoUrl:
            awayLogo
        }
      };
    }
  );
}

async function fetchSeasonBrazilMatches(): Promise<
  Match[]
> {
  const url =
    `${SPORTS_DB_URL}/eventsseason.php` +
    `?id=${WORLD_CUP_LEAGUE_ID}&s=${SEASON}`;

  const json =
    await fetchJson<SportsDbEventsResponse>(
      url
    );

  const events =
    json?.events ??
    json?.event ??
    [];

  return events
    .map(
      mapSportsDbEvent
    )
    .filter(
      (
        match
      ): match is Match =>
        Boolean(match)
    )
    .filter(
      isBrazilMatch
    );
}

function addDays(
  dateString: string,
  amount: number
): string {
  const date =
    new Date(
      `${dateString}T12:00:00Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
      amount
  );

  return date
    .toISOString()
    .slice(0, 10);
}

async function fetchBrazilMatchesByFallbackDays(): Promise<
  Match[]
> {
  const baseDays =
    FALLBACK_BRAZIL_MATCHES.map(
      (match) =>
        match.startsAt.slice(
          0,
          10
        )
    );

  const days =
    Array.from(
      new Set(
        baseDays.flatMap(
          (day) => [
            addDays(
              day,
              -1
            ),
            day,
            addDays(
              day,
              1
            )
          ]
        )
      )
    );

  const requests =
    days.map(
      async (day) => {
        const url =
          `${SPORTS_DB_URL}/eventsday.php` +
          `?d=${day}&l=${WORLD_CUP_LEAGUE_ID}`;

        const json =
          await fetchJson<SportsDbEventsResponse>(
            url
          );

        return (
          json?.events ??
          json?.event ??
          []
        );
      }
    );

  const results =
    await Promise.all(
      requests
    );

  return results
    .flat()
    .map(
      mapSportsDbEvent
    )
    .filter(
      (
        match
      ): match is Match =>
        Boolean(match)
    )
    .filter(
      isBrazilMatch
    );
}

async function fetchEventById(
  eventId: string
): Promise<Match | null> {
  if (!eventId) {
    return null;
  }

  const url =
    `${SPORTS_DB_URL}/lookupevent.php?id=${encodeURIComponent(eventId)}`;

  const json =
    await fetchJson<SportsDbEventsResponse>(
      url
    );

  const events =
    json?.events ??
    json?.event ??
    [];

  const event =
    events[0];

  if (!event) {
    return null;
  }

  const match =
    mapSportsDbEvent(event);

  if (
    !match ||
    !isBrazilMatch(match)
  ) {
    return null;
  }

  return match;
}

async function fetchKnownBrazilMatches(): Promise<
  Match[]
> {
  const eventIds =
    Array.from(
      new Set([
        BRAZIL_HAITI_EVENT_ID,
        SCOTLAND_BRAZIL_EVENT_ID
      ])
    ).filter(Boolean);

  const results =
    await Promise.all(
      eventIds.map(
        fetchEventById
      )
    );

  return results.filter(
    (
      match
    ): match is Match =>
      Boolean(match)
  );
}

function isScotlandBrazilMatch(
  match: Match
): boolean {
  const sameOrder =
    match.homeTeam.code ===
      'SCO' &&
    match.awayTeam.code ===
      'BRA';

  const reversedOrder =
    match.homeTeam.code ===
      'BRA' &&
    match.awayTeam.code ===
      'SCO';

  return (
    sameOrder ||
    reversedOrder
  );
}

/**
 * Força manualmente o placar de Escócia x Brasil.
 *
 * Este override acontece depois da API e depois do merge.
 * Portanto, nenhuma resposta da API consegue sobrescrevê-lo.
 */
function applyScotlandBrazilOverride(
  matches: Match[]
): Match[] {
  if (
    !FORCE_SCOTLAND_BRAZIL_MATCH
  ) {
    return matches;
  }

  return matches.map(
    (match) => {
      if (
        !isScotlandBrazilMatch(
          match
        )
      ) {
        return match;
      }

      return {
        ...match,

        homeTeam: {
          ...TEAMS.SCO,
          logoUrl:
            match.homeTeam.code ===
            'SCO'
              ? match.homeTeam
                  .logoUrl
              : match.awayTeam
                  .logoUrl
        },

        awayTeam: {
          ...TEAMS.BRA,
          logoUrl:
            match.awayTeam.code ===
            'BRA'
              ? match.awayTeam
                  .logoUrl
              : match.homeTeam
                  .logoUrl
        },

        homeScore:
          FORCED_SCOTLAND_SCORE,

        awayScore:
          FORCED_BRAZIL_SCORE,

        status:
          FORCED_SCOTLAND_BRAZIL_STATUS,

        minute:
          FORCED_SCOTLAND_BRAZIL_MINUTE
      };
    }
  );
}

export async function fetchBrazilMatches(): Promise<
  Match[]
> {
  const [
    seasonMatches,
    dayMatches,
    knownMatches
  ] = await Promise.all([
    fetchSeasonBrazilMatches(),
    fetchBrazilMatchesByFallbackDays(),
    fetchKnownBrazilMatches()
  ]);

  /**
   * Ordem intencional:
   *
   * 1. temporada;
   * 2. consulta por data;
   * 3. consulta pelo ID exato.
   *
   * Como o merge sobrescreve seguindo a ordem,
   * knownMatches fica com prioridade.
   */
  const apiMatches = [
    ...seasonMatches,
    ...dayMatches,
    ...knownMatches
  ];

  const mergedMatches =
    apiMatches.length === 0
      ? FALLBACK_BRAZIL_MATCHES
      : mergeMatches(
          apiMatches,
          FALLBACK_BRAZIL_MATCHES
        );

  const forcedMatches =
    applyScotlandBrazilOverride(
      mergedMatches
    );

  return hydrateMissingTeamLogos(
    forcedMatches
  );
}  strLeague?: string | null;
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

type SportsDbTeam = {
  strTeam?: string | null;
  strTeamBadge?: string | null;
  strTeamLogo?: string | null;
};

type SportsDbTeamsResponse = {
  teams?: SportsDbTeam[] | null;
};

const KNOWN_TEAM_NAMES: Record<TeamCode, string[]> = {
  BRA: ['Brazil', 'Brasil'],
  MAR: ['Morocco', 'Marrocos'],
  HAI: ['Haiti'],
  SCO: ['Scotland', 'Escócia', 'Escocia'],
  UNK: []
};

const teamLogoCache =
  new Map<TeamCode, string | null>();

function compactImage(
  url?: string | null
): string | null {
  if (!url) return null;

  if (url.endsWith('/preview')) {
    return url;
  }

  return `${url}/preview`;
}

function identifyTeamCode(
  name: string
): TeamCode {
  const normalized = name.toLowerCase();

  if (
    normalized.includes('brazil') ||
    normalized.includes('brasil')
  ) {
    return 'BRA';
  }

  if (
    normalized.includes('morocco') ||
    normalized.includes('marrocos')
  ) {
    return 'MAR';
  }

  if (normalized.includes('haiti')) {
    return 'HAI';
  }

  if (
    normalized.includes('scotland') ||
    normalized.includes('escócia') ||
    normalized.includes('escocia')
  ) {
    return 'SCO';
  }

  return 'UNK';
}

function guessTeam(
  name: string,
  logoUrl?: string | null
): Team {
  const code = identifyTeamCode(name);
  const compactLogo = compactImage(logoUrl);

  if (code === 'BRA') {
    return {
      ...TEAMS.BRA,
      logoUrl:
        compactLogo ??
        TEAMS.BRA.logoUrl
    };
  }

  if (code === 'MAR') {
    return {
      ...TEAMS.MAR,
      logoUrl:
        compactLogo ??
        TEAMS.MAR.logoUrl
    };
  }

  if (code === 'HAI') {
    return {
      ...TEAMS.HAI,
      logoUrl:
        compactLogo ??
        TEAMS.HAI.logoUrl
    };
  }

  if (code === 'SCO') {
    return {
      ...TEAMS.SCO,
      logoUrl:
        compactLogo ??
        TEAMS.SCO.logoUrl
    };
  }

  return {
    name,
    shortName: name,
    code: 'UNK',
    flag: '🏳️',
    logoUrl: compactLogo
  };
}

function parseScore(
  score?: string | null
): number | null {
  if (
    score === undefined ||
    score === null ||
    score === ''
  ) {
    return null;
  }

  const parsed = Number(score);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

/**
 * Mantém o horário da API em UTC.
 *
 * Não subtraia três horas aqui.
 * A conversão para Brasília deve acontecer
 * somente na exibição.
 */
function parseStartsAt(
  event: SportsDbEvent
): string {
  if (event.strTimestamp) {
    const timestamp =
      event.strTimestamp.trim();

    const hasTimezone =
      timestamp.endsWith('Z') ||
      /[+-]\d{2}:\d{2}$/.test(timestamp);

    return new Date(
      hasTimezone
        ? timestamp
        : `${timestamp}Z`
    ).toISOString();
  }

  const date =
    event.dateEvent ?? '2026-06-13';

  const time =
    event.strTime?.slice(0, 8) ??
    '19:00:00';

  return new Date(
    `${date}T${time}Z`
  ).toISOString();
}

function statusFromEvent(
  event: SportsDbEvent
): MatchStatus {
  const status =
    `${event.strStatus ?? ''} ${event.strProgress ?? ''}`
      .trim()
      .toLowerCase();

  const homeScore =
    parseScore(event.intHomeScore);

  const awayScore =
    parseScore(event.intAwayScore);

  const startsAt =
    new Date(parseStartsAt(event));

  const now =
    new Date();

  const finishedStatuses = [
    'match finished',
    'finished',
    'full time',
    'ft',
    'aet',
    'after extra time',
    'pen',
    'penalties'
  ];

  if (
    finishedStatuses.some((value) =>
      status.includes(value)
    )
  ) {
    return 'finished';
  }

  const liveStatuses = [
    'live',
    '1h',
    '2h',
    'ht',
    'half time',
    'halftime',
    'et',
    'extra time',
    'break',
    'paused'
  ];

  if (
    liveStatuses.some((value) =>
      status.includes(value)
    )
  ) {
    return 'live';
  }

  if (
    homeScore !== null &&
    awayScore !== null &&
    now.getTime() >
      startsAt.getTime() +
        3 * 60 * 60 * 1000
  ) {
    return 'finished';
  }

  if (
    now.getTime() >= startsAt.getTime() &&
    now.getTime() <=
      startsAt.getTime() +
        3 * 60 * 60 * 1000
  ) {
    return 'live';
  }

  return 'scheduled';
}

function minuteFromEvent(
  event: SportsDbEvent
): number | null {
  if (!event.strProgress) {
    return null;
  }

  const match =
    event.strProgress.match(/\d+/);

  return match
    ? Number(match[0])
    : null;
}

function mapSportsDbEvent(
  event: SportsDbEvent
): Match | null {
  const homeName =
    event.strHomeTeam ?? '';

  const awayName =
    event.strAwayTeam ?? '';

  if (!homeName || !awayName) {
    return null;
  }

  const homeTeam =
    guessTeam(
      homeName,
      event.strHomeTeamBadge
    );

  const awayTeam =
    guessTeam(
      awayName,
      event.strAwayTeamBadge
    );

  return {
    id: event.idEvent
      ? `sportsdb-${event.idEvent}`
      : `${homeName}-${awayName}-${event.dateEvent}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-'),

    apiFixtureId: event.idEvent
      ? Number(event.idEvent)
      : undefined,

    homeTeam,
    awayTeam,

    startsAt:
      parseStartsAt(event),

    stadium:
      event.strVenue ??
      'Estádio a confirmar',

    city:
      event.strCity ??
      'Cidade a confirmar',

    status:
      statusFromEvent(event),

    minute:
      minuteFromEvent(event),

    homeScore:
      parseScore(event.intHomeScore),

    awayScore:
      parseScore(event.intAwayScore),

    round:
      event.strRound ??
      event.strLeague ??
      'Copa do Mundo 2026'
  };
}

function isBrazilMatch(
  match: Match
): boolean {
  return (
    match.homeTeam.code === 'BRA' ||
    match.awayTeam.code === 'BRA'
  );
}

function sameMatchup(a: Match, b: Match): boolean {
  const sameOrder =
    a.homeTeam.code === b.homeTeam.code &&
    a.awayTeam.code === b.awayTeam.code;

  const reversedOrder =
    a.homeTeam.code === b.awayTeam.code &&
    a.awayTeam.code === b.homeTeam.code;

  return sameOrder || reversedOrder;
}
function sameDayOrClose(
  a: Match,
  b: Match
): boolean {
  const aTime =
    new Date(a.startsAt).getTime();

  const bTime =
    new Date(b.startsAt).getTime();

  const threeDaysMs =
    3 * 24 * 60 * 60 * 1000;

  return (
    Math.abs(aTime - bTime) <=
    threeDaysMs
  );
}

/**
 * Os itens que aparecem por último
 * em apiMatches têm prioridade.
 */
function mergeMatches(
  apiMatches: Match[],
  fallbackMatches: Match[]
): Match[] {
  const merged = [
    ...fallbackMatches
  ];

  apiMatches.forEach((apiMatch) => {
    const index =
      merged.findIndex(
        (fallbackMatch) => {
          return (
            sameMatchup(
              fallbackMatch,
              apiMatch
            ) &&
            sameDayOrClose(
              fallbackMatch,
              apiMatch
            )
          );
        }
      );

    if (index >= 0) {
      merged[index] = {
        ...merged[index],
        ...apiMatch,

        id:
          merged[index].id,

        homeTeam: {
          ...merged[index].homeTeam,
          ...apiMatch.homeTeam,

          logoUrl:
            apiMatch.homeTeam.logoUrl ??
            merged[index].homeTeam.logoUrl
        },

        awayTeam: {
          ...merged[index].awayTeam,
          ...apiMatch.awayTeam,

          logoUrl:
            apiMatch.awayTeam.logoUrl ??
            merged[index].awayTeam.logoUrl
        }
      };
    } else {
      merged.push(apiMatch);
    }
  });

  return merged.sort(
    (a, b) =>
      new Date(a.startsAt).getTime() -
      new Date(b.startsAt).getTime()
  );
}

async function fetchJson<T>(
  url: string
): Promise<T | null> {
  try {
    const response =
      await fetch(url, {
        cache: 'no-store'
      });

    if (!response.ok) {
      return null;
    }

    return (
      await response.json()
    ) as T;
  } catch {
    return null;
  }
}

async function fetchTeamLogoByCode(
  code: TeamCode
): Promise<string | null> {
  if (code === 'UNK') {
    return null;
  }

  if (
    teamLogoCache.has(code)
  ) {
    return (
      teamLogoCache.get(code) ??
      null
    );
  }

  const names =
    KNOWN_TEAM_NAMES[code];

  for (const name of names) {
    const url =
      `${SPORTS_DB_URL}/searchteams.php?t=${encodeURIComponent(name)}`;

    const json =
      await fetchJson<SportsDbTeamsResponse>(
        url
      );

    const team =
      json?.teams?.[0];

    const logo =
      compactImage(
        team?.strTeamBadge ??
        team?.strTeamLogo ??
        null
      );

    if (logo) {
      teamLogoCache.set(
        code,
        logo
      );

      return logo;
    }
  }

  teamLogoCache.set(
    code,
    null
  );

  return null;
}

async function hydrateMissingTeamLogos(
  matches: Match[]
): Promise<Match[]> {
  const neededCodes =
    Array.from(
      new Set(
        matches
          .flatMap((match) => [
            match.homeTeam,
            match.awayTeam
          ])
          .filter(
            (team) =>
              !team.logoUrl &&
              team.code !== 'UNK'
          )
          .map(
            (team) =>
              team.code
          )
      )
    );

  await Promise.all(
    neededCodes.map(
      fetchTeamLogoByCode
    )
  );

  return matches.map((match) => {
    const homeLogo =
      match.homeTeam.logoUrl ??
      teamLogoCache.get(
        match.homeTeam.code
      ) ??
      null;

    const awayLogo =
      match.awayTeam.logoUrl ??
      teamLogoCache.get(
        match.awayTeam.code
      ) ??
      null;

    return {
      ...match,

      homeTeam: {
        ...match.homeTeam,
        logoUrl: homeLogo
      },

      awayTeam: {
        ...match.awayTeam,
        logoUrl: awayLogo
      }
    };
  });
}

async function fetchSeasonBrazilMatches(): Promise<Match[]> {
  const url =
    `${SPORTS_DB_URL}/eventsseason.php` +
    `?id=${WORLD_CUP_LEAGUE_ID}&s=${SEASON}`;

  const json =
    await fetchJson<SportsDbEventsResponse>(
      url
    );

  const events =
    json?.events ??
    json?.event ??
    [];

  return events
    .map(mapSportsDbEvent)
    .filter(
      (match): match is Match =>
        Boolean(match)
    )
    .filter(isBrazilMatch);
}

function addDays(
  dateString: string,
  amount: number
): string {
  const date =
    new Date(
      `${dateString}T12:00:00Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
    amount
  );

  return date
    .toISOString()
    .slice(0, 10);
}

async function fetchBrazilMatchesByFallbackDays(): Promise<Match[]> {
  const baseDays =
    FALLBACK_BRAZIL_MATCHES.map(
      (match) =>
        match.startsAt.slice(0, 10)
    );

  const days =
    Array.from(
      new Set(
        baseDays.flatMap((day) => [
          addDays(day, -1),
          day,
          addDays(day, 1)
        ])
      )
    );

  const requests =
    days.map(async (day) => {
      const url =
        `${SPORTS_DB_URL}/eventsday.php` +
        `?d=${day}&l=${WORLD_CUP_LEAGUE_ID}`;

      const json =
        await fetchJson<SportsDbEventsResponse>(
          url
        );

      return (
        json?.events ??
        json?.event ??
        []
      );
    });

  const results =
    await Promise.all(requests);

  return results
    .flat()
    .map(mapSportsDbEvent)
    .filter(
      (match): match is Match =>
        Boolean(match)
    )
    .filter(isBrazilMatch);
}

async function fetchEventById(
  eventId: string
): Promise<Match | null> {
  if (!eventId) {
    return null;
  }

  const url =
    `${SPORTS_DB_URL}/lookupevent.php?id=${encodeURIComponent(eventId)}`;

  const json =
    await fetchJson<SportsDbEventsResponse>(
      url
    );

  const events =
    json?.events ??
    json?.event ??
    [];

  const event =
    events[0];

  if (!event) {
    return null;
  }

  const match =
    mapSportsDbEvent(event);

  if (
    !match ||
    !isBrazilMatch(match)
  ) {
    return null;
  }

  return match;
}

async function fetchKnownBrazilMatches(): Promise<Match[]> {
  const eventIds =
    Array.from(
      new Set([
        BRAZIL_HAITI_EVENT_ID,
        SCOTLAND_BRAZIL_EVENT_ID
      ])
    ).filter(Boolean);

  const results =
    await Promise.all(
      eventIds.map(
        fetchEventById
      )
    );

  return results.filter(
    (match): match is Match =>
      Boolean(match)
  );
}

export async function fetchBrazilMatches(): Promise<Match[]> {
  const [
    seasonMatches,
    dayMatches,
    knownMatches
  ] = await Promise.all([
    fetchSeasonBrazilMatches(),
    fetchBrazilMatchesByFallbackDays(),
    fetchKnownBrazilMatches()
  ]);

  /**
   * Ordem intencional:
   *
   * 1. temporada;
   * 2. consulta por dia;
   * 3. consulta pelo ID exato.
   *
   * Como o merge sobrescreve na ordem,
   * knownMatches tem prioridade.
   */
  const apiMatches = [
    ...seasonMatches,
    ...dayMatches,
    ...knownMatches
  ];

  const mergedMatches =
    apiMatches.length === 0
      ? FALLBACK_BRAZIL_MATCHES
      : mergeMatches(
          apiMatches,
          FALLBACK_BRAZIL_MATCHES
        );

  return hydrateMissingTeamLogos(
    mergedMatches
  );
}  strProgress?: string | null;
};

type SportsDbEventsResponse = {
  events?: SportsDbEvent[] | null;
  event?: SportsDbEvent[] | null;
};

type SportsDbTeam = {
  strTeam?: string | null;
  strTeamBadge?: string | null;
  strTeamLogo?: string | null;
};

type SportsDbTeamsResponse = {
  teams?: SportsDbTeam[] | null;
};

const KNOWN_TEAM_NAMES: Record<TeamCode, string[]> = {
  BRA: ['Brazil', 'Brasil'],
  MAR: ['Morocco', 'Marrocos'],
  HAI: ['Haiti'],
  SCO: ['Scotland', 'Escócia', 'Escocia'],
  UNK: []
};

const teamLogoCache = new Map<TeamCode, string | null>();

function compactImage(url?: string | null): string | null {
  if (!url) return null;
  if (url.endsWith('/preview')) return url;
  return `${url}/preview`;
}

function identifyTeamCode(name: string): TeamCode {
  const normalized = name.toLowerCase();

  if (normalized.includes('brazil') || normalized.includes('brasil')) return 'BRA';
  if (normalized.includes('morocco') || normalized.includes('marrocos')) return 'MAR';
  if (normalized.includes('haiti')) return 'HAI';
  if (normalized.includes('scotland') || normalized.includes('escócia') || normalized.includes('escocia')) return 'SCO';

  return 'UNK';
}

function guessTeam(name: string, logoUrl?: string | null): Team {
  const code = identifyTeamCode(name);

  if (code === 'BRA') return { ...TEAMS.BRA, logoUrl: compactImage(logoUrl) };
  if (code === 'MAR') return { ...TEAMS.MAR, logoUrl: compactImage(logoUrl) };
  if (code === 'HAI') return { ...TEAMS.HAI, logoUrl: compactImage(logoUrl) };
  if (code === 'SCO') return { ...TEAMS.SCO, logoUrl: compactImage(logoUrl) };

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
  let dateTimeString = event.strTimestamp;

  if (!dateTimeString) {
    const date = event.dateEvent ?? '2026-06-13';
    const time = event.strTime?.slice(0, 8) ?? '19:00:00';
    dateTimeString = `${date}T${time}Z`;
  }

  // Converte a string para um objeto Date
  const dateObj = new Date(dateTimeString);

  // Subtrai 3 horas (3 horas * 60 min * 60 seg * 1000 ms = 10800000)
  dateObj.setTime(dateObj.getTime() - 10800000);

  // Retorna no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
  return dateObj.toISOString();
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

function sameMatchup(a: Match, b: Match): boolean {
  return a.homeTeam.code === b.homeTeam.code && a.awayTeam.code === b.awayTeam.code;
}

function sameDayOrClose(a: Match, b: Match): boolean {
  const aTime = new Date(a.startsAt).getTime();
  const bTime = new Date(b.startsAt).getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  return Math.abs(aTime - bTime) <= threeDaysMs;
}

function mergeMatches(apiMatches: Match[], fallbackMatches: Match[]): Match[] {
  const merged = [...fallbackMatches];

  apiMatches.forEach((apiMatch) => {
    const index = merged.findIndex((fallbackMatch) => {
      return sameMatchup(fallbackMatch, apiMatch) && sameDayOrClose(fallbackMatch, apiMatch);
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

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchTeamLogoByCode(code: TeamCode): Promise<string | null> {
  if (code === 'UNK') return null;
  if (teamLogoCache.has(code)) return teamLogoCache.get(code) ?? null;

  const names = KNOWN_TEAM_NAMES[code];

  for (const name of names) {
    const url = `${SPORTS_DB_URL}/searchteams.php?t=${encodeURIComponent(name)}`;
    const json = await fetchJson<SportsDbTeamsResponse>(url);
    const team = json?.teams?.[0];
    const logo = compactImage(team?.strTeamBadge ?? team?.strTeamLogo ?? null);

    if (logo) {
      teamLogoCache.set(code, logo);
      return logo;
    }
  }

  teamLogoCache.set(code, null);
  return null;
}

async function hydrateMissingTeamLogos(matches: Match[]): Promise<Match[]> {
  const neededCodes = Array.from(
    new Set(
      matches
        .flatMap((match) => [match.homeTeam, match.awayTeam])
        .filter((team) => !team.logoUrl && team.code !== 'UNK')
        .map((team) => team.code)
    )
  );

  await Promise.all(neededCodes.map(fetchTeamLogoByCode));

  return matches.map((match) => {
    const homeLogo = match.homeTeam.logoUrl ?? teamLogoCache.get(match.homeTeam.code) ?? null;
    const awayLogo = match.awayTeam.logoUrl ?? teamLogoCache.get(match.awayTeam.code) ?? null;

    return {
      ...match,
      homeTeam: { ...match.homeTeam, logoUrl: homeLogo },
      awayTeam: { ...match.awayTeam, logoUrl: awayLogo }
    };
  });
}

async function fetchSeasonBrazilMatches(): Promise<Match[]> {
  const url = `${SPORTS_DB_URL}/eventsseason.php?id=${WORLD_CUP_LEAGUE_ID}&s=${SEASON}`;
  const json = await fetchJson<SportsDbEventsResponse>(url);
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
    const json = await fetchJson<SportsDbEventsResponse>(url);
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
  const mergedMatches = apiMatches.length === 0
    ? FALLBACK_BRAZIL_MATCHES
    : mergeMatches(apiMatches, FALLBACK_BRAZIL_MATCHES);

  return hydrateMissingTeamLogos(mergedMatches);
}
