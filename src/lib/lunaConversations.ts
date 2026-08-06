import { supabase } from './supabase';
import { isMemorySafeContent } from '../utils/aiCompanionScripts';
import type {
  LunaFeedbackRating,
  LunaMemory,
  LunaMessage,
  LunaThread,
  LunaThreadKind,
} from '../types/database';

export class MemorySafetyError extends Error {
  constructor() {
    super("Luna doesn't save crisis-related conversations as memory.");
    this.name = 'MemorySafetyError';
  }
}

export interface LunaThreadContext {
  label?: string;
  sourceId?: string;
  sourceType?: string;
  [key: string]: unknown;
}

const LUNA_MEMORY_CHANGED_EVENT = 'trackher:luna-memory-changed';

function notifyLunaMemoryChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LUNA_MEMORY_CHANGED_EVENT));
  }
}

export function onLunaMemoryChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(LUNA_MEMORY_CHANGED_EVENT, listener);
  return () => window.removeEventListener(LUNA_MEMORY_CHANGED_EVENT, listener);
}

export function hashLunaMemories(memories: LunaMemory[]): string {
  const value = memories
    .map((memory) => `${memory.id}:${memory.updated_at}:${memory.content}`)
    .sort()
    .join('|');
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function trimPreview(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}…` : compact;
}

export function lunaPersistenceError(error: unknown): string {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error ?? '');
  if (
    /luna_(threads|messages|memories|crisis_state|feedback)/i.test(message) ||
    /relation .* does not exist/i.test(message)
  ) {
    return 'Luna history is waiting for the beta database update.';
  }
  return 'Luna could not save that yet.';
}

export async function listLunaThreads(userId: string): Promise<LunaThread[]> {
  const { data, error } = await supabase
    .from('luna_threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data as LunaThread[]) ?? [];
}

export async function loadLunaMessages(
  userId: string,
  threadId: string,
): Promise<LunaMessage[]> {
  const { data, error } = await supabase
    .from('luna_messages')
    .select('*')
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return [...((data as LunaMessage[]) ?? [])].reverse();
}

export async function createFocusedLunaThread(
  userId: string,
  kind: Exclude<LunaThreadKind, 'dashboard'>,
  title: string,
  context: LunaThreadContext,
): Promise<LunaThread> {
  const { data, error } = await supabase
    .from('luna_threads')
    .insert({
      user_id: userId,
      kind,
      title,
      context_data: context,
      summary: null,
      summary_message_count: 0,
      is_dashboard_primary: false,
      last_message_preview: null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as LunaThread;
}

/** Reuse the newest truly empty same-kind focused thread; otherwise create one.
 *  Preview-null alone is insufficient: a user message can save before an
 *  assistant reply, leaving preview null while the thread already has content.
 */
export async function getOrCreateFocusedLunaThread(
  userId: string,
  kind: Exclude<LunaThreadKind, 'dashboard'>,
  title: string,
  context: LunaThreadContext,
): Promise<LunaThread> {
  const { data: existingRows, error: existingError } = await supabase
    .from('luna_threads')
    .select('*')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('is_dashboard_primary', false)
    .is('last_message_preview', null)
    .order('updated_at', { ascending: false })
    .limit(5);
  if (existingError) throw existingError;

  for (const candidate of (existingRows as LunaThread[] | null) ?? []) {
    const { count, error: countError } = await supabase
      .from('luna_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('thread_id', candidate.id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) continue;

    const { data, error } = await supabase
      .from('luna_threads')
      .update({
        title,
        context_data: context,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as LunaThread;
  }

  return createFocusedLunaThread(userId, kind, title, context);
}

export async function getOrCreateDashboardLunaThread(
  userId: string,
  startFresh = false,
): Promise<LunaThread> {
  if (!startFresh) {
    const { data, error } = await supabase
      .from('luna_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('kind', 'dashboard')
      .eq('is_dashboard_primary', true)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as LunaThread;
  }

  const { data: priorRows, error: priorError } = await supabase
    .from('luna_threads')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', 'dashboard')
    .eq('is_dashboard_primary', true);
  if (priorError) throw priorError;

  const priorIds = ((priorRows as Array<{ id: string }> | null) ?? []).map((row) => row.id);
  if (priorIds.length > 0) {
    const { error } = await supabase
      .from('luna_threads')
      .update({ is_dashboard_primary: false })
      .eq('user_id', userId)
      .in('id', priorIds);
    if (error) throw error;
  }

  const { data, error } = await supabase
    .from('luna_threads')
    .insert({
      user_id: userId,
      kind: 'dashboard',
      title: 'Check in with Luna',
      context_data: { sourceType: 'dashboard', label: 'Dashboard check-in' },
      summary: null,
      summary_message_count: 0,
      is_dashboard_primary: true,
      last_message_preview: null,
    })
    .select()
    .single();

  if (error) {
    if (priorIds.length > 0) {
      await supabase
        .from('luna_threads')
        .update({ is_dashboard_primary: true })
        .eq('user_id', userId)
        .eq('id', priorIds[0]);
    }
    throw error;
  }
  return data as LunaThread;
}

export async function addLunaMessage(input: {
  userId: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
  crisisTier?: LunaMessage['crisis_tier'];
}): Promise<LunaMessage> {
  const { data, error } = await supabase
    .from('luna_messages')
    .insert({
      user_id: input.userId,
      thread_id: input.threadId,
      role: input.role,
      content: input.content.trim(),
      metadata: input.metadata ?? {},
      crisis_tier: input.crisisTier ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.role === 'assistant') {
    const { error: threadError } = await supabase
      .from('luna_threads')
      .update({
        last_message_preview: input.crisisTier
          ? 'Supportive safety conversation'
          : trimPreview(input.content),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.threadId)
      .eq('user_id', input.userId);
    if (threadError && import.meta.env.DEV) {
      console.warn('Could not update Luna thread preview:', threadError.message);
    }
  }

  return data as LunaMessage;
}

export async function markLunaMessageCrisis(
  userId: string,
  messageId: string,
  tier: LunaMessage['crisis_tier'],
): Promise<void> {
  const { error } = await supabase
    .from('luna_messages')
    .update({ crisis_tier: tier })
    .eq('id', messageId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateLunaThreadSummary(
  userId: string,
  threadId: string,
  summary: string,
  messageCount: number,
): Promise<void> {
  const { error } = await supabase
    .from('luna_threads')
    .update({
      summary: summary.trim().slice(0, 5000),
      summary_message_count: messageCount,
    })
    .eq('id', threadId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteLunaThread(userId: string, threadId: string): Promise<void> {
  const { error } = await supabase
    .from('luna_threads')
    .delete()
    .eq('id', threadId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function listLunaMemories(userId: string): Promise<LunaMemory[]> {
  const { data, error } = await supabase
    .from('luna_memories')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as LunaMemory[]) ?? [];
}

export async function addLunaMemory(
  userId: string,
  content: string,
  sourceThreadId?: string | null,
): Promise<LunaMemory> {
  if (!isMemorySafeContent(content)) throw new MemorySafetyError();
  const { data, error } = await supabase
    .from('luna_memories')
    .insert({
      user_id: userId,
      content: content.trim(),
      source_thread_id: sourceThreadId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  notifyLunaMemoryChanged();
  return data as LunaMemory;
}

export async function updateLunaMemory(
  userId: string,
  memoryId: string,
  content: string,
): Promise<void> {
  if (!isMemorySafeContent(content)) throw new MemorySafetyError();
  const { error } = await supabase
    .from('luna_memories')
    .update({ content: content.trim().slice(0, 1000) })
    .eq('id', memoryId)
    .eq('user_id', userId);
  if (error) throw error;
  notifyLunaMemoryChanged();
}

export async function deleteLunaMemory(userId: string, memoryId: string): Promise<void> {
  const { error } = await supabase
    .from('luna_memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId);
  if (error) throw error;
  notifyLunaMemoryChanged();
}

export async function clearLunaMemories(userId: string): Promise<void> {
  const { error } = await supabase.from('luna_memories').delete().eq('user_id', userId);
  if (error) throw error;
  notifyLunaMemoryChanged();
}

export async function saveLunaFeedback(input: {
  userId: string;
  threadId?: string | null;
  messageId?: string | null;
  insightKey?: string | null;
  rating: LunaFeedbackRating;
}): Promise<void> {
  const { error } = await supabase.from('luna_feedback').insert({
    user_id: input.userId,
    thread_id: input.threadId ?? null,
    message_id: input.messageId ?? null,
    insight_key: input.insightKey ?? null,
    rating: input.rating,
  });
  if (error) throw error;
}
