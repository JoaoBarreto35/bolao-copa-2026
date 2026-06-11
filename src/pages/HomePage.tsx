import { GuessList } from '../components/GuessList';
import { MatchCard } from '../components/MatchCard';
import { SummaryCards } from '../components/SummaryCards';
import { Guess, Match } from '../types';
import { calculateBoardSummary } from '../utils/board';
import { formatCurrency } from '../utils/formatters';

type HomePageProps = {
  match: Match;
  guesses: Guess[];
  isAdmin: boolean;
  loading: boolean;
  onTogglePaid: (guess: Guess) => void;
  onDelete: (guess: Guess) => void;
};

export function HomePage({ match, guesses, isAdmin, loading, onTogglePaid, onDelete }: HomePageProps) {
  const matchGuesses = guesses.filter((guess) => guess.match_id === match.id);
  const summary = calculateBoardSummary(match, matchGuesses);
  const winnerIds = summary.winners.map((winner) => winner.id);

  return (
    <main className="page-grid">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Copa do Mundo 2026 • Bolão da família Barreto</span>
          <h1>Brasil jogando e familia reunida, nada melhor</h1>
          <p>
            Cada palpite custa R$ 10. Se duas ou mais pessoas acertarem o placar, o prêmio é dividido igualmente.
          </p>
        </div>
        <div className="mascot-card" aria-hidden="true">
          <span>🏆</span>
          <strong>Rumo ao Hexa</strong>
        </div>
      </section>

      <section className="main-column">
        <MatchCard match={match} />
        <SummaryCards summary={summary} />

        {match.status === 'finished' && summary.winners.length > 0 && (
          <div className="winner-banner">
            <span>🏆</span>
            <div>
              <strong>Ganhador{summary.winners.length > 1 ? 'es' : ''}: {summary.winners.map((winner) => winner.person_name).join(', ')}</strong>
              <p>Prêmio por pessoa: {formatCurrency(summary.prizePerWinner)}</p>
            </div>
          </div>
        )}

        {match.status === 'finished' && summary.winners.length === 0 && (
          <div className="winner-banner muted">
            <span>😅</span>
            <div>
              <strong>Ninguém acertou esse placar.</strong>
              <p>O dinheiro será devolvido.</p>
            </div>
          </div>
        )}

        <section className="panel">
          <div className="section-heading row">
            <div>
              <span>Palpites</span>
              <h2>{match.homeTeam.shortName} x {match.awayTeam.shortName}</h2>
            </div>
            {loading && <small>Atualizando...</small>}
          </div>
          <GuessList guesses={matchGuesses} match={match} isAdmin={isAdmin} winnerIds={winnerIds} onTogglePaid={onTogglePaid} onDelete={onDelete} />
        </section>
      </section>
    </main>
  );
}
