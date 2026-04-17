#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const PORT = process.env.DOC_EXTRACTOR_PORT ?? '3000';
const BASE = `http://localhost:${PORT}`;

async function isServerUp() {
  try {
    const res = await fetch(`${BASE}/api/extract?jobId=ping`, { signal: AbortSignal.timeout(1500) });
    return res.status === 400 || res.status === 404; // server responded
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isServerUp()) return;

  const hasBuild = existsSync(join(PROJECT_ROOT, '.next'));
  const cmd = hasBuild ? 'start' : 'dev';

  const proc = spawn('npm', ['run', cmd], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: 'ignore',
    shell: true,
  });
  proc.unref();

  // Poll until up (max 60s)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await isServerUp()) return;
  }
  throw new Error('Doc extractor server did not start in time.');
}

async function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'win32' ? 'start' : platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(cmd, [url], { shell: true, detached: true, stdio: 'ignore' }).unref();
}

async function startJob(url, query) {
  const res = await fetch(`${BASE}/api/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, query }),
  });
  if (!res.ok) throw new Error(`Extract failed: ${await res.text()}`);
  const { jobId } = await res.json();
  return jobId;
}

async function waitForJob(jobId, timeoutMs = 5 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE}/api/extract?jobId=${jobId}`);
    if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
    const job = await res.json();
    if (job.status === 'done') return job.result ?? '';
    if (job.status === 'error') throw new Error(job.error ?? 'Extraction failed');
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Extraction timed out');
}

const server = new Server(
  { name: 'doc-extractor', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'extract_docs',
      description:
        'Crawl a documentation website and extract clean markdown. Opens a browser UI at localhost:3000 with live activity feedback, then returns the extracted markdown content. The extraction is saved to history automatically.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Documentation URL to crawl (e.g. https://docs.stripe.com/api)' },
          query: { type: 'string', description: 'Optional: what to look for' },
          open_browser: {
            type: 'boolean',
            description: 'Whether to auto-open the browser UI. Default: true',
          },
        },
        required: ['url'],
      },
    },
    {
      name: 'open_ui',
      description: 'Just open the doc extractor web UI without starting an extraction',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'list_extractions',
      description: 'List all previously extracted documentations from history. Returns titles, IDs, URLs, word counts, and timestamps.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_extraction',
      description: 'Retrieve the full markdown content of a previously extracted documentation by its ID. Use this after list_extractions to load content for answering questions.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Extraction ID (from list_extractions)' },
        },
        required: ['id'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;

  try {
    if (name === 'open_ui') {
      await ensureServer();
      await openBrowser(BASE);
      return { content: [{ type: 'text', text: `✅ UI opened at ${BASE}` }] };
    }

    if (name === 'list_extractions') {
      await ensureServer();
      const res = await fetch(`${BASE}/api/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const { entries } = await res.json();
      if (entries.length === 0) {
        return { content: [{ type: 'text', text: 'No extractions in history yet.' }] };
      }
      const text = entries.map((e, i) =>
        `${i + 1}. ${e.title}\n   ID: ${e.id}\n   URL: ${e.url}\n   Pages: ${e.pageCount} · Words: ${e.totalWords.toLocaleString()}\n   Extracted: ${new Date(e.extractedAt).toISOString()}`
      ).join('\n\n');
      return { content: [{ type: 'text', text: `📚 ${entries.length} extraction${entries.length > 1 ? 's' : ''}:\n\n${text}` }] };
    }

    if (name === 'get_extraction') {
      await ensureServer();
      const id = String(args.id);
      const res = await fetch(`${BASE}/api/history/${id}`);
      if (!res.ok) throw new Error(`Extraction not found: ${id}`);
      const entry = await res.json();
      const full = entry.pages
        .map((p) => `# ${p.title}\n\n> Source: ${p.url}\n\n${p.markdown}`)
        .join('\n\n---\n\n');
      return {
        content: [{
          type: 'text',
          text: `✅ Loaded: ${entry.title} (${entry.pageCount} pages, ${entry.totalWords.toLocaleString()} words)\n\n--- MARKDOWN ---\n\n${full}`,
        }],
      };
    }

    if (name === 'extract_docs') {
      const url = String(args.url);
      const query = String(args.query ?? '');
      const openUi = args.open_browser !== false;

      await ensureServer();

      const jobId = await startJob(url, query);

      if (openUi) {
        const viewUrl = `${BASE}/?url=${encodeURIComponent(url)}&query=${encodeURIComponent(query)}&auto=1`;
        await openBrowser(viewUrl);
      }

      const result = await waitForJob(jobId);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Extraction complete (${result.split(/\s+/).length} words)\n\nUI: ${BASE}\nJob: ${jobId}\n\n--- MARKDOWN ---\n\n${result}`,
          },
        ],
      };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `❌ Error: ${msg}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('Doc Extractor MCP running\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
