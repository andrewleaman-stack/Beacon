const KEV_URL = 'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json';
const OSV_API_BASE = 'https://api.osv.dev/v1';

function text(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function severityFromCvssVector(vector) {
  if (!vector) return 'unknown';
  const upper = String(vector).toUpperCase();
  if (upper.includes('/C:H') && upper.includes('/I:H') && upper.includes('/A:H')) return 'critical';
  if (upper.includes('/AV:N') && upper.includes('/AC:L')) return 'high';
  return 'medium';
}

function priorityForSeverity(severity) {
  if (severity === 'critical') return 90;
  if (severity === 'high') return 70;
  if (severity === 'medium') return 45;
  if (severity === 'low') return 20;
  return 10;
}

function parseCvssScore(score) {
  const raw = String(score ?? '');
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric;
  const match = raw.match(/CVSS:[^\s]+/i);
  if (!match) return null;
  const vector = match[0];
  if (vector.includes('/C:H') && vector.includes('/I:H') && vector.includes('/A:H')) return 9.8;
  if (vector.includes('/AV:N') && vector.includes('/AC:L')) return 8.1;
  return null;
}

function severityFromOsv(severity = []) {
  const scores = asArray(severity)
    .map((item) => parseCvssScore(item?.score))
    .filter((score) => Number.isFinite(score));

  if (!scores.length) {
    const vectorSeverity = asArray(severity)
      .map((item) => severityFromCvssVector(item?.score))
      .find((value) => value !== 'unknown');
    return vectorSeverity || 'unknown';
  }

  const max = Math.max(...scores);
  if (max >= 9) return 'critical';
  if (max >= 7) return 'high';
  if (max >= 4) return 'medium';
  return 'low';
}

function referenceUrls(value) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === 'string' ? item : item?.url).filter(Boolean);
  }
  return text(value)
    .split(/\s+/)
    .filter((item) => /^https?:\/\//i.test(item));
}

export function normalizeKevCatalog(payload) {
  return asArray(payload?.vulnerabilities).map((item) => ({
    id: text(item.cveID),
    cve: text(item.cveID),
    title: text(item.vulnerabilityName, `${text(item.vendorProject)} ${text(item.product)} vulnerability`).replace(/\s+/g, ' ').trim(),
    description: text(item.shortDescription),
    severity: 'critical',
    priority: text(item.knownRansomwareCampaignUse).toLowerCase() === 'known' ? 100 : 95,
    exploited: true,
    ransomwareUse: text(item.knownRansomwareCampaignUse, 'Unknown'),
    vendor: text(item.vendorProject, 'Unknown'),
    product: text(item.product, 'Unknown'),
    published: text(item.dateAdded),
    dueDate: text(item.dueDate),
    source: 'CISA KEV',
    url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    references: referenceUrls(item.notes),
    cwes: asArray(item.cwes),
  })).filter((item) => item.cve);
}

export function normalizeOsvVulnerability(item) {
  const aliases = asArray(item?.aliases).map(String);
  const cve = aliases.find((alias) => /^CVE-\d{4}-\d+/i.test(alias)) || (/^CVE-\d{4}-\d+/i.test(text(item?.id)) ? text(item.id) : text(item?.id));
  const firstPackage = asArray(item?.affected).map((affected) => affected?.package).find(Boolean) || {};
  const severity = severityFromOsv(item?.severity);
  const priority = priorityForSeverity(severity);

  return {
    id: text(item?.id || cve),
    cve,
    title: text(item?.summary || cve),
    description: text(item?.details || item?.summary),
    severity,
    priority,
    exploited: false,
    ransomwareUse: 'Unknown',
    vendor: text(firstPackage.ecosystem, 'Open Source'),
    product: text(firstPackage.name, 'Unknown package'),
    published: text(item?.published || item?.modified),
    dueDate: '',
    source: 'OSV',
    url: `https://osv.dev/vulnerability/${encodeURIComponent(text(item?.id || cve))}`,
    references: referenceUrls(item?.references),
    cwes: asArray(item?.database_specific?.cwe_ids),
  };
}

export function mergeCves(items) {
  const merged = new Map();

  for (const item of items.filter(Boolean)) {
    const key = String(item.cve || item.id).toUpperCase();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }

    merged.set(key, {
      ...existing,
      ...item,
      id: existing.id || item.id,
      cve: existing.cve || item.cve,
      title: existing.title || item.title,
      description: existing.description || item.description,
      severity: existing.severity === 'critical' ? existing.severity : item.severity,
      priority: Math.max(existing.priority || 0, item.priority || 0, existing.exploited ? 100 : 0),
      exploited: Boolean(existing.exploited || item.exploited),
      ransomwareUse: existing.ransomwareUse !== 'Unknown' ? existing.ransomwareUse : item.ransomwareUse,
      source: Array.from(new Set([existing.source, item.source].filter(Boolean).flatMap((source) => String(source).split(' + ')))).join(' + '),
      references: Array.from(new Set([...(existing.references || []), ...(item.references || [])])),
      cwes: Array.from(new Set([...(existing.cwes || []), ...(item.cwes || [])])),
    });
  }

  return [...merged.values()];
}

export function sortCvesByPriority(items) {
  return [...items].sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return String(b.published || '').localeCompare(String(a.published || ''));
  });
}

export async function fetchKevCatalog(fetchImpl = fetch) {
  const response = await fetchImpl(KEV_URL, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 cyber-cve-feed' },
  });
  if (!response.ok) throw new Error(`CISA KEV returned HTTP ${response.status}`);
  return normalizeKevCatalog(await response.json());
}

export async function fetchOsvByIds(ids, fetchImpl = fetch) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))).slice(0, 25);
  const results = await Promise.allSettled(uniqueIds.map(async (id) => {
    const response = await fetchImpl(`${OSV_API_BASE}/vulns/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'BEACON/1.0 cyber-cve-feed' },
    });
    if (!response.ok) return null;
    return normalizeOsvVulnerability(await response.json());
  }));

  return results
    .filter((result) => result.status === 'fulfilled' && result.value)
    .map((result) => result.value);
}

export async function fetchCyberCveFeed({ fetchImpl = fetch } = {}) {
  const kev = await fetchKevCatalog(fetchImpl);
  const recentKev = sortCvesByPriority(kev).slice(0, 50);
  const osv = await fetchOsvByIds(recentKev.slice(0, 25).map((item) => item.cve), fetchImpl);
  const cves = sortCvesByPriority(mergeCves([...recentKev, ...osv]));

  return {
    cves,
    sourceStatus: [
      { source: 'CISA KEV', ok: true, count: kev.length, error: null },
      { source: 'OSV', ok: true, count: osv.length, error: null },
    ],
  };
}
