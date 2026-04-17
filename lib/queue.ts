import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export type QueueStatus = 'pending' | 'consumed' | 'done' | 'error';

export interface QueueRequest {
  id: string;
  extractionId: string;
  title: string;
  url: string;
  pageUrl?: string;
  pageTitle?: string;
  status: QueueStatus;
  createdAt: number;
  consumedAt?: number;
  completedAt?: number;
  userInstruction?: string;
  claudeResponse?: string;
}

const QUEUE_DIR = join(homedir(), '.claude', 'doc-extractor-queue');
const QUEUE_FILE = join(QUEUE_DIR, 'current.json');

async function ensureDir(): Promise<void> {
  await fs.mkdir(QUEUE_DIR, { recursive: true });
}

export async function enqueue(req: Omit<QueueRequest, 'createdAt' | 'status'>): Promise<QueueRequest> {
  await ensureDir();
  const entry: QueueRequest = { ...req, status: 'pending', createdAt: Date.now() };
  await fs.writeFile(QUEUE_FILE, JSON.stringify(entry, null, 2), 'utf-8');
  return entry;
}

export async function peek(): Promise<QueueRequest | null> {
  try {
    const raw = await fs.readFile(QUEUE_FILE, 'utf-8');
    return JSON.parse(raw) as QueueRequest;
  } catch {
    return null;
  }
}

export async function updateStatus(
  status: QueueStatus,
  patch: Partial<QueueRequest> = {}
): Promise<QueueRequest | null> {
  const current = await peek();
  if (!current) return null;
  const updated: QueueRequest = {
    ...current,
    ...patch,
    status,
    ...(status === 'consumed' ? { consumedAt: Date.now() } : {}),
    ...(status === 'done' || status === 'error' ? { completedAt: Date.now() } : {}),
  };
  await fs.writeFile(QUEUE_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function clear(): Promise<void> {
  try {
    await fs.unlink(QUEUE_FILE);
  } catch {}
}
