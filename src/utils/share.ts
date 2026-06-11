import { PRICE_PER_GUESS } from '../data';
import { Guess, Match } from '../types';
import { formatCurrency, formatDateTime } from './formatters';

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function paidLabel(paid: boolean) {
  return paid ? '✅ Pago' : '⏳ Pendente';
}

export function buildWhatsAppGuessesText(match: Match, guesses: Guess[]) {
  const matchGuesses = guesses
    .filter((guess) => guess.match_id === match.id)
    .slice()
    .sort((a, b) => normalizeName(a.person_name).localeCompare(normalizeName(b.person_name), 'pt-BR'));

  const paidGuesses = matchGuesses.filter((guess) => guess.paid).length;
  const totalPot = matchGuesses.length * PRICE_PER_GUESS;
  const paidPot = paidGuesses * PRICE_PER_GUESS;

  const header = [
    '🏆 *Bolão da Copa 2026*',
    `${match.homeTeam.flag} *${match.homeTeam.shortName} x ${match.awayTeam.shortName}* ${match.awayTeam.flag}`,
    `📅 ${formatDateTime(match.startsAt)}`,
    `💵 ${formatCurrency(PRICE_PER_GUESS)} por palpite`,
    `👥 ${matchGuesses.length} palpite${matchGuesses.length === 1 ? '' : 's'} | ${paidGuesses} pago${paidGuesses === 1 ? '' : 's'}`,
    `💰 Total: ${formatCurrency(totalPot)} | Recebido: ${formatCurrency(paidPot)}`
  ];

  if (matchGuesses.length === 0) {
    return [...header, '', '🎯 *Palpites*', 'Nenhum palpite cadastrado ainda.'].join('\n');
  }

  const rows = matchGuesses.map((guess, index) => {
    const name = normalizeName(guess.person_name);
    return `${index + 1}. *${name}* — ${match.homeTeam.flag} ${match.homeTeam.shortName} *${guess.home_score} x ${guess.away_score}* ${match.awayTeam.shortName} ${match.awayTeam.flag} — ${paidLabel(guess.paid)}`;
  });

  return [...header, '', '🎯 *Palpites*', ...rows].join('\n');
}

export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
