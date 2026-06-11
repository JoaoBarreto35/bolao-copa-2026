import { Guess, NewGuess } from '../types';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const TABLE = 'guesses';

export async function listGuesses(matchId?: string): Promise<Guess[]> {
  if (!isSupabaseConfigured) return [];

  let query = supabase.from(TABLE).select('*').order('created_at', { ascending: true });
  if (matchId) query = query.eq('match_id', matchId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createGuess(payload: NewGuess): Promise<Guess> {
  const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function toggleGuessPaid(id: string, paid: boolean): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ paid, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteGuess(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
