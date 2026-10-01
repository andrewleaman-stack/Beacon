// Works out what a YouTube channel is streaming right now from its /live page.
// The page's canonical link points at the current video while the channel is live,
// and the player data says whether it is live and whether it may be embedded.

/**
 * @param {string} html  the HTML of youtube.com/channel/<id>/live
 * @param {string} channelId  the channel we asked for, to reject redirects elsewhere
 * @returns {{ videoId: string | null, live: boolean, embeddable: boolean }}
 */
export function parseLivePage(html, channelId) {
  const none = { videoId: null, live: false, embeddable: false };
  if (typeof html !== 'string' || !html) return none;
  const canonical = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
  if (!canonical) return none;
  const owner = html.match(/"channelId":"(UC[\w-]{22})"/);
  if (channelId && owner && owner[1] !== channelId) return none;
  const live = /"isLive":true/.test(html) || /"isLiveNow":true/.test(html);
  const embeddable = /"playableInEmbed":true/.test(html);
  return { videoId: canonical[1], live, embeddable: live && embeddable };
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.8',
  // Skip the EU cookie-consent interstitial.
  Cookie: 'CONSENT=YES+1; SOCS=CAI',
};

/**
 * @param {string} channelId
 * @param {number} [timeoutMs]
 */
export async function resolveChannel(channelId, timeoutMs = 8000) {
  const res = await fetch(`https://www.youtube.com/channel/${channelId}/live`, {
    headers: HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseLivePage(await res.text(), channelId);
}

/**
 * Runs `fn` over `items` with at most `limit` in flight.
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<R>} fn
 * @returns {Promise<PromiseSettledResult<R>[]>}
 */
export async function mapLimit(items, limit, fn) {
  /** @type {PromiseSettledResult<R>[]} */
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try { out[i] = { status: 'fulfilled', value: await fn(items[i]) }; }
      catch (reason) { out[i] = { status: 'rejected', reason }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
