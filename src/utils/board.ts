import { PRICE_PER_GUESS } from '../data';
import { BoardSummary, Guess, Match } from '../types';

export function calculateBoardSummary(match: Match, guesses: Guess[]): BoardSummary {
  const winners = match.status === 'finished' && match.homeScore !== null && match.awayScore !== null
    ? guesses.filter((guess) => guess.home_score === match.homeScore && guess.away_score === match.awayScore)
    : [];

  const totalGuesses = guesses.length;
  const paidGuesses = guesses.filter((guess) => guess.paid).length;
  const totalPot = totalGuesses * PRICE_PER_GUESS;
  const paidPot = paidGuesses * PRICE_PER_GUESS;
  const prizePerWinner = winners.length > 0 ? totalPot / winners.length : 0;

  return {
    totalGuesses,
    paidGuesses,
    totalPot,
    paidPot,
    winners,
    prizePerWinner
  };
}

export function getCurrentDisplayMatch(matches: Match[], now = new Date()): Match {
  const sorted = [...matches].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const twoDaysMs = 48 * 60 * 60 * 1000;

  const live = sorted.find((match) => match.status === 'live');
  if (live) return live;

  const recentOrUpcoming = sorted.find((match) => {
    const startsAt = new Date(match.startsAt).getTime();
    const approxEnd = startsAt + 2 * 60 * 60 * 1000;
    return now.getTime() <= approxEnd + twoDaysMs;
  });

  return recentOrUpcoming ?? sorted[sorted.length - 1];
}
