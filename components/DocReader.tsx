'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Download,
  ExternalLink,
  Hash,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExtractedPage } from '@/lib/types';
import { SendToClaudePopover } from './SendToClaudePopover';

interface Props {
  pages: ExtractedPage[];
  status: 'idle' | 'pending' | 'running' | 'done' | 'error';
  url?: string;
  extractionId?: string | null;
  extractionTitle?: string;
  onSentToClaude?: () => void;
}

export function DocReader({ pages, status, url, extractionId, extractionTitle, onSentToClaude }: Props) {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (pages.length > 0 && index >= pages.length) setIndex(pages.length - 1);
  }, [pages.length, index]);

  const current = pages[index];
  const total = pages.length;

  const allMarkdown = pages
    .map((p) => `# ${p.title}\n\n> Source: ${p.url}\n\n${p.markdown}`)
    .join('\n\n---\n\n');

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const blob = new Blob([allMarkdown], { type: 'text/markdown' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `extract-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(u);
  };

  const isEmpty = pages.length === 0;

  return (
    <div className="flex h-full bg-[#0C0C0C] border border-border rounded-xl overflow-hidden">
      {/* Pages sidebar */}
      <aside
        className={cn(
          'shrink-0 border-r border-border bg-[#0A0A0A] flex flex-col transition-[width] duration-200',
          sidebarOpen ? 'w-[220px]' : 'w-0 border-r-0'
        )}
      >
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between px-3 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[10px] font-medium tracking-[0.12em] text-zinc-500 uppercase">
                  Pages
                </span>
                <span className="text-[10px] text-zinc-600 font-mono">
                  {total}
                </span>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto py-1.5">
              {pages.map((p, i) => (
                <button
                  key={`${i}-${p.url}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    'w-full flex items-start gap-2 text-left px-3 py-2 text-[12px] transition-colors group',
                    i === index
                      ? 'bg-accent/10 text-white'
                      : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                  )}
                >
                  <FileText
                    className={cn(
                      'h-3.5 w-3.5 mt-0.5 shrink-0',
                      i === index ? 'text-accent' : 'text-zinc-600 group-hover:text-zinc-500'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate leading-[1.3]">{p.title}</div>
                    <div className="text-[10px] text-zinc-600 font-mono truncate mt-0.5">
                      {p.path}
                    </div>
                  </div>
                </button>
              ))}
              {isEmpty && status === 'running' && (
                <div className="px-3 py-4 text-[11px] text-zinc-600">
                  Pages will appear here as they're extracted...
                </div>
              )}
            </nav>
          </>
        )}
      </aside>

      {/* Reader */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex items-center gap-2 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            {sidebarOpen ? 'Hide' : 'Show'} pages
          </button>

          <div className="flex items-center gap-1">
            {current && (
              <a
                href={current.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Source
              </a>
            )}
            <button
              onClick={() => current && copy(current.markdown)}
              disabled={!current}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-30"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy page'}
            </button>
            <button
              onClick={download}
              disabled={pages.length === 0}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-30"
            >
              <Download className="h-3 w-3" />
              Export all
            </button>
            {extractionId && pages.length > 0 && (
              <SendToClaudePopover
                extractionId={extractionId}
                extractionTitle={extractionTitle ?? 'Extraction'}
                currentPage={current ? { url: current.url, title: current.title } : undefined}
                totalPages={pages.length}
                onSent={onSentToClaude}
                variant="toolbar"
              />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-border flex items-center justify-center mb-4">
                <FileText className="h-4 w-4 text-zinc-600" />
              </div>
              <p className="text-[13px] text-zinc-500 max-w-xs">
                {status === 'idle' && 'Enter a documentation URL to start extracting pages.'}
                {status === 'pending' && 'Initializing extraction...'}
                {status === 'running' && 'Crawling in progress — pages will appear here.'}
                {status === 'error' && 'Extraction failed.'}
              </p>
              {url && status === 'running' && (
                <p className="text-[10px] text-zinc-700 font-mono mt-2">{url}</p>
              )}
            </div>
          ) : current ? (
            <article className="max-w-3xl mx-auto px-8 py-8 markdown">
              <div className="flex items-center gap-2 text-[11px] text-zinc-600 font-mono mb-4">
                <Hash className="h-3 w-3" />
                <span>{current.path}</span>
                <span className="text-zinc-700">·</span>
                <span>{current.words.toLocaleString()} words</span>
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.markdown || '*(empty page)*'}</ReactMarkdown>
            </article>
          ) : null}
        </div>

        {/* Pagination footer */}
        {pages.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-[#0A0A0A]">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className={cn(
                'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] transition-colors',
                'text-zinc-400 hover:text-white hover:bg-zinc-900',
                'disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400'
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
              <span className="text-zinc-300">{index + 1}</span>
              <span className="text-zinc-700">/</span>
              <span>{total}</span>
            </div>
            <button
              onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
              disabled={index >= total - 1}
              className={cn(
                'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] transition-colors',
                'text-zinc-400 hover:text-white hover:bg-zinc-900',
                'disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400'
              )}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
