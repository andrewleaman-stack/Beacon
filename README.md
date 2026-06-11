<div align="center">

# BEACON

### Open-source situational awareness and OSINT dashboard

**BEACON aggregates public intelligence feeds into a single MapLibre-powered common operating picture: aviation, maritime, CCTV, earthquakes, fires, weather, cyber/CVEs, conflict indicators, markets, local RF/P25 hooks, and AI-assisted briefings.**

</div>

---

## Status

This repository is an active BEACON fork/customization of OSIRIS. The current goal is a self-hostable, low-maintenance intelligence dashboard for Andrew's Beacon/April stack — useful first, shiny second. Revolutionary concept. Someone alert the dashboard-industrial complex.

- **Primary app:** Next.js 16 / React 19 / TypeScript
- **Map engine:** MapLibre GL
- **Default deployment:** Docker Compose
- **License:** MIT; original upstream copyright retained in `LICENSE`
- **Safety posture:** defensive/authorized monitoring only; scanner features should stay behind auth/VPN

## Features

| Domain | Current sources / capability |
|---|---|
| Aviation | OpenSky/ADS-B style feeds, commercial/private/military layers |
| Maritime | AIS-style vessel and chokepoint layers |
| CCTV | Public camera feeds and stream status checks |
| Seismic | USGS earthquake feed |
| Fires | NASA FIRMS/EONET wildfire indicators |
| Weather / space | NOAA/weather and space-weather indicators |
| Cyber | CVE/malware/threat intelligence routes |
| OSINT tools | DNS, WHOIS, IP, BGP, certificate, sanctions, GitHub, phone/MAC lookup routes |
| Local / Beacon | OpenMHz/RF hooks, Redis cache option, AI briefing hooks |

Most feeds degrade gracefully when optional keys are missing.

## Quick start

```bash
git clone https://github.com/andrewleaman-stack/Beacon.git
cd Beacon
npm install
npm run dev
```

Open <http://localhost:3000>.

## Docker

```bash
cp .env.template .env
# edit only the keys you actually need
docker compose up -d --build
```

Default URL: <http://localhost:3000>

Change the published host port with:

```env
BEACON_PORT=3011
```

For the beacon-core Raspberry Pi deployment plan, use `docker-compose.beacon-core.yml` and see [`docs/deploy/beacon-core.md`](docs/deploy/beacon-core.md).

## Environment

Start with `.env.template`. The important variables are:

| Variable | Purpose |
|---|---|
| `BEACON_PORT` | Published host port for Docker Compose |
| `SCANNER_URL` / `SCANNER_KEY` | Optional RECON scanner backend; leave blank to disable scanner features |
| `GROQ_API_KEY` / `OPENROUTER_API_KEY` | Optional AI briefing providers |
| `BEACON_REDIS_URL` | Optional Redis cache/state endpoint |
| `OPENMHZ_SYSTEM` / `OPENMHZ_API_KEY` | Optional local RF/P25 feed hooks |
| `BEACON_TELEGRAM_CHANNELS` | Optional comma-separated public Telegram channel usernames |

## Verification

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke
```

CI runs these checks on every push/PR and includes a production-server smoke test.

## Safety notes

- Do **not** expose scanner/recon endpoints publicly.
- Run behind Tailscale, VPN, or real authentication.
- Treat public OSINT feeds as untrusted input.
- Do not use this platform to scan or probe systems you do not own or have explicit authorization to test.

## Attribution

BEACON began as a fork/customization of OSIRIS. Original MIT license text is preserved in `LICENSE`. BEACON-specific changes are aimed at Andrew's self-hosted situational-awareness stack and local infrastructure integrations.
