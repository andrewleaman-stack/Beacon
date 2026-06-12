# BEACON Next Phase Plan

**Goal:** Turn BEACON from a healthy deployed dashboard into a real situational-awareness workbench.

**Current baseline:** BEACON is deployed on beacon-core at `http://100.72.12.80:3011`, CI is passing, `/api/health` is operational, and `/api/feed-health` feeds the lower ops drawer.

## Phase 1 — Feed Health Hardening

**Objective:** Make feed health actionable instead of merely saying `degraded`.

Deliverables:
- Tune per-feed timeout and stale thresholds.
- Include per-feed error details in `/api/feed-health`.
- Track last successful fetch when possible.
- Distinguish optional idle feeds from broken required feeds.
- Surface errors and stale reasons in the lower drawer.

## Phase 2 — Operational Event Log

**Objective:** Add a timeline of what BEACON is doing and what is breaking.

Example events:
- `GDELT probe timed out`
- `Earthquakes refreshed: 49 events`
- `News refreshed: 22 items`
- `Maritime stale: no AIS update in 12m`

Deliverables:
- Add event generation to the feed-health model.
- Add `events` array to `/api/feed-health`.
- Add lower drawer event-log view or enrich the Health tab.
- Keep events deterministic and source-grounded; no fake telemetry.

## Phase 3 — Right Drawer / Panel Registry

**Objective:** Turn selected map features into analyst context.

Deliverables:
- Panel registry for right drawer content.
- Entity details panel.
- Recon output panel.
- Related incidents panel.
- Source links and timeline panel.
- Placeholder AI brief panel wired to real data only.

**Status:** ✅ COMPLETE — deployed at `http://100.72.12.80:3011`

## Phase 4 — Feed Modules

**Objective:** Add Andrew-specific and operationally useful feeds.

Priority candidates:
- **OpenMHz / P25** — Monroe-area public safety. *Feed module prepared; not yet live (requires scanner hardware / stream access).*
- **Weather alerts / NWS / SPC** — ✅ Live (api.weather.gov active alerts)
- **Fires and infrastructure incidents** — ✅ Added (NASA FIRMS, PHMSA/NRC/DOE/USACE sample data)
- **Cyber / CVE alerts** — ✅ Added (NVD, CISA KEV, GHSA, OSV sample data)
- Aviation / ADS-B if useful.
- Local Monroe / regional public-safety sources.

**Status:** ✅ Core feed modules complete — deployed at `http://100.72.12.80:3011`

## Phase 5 — AI Briefing Engine

**Objective:** Generate source-grounded briefs, not magic dashboard poetry.

Deliverables:
- Generate brief button (wired from placeholder panel).
- Daily or shift brief.
- Incident brief.
- "What changed since last check?" summary.
- Confidence and uncertainty markers.
- **Auto-translation for non-English feed items** (LibreTranslate / Google Translate API / local model).
- Groq/OpenRouter integration (primary LLM provider).

## Phase 6 — Watchlists and Alerts

**Objective:** Let BEACON track what Andrew actually cares about.

Example watchlists:
- Monroe County.
- Gracepoint / local area.
- Ukraine / Israel / Taiwan.
- Severe weather.
- Cyber / CVE keywords.
- Public safety keywords.
- Ports and supply-chain chokepoints.

Deliverables:
- Watchlist config format.
- Match engine over feed items.
- Watchlist tab in lower drawer.
- Alert acknowledgement later, once persistence exists.

## Phase 7 — Persistence Layer

**Objective:** Stop depending only on live/in-memory responses.

Deliverables:
- Redis cache for feed snapshots.
- Feed run records.
- Last success/failure history.
- Event history.
- Saved briefs.
- Later: Prisma/Postgres if durable structured history is needed.

## Phase 8 — Auth / Private Mode

**Objective:** Protect BEACON if it leaves the Tailscale bubble.

Deliverables:
- NextAuth setup.
- Admin/user roles.
- Protected API endpoints.
- Audit log.

Out of scope until BEACON needs access beyond private infrastructure.

## Phase 9 — Mobile Operator View

**Objective:** Make a useful phone view for field use.

Deliverables:
- Current alerts.
- Feed health.
- Quick brief.
- Nearby/local incidents.
- Weather/public-safety status.

## Phase 10 — Retire WorldMonitor Dependency

**Objective:** Borrow concepts clean-room, then shut WorldMonitor down.

Rules:
- WorldMonitor is AGPL reference only.
- Borrow behavior and source ideas, not implementation.
- Do not copy parser code, React components, or seed scripts.

## Recommended Immediate Sequence

1. ✅ Build operational event log into `/api/feed-health`.
2. ✅ Surface feed errors/stale reasons in the lower drawer.
3. ✅ Fix or tune the GDELT timeout.
4. ✅ Build right drawer panel registry.
5. **Prepare OpenMHz/P25 feed module (offline-ready, activate when stream available).**
6. ✅ Add weather alerts / NWS / SPC feed module.
7. ✅ Add fires and infrastructure incidents feed modules.
8. ✅ Add cyber / CVE alerts feed module.
9. **AI Briefing Engine with Groq/OpenRouter + auto-translation** (Phase 5).
10. **Watchlists and Alerts** (Phase 6).
11. Persistence Layer (Phase 7).
