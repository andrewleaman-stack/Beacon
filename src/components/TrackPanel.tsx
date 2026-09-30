'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { contactsNear, nearest, appendTrail, distanceKm } from '@/lib/geo-nearby.mjs';

export interface TrackTarget {
  kind: 'flight' | 'ship' | 'point';
  id: string;
  label: string;
  lat: number;
  lng: number;
}

interface TrackState { trail: [number, number][]; head: [number, number] | null; follow: boolean }

interface Props {
  target: TrackTarget;
  data: any;
  onClose: () => void;
  onTrackUpdate: (track: TrackState | null) => void;
  onRetarget: (target: TrackTarget) => void;
  onOpenCamera: (camera: any) => void;
}

const ICON: Record<string, string> = { flight: '✈', ship: '⛴', camera: '📹' };
const RADIUS_KM = 250;

export default function TrackPanel({ target, data, onClose, onTrackUpdate, onRetarget, onOpenCamera }: Props) {
  const [head, setHead] = useState<{ lat: number; lng: number }>({ lat: target.lat, lng: target.lng });
  const [trail, setTrail] = useState<[number, number][]>([[target.lng, target.lat]]);
  const [follow, setFollow] = useState(target.kind !== 'point');
  const [detail, setDetail] = useState<string>('');
  const [lastFix, setLastFix] = useState<number>(Date.now());
  const [lost, setLost] = useState(false);
  const [cameras, setCameras] = useState<any[] | null>(Array.isArray(data?.cameras) ? data.cameras : null);
  const camerasRequested = useRef(false);

  // Reset when the target changes.
  useEffect(() => {
    setHead({ lat: target.lat, lng: target.lng });
    setTrail([[target.lng, target.lat]]);
    setFollow(target.kind !== 'point');
    setDetail('');
    setLost(false);
    setLastFix(Date.now());
  }, [target.kind, target.id, target.lat, target.lng]);

  const moveTo = (lat: number, lng: number) => {
    setHead({ lat, lng });
    setTrail((t) => appendTrail(t, { lat, lng }));
    setLastFix(Date.now());
    setLost(false);
  };

  // Aircraft: poll adsb.lol for this one airframe every 15 s.
  useEffect(() => {
    if (target.kind !== 'flight') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/track/aircraft?hex=${encodeURIComponent(target.id)}`, { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (json.found) {
          moveTo(json.lat, json.lng);
          const alt = json.onGround ? 'on ground' : json.altFt != null ? `${Math.round(json.altFt).toLocaleString()} ft` : '';
          setDetail([alt, json.speedKn != null ? `${Math.round(json.speedKn)} kn` : '', json.heading != null ? `${Math.round(json.heading)}°` : '', json.model].filter(Boolean).join(' · '));
        } else {
          setLost(true);
        }
      } catch {
        if (!cancelled) setLost(true);
      }
    };
    poll();
    const iv = setInterval(poll, 15_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [target.kind, target.id]);

  // Ships: the maritime feed already refreshes every 10 s.
  useEffect(() => {
    if (target.kind !== 'ship') return;
    const ship = (data?.maritime_ships || []).find((s: any) => String(s.mmsi) === target.id);
    if (!ship) return;
    moveTo(ship.lat, ship.lng);
    setDetail([ship.speed != null ? `${Number(ship.speed).toFixed(1)} kn` : '', ship.course != null ? `${Math.round(ship.course)}°` : '', ship.destination ? `→ ${ship.destination}` : ''].filter(Boolean).join(' · '));
  }, [target.kind, target.id, data?.maritime_ships]);

  // Mark a ship lost if the feed stops reporting it for 5 minutes.
  useEffect(() => {
    if (target.kind !== 'ship') return;
    const iv = setInterval(() => setLost(Date.now() - lastFix > 5 * 60_000), 30_000);
    return () => clearInterval(iv);
  }, [target.kind, lastFix]);

  useEffect(() => {
    onTrackUpdate({ trail, head: [head.lng, head.lat], follow });
  }, [trail, head, follow, onTrackUpdate]);
  useEffect(() => () => onTrackUpdate(null), [onTrackUpdate]);

  // Cameras: use the CCTV layer's data, or fetch the catalogue once.
  useEffect(() => {
    if (Array.isArray(data?.cameras)) { setCameras(data.cameras); return; }
    if (camerasRequested.current) return;
    camerasRequested.current = true;
    fetch('/api/cctv?region=all&v=2').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.cameras) setCameras(j.cameras); }).catch(() => {});
  }, [data?.cameras]);

  const flights = useMemo(
    () => [...(data?.commercial_flights || []), ...(data?.private_flights || []), ...(data?.private_jets || []), ...(data?.military_flights || [])],
    [data?.commercial_flights, data?.private_flights, data?.private_jets, data?.military_flights],
  );
  const contacts = useMemo(
    () => contactsNear(head, { flight: flights, ship: data?.maritime_ships || [], camera: cameras || [] }, { radiusKm: RADIUS_KM, limit: 12, excludeId: target.id }),
    [head, flights, data?.maritime_ships, cameras, target.id],
  );
  const nearestCam = useMemo(() => (cameras ? nearest(head, cameras) : null), [head, cameras]);
  const travelledKm = useMemo(() => trail.slice(1).reduce((sum, p, i) => sum + distanceKm({ lat: trail[i][1], lng: trail[i][0] }, { lat: p[1], lng: p[0] }), 0), [trail]);

  const openContact = (c: { kind: string; id: string; item: any }) => {
    if (c.kind === 'camera') { onOpenCamera(c.item); return; }
    const label = c.kind === 'flight' ? (String(c.item.callsign || '').trim() || c.id) : String(c.item.name || c.id);
    onRetarget({ kind: c.kind as 'flight' | 'ship', id: c.id, label, lat: Number(c.item.lat), lng: Number(c.item.lng) });
  };

  const labelFor = (c: { kind: string; id: string; item: any }) =>
    c.kind === 'flight' ? (String(c.item.callsign || '').trim() || c.id) : c.kind === 'ship' ? String(c.item.name || c.id) : String(c.item.name || 'Camera');

  return (
    <div className="glass-panel p-3 w-[300px] max-w-[calc(100vw-24px)] max-h-[60vh] overflow-y-auto styled-scrollbar font-mono">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="hud-label">{target.kind === 'point' ? 'NEARBY' : 'TRACKING'}</div>
          <div className="text-xs text-[var(--cyan-primary,#00E5FF)] font-bold truncate">{ICON[target.kind] || '◎'} {target.label}</div>
          {detail && <div className="text-[9px] text-[var(--text-secondary)]">{detail}</div>}
          {target.kind !== 'point' && (
            <div className="text-[8px] text-[var(--text-muted)]">
              {lost ? 'Signal lost — last known position shown' : `Trail ${travelledKm.toFixed(1)} km · updated ${Math.max(0, Math.round((Date.now() - lastFix) / 1000))}s ago`}
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs" aria-label="Stop tracking">✕</button>
      </div>

      <div className="flex gap-2 mb-3">
        {target.kind !== 'point' && (
          <button onClick={() => setFollow((f) => !f)} className={`flex-1 text-[9px] tracking-wider border rounded px-2 py-1 ${follow ? 'border-[#00E5FF] text-[#00E5FF]' : 'border-[var(--text-muted)] text-[var(--text-muted)]'}`}>
            {follow ? 'FOLLOWING' : 'FOLLOW'}
          </button>
        )}
        <button
          onClick={() => nearestCam && onOpenCamera(nearestCam.item)}
          disabled={!nearestCam}
          className="flex-1 text-[9px] tracking-wider border rounded px-2 py-1 border-[#7E57C2] text-[#B39DDB] disabled:opacity-40"
        >
          {nearestCam ? `NEAREST CAM · ${nearestCam.km < 10 ? nearestCam.km.toFixed(1) : Math.round(nearestCam.km)} km` : 'LOADING CAMS…'}
        </button>
      </div>

      <div className="hud-label mb-1">CONTACTS WITHIN {RADIUS_KM} KM</div>
      {contacts.length === 0 ? (
        <div className="text-[9px] text-[var(--text-muted)]">Nothing within {RADIUS_KM} km. Turn on the Aviation or Maritime layers to include aircraft and ships.</div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {contacts.map((c) => (
            <li key={`${c.kind}-${c.id}`}>
              <button onClick={() => openContact(c)} className="w-full flex items-baseline justify-between gap-2 text-left text-[10px] px-1 py-0.5 rounded hover:bg-white/5">
                <span className="truncate text-[var(--text-primary)]">{ICON[c.kind]} {labelFor(c)}</span>
                <span className="text-[var(--text-muted)] tabular-nums shrink-0">{c.km < 10 ? c.km.toFixed(1) : Math.round(c.km)} km</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
