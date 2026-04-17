import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
// @ts-expect-error — no types
import { gfm } from 'turndown-plugin-gfm';
import PQueue from 'p-queue';
import { randomUUID } from 'crypto';
import { jobStore } from './events';
import { saveExtraction } from './persistence';
import type { ActivityEvent } from './types';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndown.use(gfm);

turndown.addRule('stripScripts', {
  filter: ['script', 'style', 'noscript', 'iframe'],
  replacement: () => '',
});

function pushEvent(jobId: string, event: Omit<ActivityEvent, 'id' | 'timestamp'>): void {
  jobStore.push(jobId, { id: randomUUID(), timestamp: Date.now(), ...event });
}

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = '';
    // Strip common tracking / locale / version params that don't change content meaningfully
    const drop = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'lang'];
    drop.forEach((k) => u.searchParams.delete(k));
    // Normalize trailing slash: keep for root only
    let pathname = u.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    u.pathname = pathname;
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return raw;
  }
}

async function fetchPage(url: string): Promise<{ html: string; title: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DocCrawler/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    return { html, title: $('title').text().trim() || url };
  } catch {
    return null;
  }
}

function extractMainContent(html: string, baseUrl: string): { markdown: string; words: number; links: string[] } {
  const $ = cheerio.load(html);

  $('script, style, noscript, iframe, nav, footer, aside, header, .sidebar, .nav, [role=navigation]').remove();

  const selectors = ['main', 'article', '[role=main]', '.content', '.documentation', '.docs-content', '#content', '.markdown-body'];
  let content = '';
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 200) {
      content = el.html() ?? '';
      break;
    }
  }
  if (!content) content = $('body').html() ?? '';

  const links: string[] = [];
  const base = new URL(baseUrl);
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const abs = new URL(href, baseUrl);
      if (abs.hostname === base.hostname) links.push(normalizeUrl(abs.toString()));
    } catch {}
  });

  const markdown = turndown.turndown(content).trim();
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return { markdown, words, links: [...new Set(links)] };
}

export async function crawl(jobId: string, startUrl: string, query: string, maxPages = 15, maxDepth = 2): Promise<string> {
  const normalizedStart = normalizeUrl(startUrl);
  const startUrlObj = new URL(normalizedStart);
  const hostname = startUrlObj.hostname;

  pushEvent(jobId, {
    type: 'start',
    title: `Starting extract for query: "${query || 'Full documentation'}"`,
  });

  pushEvent(jobId, {
    type: 'site',
    site: { hostname, favicon: `https://${hostname}/favicon.ico` },
  });

  jobStore.setStatus(jobId, 'running');

  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: normalizedStart, depth: 0 }];
  const pages: Array<{ url: string; title: string; markdown: string; words: number; path: string }> = [];
  const pQueue = new PQueue({ concurrency: 3 });
  let batchBuffer: typeof pages = [];

  const flushBatch = () => {
    if (batchBuffer.length === 0) return;
    pushEvent(jobId, {
      type: 'pages',
      pages: batchBuffer.map((p) => ({ url: p.url, title: p.title, words: p.words })),
    });
    batchBuffer = [];
  };

  while (queue.length > 0 && visited.size < maxPages) {
    const batch = queue.splice(0, Math.min(queue.length, maxPages - visited.size, 5));
    await Promise.all(
      batch.map(({ url, depth }) =>
        pQueue.add(async () => {
          if (visited.has(url) || visited.size >= maxPages) return;
          visited.add(url);

          pushEvent(jobId, { type: 'running', message: 'Running code...', detail: url });

          const page = await fetchPage(url);
          if (!page) return;

          const { markdown, words, links } = extractMainContent(page.html, url);
          let pathname = '/';
          try { pathname = new URL(url).pathname || '/'; } catch {}
          const extracted = { url, title: page.title, markdown, words, path: pathname };
          pages.push(extracted);
          batchBuffer.push(extracted);
          jobStore.addPage(jobId, extracted);

          if (batchBuffer.length >= 2) flushBatch();

          if (depth < maxDepth) {
            for (const link of links.slice(0, 10)) {
              if (!visited.has(link) && visited.size + queue.length < maxPages) {
                queue.push({ url: link, depth: depth + 1 });
              }
            }
          }
        })
      )
    );
  }

  flushBatch();

  const full = pages
    .map(
      (p) =>
        `# ${p.title}\n\n> Source: ${p.url}\n\n${p.markdown}`
    )
    .join('\n\n---\n\n');

  const totalWords = pages.reduce((s, p) => s + p.words, 0);

  pushEvent(jobId, {
    type: 'done',
    title: `Extracted ${pages.length} pages (${totalWords.toLocaleString()} words)`,
  });

  jobStore.setResult(jobId, full);

  // Persist to history
  if (pages.length > 0) {
    try {
      const rootTitle = pages[0]?.title ?? hostname;
      const job = jobStore.get(jobId);
      await saveExtraction({
        id: jobId,
        title: rootTitle,
        url: normalizedStart,
        hostname,
        query,
        pages,
        events: job?.events ?? [],
        pageCount: pages.length,
        totalWords,
        extractedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to persist extraction:', err);
    }
  }

  jobStore.setStatus(jobId, 'done');

  return full;
}
