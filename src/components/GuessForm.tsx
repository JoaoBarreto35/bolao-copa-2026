import { FormEvent, useState } from 'react';
import { Match, NewGuess } from '../types';

type GuessFormProps = {
  match: Match;
  onSubmit: (guess: NewGuess) => Promise<void>;
};

export function GuessForm({ match, onSubmit }: GuessFormProps) {
  const [personName, setPersonName] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [paid, setPaid] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!personName.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        match_id: match.id,
        person_name: personName.trim(),
        home_score: Number(homeScore),
        away_score: Number(awayScore),
        paid,
        notes: null
      });
      setPersonName('');
      setHomeScore('');
      setAwayScore('');
      setPaid(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="section-heading">
        <span>Admin</span>
        <h2>Adicionar palpite</h2>
        <p>{match.homeTeam.shortName} x {match.awayTeam.shortName}</p>
      </div>

      <label>
        Nome da pessoa
        <input value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="Ex.: João, Mãe, Tio Carlos" required />
      </label>

      <div className="score-input-row">
        <label>
          {match.homeTeam.shortName}
          <input min="0" max="20" type="number" value={homeScore} onChange={(event) => setHomeScore(event.target.value)} required />
        </label>
        <span>×</span>
        <label>
          {match.awayTeam.shortName}
          <input min="0" max="20" type="number" value={awayScore} onChange={(event) => setAwayScore(event.target.value)} required />
        </label>
      </div>

      <label className="checkbox-row">
        <input type="checkbox" checked={paid} onChange={(event) => setPaid(event.target.checked)} />
        Já pagou os R$ 10
      </label>

      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar palpite'}
      </button>
    </form>
  );
}
