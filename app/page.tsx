'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, History as HistoryIcon, Zap } from 'lucide-react';
import { ExtractForm } from '@/components/ExtractForm';
import { ActivityLog } from '@/components/ActivityLog';
import { DocReader } from '@/components/DocReader';
import { HistoryPanel } from '@/components/HistoryPanel';
import { cn } from '@/lib/utils';
import type { ActivityEvent, ExtractedPage } from '@/lib/types';
import type { HistoryEntry } from '@/lib/persistence';
import type { QueueRequest } from '@/lib/queue';

type JobStatus = 'idle' | 'pending' | 'running' | 'done' | 'error';
type Tab = 'reader' | 'history';

function ExtractorInner() {
  const params = useSearchParams();
  const autoUrl = params?.get('url') ?? '';
  const autoRun = params?.get('auto') === '1';

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [tab, setTab] = useState<Tab>('reader');
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [queueRequest, setQueueRequest] = useState<QueueRequest | null>(null);

  const sourceRef = useRef<EventSource | null>(null);

  const pollQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/claude-queue');
      if (res.ok) {
        const { request } = (await res.json()) as { request: QueueRequest | null };
        setQueueRequest(request);
      }
    } catch {}
  }, []);

  useEffect(() => {
    pollQueue();
    const id = setInterval(pollQueue, 2000);
    return () => clearInterval(id);
  }, [pollQueue]);

  const startExtract = async (url: string) => {
    setEvents([]);
    setPages([]);
    setCurrentUrl(url);
    setCurrentTitle('');
    setStatus('pending');
    setTab('reader');

    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      setStatus('error');
      return;
    }

    const { jobId: newJobId } = (await res.json()) as { jobId: string };
    setJobId(newJobId);

    sourceRef.current?.close();
    const es = new EventSource(`/api/events/${newJobId}`);
    sourceRef.current = es;

    es.addEventListener('event', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as ActivityEvent;
      setEvents((prev) => (prev.some((ev) => ev.id === data.id) ? prev : [...prev, data]));
    });
    es.addEventListener('page', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as ExtractedPage;
      setPages((prev) => (prev.some((p) => p.url === data.url) ? prev : [...prev, data]));
    });
    es.addEventListener('status', (e) => {
      const s = JSON.parse((e as MessageEvent).data) as JobStatus;
      setStatus(s);
      if (s === 'done') setHistoryRefresh((x) => x + 1);
    });
    es.addEventListener('error', () => {});
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setEvents(entry.events ?? []);
    setPages(entry.pages);
    setCurrentUrl(entry.url);
    setCurrentTitle(entry.title);
    setStatus('done');
    setJobId(entry.id);
    setTab('reader');
    sourceRef.current?.close();
  };

  const clearQueue = async () => {
    await fetch('/api/claude-queue', { method: 'DELETE' });
    setQueueRequest(null);
  };

  useEffect(() => {
    if (autoRun && autoUrl && status === 'idle') startExtract(autoUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, autoUrl]);

  useEffect(() => {
    return () => sourceRef.current?.close();
  }, []);

  const isRunning = status === 'running' || status === 'pending';
  const queueActive = !!queueRequest && (queueRequest.status === 'pending' || queueRequest.status === 'consumed');

  return (
    <main className="h-screen flex flex-col relative overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(255, 90, 0, 0.08) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col max-w-[1440px] w-full mx-auto px-8 py-6 min-h-0">
        <header className="shrink-0 flex items-start gap-6 mb-5">
          <div className="shrink-0">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-6 w-6 rounded-md bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(255,90,0,0.4)]">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <h1 className="text-[16px] font-medium tracking-tight">Doc Extractor</h1>
            </div>
            <p className="text-[11px] text-zinc-600 ml-9 font-mono tracking-wide">
              local · v0.3
            </p>
          </div>
          <div className="flex-1 max-w-3xl">
            <ExtractForm onSubmit={startExtract} isRunning={isRunning} initialUrl={autoUrl} />
          </div>
        </header>

        {/* Tabs with queue indicator */}
        <div className="shrink-0 flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <TabButton
              active={tab === 'reader'}
              onClick={() => setTab('reader')}
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Reader"
              badge={pages.length > 0 ? `${pages.length}` : undefined}
            />
            <TabButton
              active={tab === 'history'}
              onClick={() => setTab('history')}
              icon={<HistoryIcon className="h-3.5 w-3.5" />}
              label="History"
            />
          </div>

          {queueRequest && (
            <QueueIndicator request={queueRequest} active={queueActive} onClear={clearQueue} />
          )}
        </div>

        <div className="flex-1 grid grid-cols-[minmax(0,1fr)_360px] gap-4 min-h-0">
          {tab === 'reader' ? (
            <DocReader
              pages={pages}
              status={status}
              url={currentUrl}
              extractionId={jobId}
              extractionTitle={currentTitle || (pages[0]?.title ?? 'Current extraction')}
              onSentToClaude={pollQueue}
            />
          ) : (
            <HistoryPanel
              onLoad={loadFromHistory}
              onSentToClaude={pollQueue}
              refreshKey={historyRefresh}
            />
          )}
          <ActivityLog events={events} status={status} />
        </div>

        <footer className="shrink-0 mt-3 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
          <span>localhost:3000</span>
          <span>
            {jobId && <span className="text-zinc-700">job: {jobId.slice(0, 8)}</span>}
            {pages.length > 0 && (
              <span className="ml-3 text-zinc-500">
                {pages.length} page{pages.length > 1 ? 's' : ''} · {pages.reduce((s, p) => s + p.words, 0).toLocaleString()} words
                {currentTitle && <span className="ml-2 text-zinc-600">· {currentTitle}</span>}
              </span>
            )}
          </span>
        </footer>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] transition-colors',
        active
          ? 'bg-zinc-900 text-white border border-border'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
      )}
    >
      {icon}
      {label}
      {badge && (
        <span
          className={cn(
            'ml-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-sm',
            active ? 'bg-accent/20 text-accent-muted' : 'bg-zinc-800 text-zinc-500'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function QueueIndicator({
  request,
  active,
  onClear,
}: {
  request: QueueRequest;
  active: boolean;
  onClear: () => void;
}) {
  const label = {
    pending: 'Waiting for Claude Code',
    consumed: 'Claude is processing',
    done: 'Claude responded',
    error: 'Claude failed',
  }[request.status];

  const color = {
    pending: 'bg-accent text-white',
    consumed: 'bg-blue-500 text-white',
    done: 'bg-emerald-500 text-white',
    error: 'bg-red-500 text-white',
  }[request.status];

  return (
    <div className="flex items-center gap-2 animate-slide-in">
      <div
        className={cn(
          'flex items-center gap-2 h-8 pl-2 pr-3 rounded-md border border-border bg-[#0C0C0C]',
          'shadow-[0_0_18px_rgba(255,90,0,0.15)]'
        )}
      >
        <div className="relative flex items-center justify-center h-5 w-5">
          <div
            className={cn(
              'h-5 w-5 rounded-sm flex items-center justify-center',
              color
            )}
          >
            <Zap className="h-3 w-3" />
          </div>
          {active && (
            <div className={cn('absolute inset-0 rounded-sm animate-ping opacity-50', color)} />
          )}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-medium text-zinc-200">{label}</span>
          <span className="text-[9px] font-mono text-zinc-500 truncate max-w-[220px]">
            {request.title}
          </span>
        </div>
        <button
          onClick={onClear}
          className="ml-2 text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors"
          title="Clear queue"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExtractorInner />
    </Suspense>
  );
}
