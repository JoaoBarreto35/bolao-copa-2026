import { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { AdminPage } from './pages/AdminPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { FALLBACK_BRAZIL_MATCHES } from './data';
import { getSession, signIn, signOut } from './services/authService';
import { createGuess, deleteGuess, listGuesses, toggleGuessPaid } from './services/guessService';
import { fetchBrazilMatches } from './services/footballApi';
import { Guess, Match, NewGuess } from './types';
import { getCurrentDisplayMatch } from './utils/board';

type Page = 'home' | 'history' | 'admin';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [matches, setMatches] = useState<Match[]>(FALLBACK_BRAZIL_MATCHES);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayMatch = useMemo(() => {
    if (selectedMatchId) {
      return matches.find((match) => match.id === selectedMatchId) ?? getCurrentDisplayMatch(matches);
    }
    return getCurrentDisplayMatch(matches);
  }, [matches, selectedMatchId]);

  const loadGuesses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listGuesses();
      setGuesses(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar palpites.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    const result = await fetchBrazilMatches();
    setMatches(result);
  }, []);

  useEffect(() => {
    getSession().then(setSession).catch(() => setSession(null));
    loadMatches();
    loadGuesses();

    const interval = window.setInterval(() => {
      loadMatches();
      loadGuesses();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [loadGuesses, loadMatches]);

  async function handleLogin(email: string, password: string) {
    setError(null);
    try {
      await signIn(email, password);
      const currentSession = await getSession();
      setSession(currentSession);
      setPage('admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.');
    }
  }

  async function handleLogout() {
    await signOut();
    setSession(null);
    setPage('home');
  }

  async function handleAddGuess(guess: NewGuess) {
    setError(null);
    try {
      const created = await createGuess(guess);
      setGuesses((current) => [...current, created]);
      setPage('home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar palpite.');
      throw err;
    }
  }

  async function handleTogglePaid(guess: Guess) {
    if (!session) return;
    try {
      await toggleGuessPaid(guess.id, !guess.paid);
      setGuesses((current) => current.map((item) => (item.id === guess.id ? { ...item, paid: !item.paid } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar pagamento.');
    }
  }

  async function handleDelete(guess: Guess) {
    if (!session) return;
    const confirmed = window.confirm(`Excluir o palpite de ${guess.person_name}?`);
    if (!confirmed) return;

    try {
      await deleteGuess(guess.id);
      setGuesses((current) => current.filter((item) => item.id !== guess.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir palpite.');
    }
  }

  function handleSelectMatch(match: Match) {
    setSelectedMatchId(match.id);
    setPage('home');
  }

  return (
    <div className="app-shell">
      <div className="background-orb one" />
      <div className="background-orb two" />

      <Header session={session} currentPage={page} onNavigate={(nextPage) => setPage(nextPage as Page)} onLogout={handleLogout} />

      {error && page !== 'admin' && (
        <div className="global-error" role="alert">
          {error}
        </div>
      )}

      {page === 'home' && (
        <HomePage match={displayMatch} guesses={guesses} isAdmin={Boolean(session)} loading={loading} onTogglePaid={handleTogglePaid} onDelete={handleDelete} />
      )}

      {page === 'history' && (
        <HistoryPage matches={matches} guesses={guesses} selectedMatch={displayMatch} onSelectMatch={handleSelectMatch} />
      )}

      {page === 'admin' && (
        <AdminPage
          isAdmin={Boolean(session)}
          selectedMatch={displayMatch}
          matches={matches}
          onSelectMatch={(match) => setSelectedMatchId(match.id)}
          onAddGuess={handleAddGuess}
          onLogin={handleLogin}
          error={error}
        />
      )}
    </div>
  );
}

export default App;
