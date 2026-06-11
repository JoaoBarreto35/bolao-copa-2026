import { FormEvent, useMemo, useState } from 'react';
import { GuessForm } from '../GuessForm';
import { MatchCard } from '../MatchCard';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { Guess, Match, NewGuess } from '../../types';
import { buildWhatsAppGuessesText, copyTextToClipboard } from '../../utils/share';

type AdminPageProps = {
  isAdmin: boolean;
  selectedMatch: Match;
  matches: Match[];
  guesses: Guess[];
  onSelectMatch: (match: Match) => void;
  onAddGuess: (guess: NewGuess) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  error: string | null;
};

export function AdminPage({ isAdmin, selectedMatch, matches, guesses, onSelectMatch, onAddGuess, onLogin, error }: AdminPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const selectedMatchGuesses = useMemo(() => guesses.filter((guess) => guess.match_id === selectedMatch.id), [guesses, selectedMatch.id]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyGuesses() {
    const text = buildWhatsAppGuessesText(selectedMatch, guesses);

    try {
      await copyTextToClipboard(text);
      setCopyFeedback('Palpites copiados! Agora é só colar no WhatsApp.');
      window.setTimeout(() => setCopyFeedback(null), 3000);
    } catch {
      setCopyFeedback('Não consegui copiar automaticamente. Se acontecer de novo, me avisa que fazemos um campo manual.');
      window.setTimeout(() => setCopyFeedback(null), 4000);
    }
  }

  if (!isAdmin) {
    return (
      <main className="admin-layout">
        <form className="panel login-panel" onSubmit={handleLogin}>
          <div className="section-heading">
            <span>Acesso do organizador</span>
            <h1>Entrar para mexer no bolão</h1>
            <p>Apenas para o organizador.</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="alert-box">
              Supabase ainda não configurado. Preencha o arquivo <strong>.env</strong> antes de entrar.
            </div>
          )}

          {error && <div className="alert-box danger">{error}</div>}

          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" required />
          </label>

          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" required />
          </label>

          <button className="primary-button" type="submit" disabled={loading || !isSupabaseConfigured}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-layout wide">
      <section className="panel">
        <div className="section-heading">
          <span>Escolha o jogo</span>
          <h1>Gerenciar palpites</h1>
          <p>Um participante pode ter quantos palpites quiser. Cada palpite conta R$ 10.</p>
        </div>

        <div className="admin-share-box">
          <div>
            <strong>Compartilhar no WhatsApp</strong>
            <p>
              Copia os {selectedMatchGuesses.length} palpite{selectedMatchGuesses.length === 1 ? '' : 's'} de {selectedMatch.homeTeam.shortName} x{' '}
              {selectedMatch.awayTeam.shortName} em formato organizado para mandar no grupo.
            </p>
          </div>
          <button type="button" className="share-button" onClick={handleCopyGuesses}>
            📋 Copiar palpites
          </button>
          {copyFeedback && <span className="copy-feedback">{copyFeedback}</span>}
        </div>

        <div className="match-list-grid">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} compact selected={selectedMatch.id === match.id} onSelect={onSelectMatch} />
          ))}
        </div>
      </section>

      <GuessForm match={selectedMatch} onSubmit={onAddGuess} />
    </main>
  );
}
