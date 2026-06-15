# WorldMonitor Idea Borrowing Tracker

WorldMonitor stays online while BEACON matures. Treat it as a reference system and comparison target, not a code donor.

## License boundary

WorldMonitor is AGPL-3.0. BEACON must not copy WorldMonitor implementation code into this repo.

Allowed:

- Study user-facing behavior.
- Study public data source lists.
- Read public API/provider documentation directly.
- Reimplement behavior clean-room in BEACON.
- Link to WorldMonitor as attribution/context.

Not allowed:

- Copy parser code, components, cron scripts, Redis logic, or API routes.
- Translate WorldMonitor files line-by-line.
- Merge WorldMonitor source into BEACON.
- Pretend AGPL is decorative. It is not a throw pillow.

## Ideas worth evaluating

### Feed architecture

- [ ] Provider inventory: compare WorldMonitor's provider list against BEACON's current feeds.
- [ ] Feed freshness model: TTL, last-success timestamps, stale/empty state indicators.
- [ ] Background seeder model: scheduled ingestion rather than only fetch-on-demand.
- [ ] Cache strategy: decide whether BEACON needs Redis or simpler file/memory cache first.

### Operations

- [ ] Health endpoint depth: expand beyond liveness into feed freshness.
- [ ] Monitoring dashboard: expose simple machine-readable status for April/Beacon-Stack.
- [ ] Update cadence: define which feeds refresh every 15, 30, 60 minutes.
- [ ] Failure visibility: distinguish empty feed, provider error, rate limit, and stale cache.

### UI / analyst workflow

- [ ] Layer grouping: compare WorldMonitor categories with BEACON's layer panel.
- [ ] Incident/alert triage: decide what belongs in the main map vs side panel.
- [ ] Data confidence indicators: source, age, severity, and reliability.
- [ ] Right-drawer analyst panel: entity details, feed evidence, and recon output.

### Data sources to clean-room reimplement

For each candidate source:

1. Link official provider docs.
2. Record license/terms/rate limits.
3. Write BEACON-native parser from provider docs/sample payloads.
4. Add tests or smoke checks.
5. Add freshness/health reporting.

Candidate list starts here:

- [ ] USGS earthquakes / hazards
- [ ] NOAA / NWS weather alerts
- [ ] NASA FIRMS fire data
- [ ] OpenSky aviation status/rate-limited authenticated mode
- [ ] AIS / maritime feeds
- [ ] GDELT/news-derived events
- [ ] CVE/cyber advisories
- [ ] Space weather / satellite feeds

## 2026-06-14 — Final source scan before retirement

Scanned WorldMonitor's provider inventory (`.env.example` keys + `api/` route
categories) and compared against BEACON's existing routes. Sources are facts;
no AGPL code was read for reuse. Result below.

### Already covered by BEACON — no action

These WorldMonitor sources are already implemented in BEACON, so they are *not*
borrow candidates:

- OREF / Home Front Command rocket alerts → `src/components/LiveAlerts.tsx`
- GPSJam GPS-interference → referenced in `api/flights`
- AbuseIPDB / AlienVault OTX → `api/osint/ip`, `api/osint/threats`
- URLhaus malware → `api/malware`
- OpenAQ air quality → `api/air-quality`
- CoinGecko / markets → `api/markets`
- USGS quakes, NWS alerts, FIRMS fires, OpenSky, AIS, GDELT, CVE, space weather,
  satellites — all already live in BEACON.

### Borrow shortlist (clean-room, prioritized)

Genuine coverage gaps worth reimplementing from provider docs:

1. **Conflict intelligence — ACLED + UCDP.** Authoritative academic conflict-event
   datasets. Would deepen BEACON's existing `frontlines` layer with structured,
   sourced events. (Both need free access tokens; respect their terms.)
2. **Energy / grid infrastructure — ENTSO-E (EU electricity load/outages), GIE
   (EU gas storage), EIA (US energy).** Strong fit for BEACON's infrastructure
   focus; ENTSO-E is only referenced today in an SDK adapter, not a live feed.
3. **Maritime / supply chain — IMF PortWatch.** Port congestion and chokepoint
   disruption; complements `maritime` + `submarine-cable-faults`.
4. **Macro-economic — FRED + IMF + UN COMTRADE.** Economic situational awareness
   beyond the market ticker.
5. **Prediction signals — Polymarket.** Forward-looking geopolitical/event
   probabilities as a leading indicator.
6. **Radiation — Safecast / EURDEP.** Environmental radiation monitoring;
   complements the existing NRC events feed.

Lower priority / optional: WAQI (alt air quality — already have OpenAQ), Finnhub
(markets enrichment), WTO trade.

## Retirement — DONE 2026-06-14

WorldMonitor was retired and removed from beacon-core on 2026-06-14, freeing port
`3010`. Retirement criteria were met:

- BEACON is deployed and monitored on beacon-core (`/api/health` on `3011`).
- BEACON has equivalent or better coverage for the feeds in use; remaining gaps
  are captured in the borrow shortlist above (forward work, not blockers).
- Borrowable source ideas have been recorded clean-room before turndown.
- Andrew approved turndown.

WorldMonitor's code remains recoverable upstream at
`https://github.com/koala73/worldmonitor`. Andrew's local deployment tweaks were
archived to a tarball on beacon-core at removal time (see CHANGELOG/Hermes log).
