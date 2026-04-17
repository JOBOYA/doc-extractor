import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { enqueue, peek, clear } from '@/lib/queue';
import { getExtraction } from '@/lib/persistence';

export const dynamic = 'force-dynamic';

export async function GET() {
  const req = await peek();
  return NextResponse.json({ request: req });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    extractionId,
    pageUrl,
    instruction,
  } = body as { extractionId: string; pageUrl?: string; instruction?: string };

  if (!extractionId) {
    return NextResponse.json({ error: 'extractionId required' }, { status: 400 });
  }
  const extraction = await getExtraction(extractionId);
  if (!extraction) {
    return NextResponse.json({ error: 'Extraction not found' }, { status: 404 });
  }

  let pageTitle: string | undefined;
  if (pageUrl) {
    const p = extraction.pages.find((pg) => pg.url === pageUrl);
    pageTitle = p?.title;
  }

  const entry = await enqueue({
    id: randomUUID(),
    extractionId,
    title: extraction.title,
    url: extraction.url,
    pageUrl,
    pageTitle,
    userInstruction: instruction,
  });
  return NextResponse.json({ request: entry });
}

export async function DELETE() {
  await clear();
  return NextResponse.json({ ok: true });
}
