'use client';

import { useState } from 'react';
import { Copy, Check, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  content: string | null;
  status: 'idle' | 'pending' | 'running' | 'done' | 'error';
}

export function ResultsPanel({ content, status }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extract-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
  const tokenEstimate = Math.round(wordCount * 1.3);

  return (
    <div className="flex flex-col h-full bg-[#0C0C0C] border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[10px] font-medium tracking-[0.12em] text-zinc-500 uppercase">
            Markdown Result
          </span>
          {content && (
            <span className="text-[10px] text-zinc-600 font-mono ml-1">
              {wordCount.toLocaleString()} words · ~{tokenEstimate.toLocaleString()} tokens
            </span>
          )}
        </div>
        {content && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <Download className="h-3 w-3" />
              Download
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {!content ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[12px] text-zinc-600">
              {status === 'idle' && 'Extract a doc to see the markdown result here'}
              {status === 'running' && 'Extracting...'}
              {status === 'error' && 'Extraction failed'}
            </p>
          </div>
        ) : (
          <pre className={cn('font-mono text-[12px] text-zinc-300 whitespace-pre-wrap leading-[1.6]')}>
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
