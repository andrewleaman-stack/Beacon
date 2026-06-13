const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const CABLEDOWN_ACTIVE_OUTAGES = 'https://cabledown.com/api/trpc/outages.getActive';
const SUBTEL_FAULTS_RSS = 'https://subtelforum.com/category/cable-faults-maintenance/feed/';

function clean(value) {
  return String(value ?? '').trim();
}

function extractCableNames(text) {
  const known = ['AAE-1', 'SEAMEWE-5', 'SEA-ME-WE 5', 'EIG', 'TGN-EA', 'ACE', 'SAT-3', 'WACS', 'MainOne', 'Seacom', 'Equiano', 'BCS East-West Interlink', 'C-Lion1', 'AU-Aleutian', 'IMEWE', 'FALCON', 'Asia-America Gateway'];
  const found = new Set();
  for (const name of known) {
    if (text.toLowerCase().includes(name.toLowerCase())) found.add(name);
  }
  return Array.from(found);
}

function severityFrom(text) {
  const lower = text.toLowerCase();
  if (lower.includes('down') || lower.includes('sabotage') || lower.includes('severed') || lower.includes('cut') || lower.includes('major outage')) return 'high';
  if (lower.includes('degraded') || lower.includes('fault') || lower.includes('damage') || lower.includes('disruption')) return 'elevated';
  return 'low';
}

function base64Id(input) {
  return Buffer.from(clean(input)).toString('base64url').slice(0, 48);
}

export function normalizeSubmarineCableFault(article) {
  const title = clean(article.title);
  const text = `${title} ${clean(article.url)} ${clean(article.domain)}`;
  return {
    id: `submarine-cable-${base64Id(clean(article.url || title))}`,
    type: 'submarine_cable_fault',
    title,
    description: title,
    url: clean(article.url),
    domain: clean(article.domain),
    language: clean(article.language),
    publishedAt: clean(article.seendate),
    cables: extractCableNames(text),
    source: 'GDELT submarine cable disruption search',
    sourceUrl: clean(article.url),
    fetchedAt: new Date().toISOString(),
    severity: severityFrom(text),
  };
}

export function normalizeCableDownOutage(outage) {
  const cableName = clean(outage.cableName);
  const segmentName = clean(outage.segmentName);
  const status = clean(outage.status).toLowerCase();
  const title = `${cableName || 'Submarine cable'} ${status || 'fault'}${segmentName ? ` — ${segmentName}` : ''}`;
  const description = clean(outage.faultLocationDescription || outage.causeDetail || outage.cause || title);
  return {
    id: `submarine-cable-cabledown-${clean(outage.segmentId || outage.cableId || base64Id(title))}`,
    type: 'submarine_cable_fault',
    title,
    description,
    url: 'https://cabledown.com/outages',
    domain: 'cabledown.com',
    publishedAt: clean(outage.statusSince),
    expectedRecovery: outage.expectedRecovery || null,
    status,
    cause: clean(outage.cause),
    causeDetail: clean(outage.causeDetail),
    repairShipAssigned: clean(outage.repairShipAssigned),
    affectedCapacityPercent: Number(outage.affectedCapacityPercent ?? 0),
    cableId: outage.cableId ?? null,
    segmentId: outage.segmentId ?? null,
    cableName,
    segmentName,
    cables: cableName ? [cableName] : extractCableNames(`${title} ${description}`),
    source: 'SubseaDown active outage tracker',
    sourceUrl: 'https://cabledown.com/outages',
    fetchedAt: new Date().toISOString(),
    severity: status === 'down' ? 'high' : severityFrom(`${status} ${title} ${description}`),
  };
}

function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
  for (const block of xml.match(itemRegex) || []) {
    const value = (tag) => {
      const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return clean((match?.[1] || '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#038;/g, '&'));
    };
    const title = value('title');
    const link = value('link');
    const pubDate = value('pubDate');
    if (!title || !link) continue;
    items.push({
      id: `submarine-cable-subtel-${base64Id(link)}`,
      type: 'submarine_cable_fault',
      title,
      description: value('description') || title,
      url: link,
      domain: 'subtelforum.com',
      publishedAt: pubDate,
      cables: extractCableNames(`${title} ${link}`),
      source: 'SubTel Forum cable faults RSS',
      sourceUrl: link,
      fetchedAt: new Date().toISOString(),
      severity: severityFrom(title),
    });
  }
  return items;
}

async function fetchCableDownOutages({ limit, fetchImpl }) {
  const response = await fetchImpl(CABLEDOWN_ACTIVE_OUTAGES, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 submarine-cable-faults', 'Accept': 'application/json', 'Referer': 'https://cabledown.com/outages' },
  });
  if (!response.ok) throw new Error(`SubseaDown returned HTTP ${response.status}`);
  const payload = await response.json();
  const rows = payload?.result?.data?.json || [];
  return (Array.isArray(rows) ? rows : []).slice(0, limit).map(normalizeCableDownOutage).filter((item) => item.title);
}

async function fetchSubtelFaultRss({ limit, fetchImpl }) {
  const response = await fetchImpl(SUBTEL_FAULTS_RSS, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 submarine-cable-faults', 'Accept': 'application/rss+xml,text/xml,*/*' },
  });
  if (!response.ok) throw new Error(`SubTel Forum RSS returned HTTP ${response.status}`);
  const xml = await response.text();
  return parseRssItems(xml).slice(0, limit);
}

async function fetchGdeltFaults({ limit, fetchImpl }) {
  const query = '"submarine cable" (cut OR fault OR outage OR damage OR severed OR disruption)';
  const params = new URLSearchParams({
    query,
    mode: 'ArtList',
    format: 'json',
    maxrecords: String(Math.min(limit, 50)),
    sort: 'HybridRel',
  });
  const response = await fetchImpl(`${GDELT_DOC_API}?${params.toString()}`, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 submarine-cable-faults', 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`GDELT submarine cable search returned HTTP ${response.status}`);
  const payload = await response.json();
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  return articles.map(normalizeSubmarineCableFault).filter((item) => item.title && item.url).slice(0, limit);
}

export async function fetchSubmarineCableFaults({ limit = 25, fetchImpl = fetch } = {}) {
  const errors = [];
  for (const loader of [fetchCableDownOutages, fetchSubtelFaultRss, fetchGdeltFaults]) {
    try {
      const faults = await loader({ limit, fetchImpl });
      if (faults.length > 0) return faults;
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(errors.join('; ') || 'No submarine cable fault sources returned data');
}
