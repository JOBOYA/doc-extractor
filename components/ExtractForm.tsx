'use client';

import { useState, useEffect } from 'react';
import { Link2, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onSubmit: (url: string) => void;
  isRunning: boolean;
  initialUrl?: string;
}

export function ExtractForm({ onSubmit, isRunning, initialUrl }: Props) {
  const [url, setUrl] = useState(initialUrl ?? '');

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isRunning) return;
    onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="group relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-accent transition-colors">
          <Link2 className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.stripe.com/api"
          disabled={isRunning}
          className={cn(
            'w-full h-12 bg-[#0C0C0C] border border-border rounded-lg pl-11 pr-32',
            'text-[14px] text-foreground placeholder:text-zinc-600 font-mono',
            'focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700',
            'transition-colors disabled:opacity-50'
          )}
        />
        <button
          type="submit"
          disabled={!url.trim() || isRunning}
          className={cn(
            'absolute right-1.5 top-1.5 h-9 px-4 rounded-md',
            'bg-accent text-white text-[13px] font-medium',
            'hover:bg-accent-muted disabled:opacity-40 disabled:hover:bg-accent',
            'transition-all shadow-[0_0_20px_rgba(255,90,0,0.2)]',
            'flex items-center gap-1.5'
          )}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Extracting
            </>
          ) : (
            <>
              Extract
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
