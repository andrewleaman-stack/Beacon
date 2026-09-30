import { NextResponse } from 'next/server';
import { fetchWorldBankIndicators, fetchWorldBankCountry, fetchLocalSun, flagEmoji } from '@/lib/region-context.mjs';

/**
 * BEACON — Region Dossier API
 * Provides country intelligence for any coordinate (right-click on map)
 * Fix #115: Steps 2-4 now run in parallel via Promise.allSettled
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');

  try {
    // Step 1: Reverse geocode to get country (must complete first — other steps depend on it)
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=5&addressdetails=1`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon)' },
      }
    );

    let countryName = '';
    let countryCode = '';
    let locationInfo: any = {};

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const addr = geoData.address || {};
      countryName = addr.country || '';
      countryCode = addr.country_code?.toUpperCase() || '';
      locationInfo = {
        city: addr.city || addr.town || addr.village || '',
        state: addr.state || addr.region || '',
        country: countryName,
        country_code: countryCode,
        display_name: geoData.display_name,
      };
    }

    // Steps 2–4: Run in PARALLEL after geocode (Fixes #115 — was a sequential waterfall)
    const [countryResult, wikiResult, hosResult, indicatorsResult, sunResult] = await Promise.allSettled([

      // Step 2: Country details (World Bank; restcountries v3 now requires a paid key)
      fetchWorldBankCountry(countryCode),

      // Step 3: Fetch Wikipedia summary
      (async () => {
        const wikiQuery = locationInfo.city || countryName;
        if (!wikiQuery) return null;
        try {
          const res = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const wiki = await res.json();
            return {
              title: wiki.title,
              extract: wiki.extract?.substring(0, 500),
              thumbnail: wiki.thumbnail?.source,
            };
          }
        } catch (e) { console.warn('[BEACON] Wikipedia fetch error:', e instanceof Error ? e.message : e); }
        return null;
      })(),

      // Step 4: Fetch head of state from Wikidata SPARQL
      (async () => {
        // Match on the ISO code: Nominatim names are localized ("Perú") and miss English labels.
        if (!/^[A-Z]{2}$/.test(countryCode)) return null;
        try {
          // Head of state (P35), falling back to head of government (P6).
          const sparql = `SELECT ?leaderLabel ?role WHERE {
            ?country wdt:P297 "${countryCode}".
            { ?country wdt:P35 ?leader. BIND("Head of State" AS ?role) }
            UNION
            { ?country wdt:P6 ?leader. BIND("Head of Government" AS ?role) }
            SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
          } ORDER BY DESC(?role) LIMIT 1`;
          const res = await fetch(
            `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
            {
              signal: AbortSignal.timeout(5000),
              headers: { 'User-Agent': 'BEACON/1.0 (+https://github.com/andrewleaman-stack/Beacon)' },
            }
          );
          if (res.ok) {
            const wd = await res.json();
            const binding = wd.results?.bindings?.[0];
            if (binding) {
              return {
                name: binding.leaderLabel?.value,
                position: binding.role?.value || 'Head of State',
              };
            }
          }
        } catch (e) { console.warn('[BEACON] Wikidata fetch error:', e instanceof Error ? e.message : e); }
        return null;
      })(),

      // Step 5: World Bank development indicators for the country
      fetchWorldBankIndicators(countryCode),

      // Step 6: Local time zone and sunrise/sunset at the clicked point
      fetchLocalSun(lat, lng),
    ]);

    const countryData = countryResult.status === 'fulfilled' ? countryResult.value : null;
    const wikiSummary  = wikiResult.status   === 'fulfilled' ? wikiResult.value   : null;
    const headOfState  = hosResult.status    === 'fulfilled' ? hosResult.value    : null;
    const allIndicators = indicatorsResult.status === 'fulfilled' ? indicatorsResult.value : [];
    const indicators   = allIndicators.filter((i) => !i.summary);
    const summary      = Object.fromEntries(allIndicators.filter((i) => i.summary).map((i) => [i.key, i.value]));
    const localSun     = sunResult.status    === 'fulfilled' ? sunResult.value    : null;

    return NextResponse.json({
      coordinates: { lat, lng },
      location: locationInfo,
      country: countryData ? {
        name: countryData.name,
        capital: countryData.capital,
        population: summary.population,
        area: summary.area,
        region: countryData.region,
        income_level: countryData.incomeLevel,
        flag: flagEmoji(countryData.iso2),
      } : null,
      head_of_state: headOfState,
      wikipedia: wikiSummary,
      indicators,
      local_sun: localSun,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Region dossier error:', error);
    return NextResponse.json({ error: 'Failed to fetch region data' }, { status: 500 });
  }
}
