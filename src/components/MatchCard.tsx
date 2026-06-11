import { Match } from '../types';
import { formatDateTime } from '../utils/formatters';

type MatchCardProps = {
  match: Match;
  compact?: boolean;
  selected?: boolean;
  onSelect?: (match: Match) => void;
};


function TeamLogo({ teamName, flag, logoUrl }: { teamName: string; flag: string; logoUrl?: string | null }) {
  if (logoUrl) {
    return <img className="team-logo" src={logoUrl} alt={`Escudo de ${teamName}`} loading="lazy" />;
  }

  return <span className="flag-bubble">{flag}</span>;
}

function statusLabel(match: Match): string {
  if (match.status === 'live') return match.minute ? `Ao vivo • ${match.minute}'` : 'Ao vivo';
  if (match.status === 'finished') return 'Encerrado';
  return 'Próximo jogo';
}

export function MatchCard({ match, compact = false, selected = false, onSelect }: MatchCardProps) {
  const score = match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} × ${match.awayScore}` : '×';
  const className = `match-card ${compact ? 'compact' : ''} ${selected ? 'selected' : ''}`;
  const content = (
    <>
      <div className="match-topline">
        <span className={`status-pill ${match.status}`}>{statusLabel(match)}</span>
        {/* <span>{formatDateTime(match.startsAt)}</span> */}
        <span>13/06 às 19h00</span>
      </div>

      <div className="scoreboard">
        <div className="team">
          <TeamLogo teamName={match.homeTeam.name} flag={match.homeTeam.flag} logoUrl={match.homeTeam.logoUrl} />
          <strong>{match.homeTeam.shortName}</strong>
        </div>

        <div className="score-box">{score}</div>

        <div className="team right">
          <TeamLogo teamName={match.awayTeam.name} flag={match.awayTeam.flag} logoUrl={match.awayTeam.logoUrl} />
          <strong>{match.awayTeam.shortName}</strong>
        </div>
      </div>

      {!compact && (
        <div className="match-meta">
          <span>{match.round}</span>
          <span>{match.stadium} • {match.city}</span>
        </div>
      )}
    </>
  );

  if (onSelect) {
    return (
      <button className={className} type="button" onClick={() => onSelect(match)}>
        {content}
      </button>
    );
  }

  return <article className={className}>{content}</article>;
}
