const DTE_TRACKER_API_URL = 'https://raw.githubusercontent.com/MichiganDaily/dte-outage-tracker/main/data-api.json';
const DTE_TRACKER_HOME_URL = 'https://raw.githubusercontent.com/MichiganDaily/dte-outage-tracker/main/data-home.json';

function number(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeDteOutageSummary({ apiPayload = {}, homePayload = {} } = {}) {
  const total = apiPayload?.summaryFileData?.totals?.[0] || {};
  const generated = apiPayload?.summaryFileData?.date_generated || homePayload?.lastUpdated || new Date().toISOString();
  const customersAffected = number(homePayload.customersAffected, number(total?.total_cust_a?.val));
  const totalCustomers = number(homePayload.totalCustomers, number(total?.total_cust_s));
  const totalOutages = number(total?.total_outages);
  const percentWithPower = number(homePayload.percentageWithPower, number(total?.total_percent_cust_active?.val));

  return {
    id: `dte-outage-summary-${generated}`,
    provider: 'DTE Energy',
    type: 'power_outage_summary',
    customersAffected,
    customersWithPower: number(homePayload.customersWithPower, Math.max(0, totalCustomers - customersAffected)),
    totalCustomers,
    totalOutages,
    percentWithPower,
    crews: number(homePayload.currentSituations?.find?.((item) => item.key === 'crews')?.displayValue),
    lat: 42.3314,
    lng: -83.0458,
    region: 'Southeast Michigan / DTE service territory',
    timestamp: generated,
    fetchedAt: new Date().toISOString(),
    severity: customersAffected >= 100000 ? 'critical' : customersAffected >= 25000 ? 'high' : customersAffected >= 5000 ? 'elevated' : 'low',
    source: 'Michigan Daily DTE outage tracker / DTE Kubra summary',
    sourceUrl: 'https://github.com/MichiganDaily/dte-outage-tracker',
  };
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'BEACON/1.0 dte-power-outages', 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

export async function fetchPowerOutages({ fetchImpl = fetch } = {}) {
  const [apiPayload, homePayload] = await Promise.all([
    fetchJson(DTE_TRACKER_API_URL, fetchImpl),
    fetchJson(DTE_TRACKER_HOME_URL, fetchImpl),
  ]);
  return [normalizeDteOutageSummary({ apiPayload, homePayload })];
}
