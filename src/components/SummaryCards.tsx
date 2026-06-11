import { BoardSummary } from '../types';
import { formatCurrency } from '../utils/formatters';

type SummaryCardsProps = {
  summary: BoardSummary;
};

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <section className="summary-grid" aria-label="Resumo do bolão">
      <div className="summary-card">
        <span>Palpites</span>
        <strong>{summary.totalGuesses}</strong>
      </div>
      <div className="summary-card">
        <span>Pagos</span>
        <strong>{summary.paidGuesses}</strong>
      </div>
      <div className="summary-card yellow">
        <span>Total previsto</span>
        <strong>{formatCurrency(summary.totalPot)}</strong>
      </div>
      <div className="summary-card green">
        <span>Recebido</span>
        <strong>{formatCurrency(summary.paidPot)}</strong>
      </div>
    </section>
  );
}
