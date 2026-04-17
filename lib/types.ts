export type ActivityEventType =
  | 'start'
  | 'site'
  | 'running'
  | 'pages'
  | 'error'
  | 'done';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: number;
  title?: string;
  message?: string;
  site?: { hostname: string; favicon?: string };
  pages?: Array<{ url: string; title: string; words: number }>;
  detail?: string;
}

export interface ExtractedPage {
  url: string;
  title: string;
  markdown: string;
  words: number;
  path: string;
}

export interface ExtractRequest {
  url: string;
  query?: string;
  maxPages?: number;
  maxDepth?: number;
}

export interface ExtractJob {
  jobId: string;
  url: string;
  query: string;
  status: 'pending' | 'running' | 'done' | 'error';
  events: ActivityEvent[];
  pages: ExtractedPage[];
  result?: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}
