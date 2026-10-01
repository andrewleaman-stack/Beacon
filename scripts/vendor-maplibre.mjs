#!/usr/bin/env node
/**
 * Copy MapLibre GL's ES-module build into public/vendor/maplibre-gl/.
 *
 * MapLibre 6 starts its web worker with `new URL(..., import.meta.url)`, which
 * Turbopack can't bundle. BEACON instead loads the library at runtime from
 * these static files, where the browser resolves the worker natively.
 * Runs automatically before `next dev` and `next build`.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'maplibre-gl', 'dist');
const dest = join(root, 'public', 'vendor', 'maplibre-gl');
const files = ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs'];

mkdirSync(dest, { recursive: true });
for (const file of files) cpSync(join(src, file), join(dest, file));
const { version } = JSON.parse(readFileSync(join(root, 'node_modules', 'maplibre-gl', 'package.json'), 'utf8'));
writeFileSync(join(dest, 'VERSION'), `${version}\n`);
console.log(`[vendor-maplibre] copied maplibre-gl ${version} to public/vendor/maplibre-gl`);
