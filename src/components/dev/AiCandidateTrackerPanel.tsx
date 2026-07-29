import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface CandidateFreqRow {
  candidate_hash: string;
  title: string;
  shown: number;
  dismissed: number;
  opened: number;
  total: number;
}

/**
 * Dev-only: aggregate AI-noticed candidate events by title hash so James can
 * promote recurring shapes into hand-written patternEngine analyzers.
 */
export function AiCandidateTrackerPanel() {
  const userId = useAuthStore((s) => s.user?.id);
  const [rows, setRows] = useState<CandidateFreqRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data, error: fetchError } = await supabase
        .from('ai_candidate_events')
        .select('candidate_hash, title, action')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (cancelled) return;
      setLoading(false);
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      const map = new Map<string, CandidateFreqRow>();
      for (const row of data ?? []) {
        const hash = row.candidate_hash as string;
        const title = row.title as string;
        const action = row.action as string;
        const existing = map.get(hash) ?? {
          candidate_hash: hash,
          title,
          shown: 0,
          dismissed: 0,
          opened: 0,
          total: 0,
        };
        if (action === 'shown') existing.shown += 1;
        if (action === 'dismissed') existing.dismissed += 1;
        if (action === 'opened') existing.opened += 1;
        existing.total += 1;
        existing.title = title;
        map.set(hash, existing);
      }
      setRows(
        [...map.values()].sort(
          (a, b) => b.shown - a.shown || b.total - a.total,
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl text-sage-800">AI candidate tracker</h2>
      <p className="text-sm text-sage-600">
        Frequency of AI-noticed titles (shown / dismissed / opened). Promote recurring ones by
        hand into patternEngine — the model never writes analyzers.
      </p>
      {loading && <p className="text-sm text-sage-500">Loading…</p>}
      {error && <p className="text-sm text-sage-600">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-sage-500">No candidate events yet.</p>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-sand-200 bg-sand-50">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-sand-200 text-xs uppercase tracking-wide text-sage-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Shown</th>
                <th className="px-3 py-2">Opened</th>
                <th className="px-3 py-2">Dismissed</th>
                <th className="px-3 py-2">Hash</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.candidate_hash} className="border-b border-sand-100 last:border-0">
                  <td className="px-3 py-2 text-sage-800">{r.title}</td>
                  <td className="px-3 py-2 text-sage-600">{r.shown}</td>
                  <td className="px-3 py-2 text-sage-600">{r.opened}</td>
                  <td className="px-3 py-2 text-sage-600">{r.dismissed}</td>
                  <td className="px-3 py-2 font-mono text-xs text-sage-400">
                    {r.candidate_hash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
