import { MatchCard } from '../../components/MatchCard';
import { Guess, Match } from '../../types';
import { calculateBoardSummary } from '../../utils/board';
import { formatCurrency } from '../../utils/formatters';

type HistoryPageProps = {
  matches: Match[];
  guesses: Guess[];
  selectedMatch: Match;
  onSelectMatch: (match: Match) => void;
};

export function HistoryPage({ matches, guesses, selectedMatch, onSelectMatch }: HistoryPageProps) {
  return (
    <main className="history-layout">
      <section className="panel">
        <div className="section-heading">
          <span>Jogos do Brasil</span>
          <h1>Histórico e próximos jogos</h1>
          <p>Toque em um jogo para ver ou cadastrar os palpites daquele confronto.</p>
        </div>

        <div className="match-list-grid">
          {matches.map((match) => {
            const summary = calculateBoardSummary(match, guesses.filter((guess) => guess.match_id === match.id));
            return (
              <div key={match.id} className="history-item">
                <MatchCard match={match} compact selected={selectedMatch.id === match.id} onSelect={onSelectMatch} />
                <div className="history-stats">
                  <span>{summary.totalGuesses} palpite(s)</span>
                  <strong>{formatCurrency(summary.totalPot)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
