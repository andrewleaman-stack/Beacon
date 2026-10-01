// Live risk for shipping chokepoints, from evidence rather than a fixed label:
//  - traffic: IMF PortWatch daily transits, last 7 days against the 90 days before
//  - security: recent headlines that name the chokepoint together with attack words
// With no data a chokepoint is UNKNOWN, never assumed HIGH.

export const LEVELS = ['UNKNOWN', 'LOW', 'ELEVATED', 'HIGH', 'CRITICAL'];
const rank = (/** @type {string} */ l) => Math.max(0, LEVELS.indexOf(l));

/** PortWatch ids and the names headlines use for each chokepoint. */
export const CHOKEPOINT_SOURCES = /** @type {Record<string, { portid: string, aliases: string[] }>} */ ({
  'Strait of Hormuz': { portid: 'chokepoint6', aliases: ['hormuz'] },
  'Strait of Malacca': { portid: 'chokepoint5', aliases: ['malacca'] },
  'Suez Canal': { portid: 'chokepoint1', aliases: ['suez'] },
  'Bab el-Mandeb': { portid: 'chokepoint4', aliases: ['bab el-mandeb', 'bab al-mandab', 'bab-el-mandeb', 'red sea'] },
  'Panama Canal': { portid: 'chokepoint2', aliases: ['panama canal'] },
  'Turkish Straits': { portid: 'chokepoint3', aliases: ['bosporus', 'bosphorus', 'dardanelles'] },
  'Danish Straits': { portid: 'chokepoint10', aliases: ['oresund', 'øresund', 'danish straits'] },
  'Cape of Good Hope': { portid: 'chokepoint7', aliases: ['cape of good hope'] },
  'Taiwan Strait': { portid: 'chokepoint11', aliases: ['taiwan strait'] },
  'Lombok Strait': { portid: 'chokepoint15', aliases: ['lombok strait'] },
});

/**
 * @param {{ date: string, n_total: number }[]} rows  daily transits for one chokepoint
 * @returns {{ level: string, ratio: number | null, recent: number | null, normal: number | null, latest: string | null }}
 */
export function transitRisk(rows) {
  const days = (Array.isArray(rows) ? rows : [])
    .filter((r) => r && typeof r.date === 'string' && Number.isFinite(Number(r.n_total)))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (days.length < 30) return { level: 'UNKNOWN', ratio: null, recent: null, normal: null, latest: days[0]?.date ?? null };
  const mean = (/** @type {typeof days} */ xs) => xs.reduce((s, r) => s + Number(r.n_total), 0) / xs.length;
  const recent = mean(days.slice(0, 7));
  const normal = mean(days.slice(7, 97));
  if (!(normal > 0)) return { level: 'UNKNOWN', ratio: null, recent, normal, latest: days[0].date };
  const ratio = recent / normal;
  let level = ratio < 0.4 ? 'CRITICAL' : ratio < 0.6 ? 'HIGH' : ratio < 0.8 ? 'ELEVATED' : 'LOW';
  // A handful of ships a day is too noisy for traffic alone to call HIGH.
  if (normal < 5 && rank(level) > rank('ELEVATED')) level = 'ELEVATED';
  return { level, ratio, recent, normal, latest: days[0].date };
}

const THREAT = /\b(attack(ed|s)?|seiz(e|ed|ure)|hijack(ed)?|drone|missile|strike|struck|explosion|mine[sd]?|board(ed|ing)|fired|shot|closure|closed|blockade|threat(en|ened)?)\b/i;

/**
 * @param {{ title?: string, published?: string, time?: string, timestamp?: string }[]} headlines
 * @param {string[]} aliases
 * @param {number} [now]
 * @returns {{ level: string, reports: string[] }}
 */
export function securityRisk(headlines, aliases, now = Date.now()) {
  const reports = (Array.isArray(headlines) ? headlines : []).filter((h) => {
    const text = String(h?.title || '').toLowerCase();
    if (!aliases.some((a) => text.includes(a)) || !THREAT.test(text)) return false;
    const t = Date.parse(h.published || h.time || h.timestamp || '');
    return !Number.isFinite(t) || now - t < 48 * 3600_000;
  }).map((h) => String(h.title).slice(0, 160));
  const level = reports.length >= 3 ? 'HIGH' : reports.length >= 1 ? 'ELEVATED' : 'LOW';
  return { level, reports };
}

/**
 * @param {{ level: string, ratio: number | null, latest: string | null }} traffic
 * @param {{ level: string, reports: string[] }} security
 * @returns {{ risk: string, evidence: string[] }}
 */
export function combineRisk(traffic, security) {
  const evidence = [];
  if (traffic.ratio !== null) {
    const pct = Math.round((1 - traffic.ratio) * 100);
    evidence.push(pct > 0 ? `Transits ${pct}% below normal (7 days to ${traffic.latest})` : `Transits normal (7 days to ${traffic.latest})`);
  }
  if (security.reports.length) evidence.push(`${security.reports.length} security report${security.reports.length > 1 ? 's' : ''} in 48 h`);
  // Two independent signals agreeing push the level up one step.
  let level = rank(traffic.level) >= rank(security.level) ? traffic.level : security.level;
  if (rank(traffic.level) >= rank('ELEVATED') && rank(security.level) >= rank('ELEVATED') && level !== 'CRITICAL') {
    level = LEVELS[rank(level) + 1];
  }
  if (traffic.level === 'UNKNOWN' && !security.reports.length) level = 'UNKNOWN';
  return { risk: level, evidence };
}
