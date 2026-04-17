import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { jobStore } from '@/lib/events';
import { crawl } from '@/lib/crawler';
import type { ExtractRequest } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ExtractRequest;
  if (!body.url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = new URL(body.url).toString();
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const jobId = randomUUID();
  jobStore.create(jobId, normalizedUrl, body.query ?? '');

  // Fire-and-forget crawl
  crawl(jobId, normalizedUrl, body.query ?? '', body.maxPages ?? 15, body.maxDepth ?? 2).catch((err) => {
    jobStore.setError(jobId, err instanceof Error ? err.message : String(err));
    jobStore.setStatus(jobId, 'error');
  });

  return NextResponse.json({ jobId });
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  const job = jobStore.get(jobId);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(job);
}
