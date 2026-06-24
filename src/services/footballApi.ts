import { FALLBACK_BRAZIL_MATCHES } from '../data';
import { Match } from '../types';

/**
 * CONTROLE TEMPORÁRIO
 *
 * true  = ignora completamente a API e usa somente o fallback.
 * false = depois você pode restaurar o arquivo da API.
 */
const FORCE_FALLBACK = true;

/**
 * Cria uma cópia dos jogos para evitar alteração acidental
 * dos objetos importados de data.ts.
 */
function getFallbackMatches(): Match[] {
  return FALLBACK_BRAZIL_MATCHES.map((match) => ({
    ...match,

    homeTeam: {
      ...match.homeTeam
    },

    awayTeam: {
      ...match.awayTeam
    }
  }));
}

/**
 * Essa é a função consumida pela Home.
 *
 * Enquanto FORCE_FALLBACK estiver como true,
 * nenhuma requisição será feita à TheSportsDB.
 */
export async function fetchBrazilMatches(): Promise<Match[]> {
  if (FORCE_FALLBACK) {
    console.warn(
      '[Bolão] API desativada: usando somente os jogos do fallback.'
    );

    return getFallbackMatches();
  }

  /*
   * Segurança adicional:
   * mesmo que FORCE_FALLBACK seja alterado para false,
   * esta versão ainda mantém o fallback.
   *
   * Quando quiser reativar a API, restaure o arquivo anterior.
   */
  return getFallbackMatches();
}
