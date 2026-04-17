import { NextRequest, NextResponse } from 'next/server';
import { getExtraction, deleteExtraction } from '@/lib/persistence';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getExtraction(id);
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteExtraction(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
