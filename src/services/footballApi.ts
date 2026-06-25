import {
  FALLBACK_BRAZIL_MATCHES,
  TEAMS
} from '../data';

import {
  Match,
  MatchStatus,
  Team,
  TeamCode
} from '../types';

/**
 * FLUXO DA INTEGRAÇÃO
 *
 * 1. Jogos encerrados vêm exclusivamente do data.ts.
 *
 * 2. O próximo jogo fica previamente cadastrado no data.ts.
 *
 * 3. Caso ainda não exista apiFixtureId:
 *    - consulta eventsday.php somente para a data do próximo jogo;
 *    - procura um evento em que o Brasil seja mandante ou visitante;
 *    - salva o idEvent retornado.
 *
 * 4. Caso já exista apiFixtureId:
 *    - consulta lookupevent.php diretamente.
 *
 * 5. Quando o jogo for finalizado:
 *    - o serviço deixa de consultá-lo;
 *    - o resultado fica armazenado no localStorage;
 *    - posteriormente ele deve ser consolidado no data.ts.
 *
 * Resultado:
 * - no máximo uma requisição por ciclo;
 * - nenhuma consulta de jogos antigos;
 * - nenhuma consulta da temporada inteira;
 * - nenhuma busca repetida pelo time Brasil;
 * - nenhuma dependência de o Brasil ser mandante.
 */

const SPORTS_DB_BASE_URL =
  'https://www.thesportsdb.com/api/v1/json';

const SPORTS_DB_KEY =
  process.env.REACT_APP_THESPORTSDB_API_KEY ??
  '123';

const WORLD_CUP_LEAGUE_ID =
  process.env.REACT_APP_THESPORTSDB_WORLD_CUP_LEAGUE_ID ??
  '4429';

const BRAZIL_TEAM_ID =
  process.env.REACT_APP_THESPORTSDB_BRAZIL_TEAM_ID ??
  '134496';

const SPORTS_DB_URL =
  `${SPORTS_DB_BASE_URL}/${SPORTS_DB_KEY}`;

/**
 * Impede requisições duplicadas do React.StrictMode.
 *
 * Se a Home solicitar novamente dentro desse período,
 * o resultado anterior será reaproveitado.
 */
const REQUEST_CACHE_DURATION_MS =
  55 * 1000;

/**
 * Guarda os jogos enriquecidos pela API.
 *
 * Esse armazenamento é persistente:
 * - mantém apiFixtureId;
 * - mantém adversário;
 * - mantém placar;
 * - mantém status;
 * - sobrevive ao recarregamento da página.
 */
const MATCH_STATE_STORAGE_KEY =
  'bolao-brazil-match-state-v2';

/**
 * Controla apenas a frequência das requisições.
 */
const REQUEST_CACHE_STORAGE_KEY =
  'bolao-brazil-request-cache-v2';

type SportsDbEvent = {
  idEvent?: string | null;

  strEvent?: string | null;
  strEventAlternate?: string | null;

  idLeague?: string | null;
  strLeague?: string | null;
  strSeason?: string | null;

  intRound?: string | number | null;
  strRound?: string | null;

  idHomeTeam?: string | null;
  idAwayTeam?: string | null;

  strHomeTeam?: string | null;
  strAwayTeam?: string | null;

  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;

  intHomeScore?: string | number | null;
  intAwayScore?: string | number | null;

  strTimestamp?: string | null;
  dateEvent?: string | null;
  dateEventLocal?: string | null;

  strTime?: string | null;
  strTimeLocal?: string | null;

  strVenue?: string | null;
  strCity?: string | null;
  strCountry?: string | null;

  strStatus?: string | null;
  strProgress?: string | null;

  strPostponed?: string | null;
};

type SportsDbEventsResponse = {
  events?: SportsDbEvent[] | null;
  event?: SportsDbEvent[] | null;
  results?: SportsDbEvent[] | null;
};

type StoredMatchState = {
  matches: Match[];
  updatedAt: number;
};

type RequestCache = {
  matches: Match[];
  expiresAt: number;
};

let memoryRequestCache: RequestCache | null =
  null;

let pendingRequest:
  | Promise<Match[]>
  | null = null;

function normalizeText(
  value: string
): string {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .trim();
}

function cloneTeam(
  team: Team
): Team {
  return {
    ...team
  };
}

function cloneMatch(
  match: Match
): Match {
  return {
    ...match,

    homeTeam:
      cloneTeam(
        match.homeTeam
      ),

    awayTeam:
      cloneTeam(
        match.awayTeam
      )
  };
}

function cloneMatches(
  matches: Match[]
): Match[] {
  return matches.map(
    cloneMatch
  );
}

function getFallbackMatches(): Match[] {
  return cloneMatches(
    FALLBACK_BRAZIL_MATCHES
  );
}

function compactImage(
  url?: string | null
): string | null {
  if (!url) {
    return null;
  }

  if (
    url.endsWith('/preview')
  ) {
    return url;
  }

  return `${url}/preview`;
}

function identifyTeamCode(
  teamName: string
): TeamCode {
  const normalizedName =
    normalizeText(teamName);

  if (
    normalizedName.includes(
      'brazil'
    ) ||
    normalizedName.includes(
      'brasil'
    )
  ) {
    return 'BRA';
  }

  if (
    normalizedName.includes(
      'morocco'
    ) ||
    normalizedName.includes(
      'marrocos'
    )
  ) {
    return 'MAR';
  }

  if (
    normalizedName.includes(
      'haiti'
    )
  ) {
    return 'HAI';
  }

  if (
    normalizedName.includes(
      'scotland'
    ) ||
    normalizedName.includes(
      'escocia'
    )
  ) {
    return 'SCO';
  }

  return 'UNK';
}

function getKnownTeam(
  code: TeamCode
): Team | null {
  if (
    code === 'BRA'
  ) {
    return TEAMS.BRA;
  }

  if (
    code === 'MAR'
  ) {
    return TEAMS.MAR;
  }

  if (
    code === 'HAI'
  ) {
    return TEAMS.HAI;
  }

  if (
    code === 'SCO'
  ) {
    return TEAMS.SCO;
  }

  return null;
}

function createTeam(
  name: string,
  badgeUrl?: string | null
): Team {
  const code =
    identifyTeamCode(name);

  const knownTeam =
    getKnownTeam(code);

  const logoUrl =
    compactImage(badgeUrl);

  if (
    knownTeam
  ) {
    return {
      ...knownTeam,

      logoUrl:
        logoUrl ??
        knownTeam.logoUrl
    };
  }

  return {
    name,
    shortName: name,
    code: 'UNK',
    flag: '🏳️',
    logoUrl
  };
}

function parseScore(
  value?: string | number | null
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const parsedValue =
    Number(value);

  return Number.isFinite(
    parsedValue
  )
    ? parsedValue
    : null;
}

/**
 * A resposta da TheSportsDB utiliza strTimestamp
 * como referência principal.
 *
 * Quando o timestamp não possui timezone explícito,
 * ele é interpretado como UTC.
 *
 * A conversão para America/Sao_Paulo deve acontecer
 * apenas na interface.
 */
function parseStartsAt(
  event: SportsDbEvent
): string {
  if (
    event.strTimestamp
  ) {
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

    const parsedTimestamp =
      new Date(
        normalizedTimestamp
      );

    if (
      !Number.isNaN(
        parsedTimestamp.getTime()
      )
    ) {
      return parsedTimestamp
        .toISOString();
    }
  }

  const date =
    event.dateEvent ??
    event.dateEventLocal;

  const time =
    event.strTime ??
    event.strTimeLocal;

  if (
    date &&
    time
  ) {
    const normalizedTime =
      time.slice(0, 8);

    const parsedDate =
      new Date(
        `${date}T${normalizedTime}Z`
      );

    if (
      !Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return parsedDate
        .toISOString();
    }
  }

  return new Date()
    .toISOString();
}

function includesStatus(
  status: string,
  possibleStatuses: string[]
): boolean {
  return possibleStatuses.some(
    (possibleStatus) =>
      status === possibleStatus ||
      status.includes(
        possibleStatus
      )
  );
}

function getMatchStatus(
  event: SportsDbEvent
): MatchStatus {
  const normalizedStatus =
    normalizeText(
      `${event.strStatus ?? ''} ${event.strProgress ?? ''}`
    );

  const finishedStatuses = [
    'ft',
    'finished',
    'match finished',
    'full time',
    'aet',
    'after extra time',
    'pen',
    'penalties'
  ];

  if (
    includesStatus(
      normalizedStatus,
      finishedStatuses
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
    'paused',
    'in progress'
  ];

  if (
    includesStatus(
      normalizedStatus,
      liveStatuses
    )
  ) {
    return 'live';
  }

  const postponedStatuses = [
    'postponed',
    'cancelled',
    'canceled',
    'suspended'
  ];

  if (
    event.strPostponed === 'yes' ||
    includesStatus(
      normalizedStatus,
      postponedStatuses
    )
  ) {
    return 'scheduled';
  }

  const startsAt =
    new Date(
      parseStartsAt(event)
    ).getTime();

  const now =
    Date.now();

  const estimatedDuration =
    3 *
    60 *
    60 *
    1000;

  const homeScore =
    parseScore(
      event.intHomeScore
    );

  const awayScore =
    parseScore(
      event.intAwayScore
    );

  if (
    homeScore !== null &&
    awayScore !== null &&
    now >
      startsAt +
      estimatedDuration
  ) {
    return 'finished';
  }

  if (
    now >= startsAt &&
    now <=
      startsAt +
      estimatedDuration
  ) {
    return 'live';
  }

  return 'scheduled';
}

function getMatchMinute(
  event: SportsDbEvent
): number | null {
  const progress =
    event.strProgress ??
    event.strStatus ??
    '';

  const minuteMatch =
    progress.match(/\d+/);

  if (
    !minuteMatch
  ) {
    return null;
  }

  const minute =
    Number(
      minuteMatch[0]
    );

  return Number.isFinite(
    minute
  )
    ? minute
    : null;
}

function getRoundName(
  event: SportsDbEvent,
  fallbackRound: string
): string {
  if (
    event.strRound
  ) {
    return event.strRound;
  }

  if (
    event.intRound !== undefined &&
    event.intRound !== null
  ) {
    const numericRound =
      Number(
        event.intRound
      );

    if (
      numericRound === 1
    ) {
      return 'Fase de grupos';
    }

    return `Rodada ${numericRound}`;
  }

  return (
    event.strLeague ??
    fallbackRound
  );
}

function isBrazilEvent(
  event: SportsDbEvent
): boolean {
  if (
    event.idHomeTeam ===
      BRAZIL_TEAM_ID ||
    event.idAwayTeam ===
      BRAZIL_TEAM_ID
  ) {
    return true;
  }

  const homeTeamCode =
    identifyTeamCode(
      event.strHomeTeam ??
      ''
    );

  const awayTeamCode =
    identifyTeamCode(
      event.strAwayTeam ??
      ''
    );

  return (
    homeTeamCode ===
      'BRA' ||
    awayTeamCode ===
      'BRA'
  );
}

function mapApiEventToMatch(
  event: SportsDbEvent,
  localMatch: Match
): Match | null {
  const homeTeamName =
    event.strHomeTeam ??
    '';

  const awayTeamName =
    event.strAwayTeam ??
    '';

  if (
    !homeTeamName ||
    !awayTeamName ||
    !isBrazilEvent(event)
  ) {
    return null;
  }

  const homeTeam =
    createTeam(
      homeTeamName,
      event.strHomeTeamBadge
    );

  const awayTeam =
    createTeam(
      awayTeamName,
      event.strAwayTeamBadge
    );

  const fixtureId =
    event.idEvent
      ? Number(
          event.idEvent
        )
      : localMatch.apiFixtureId;

  return {
    ...localMatch,

    /**
     * Mantém o ID usado pelos palpites do Supabase.
     */
    id:
      localMatch.id,

    apiFixtureId:
      fixtureId,

    homeTeam,
    awayTeam,

    startsAt:
      parseStartsAt(event),

    stadium:
      event.strVenue ??
      localMatch.stadium,

    city:
      event.strCity ??
      event.strCountry ??
      localMatch.city,

    status:
      getMatchStatus(event),

    minute:
      getMatchMinute(event),

    homeScore:
      parseScore(
        event.intHomeScore
      ),

    awayScore:
      parseScore(
        event.intAwayScore
      ),

    round:
      getRoundName(
        event,
        localMatch.round
      )
  };
}

function getEventsFromResponse(
  response: SportsDbEventsResponse | null
): SportsDbEvent[] {
  if (
    !response
  ) {
    return [];
  }

  return (
    response.events ??
    response.event ??
    response.results ??
    []
  );
}

async function fetchJson<T>(
  url: string
): Promise<T | null> {
  try {
    const separator =
      url.includes('?')
        ? '&'
        : '?';

    const requestUrl =
      `${url}${separator}_=${Date.now()}`;

    const response =
      await fetch(
        requestUrl,
        {
          cache: 'no-store',

          headers: {
            Accept:
              'application/json'
          }
        }
      );

    if (
      !response.ok
    ) {
      console.warn(
        '[Bolão] Erro HTTP na TheSportsDB:',
        response.status,
        url
      );

      return null;
    }

    return (
      await response.json()
    ) as T;
  } catch (error) {
    console.warn(
      '[Bolão] Não foi possível consultar a TheSportsDB:',
      url,
      error
    );

    return null;
  }
}

function getMatchApiDate(
  match: Match
): string {
  /**
   * O startsAt do data.ts contém o horário brasileiro.
   *
   * Usamos a parte YYYY-MM-DD cadastrada manualmente,
   * pois é a data em que sabemos que o jogo acontecerá.
   */
  return match.startsAt.slice(
    0,
    10
  );
}

async function discoverMatchByDate(
  localMatch: Match
): Promise<Match | null> {
  const date =
    getMatchApiDate(
      localMatch
    );

  const url =
    `${SPORTS_DB_URL}/eventsday.php` +
    `?d=${encodeURIComponent(date)}` +
    `&l=${encodeURIComponent(WORLD_CUP_LEAGUE_ID)}`;

  console.info(
    '[Bolão] Procurando o jogo do Brasil na data:',
    date
  );

  const response =
    await fetchJson<SportsDbEventsResponse>(
      url
    );

  const brazilEvent =
    getEventsFromResponse(
      response
    ).find(
      isBrazilEvent
    );

  if (
    !brazilEvent
  ) {
    console.warn(
      '[Bolão] Nenhum jogo do Brasil encontrado em:',
      date
    );

    return null;
  }

  console.info(
    '[Bolão] Evento do Brasil descoberto:',
    {
      idEvent:
        brazilEvent.idEvent,

      jogo:
        `${brazilEvent.strHomeTeam} x ${brazilEvent.strAwayTeam}`
    }
  );

  return mapApiEventToMatch(
    brazilEvent,
    localMatch
  );
}

async function fetchMatchByFixtureId(
  localMatch: Match
): Promise<Match | null> {
  if (
    !localMatch.apiFixtureId
  ) {
    return null;
  }

  const url =
    `${SPORTS_DB_URL}/lookupevent.php` +
    `?id=${encodeURIComponent(String(localMatch.apiFixtureId))}`;

  console.info(
    '[Bolão] Atualizando evento diretamente:',
    localMatch.apiFixtureId
  );

  const response =
    await fetchJson<SportsDbEventsResponse>(
      url
    );

  const event =
    getEventsFromResponse(
      response
    ).find(
      isBrazilEvent
    );

  if (
    !event
  ) {
    console.warn(
      '[Bolão] Evento não encontrado pelo ID:',
      localMatch.apiFixtureId
    );

    return null;
  }

  return mapApiEventToMatch(
    event,
    localMatch
  );
}

function sortMatches(
  matches: Match[]
): Match[] {
  return [...matches].sort(
    (a, b) =>
      new Date(
        a.startsAt
      ).getTime() -
      new Date(
        b.startsAt
      ).getTime()
  );
}

function mergeMatchIntoList(
  matches: Match[],
  updatedMatch: Match
): Match[] {
  const updatedMatches =
    matches.map(
      (match) =>
        match.id ===
        updatedMatch.id
          ? cloneMatch(
              updatedMatch
            )
          : cloneMatch(
              match
            )
    );

  const exists =
    updatedMatches.some(
      (match) =>
        match.id ===
        updatedMatch.id
    );

  if (
    !exists
  ) {
    updatedMatches.push(
      cloneMatch(
        updatedMatch
      )
    );
  }

  return sortMatches(
    updatedMatches
  );
}

function readStoredMatchState(): Match[] {
  if (
    typeof window ===
    'undefined'
  ) {
    return [];
  }

  try {
    const rawState =
      window.localStorage.getItem(
        MATCH_STATE_STORAGE_KEY
      );

    if (
      !rawState
    ) {
      return [];
    }

    const parsedState =
      JSON.parse(
        rawState
      ) as StoredMatchState;

    if (
      !Array.isArray(
        parsedState.matches
      )
    ) {
      return [];
    }

    return cloneMatches(
      parsedState.matches
    );
  } catch {
    return [];
  }
}

function saveStoredMatchState(
  matches: Match[]
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  try {
    const state: StoredMatchState = {
      matches:
        cloneMatches(
          matches
        ),

      updatedAt:
        Date.now()
    };

    window.localStorage.setItem(
      MATCH_STATE_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // O aplicativo continua funcionando sem localStorage.
  }
}

/**
 * O data.ts sempre é a base.
 *
 * O estado armazenado apenas complementa os jogos que ainda
 * possuem o mesmo ID local.
 */
function mergeStoredStateWithFallback(
  fallbackMatches: Match[],
  storedMatches: Match[]
): Match[] {
  const mergedMatches =
    fallbackMatches.map(
      (fallbackMatch) => {
        const storedMatch =
          storedMatches.find(
            (match) =>
              match.id ===
              fallbackMatch.id
          );

        if (
          !storedMatch
        ) {
          return cloneMatch(
            fallbackMatch
          );
        }

        return {
          ...fallbackMatch,
          ...storedMatch,

          id:
            fallbackMatch.id,

          homeTeam: {
            ...fallbackMatch.homeTeam,
            ...storedMatch.homeTeam
          },

          awayTeam: {
            ...fallbackMatch.awayTeam,
            ...storedMatch.awayTeam
          }
        };
      }
    );

  return sortMatches(
    mergedMatches
  );
}

/**
 * Seleciona apenas um jogo para consultar.
 *
 * Prioridade:
 * 1. jogo ao vivo;
 * 2. primeiro jogo agendado;
 * 3. nenhum jogo, caso todos estejam finalizados.
 */
function selectMatchToUpdate(
  matches: Match[]
): Match | null {
  const liveMatch =
    matches.find(
      (match) =>
        match.status ===
        'live'
    );

  if (
    liveMatch
  ) {
    return liveMatch;
  }

  const scheduledMatches =
    matches
      .filter(
        (match) =>
          match.status ===
          'scheduled'
      )
      .sort(
        (a, b) =>
          new Date(
            a.startsAt
          ).getTime() -
          new Date(
            b.startsAt
          ).getTime()
      );

  return (
    scheduledMatches[0] ??
    null
  );
}

function readRequestCache(): RequestCache | null {
  if (
    typeof window ===
    'undefined'
  ) {
    return null;
  }

  try {
    const rawCache =
      window.localStorage.getItem(
        REQUEST_CACHE_STORAGE_KEY
      );

    if (
      !rawCache
    ) {
      return null;
    }

    const parsedCache =
      JSON.parse(
        rawCache
      ) as RequestCache;

    if (
      !Array.isArray(
        parsedCache.matches
      ) ||
      typeof parsedCache.expiresAt !==
        'number'
    ) {
      return null;
    }

    return {
      matches:
        cloneMatches(
          parsedCache.matches
        ),

      expiresAt:
        parsedCache.expiresAt
    };
  } catch {
    return null;
  }
}

function saveRequestCache(
  cache: RequestCache
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      REQUEST_CACHE_STORAGE_KEY,
      JSON.stringify(cache)
    );
  } catch {
    // O aplicativo continua normalmente.
  }
}

function getValidRequestCache(): Match[] | null {
  const now =
    Date.now();

  if (
    memoryRequestCache &&
    memoryRequestCache.expiresAt >
      now
  ) {
    return cloneMatches(
      memoryRequestCache.matches
    );
  }

  const storedCache =
    readRequestCache();

  if (
    storedCache &&
    storedCache.expiresAt >
      now
  ) {
    memoryRequestCache =
      storedCache;

    return cloneMatches(
      storedCache.matches
    );
  }

  return null;
}

async function requestBrazilMatches(): Promise<Match[]> {
  const fallbackMatches =
    getFallbackMatches();

  const storedMatches =
    readStoredMatchState();

  const currentMatches =
    mergeStoredStateWithFallback(
      fallbackMatches,
      storedMatches
    );

  const matchToUpdate =
    selectMatchToUpdate(
      currentMatches
    );

  /**
   * Todos os jogos do data.ts já estão encerrados.
   *
   * Nesse caso, não há motivo para chamar a API.
   */
  if (
    !matchToUpdate
  ) {
    console.info(
      '[Bolão] Todos os jogos conhecidos estão finalizados. Nenhuma chamada à API foi feita.'
    );

    return currentMatches;
  }

  let updatedMatch:
    | Match
    | null;

  /**
   * Exatamente uma das duas funções é executada:
   *
   * - sem ID: eventsday.php;
   * - com ID: lookupevent.php.
   */
  if (
    matchToUpdate.apiFixtureId
  ) {
    updatedMatch =
      await fetchMatchByFixtureId(
        matchToUpdate
      );
  } else {
    updatedMatch =
      await discoverMatchByDate(
        matchToUpdate
      );
  }

  if (
    !updatedMatch
  ) {
    console.warn(
      '[Bolão] Não foi possível atualizar o próximo jogo. Mantendo os dados locais.'
    );

    return currentMatches;
  }

  const mergedMatches =
    mergeMatchIntoList(
      currentMatches,
      updatedMatch
    );

  saveStoredMatchState(
    mergedMatches
  );

  console.info(
    '[Bolão] Jogo atualizado:',
    {
      id:
        updatedMatch.id,

      apiFixtureId:
        updatedMatch.apiFixtureId,

      jogo:
        `${updatedMatch.homeTeam.name} x ${updatedMatch.awayTeam.name}`,

      status:
        updatedMatch.status,

      placar:
        `${updatedMatch.homeScore ?? '-'} x ${updatedMatch.awayScore ?? '-'}`,

      inicio:
        updatedMatch.startsAt
    }
  );

  return mergedMatches;
}

export async function fetchBrazilMatches(): Promise<Match[]> {
  const cachedMatches =
    getValidRequestCache();

  if (
    cachedMatches
  ) {
    return cachedMatches;
  }

  /**
   * Evita duas requisições simultâneas causadas pelo
   * React.StrictMode durante o desenvolvimento.
   */
  if (
    pendingRequest
  ) {
    return pendingRequest;
  }

  pendingRequest =
    requestBrazilMatches();

  try {
    const matches =
      await pendingRequest;

    const requestCache: RequestCache = {
      matches:
        cloneMatches(
          matches
        ),

      expiresAt:
        Date.now() +
        REQUEST_CACHE_DURATION_MS
    };

    memoryRequestCache =
      requestCache;

    saveRequestCache(
      requestCache
    );

    return cloneMatches(
      matches
    );
  } finally {
    pendingRequest =
      null;
  }
}