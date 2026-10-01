import { timedFetch } from '@/lib/timed-fetch';
import { CHOKEPOINT_SOURCES, transitRisk, securityRisk, combineRisk } from '@/lib/chokepoint-risk.mjs';

// IMF PortWatch daily chokepoint transits. Data lags a few days and changes daily,
// so it is cached for 3 hours; a failed refresh keeps the last good copy.
const PORTWATCH = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query';
const TTL_MS = 3 * 3600_000;
let transits: { at: number; byPort: Map<string, { date: string; n_total: number }[]> } | null = null;

async function loadTransits() {
  if (transits && Date.now() - transits.at < TTL_MS) return transits.byPort;
  try {
    const since = new Date(Date.now() - 120 * 86400_000).toISOString().slice(0, 10);
    const ids = Object.values(CHOKEPOINT_SOURCES).map((s) => `'${s.portid}'`).join(',');
    const qs = new URLSearchParams({
      where: `portid IN (${ids}) AND date >= DATE '${since}'`,
      outFields: 'portid,date,n_total', orderByFields: 'date DESC', resultRecordCount: '2000', f: 'json',
    });
    const res = await timedFetch(`${PORTWATCH}?${qs}`, { timeoutMs: 15_000 });
    if (!res.ok) throw new Error(`PortWatch HTTP ${res.status}`);
    const json = await res.json();
    const byPort = new Map<string, { date: string; n_total: number }[]>();
    for (const f of json?.features || []) {
      const a = f.attributes || {};
      if (!byPort.has(a.portid)) byPort.set(a.portid, []);
      byPort.get(a.portid)!.push({ date: String(a.date), n_total: Number(a.n_total) });
    }
    if (byPort.size) transits = { at: Date.now(), byPort };
    return byPort.size ? byPort : transits?.byPort ?? new Map();
  } catch {
    return transits?.byPort ?? new Map();
  }
}

async function loadHeadlines(origin: string) {
  try {
    const res = await fetch(`${origin}/api/news`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    return (await res.json())?.news || [];
  } catch {
    return [];
  }
}

/** Live risk and the evidence behind it, keyed by chokepoint name. */
export async function chokepointStatus(origin: string) {
  const [byPort, headlines] = await Promise.all([loadTransits(), loadHeadlines(origin)]);
  const out = new Map<string, { risk: string; evidence: string[]; reports: string[] }>();
  for (const [name, src] of Object.entries(CHOKEPOINT_SOURCES)) {
    const traffic = transitRisk(byPort.get(src.portid) || []);
    const security = securityRisk(headlines, src.aliases);
    out.set(name, { ...combineRisk(traffic, security), reports: security.reports.slice(0, 3) });
  }
  return out;
}
