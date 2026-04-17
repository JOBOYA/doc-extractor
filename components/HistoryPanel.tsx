'use client';

import { useEffect, useState } from 'react';
import { History, Globe, Trash2, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SendToClaudePopover } from './SendToClaudePopover';
import type { HistoryEntry } from '@/lib/persistence';

type HistorySummary = Omit<HistoryEntry, 'pages' | 'events'>;

interface Props {
  onLoad: (entry: HistoryEntry) => void;
  onSentToClaude: () => void;
  refreshKey?: number;
}

function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function HistoryPanel({ onLoad, onSentToClaude, refreshKey }: Props) {
  const [entries, setEntries] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = (await res.json()) as { entries: HistorySummary[] };
      setEntries(data.entries);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshKey]);

  const handleLoad = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) return;
      const entry = (await res.json()) as HistoryEntry;
      onLoad(entry);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[#0C0C0C] border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[10px] font-medium tracking-[0.12em] text-zinc-500 uppercase">
            History
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">{entries.length}</span>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-border flex items-center justify-center mb-4">
              <History className="h-4 w-4 text-zinc-600" />
            </div>
            <p className="text-[13px] text-zinc-500 max-w-xs">
              No extractions yet. Crawl some docs to build your history.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="group relative p-4 hover:bg-[#0E0E0E] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-md bg-zinc-900 border border-border flex items-center justify-center">
                    <Globe className="h-3.5 w-3.5 text-zinc-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-medium text-zinc-200 truncate">{entry.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-zinc-600">
                      <span className="truncate max-w-[220px]">{entry.hostname}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{entry.pageCount} page{entry.pageCount > 1 ? 's' : ''}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{entry.totalWords.toLocaleString()} words</span>
                      <span className="text-zinc-700">·</span>
                      <span>{formatDate(entry.extractedAt)}</span>
                    </div>

                    <div className="flex items-center gap-1 mt-2.5">
                      <button
                        onClick={() => handleLoad(entry.id)}
                        disabled={loadingId === entry.id}
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] text-zinc-300 bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                      >
                        {loadingId === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                        View
                      </button>
                      <SendToClaudePopover
                        extractionId={entry.id}
                        extractionTitle={entry.title}
                        totalPages={entry.pageCount}
                        onSent={onSentToClaude}
                      />
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="flex items-center justify-center h-7 w-7 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
