const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';

function clean(value) {
  return String(value ?? '').trim();
}

function extractCableNames(text) {
  const known = ['AAE-1', 'SEAMEWE-5', 'SEA-ME-WE 5', 'EIG', 'TGN-EA', 'ACE', 'SAT-3', 'WACS', 'MainOne', 'Seacom', 'Equiano', 'BCS East-West Interlink', 'C-Lion1'];
  const found = new Set();
  for (const name of known) {
    if (text.toLowerCase().includes(name.toLowerCase())) found.add(name);
  }
  return Array.from(found);
}

function severityFrom(text) {
  const lower = text.toLowerCase();
  if (lower.includes('sabotage') || lower.includes('severed') || lower.includes('cut') || lower.includes('major outage')) return 'high';
  if (lower.includes('fault') || lower.includes('damage') || lower.includes('disruption')) return 'elevated';
  return 'low';
}

export function normalizeSubmarineCableFault(article) {
  const title = clean(article.title);
  const description = clean(article.seendate || article.socialimage || article.domain);
  const text = `${title} ${clean(article.url)} ${clean(article.domain)}`;
  return {
    id: `submarine-cable-${Buffer.from(clean(article.url || title)).toString('base64url').slice(0, 32)}`,
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

export async function fetchSubmarineCableFaults({ limit = 25, fetchImpl = fetch } = {}) {
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
  return articles.map(normalizeSubmarineCableFault).filter((item) => item.title && item.url);
}
