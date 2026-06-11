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

## Retirement criteria for WorldMonitor

WorldMonitor can be retired only when:

- BEACON is deployed and monitored on beacon-core.
- BEACON has equivalent or better coverage for the feeds Andrew actually uses.
- BEACON exposes feed freshness, not just app liveness.
- Any borrowed concepts have been clean-room reimplemented or explicitly rejected.
- Andrew approves turning WorldMonitor down.

Until then: keep it. It is useful scaffolding, not clutter yet.
