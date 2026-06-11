import { FormEvent, useState } from 'react';
import { GuessForm } from '../components/GuessForm';
import { MatchCard } from '../components/MatchCard';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Match, NewGuess } from '../types';

type AdminPageProps = {
  isAdmin: boolean;
  selectedMatch: Match;
  matches: Match[];
  onSelectMatch: (match: Match) => void;
  onAddGuess: (guess: NewGuess) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  error: string | null;
};

export function AdminPage({ isAdmin, selectedMatch, matches, onSelectMatch, onAddGuess, onLogin, error }: AdminPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <main className="admin-layout">
        <form className="panel login-panel" onSubmit={handleLogin}>
          <div className="section-heading">
            <span>Acesso do organizador</span>
            <h1>Entrar para mexer no bolão</h1>
            <p>A tela é simples mesmo: só você precisa ver isso. Sem login, a família continua vendo tudo normalmente.</p>
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
