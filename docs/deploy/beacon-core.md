# Deploy BEACON on beacon-core

BEACON's target home is **beacon-core** — the Raspberry Pi 5 infrastructure host.

WorldMonitor stays online while BEACON is being hardened and while useful ideas are reimplemented clean-room.

## Target placement

| Service | Host | Port | Purpose |
|---|---:|---:|---|
| WorldMonitor | beacon-core | `3010` | Existing OSINT dashboard/reference implementation |
| BEACON | beacon-core | `3011` | Andrew-owned situational-awareness dashboard |

Planned URLs:

- `http://beacon-core:3011`
- `http://100.72.12.80:3011`

## Repo path on beacon-core

Use:

```bash
/srv/apps/beacon
```

Do not deploy from `/tmp`. That is where work goes to become ghosts.

## One-time install/update

On beacon-core:

```bash
sudo mkdir -p /srv/apps
sudo chown "$USER":"$USER" /srv/apps
cd /srv/apps

git clone https://github.com/andrewleaman-stack/Beacon.git beacon
cd /srv/apps/beacon
```

If the repo already exists:

```bash
cd /srv/apps/beacon
git pull --ff-only
```

## Briefing backlog volume (one-time)

The compose file mounts `./beacon_briefs` → `/var/log/beacon_briefs` and sets
`BEACON_BRIEF_LOG_DIR` to it so the AI briefing backlog (`/api/ai/briefings`)
survives container restarts. The container runs as uid `1001`, so the host
directory must be writable by that uid:

```bash
mkdir -p /srv/apps/beacon/beacon_briefs
sudo chown 1001:65533 /srv/apps/beacon/beacon_briefs
```

Without this, the app falls back to ephemeral `/tmp` and the backlog is lost on
restart (it still works within a single container lifetime).

## Environment

BEACON runs keyless for many feeds. Optional API keys can be added later.

```bash
cp .env.template .env
nano .env
```

Leave unknown optional keys blank. Do not invent secrets for the vibes.

Recommended beacon-core port:

```bash
cat >> .env <<'EOF'
BEACON_PORT=3011
EOF
```

## Compose deployment

The Compose files use `env_file.required: false`, so use Docker Compose v2.24+ on beacon-core. If an older Compose install complains about `required`, either upgrade Compose or create `.env` before running Compose.

Use the Pi-specific Compose file:

```bash
cd /srv/apps/beacon
docker compose -f docker-compose.beacon-core.yml config
docker compose -f docker-compose.beacon-core.yml up -d --build
```

Check status:

```bash
docker compose -f docker-compose.beacon-core.yml ps
docker compose -f docker-compose.beacon-core.yml logs --tail=100 beacon
curl -fsS http://127.0.0.1:3011/api/health
```

Expected health payload includes:

```json
{
  "status": "operational",
  "platform": "BEACON"
}
```

## Update procedure

```bash
cd /srv/apps/beacon
git pull --ff-only
docker compose -f docker-compose.beacon-core.yml up -d --build
docker compose -f docker-compose.beacon-core.yml ps
curl -fsS http://127.0.0.1:3011/api/health
```

## Rollback

```bash
cd /srv/apps/beacon
git log --oneline -5
git checkout <known-good-commit>
docker compose -f docker-compose.beacon-core.yml up -d --build
curl -fsS http://127.0.0.1:3011/api/health
```

Return to normal branch later:

```bash
git checkout main
git pull --ff-only
```

## Monitoring target

Minimum monitor:

- URL: `http://127.0.0.1:3011/api/health`
- Expected status: HTTP `200`
- Expected body contains: `"platform":"BEACON"`

Better monitor later:

- BEACON liveness: `/api/health`
- BEACON feed freshness: endpoint-specific checks once feed state exists
- WorldMonitor liveness: keep separate on `3010`
- WorldMonitor freshness: keep separate until retired

## Notes

- WorldMonitor remains deployed on port `3010` until BEACON has borrowed/reimplemented the useful ideas.
- Do not copy AGPL WorldMonitor code into BEACON.
- Public data source ideas are fine; implementation code needs clean-room rework.
