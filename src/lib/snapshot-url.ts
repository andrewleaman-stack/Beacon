// Camera snapshots are refreshed by adding a throwaway query parameter so the
// browser fetches a new frame. A few hosts reject unknown parameters, so they
// get the plain URL (they still update, just on the browser's cache schedule).
const NO_CACHE_BUST = ['mdotjboss.state.mi.us'];

export function snapshotUrl(url: string, tick: number | string): string {
  try {
    if (NO_CACHE_BUST.includes(new URL(url).hostname)) return url;
  } catch {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}_t=${tick}`;
}
