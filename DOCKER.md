# BEACON Docker Guide

BEACON ships with a Docker Compose stack for local or homelab deployment.

## Quick start

```bash
cp .env.template .env
# optional: edit .env
docker compose up -d --build
```

Default URL: <http://localhost:3000>

Use a different host port:

```env
BEACON_PORT=3011
```

For beacon-core, use the lean Pi deployment file instead of the full local stack:

```bash
docker compose -f docker-compose.beacon-core.yml up -d --build
```

See [`docs/deploy/beacon-core.md`](docs/deploy/beacon-core.md).

For the default local stack, restart after changing `.env`:

```bash
docker compose up -d
```

## Services

| Service | Purpose |
|---|---|
| `beacon` | Next.js BEACON dashboard |
| `beacon-cache` | nginx cache/proxy sidecar |
| `beacon-intel` | optional local intelligence/scanner support service from `intel/` |

## Prebuilt image

The compose file points at:

```bash
ghcr.io/andrewleaman-stack/beacon:latest
```

If the image is unavailable, Compose can build locally from the included `Dockerfile`.

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `BEACON_PORT` | Host port published for the dashboard | `3000` |
| `SCANNER_URL` | Optional RECON scanner backend URL | unset |
| `SCANNER_KEY` | Shared secret for scanner backend; must match backend `BEACON_KEY` | unset |
| `GROQ_API_KEY` | Optional Groq key for AI briefs | unset |
| `OPENROUTER_API_KEY` | Optional OpenRouter key for AI briefs | unset |
| `BEACON_REDIS_URL` | Optional Redis-compatible cache/state URL | unset |
| `OPENMHZ_SYSTEM` | Optional OpenMHz system ID for local RF/P25 feeds | unset |
| `OPENMHZ_API_KEY` | Optional OpenMHz API key | unset |
| `BEACON_TELEGRAM_CHANNELS` | Optional comma-separated public Telegram channel usernames | curated default in code |
| `FIRMS_API_KEY` | Optional NASA FIRMS key for higher-rate/custom fire data | unset |
| `AIS_API_KEY` | Optional aisstream.io key | unset |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | Optional OpenSky OAuth2 credentials | unset |
| `N2YO_API_KEY` | Optional N2YO satellite API key | unset |
| `UCDP_ACCESS_TOKEN` | Optional UCDP conflict-events token ([request](https://ucdp.uu.se/apidocs/)) | unset |
| `UCDP_GED_VERSION` | UCDP dataset version | `26.1` |
| `ACLED_EMAIL` / `ACLED_PASSWORD` | Optional ACLED myACLED login (OAuth password grant; no static API key) | unset |
| `CONFLICT_EVENT_LIMIT` | Max merged UCDP+ACLED events returned | `250` |

## Safety

Scanner/recon tools are useful and abusable, which is the entire internet in miniature.

- Keep BEACON behind Tailscale, VPN, or authentication.
- Do not expose scanner endpoints publicly.
- Do not scan infrastructure you do not own or have explicit authorization to test.
- Keep secrets in `.env`; do not commit them.

## Useful commands

```bash
# Start / update
docker compose up -d --build

# Logs
docker compose logs -f beacon

# Stop
docker compose down

# Rebuild cleanly
docker compose build --no-cache beacon
```
