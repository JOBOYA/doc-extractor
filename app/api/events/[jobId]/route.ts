import { NextRequest } from 'next/server';
import { jobStore } from '@/lib/events';
import type { ActivityEvent, ExtractedPage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = jobStore.get(jobId);
  if (!job) return new Response('Not found', { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      for (const ev of job.events ?? []) send('event', ev);
      for (const p of job.pages ?? []) send('page', p);
      send('status', job.status);

      const onEvent = (ev: ActivityEvent) => send('event', ev);
      const onPage = (p: ExtractedPage) => send('page', p);
      const onStatus = (status: string) => {
        send('status', status);
        if (status === 'done' || status === 'error') {
          const j = jobStore.get(jobId);
          if (j?.result) send('result', { content: j.result });
          if (j?.error) send('error_msg', { message: j.error });
          controller.close();
          jobStore.off(`event:${jobId}`, onEvent);
          jobStore.off(`page:${jobId}`, onPage);
          jobStore.off(`status:${jobId}`, onStatus);
        }
      };

      jobStore.on(`event:${jobId}`, onEvent);
      jobStore.on(`page:${jobId}`, onPage);
      jobStore.on(`status:${jobId}`, onStatus);

      req.signal.addEventListener('abort', () => {
        jobStore.off(`event:${jobId}`, onEvent);
        jobStore.off(`page:${jobId}`, onPage);
        jobStore.off(`status:${jobId}`, onStatus);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
