import { Guess, Match } from '../types';

type GuessListProps = {
  guesses: Guess[];
  match: Match;
  isAdmin: boolean;
  winnerIds: string[];
  onTogglePaid: (guess: Guess) => void;
  onDelete: (guess: Guess) => void;
};

export function GuessList({ guesses, match, isAdmin, winnerIds, onTogglePaid, onDelete }: GuessListProps) {
  if (guesses.length === 0) {
    return (
      <div className="empty-state">
        <strong>Nenhum palpite ainda.</strong>
        <span>Quando você adicionar os palpites, eles aparecem aqui para todo mundo acompanhar.</span>
      </div>
    );
  }

  return (
    <div className="guess-list">
      {guesses.map((guess) => {
        const isWinner = winnerIds.includes(guess.id);
        const isExactWhileLive = match.status === 'live' && match.homeScore === guess.home_score && match.awayScore === guess.away_score;

        return (
          <article key={guess.id} className={`guess-card ${isWinner ? 'winner' : ''} ${isExactWhileLive ? 'alive' : ''}`}>
            <div className="guess-main">
              <strong>{guess.person_name}</strong>

              <div className="guess-matchup" aria-label={`Palpite: ${match.homeTeam.shortName} ${guess.home_score} a ${guess.away_score} ${match.awayTeam.shortName}`}>
                <span className="guess-team">{match.homeTeam.shortName}</span>
                <span className="guess-score">{guess.home_score} × {guess.away_score}</span>
                <span className="guess-team">{match.awayTeam.shortName}</span>
              </div>
            </div>

            <div className="guess-badges">
              {isWinner && <span className="badge trophy">🏆 Ganhou</span>}
              {isExactWhileLive && <span className="badge live">🔥 Batendo agora</span>}
              <span className={`badge ${guess.paid ? 'paid' : 'pending'}`}>{guess.paid ? 'Pago' : 'Pendente'}</span>
            </div>

            {isAdmin && (
              <div className="guess-actions">
                <button type="button" onClick={() => onTogglePaid(guess)}>
                  {guess.paid ? 'Marcar pendente' : 'Marcar pago'}
                </button>
                <button className="danger" type="button" onClick={() => onDelete(guess)}>
                  Excluir
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
