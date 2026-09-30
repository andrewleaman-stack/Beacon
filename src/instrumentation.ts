/**
 * Runs once when the Next.js server starts. Starts the Wikipedia edit-surge
 * stream on long-running Node servers (the Pi container). Skipped on Vercel,
 * during `next build`, and when WIKI_SURGE_STREAM=0.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.VERCEL || process.env.NEXT_PHASE === 'phase-production-build') return;
  if (process.env.WIKI_SURGE_STREAM === '0') return;
  const { ensureWikiSurgeStream } = await import('./lib/wiki-surge-stream.mjs');
  ensureWikiSurgeStream();
}
