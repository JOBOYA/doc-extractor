'use client';

import { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { ActivityItem } from './ActivityItem';
import type { ActivityEvent } from '@/lib/types';

interface Props {
  events: ActivityEvent[];
  status: 'idle' | 'pending' | 'running' | 'done' | 'error';
}

export function ActivityLog({ events, status }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  const isActive = status === 'running' || status === 'pending';

  return (
    <div className="flex flex-col h-full bg-[#0C0C0C] border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium tracking-[0.12em] text-zinc-500 uppercase">
            Activity
          </span>
          {isActive && (
            <div className="flex items-center gap-1">
              <div className="h-1 w-1 rounded-full bg-accent animate-pulse-subtle" />
              <div className="h-1 w-1 rounded-full bg-accent animate-pulse-subtle [animation-delay:0.2s]" />
              <div className="h-1 w-1 rounded-full bg-accent animate-pulse-subtle [animation-delay:0.4s]" />
            </div>
          )}
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
      </div>

      {/* Event list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[12px] text-zinc-600">Waiting for extraction...</p>
          </div>
        ) : (
          <div className="space-y-0">
            {events.map((event, idx) => (
              <ActivityItem key={`${idx}-${event.id}`} event={event} isLast={idx === events.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
