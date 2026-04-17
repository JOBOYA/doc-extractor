'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: '2rem' }}>
      <p>Something went wrong.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
