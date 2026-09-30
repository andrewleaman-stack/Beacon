/**
 * Wikipedia edit-surge detection.
 *
 * When something happens in the world, editors pile onto the relevant article
 * within minutes. This watches Wikimedia's public recent-changes stream
 * (https://stream.wikimedia.org/v2/stream/recentchange, no key) and flags:
 *   - surge:        many edits from many different people in a short window
 *   - new-article:  a freshly created article that is filling up fast
 *   - protected:    an article locked because of edit volume
 * Flagged articles are then checked against the Wikipedia API: we keep ones
 * with coordinates or an event-like description, and drop sport/entertainment.
 *
 * A surge is a lead to investigate, not confirmation of an event.
 */

export const WATCHED_WIKIS = new Set([
  'enwiki', 'ukwiki', 'ruwiki', 'arwiki', 'hewiki', 'fawiki', 'trwiki', 'frwiki', 'dewiki',
  'eswiki', 'ptwiki', 'itwiki', 'plwiki', 'zhwiki', 'jawiki', 'kowiki', 'hiwiki', 'idwiki',
]);

const MINUTE = 60_000;

export const DEFAULTS = {
  windowMs: 30 * MINUTE,
  minEdits: 12,
  minEditors: 5,
  newArticleWindowMs: 6 * 60 * MINUTE,
  newArticleMinEdits: 8,
  newArticleMinEditors: 4,
  protectedMinEdits: 3,
  maxPages: 20_000,
};

export class SurgeTracker {
  constructor(options = {}) {
    this.opts = { ...DEFAULTS, ...options };
    this.now = options.now || (() => Date.now());
    this.pages = new Map();
    this.ingested = 0;
  }

  static key(wiki, title) {
    return `${wiki}:${title}`;
  }

  /** Feed one recentchange event (parsed JSON). Returns true if it was kept. */
  ingest(event) {
    if (!event || event.bot || event.namespace !== 0 || !WATCHED_WIKIS.has(event.wiki)) return false;
    const ts = Number(event.timestamp) * 1000 || this.now();
    const isEdit = event.type === 'edit' || event.type === 'new';
    const isProtect = event.type === 'log' && event.log_type === 'protect' && event.log_action !== 'unprotect';
    if (!isEdit && !isProtect) return false;

    const key = SurgeTracker.key(event.wiki, event.title);
    let page = this.pages.get(key);
    if (!page) {
      if (this.pages.size >= this.opts.maxPages) this.sweep(true);
      page = { wiki: event.wiki, title: event.title, serverUrl: event.server_url, edits: [], editors: new Map(), createdAt: null, protectedAt: null, lastAt: ts };
      this.pages.set(key, page);
    }
    page.lastAt = Math.max(page.lastAt, ts);
    if (event.type === 'new') page.createdAt = ts;
    if (isProtect) page.protectedAt = ts;
    if (isEdit) {
      page.edits.push(ts);
      if (event.user) page.editors.set(event.user, ts);
    }
    this.ingested++;
    if (this.ingested % 5000 === 0) this.sweep(false);
    return true;
  }

  /** Drop activity outside the window; when `force`, also evict the least recently active tenth. */
  sweep(force) {
    const cutoff = this.now() - this.opts.windowMs;
    for (const [key, page] of this.pages) {
      page.edits = page.edits.filter((t) => t >= cutoff);
      for (const [user, t] of page.editors) if (t < cutoff) page.editors.delete(user);
      const recentlyCreated = page.createdAt && page.createdAt >= this.now() - this.opts.newArticleWindowMs;
      if (!page.edits.length && !recentlyCreated && !(page.protectedAt && page.protectedAt >= cutoff)) this.pages.delete(key);
    }
    if (force && this.pages.size >= this.opts.maxPages) {
      const byAge = [...this.pages.entries()].sort((a, b) => a[1].lastAt - b[1].lastAt);
      for (const [key] of byAge.slice(0, Math.ceil(byAge.length / 10))) this.pages.delete(key);
    }
  }

  /** Articles currently meeting a surge rule, strongest first. */
  surges() {
    const now = this.now();
    const cutoff = now - this.opts.windowMs;
    const out = [];
    for (const page of this.pages.values()) {
      const edits = page.edits.filter((t) => t >= cutoff).length;
      let editors = 0;
      for (const t of page.editors.values()) if (t >= cutoff) editors++;
      const isNew = !!page.createdAt && page.createdAt >= now - this.opts.newArticleWindowMs;
      const isProtected = !!page.protectedAt && page.protectedAt >= cutoff;

      let kind = null;
      if (isNew && edits >= this.opts.newArticleMinEdits && editors >= this.opts.newArticleMinEditors) kind = 'new-article';
      else if (isProtected && edits >= this.opts.protectedMinEdits) kind = 'protected';
      else if (edits >= this.opts.minEdits && editors >= this.opts.minEditors) kind = 'surge';
      if (!kind) continue;

      out.push({
        key: SurgeTracker.key(page.wiki, page.title),
        wiki: page.wiki,
        title: page.title,
        serverUrl: page.serverUrl,
        kind,
        edits,
        editors,
        windowMinutes: Math.round(this.opts.windowMs / MINUTE),
        createdAt: page.createdAt ? new Date(page.createdAt).toISOString() : null,
        protectedAt: page.protectedAt ? new Date(page.protectedAt).toISOString() : null,
        lastEditAt: new Date(page.lastAt).toISOString(),
        score: edits + editors * 3 + (kind === 'new-article' ? 15 : 0) + (isProtected ? 10 : 0),
      });
    }
    return out.sort((a, b) => b.score - a.score);
  }
}

// ── Topic filter ────────────────────────────────────────────────────────────

const EVENT_RE = /\b(earthquake|tsunami|eruption|flood|storm|hurricane|typhoon|cyclone|tornado|wildfire|fire|explosion|blast|attack|bombing|shooting|massacre|stabbing|hostage|siege|strike|airstrike|offensive|battle|war|invasion|coup|protest|riot|unrest|uprising|crash|collision|derailment|shipwreck|sinking|disaster|outbreak|epidemic|pandemic|assassination|killing|evacuation|blackout|outage|cyberattack|ceasefire|incident|accident|crisis|emergency)\b/i;
const NOISE_RE = /\b(footballer|football club|soccer|basketball|baseball|cricketer|cricket|tennis|golfer|wrestler|boxer|athlete|olympic|tournament|championship|season|league|cup final|singer|rapper|musician|band|album|song|single|actor|actress|film|movie|television|tv series|episode|sitcom|video game|anime|manga|youtuber|influencer|reality show|award)\b/i;

/**
 * Decide whether an enriched article is worth showing. `info` comes from the
 * Wikipedia API: { coordinates: {lat, lon} | null, description: string }.
 */
export function classifyArticle(surge, info) {
  const text = `${surge.title} ${info?.description || ''}`;
  if (NOISE_RE.test(text)) return { keep: false, reason: 'entertainment/sport' };
  if (info?.coordinates) return { keep: true, reason: 'has coordinates' };
  if (EVENT_RE.test(text)) return { keep: true, reason: 'event-like topic' };
  return { keep: false, reason: 'no location or event signal' };
}

export function severityForSurge(surge) {
  if (surge.kind === 'new-article' || surge.kind === 'protected') return 'high';
  return surge.editors >= 10 ? 'high' : 'elevated';
}

// ── SSE parsing ─────────────────────────────────────────────────────────────

/** Split an SSE text buffer into complete `data:` payloads and the unfinished remainder. */
export function parseSseChunk(buffer) {
  const events = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const block of parts) {
    const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n');
    if (data) events.push(data);
  }
  return { events, rest };
}
