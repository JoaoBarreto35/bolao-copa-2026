import { Session } from '@supabase/supabase-js';

type HeaderProps = {
  session: Session | null;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
};

export function Header({ session, currentPage, onNavigate, onLogout }: HeaderProps) {
  const navItems = [
    { id: 'home', label: 'Bolão' },
    { id: 'history', label: 'Jogos' },
    { id: 'admin', label: session ? 'Admin' : 'Entrar' }
  ];

  return (
    <header className="app-header">
      <button className="brand" type="button" onClick={() => onNavigate('home')} aria-label="Ir para o início">
        <span className="brand-icon">🇧🇷</span>
        <span>
          <strong>Bolão BR 2026</strong>
          <small>Família na torcida</small>
        </span>
      </button>

      <nav className="nav-tabs" aria-label="Navegação principal">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={currentPage === item.id ? 'active' : ''}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
        {session && (
          <button className="logout-button" type="button" onClick={onLogout}>
            Sair
          </button>
        )}
      </nav>
    </header>
  );
}
