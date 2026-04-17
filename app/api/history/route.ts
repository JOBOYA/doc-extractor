import { NextResponse } from 'next/server';
import { listExtractions } from '@/lib/persistence';

export const dynamic = 'force-dynamic';

export async function GET() {
  const entries = await listExtractions();
  // Return summary without full page content (for list view)
  const summary = entries.map(({ pages: _pages, ...rest }) => rest);
  return NextResponse.json({ entries: summary });
}
