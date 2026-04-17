import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function safePathname(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname || '/';
  } catch {
    return url;
  }
}
