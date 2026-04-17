'use client';

import { useState } from 'react';
import { Lightbulb, Globe, Terminal, Files, CheckCircle2, AlertCircle, ChevronDown, ExternalLink } from 'lucide-react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { cn, hostname, safePathname } from '@/lib/utils';
import type { ActivityEvent } from '@/lib/types';

interface Props {
  event: ActivityEvent;
  isLast: boolean;
}

function IconBadge({ type }: { type: ActivityEvent['type'] }) {
  const styles = {
    start: 'bg-transparent text-zinc-400',
    site: 'bg-accent text-white shadow-[0_0_20px_rgba(255,90,0,0.3)]',
    running: 'bg-zinc-900 text-zinc-500 border border-border',
    pages: 'bg-accent text-white shadow-[0_0_20px_rgba(255,90,0,0.3)]',
    done: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    error: 'bg-red-500/20 text-red-400 border border-red-500/30',
  } as const;

  const Icon = {
    start: Lightbulb,
    site: Globe,
    running: Terminal,
    pages: Files,
    done: CheckCircle2,
    error: AlertCircle,
  }[type];

  return (
    <div
      className={cn(
        'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
        styles[type]
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </div>
  );
}

export function ActivityItem({ event, isLast }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex gap-3 animate-slide-in">
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[13px] top-7 bottom-[-12px] w-px bg-border" aria-hidden />
      )}

      <IconBadge type={event.type} />

      <div className="flex-1 min-w-0 pt-0.5 pb-3">
        {event.type === 'start' && (
          <p className="text-[13px] leading-[1.55] text-zinc-300">
            {event.title}
          </p>
        )}

        {event.type === 'site' && event.site && (
          <p className="text-[13px] font-medium text-zinc-200 leading-7 flex items-center gap-1.5">
            {event.site.hostname}
          </p>
        )}

        {event.type === 'running' && (
          <div className="flex items-center gap-2 leading-7">
            <span className="text-[13px] text-zinc-500">Running code...</span>
            {event.detail && (
              <span className="text-[11px] text-zinc-600 font-mono truncate max-w-[200px]">
                {hostname(event.detail)}
              </span>
            )}
          </div>
        )}

        {event.type === 'pages' && event.pages && (
          <Collapsible.Root open={open} onOpenChange={setOpen}>
            <Collapsible.Trigger asChild>
              <button className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-200 hover:text-white transition-colors leading-7 group">
                Read {event.pages.length} page{event.pages.length > 1 ? 's' : ''}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 group-hover:text-zinc-300',
                    open && 'rotate-180'
                  )}
                />
              </button>
            </Collapsible.Trigger>
            <Collapsible.Content className="overflow-hidden data-[state=open]:animate-fade-in">
              <div className="mt-2 space-y-1.5 border-l border-border pl-3 ml-1">
                {event.pages.map((page, idx) => (
                  <a
                    key={idx}
                    href={page.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-2 text-[12px] hover:bg-zinc-900/50 rounded-md px-2 py-1.5 -mx-2 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-300 truncate leading-[1.4]">{page.title}</div>
                      <div className="text-zinc-600 font-mono text-[10px] truncate mt-0.5">
                        {safePathname(page.url)}
                      </div>
                    </div>
                    <div className="text-zinc-600 text-[10px] font-mono shrink-0 pt-0.5">
                      {page.words.toLocaleString()}w
                    </div>
                    <ExternalLink className="h-3 w-3 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 mt-1" />
                  </a>
                ))}
              </div>
            </Collapsible.Content>
          </Collapsible.Root>
        )}

        {event.type === 'done' && (
          <p className="text-[13px] font-medium text-emerald-400 leading-7">
            {event.title}
          </p>
        )}

        {event.type === 'error' && (
          <p className="text-[13px] text-red-400 leading-7">
            {event.title || event.message}
          </p>
        )}
      </div>
    </div>
  );
}
