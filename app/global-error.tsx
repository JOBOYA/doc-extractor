'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <p style={{ padding: '2rem' }}>Something went wrong.</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
