import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { ActivityEvent, ExtractedPage } from './types';

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  hostname: string;
  query: string;
  pages: ExtractedPage[];
  events: ActivityEvent[];
  pageCount: number;
  totalWords: number;
  extractedAt: number;
}

const HISTORY_DIR = join(homedir(), '.claude', 'doc-extractor-history');

async function ensureDir(): Promise<void> {
  await fs.mkdir(HISTORY_DIR, { recursive: true });
}

export async function saveExtraction(entry: HistoryEntry): Promise<void> {
  await ensureDir();
  const path = join(HISTORY_DIR, `${entry.id}.json`);
  await fs.writeFile(path, JSON.stringify(entry, null, 2), 'utf-8');
}

export async function listExtractions(): Promise<HistoryEntry[]> {
  await ensureDir();
  const files = await fs.readdir(HISTORY_DIR);
  const entries: HistoryEntry[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(join(HISTORY_DIR, f), 'utf-8');
      entries.push(JSON.parse(raw));
    } catch {}
  }
  return entries.sort((a, b) => b.extractedAt - a.extractedAt);
}

export async function getExtraction(id: string): Promise<HistoryEntry | null> {
  try {
    const raw = await fs.readFile(join(HISTORY_DIR, `${id}.json`), 'utf-8');
    return JSON.parse(raw) as HistoryEntry;
  } catch {
    return null;
  }
}

export async function deleteExtraction(id: string): Promise<boolean> {
  try {
    await fs.unlink(join(HISTORY_DIR, `${id}.json`));
    return true;
  } catch {
    return false;
  }
}
