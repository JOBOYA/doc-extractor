import { EventEmitter } from 'events';
import type { ActivityEvent, ExtractJob, ExtractedPage } from './types';

class JobStore extends EventEmitter {
  private jobs = new Map<string, ExtractJob>();

  create(jobId: string, url: string, query: string): ExtractJob {
    const job: ExtractJob = {
      jobId,
      url,
      query,
      status: 'pending',
      events: [],
      pages: [],
      startedAt: Date.now(),
    };
    this.jobs.set(jobId, job);
    return job;
  }

  get(jobId: string): ExtractJob | undefined {
    return this.jobs.get(jobId);
  }

  push(jobId: string, event: ActivityEvent): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.events.push(event);
    this.emit(`event:${jobId}`, event);
  }

  addPage(jobId: string, page: ExtractedPage): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.pages.push(page);
    this.emit(`page:${jobId}`, page);
  }

  setStatus(jobId: string, status: ExtractJob['status']): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = status;
    if (status === 'done' || status === 'error') {
      job.finishedAt = Date.now();
    }
    this.emit(`status:${jobId}`, status);
  }

  setResult(jobId: string, result: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.result = result;
  }

  setError(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.error = error;
  }
}

declare global {
  var __jobStore: JobStore | undefined;
}

export const jobStore = globalThis.__jobStore ?? (globalThis.__jobStore = new JobStore());
