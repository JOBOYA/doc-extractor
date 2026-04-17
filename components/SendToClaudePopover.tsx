'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Check, FileText, Layers, Send } from 'lucide-react';
import { ClaudeIcon } from './ClaudeIcon';
import { cn } from '@/lib/utils';

interface Props {
  extractionId: string;
  extractionTitle: string;
  currentPage?: { url: string; title: string };
  totalPages: number;
  onSent?: () => void;
  variant?: 'toolbar' | 'inline';
}

export function SendToClaudePopover({
  extractionId,
  extractionTitle,
  currentPage,
  totalPages,
  onSent,
  variant = 'toolbar',
}: Props) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'page' | 'all'>(currentPage ? 'page' : 'all');
  const [instruction, setInstruction] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (currentPage && !open) setScope('page');
  }, [currentPage, open]);

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/claude-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId,
          pageUrl: scope === 'page' ? currentPage?.url : undefined,
          instruction: instruction.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSent(true);
        onSent?.();
        setTimeout(() => {
          setSent(false);
          setOpen(false);
          setInstruction('');
        }, 1500);
      }
    } finally {
      setSending(false);
    }
  };

  const triggerClasses =
    variant === 'toolbar'
      ? 'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors bg-accent/15 text-accent-muted hover:bg-accent/25'
      : 'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors bg-accent/15 text-accent-muted hover:bg-accent/25';

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(triggerClasses, open && 'bg-accent/30 text-white')}
      >
        <ClaudeIcon className="text-accent-muted" size={14} />
        Send to Claude
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-[320px] bg-[#0C0C0C] border border-border rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-[#0A0A0A]">
            <div className="h-6 w-6 rounded-md bg-accent flex items-center justify-center shadow-[0_0_16px_rgba(255,90,0,0.4)]">
              <ClaudeIcon className="text-white" size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-zinc-200 truncate">{extractionTitle}</div>
              <div className="text-[10px] text-zinc-600 font-mono">{totalPages} page{totalPages > 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Scope */}
          <div className="p-3 border-b border-border space-y-1.5">
            <label className="text-[10px] font-medium tracking-[0.1em] text-zinc-500 uppercase">
              Scope
            </label>
            {currentPage && (
              <ScopeOption
                active={scope === 'page'}
                onClick={() => setScope('page')}
                icon={<FileText className="h-3.5 w-3.5" />}
                title="This page only"
                subtitle={currentPage.title}
              />
            )}
            <ScopeOption
              active={scope === 'all'}
              onClick={() => setScope('all')}
              icon={<Layers className="h-3.5 w-3.5" />}
              title={`All ${totalPages} page${totalPages > 1 ? 's' : ''}`}
              subtitle="Full extraction context"
            />
          </div>

          {/* Instruction */}
          <div className="p-3 border-b border-border">
            <label className="block text-[10px] font-medium tracking-[0.1em] text-zinc-500 uppercase mb-1.5">
              Instruction (optional)
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Explain how to set up authentication"
              rows={2}
              className="w-full bg-[#080808] border border-border rounded-md px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none"
            />
          </div>

          {/* Action */}
          <div className="p-3 flex items-center justify-between">
            <div className="text-[10px] text-zinc-600">
              {sent ? 'Queued — Claude will read this on your next message' : 'Will inject context on next Claude Code prompt'}
            </div>
            <button
              onClick={send}
              disabled={sending || sent}
              className={cn(
                'flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-medium transition-colors',
                sent
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-accent text-white hover:bg-accent-muted shadow-[0_0_16px_rgba(255,90,0,0.3)]',
                (sending || sent) && 'opacity-80'
              )}
            >
              {sending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending
                </>
              ) : sent ? (
                <>
                  <Check className="h-3 w-3" />
                  Queued
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScopeOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-2 text-left px-2.5 py-2 rounded-md border transition-colors',
        active
          ? 'border-accent/50 bg-accent/10'
          : 'border-transparent bg-[#0A0A0A] hover:bg-zinc-900/60 hover:border-border'
      )}
    >
      <div
        className={cn(
          'mt-0.5 h-5 w-5 rounded flex items-center justify-center',
          active ? 'bg-accent/20 text-accent-muted' : 'bg-zinc-900 text-zinc-500'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('text-[12px] font-medium truncate', active ? 'text-white' : 'text-zinc-300')}>
          {title}
        </div>
        <div className="text-[10px] text-zinc-600 truncate">{subtitle}</div>
      </div>
      <div
        className={cn(
          'mt-1 h-3 w-3 rounded-full border-2 shrink-0',
          active ? 'border-accent bg-accent' : 'border-zinc-700'
        )}
      />
    </button>
  );
}
