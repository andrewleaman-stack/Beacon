const CISA_ICS_RSS_URL = 'https://www.cisa.gov/cybersecurity-advisories/ics-advisories.xml';

function decodeEntities(value) {
  return String(value ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function stripTags(value) {
  return decodeEntities(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

function isoDate(value, fallback = null) {
  const parsed = new Date(value || fallback || Date.now());
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date(fallback || Date.now()).toISOString();
}

function severityForAdvisory(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  if (text.includes('exploited') || text.includes('known exploitation') || text.includes('public exploitation')) return 'high';
  if (text.includes('critical') || text.includes('remote code execution') || text.includes('authentication bypass')) return 'high';
  if (text.includes('industrial control') || text.includes('ics')) return 'elevated';
  return 'elevated';
}

export function normalizeCisaIcsAdvisory(item, now = new Date()) {
  const title = stripTags(item.title);
  const summary = stripTags(item.description || item.summary || '');
  const url = decodeEntities(item.link || item.url || '');
  const id = decodeEntities(item.guid || item.id || url.split('/').filter(Boolean).pop() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return {
    id,
    title,
    summary,
    url,
    publishedAt: isoDate(item.pubDate || item.publishedAt || item.isoDate, now),
    fetchedAt: now.toISOString(),
    severity: severityForAdvisory(title, summary),
    source: 'CISA ICS Advisories',
  };
}

export function parseCisaIcsAdvisoriesXml(xmlText, now = new Date()) {
  const items = String(xmlText || '').match(/<item>[\s\S]*?<\/item>/gi) || [];
  return items.map((block) => normalizeCisaIcsAdvisory({
    title: tag(block, 'title'),
    link: tag(block, 'link'),
    description: tag(block, 'description'),
    pubDate: tag(block, 'pubDate'),
    guid: tag(block, 'guid'),
  }, now));
}

export async function fetchCisaIcsAdvisories({ limit = 50, fetchImpl = fetch, now = new Date() } = {}) {
  const response = await fetchImpl(CISA_ICS_RSS_URL, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 cisa-ics-advisories' },
  });
  if (!response.ok) throw new Error(`CISA ICS returned HTTP ${response.status}`);
  const advisories = parseCisaIcsAdvisoriesXml(await response.text(), now);
  return advisories
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .slice(0, limit);
}
