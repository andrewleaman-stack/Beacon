const KEV_URL = 'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json';
const OSV_API_BASE = 'https://api.osv.dev/v1';
const NVD_API_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const GHSA_API_BASE = 'https://api.github.com/advisories';

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

function severityFromScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 'unknown';
  if (numeric >= 9) return 'critical';
  if (numeric >= 7) return 'high';
  if (numeric >= 4) return 'medium';
  return 'low';
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
  return severityFromScore(max);
}

function referenceUrls(value) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === 'string' ? item : item?.url).filter(Boolean);
  }
  return text(value)
    .split(/\s+/)
    .filter((item) => /^https?:\/\//i.test(item));
}

function firstEnglishDescription(descriptions = []) {
  return text(asArray(descriptions).find((item) => item?.lang === 'en')?.value || descriptions?.[0]?.value);
}

function firstCpeProduct(configurations = []) {
  const matches = [];
  const visitNode = (node) => {
    for (const match of asArray(node?.cpeMatch)) matches.push(match?.criteria);
    for (const child of asArray(node?.children)) visitNode(child);
  };
  for (const configuration of asArray(configurations)) {
    for (const node of asArray(configuration?.nodes)) visitNode(node);
  }
  const cpe = text(matches.find(Boolean));
  const parts = cpe.split(':');
  return {
    vendor: parts[3] || 'Unknown',
    product: parts[4] || 'Unknown',
  };
}

function nvdMetric(cve = {}) {
  const metrics = cve.metrics || {};
  const metric = asArray(metrics.cvssMetricV31)[0]
    || asArray(metrics.cvssMetricV30)[0]
    || asArray(metrics.cvssMetricV2)[0]
    || {};
  const score = metric.cvssData?.baseScore;
  const severity = text(metric.cvssData?.baseSeverity || metric.baseSeverity || severityFromScore(score)).toLowerCase();
  return { score, severity };
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

export function normalizeNvdVulnerability(item) {
  const cve = item?.cve || item || {};
  const metric = nvdMetric(cve);
  const product = firstCpeProduct(cve.configurations);
  const id = text(cve.id);
  return {
    id,
    cve: id,
    title: id,
    description: firstEnglishDescription(cve.descriptions),
    severity: metric.severity || 'unknown',
    priority: priorityForSeverity(metric.severity || 'unknown'),
    cvssScore: metric.score ?? null,
    exploited: false,
    ransomwareUse: 'Unknown',
    vendor: product.vendor,
    product: product.product,
    published: text(cve.published),
    dueDate: '',
    source: 'NVD',
    url: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(id)}`,
    references: referenceUrls(cve.references?.referenceData),
    cwes: asArray(cve.weaknesses).flatMap((weakness) => asArray(weakness.description).map((description) => text(description.value)).filter(Boolean)),
  };
}

export function normalizeGhsaAdvisory(item) {
  const firstPackage = asArray(item?.vulnerabilities).map((vulnerability) => vulnerability?.package).find(Boolean) || {};
  const severity = text(item?.severity, 'unknown').toLowerCase();
  return {
    id: text(item?.ghsa_id || item?.id),
    cve: text(item?.cve_id || item?.ghsa_id || item?.id),
    title: text(item?.summary || item?.ghsa_id),
    description: text(item?.description || item?.summary),
    severity,
    priority: priorityForSeverity(severity),
    exploited: false,
    ransomwareUse: 'Unknown',
    vendor: text(firstPackage.ecosystem, 'GitHub Advisory'),
    product: text(firstPackage.name, 'Unknown package'),
    published: text(item?.published_at || item?.updated_at),
    dueDate: '',
    source: 'GHSA',
    url: text(item?.html_url || item?.url),
    references: [text(item?.html_url || item?.url)].filter(Boolean),
    cwes: asArray(item?.cwes).map((cwe) => text(cwe.cwe_id || cwe.name || cwe)).filter(Boolean),
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

export async function fetchNvdRecent({ apiKey = process.env.NVD_API_KEY, fetchImpl = fetch, days = 7 } = {}) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60_000);
  const params = new URLSearchParams({
    lastModStartDate: start.toISOString(),
    lastModEndDate: end.toISOString(),
    resultsPerPage: '50',
  });
  const response = await fetchImpl(`${NVD_API_BASE}?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'BEACON/1.0 cyber-cve-feed',
      ...(apiKey ? { apiKey } : {}),
    },
  });
  if (!response.ok) throw new Error(`NVD returned HTTP ${response.status}`);
  const payload = await response.json();
  return asArray(payload.vulnerabilities).map(normalizeNvdVulnerability).filter((item) => item.cve);
}

export async function fetchGhsaRecent({ token = process.env.GITHUB_TOKEN, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({ per_page: '50', sort: 'published', direction: 'desc' });
  const response = await fetchImpl(`${GHSA_API_BASE}?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
      'User-Agent': 'BEACON/1.0 cyber-cve-feed',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`GHSA returned HTTP ${response.status}`);
  return asArray(await response.json()).map(normalizeGhsaAdvisory).filter((item) => item.id);
}

export async function fetchCyberCveFeed({ fetchImpl = fetch } = {}) {
  const [kevResult, nvdResult, ghsaResult] = await Promise.allSettled([
    fetchKevCatalog(fetchImpl),
    fetchNvdRecent({ fetchImpl }),
    fetchGhsaRecent({ fetchImpl }),
  ]);

  if (kevResult.status !== 'fulfilled') throw kevResult.reason;
  const kev = kevResult.value;
  const nvd = nvdResult.status === 'fulfilled' ? nvdResult.value : [];
  const ghsa = ghsaResult.status === 'fulfilled' ? ghsaResult.value : [];
  const recentKev = sortCvesByPriority(kev).slice(0, 50);
  const osv = await fetchOsvByIds(recentKev.slice(0, 25).map((item) => item.cve), fetchImpl);
  const cves = sortCvesByPriority(mergeCves([...recentKev, ...osv, ...nvd, ...ghsa]));

  return {
    cves,
    sourceStatus: [
      { source: 'CISA KEV', ok: true, count: kev.length, error: null },
      { source: 'OSV', ok: true, count: osv.length, error: null },
      { source: 'NVD', ok: nvdResult.status === 'fulfilled', count: nvd.length, error: nvdResult.status === 'rejected' ? (nvdResult.reason instanceof Error ? nvdResult.reason.message : String(nvdResult.reason)) : null },
      { source: 'GHSA', ok: ghsaResult.status === 'fulfilled', count: ghsa.length, error: ghsaResult.status === 'rejected' ? (ghsaResult.reason instanceof Error ? ghsaResult.reason.message : String(ghsaResult.reason)) : null },
    ],
  };
}
