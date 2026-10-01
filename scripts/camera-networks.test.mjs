#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMichigan, parseFinland, parseHongKong, parseIceland, parseNewZealand, parseWsdot, parseCaltrans } from '../src/lib/camera-networks.mjs';

test('Michigan: coordinates from the map link, full image instead of the thumbnail', () => {
  const [cam] = parseMichigan([{
    route: '11 Mile', location: ' @ Mound NB',
    county: 'Wayne County <a href="/MiDrive/map?cameras=true&lat=42.491304&lon=-83.04479&zoom=15&id=1129"target="_blank">Go to</a>',
    image: '<img alt="x" src="https://micamerasimages.net/thumbs/semtoc_cam_253.flv.jpg?item=1" height="170">',
  }]);
  assert.deepEqual(cam, { id: 'mi-1129', lat: 42.491304, lng: -83.04479, name: '11 Mile @ Mound NB', city: 'Wayne County', country: 'US', feed_url: 'https://micamerasimages.net/semtoc_cam_253.jpg', source: 'MDOT Michigan' });
});

test('Michigan: rows without a location or https image are dropped', () => {
  assert.equal(parseMichigan([{ county: 'x', image: '<img src="https://a/b.jpg">' }, { county: 'lat=1&lon=2&id=3', image: '<img src="http://a/b.jpg">' }]).length, 0);
  assert.deepEqual(parseMichigan(/** @type {any} */ (null)), []);
});

test('Finland: one camera per collecting station, readable name', () => {
  const cams = parseFinland({ features: [
    { geometry: { coordinates: [23.99616, 60.05374, 0] }, properties: { id: 'C01503', name: 'kt51_Inkoo', collectionStatus: 'GATHERING', presets: [{ id: 'C0150301', inCollection: true }, { id: 'C0150302', inCollection: true }] } },
    { geometry: { coordinates: [25, 61] }, properties: { id: 'C09999', name: 'vt4_Old', collectionStatus: 'REMOVED_TEMPORARILY', presets: [{ id: 'C0999901', inCollection: true }] } },
  ] });
  assert.equal(cams.length, 1);
  assert.equal(cams[0].name, 'Inkoo · Road 51');
  assert.equal(cams[0].feed_url, 'https://weathercam.digitraffic.fi/C0150301.jpg');
  assert.equal(cams[0].thumb_url, 'https://weathercam.digitraffic.fi/C0150301.jpg?thumbnail=true');
});

test('Hong Kong: XML records with district and key stripped from the name', () => {
  const xml = '<image-list><image><key>H429F</key><district>Southern</district><description>Aberdeen Praya Road near Fish Market [H429F]</description><latitude>22.24845</latitude><longitude>114.1505</longitude><url>https://tdcctv.data.one.gov.hk/H429F.JPG</url></image></image-list>';
  const [cam] = parseHongKong(xml);
  assert.equal(cam.id, 'hk-H429F');
  assert.equal(cam.name, 'Aberdeen Praya Road near Fish Market');
  assert.equal(cam.city, 'Southern');
});

test('Iceland: each view is a camera, duplicates removed, http upgraded', () => {
  const row = { Maelist_nr: 7001, Myndavel: 'Hellisheiði', Skyring: 'Hellisheiði séð til vesturs', Slod: 'http://www.vegagerdin.is/vgdata/vefmyndavelar/hellisheidi_1.jpg', Breidd: 64.018296, Lengd: -21.342636 };
  const cams = parseIceland([row, row]);
  assert.equal(cams.length, 1);
  assert.equal(cams[0].id, 'is-hellisheidi_1');
  assert.match(cams[0].feed_url, /^https:/);
});

test('New Zealand: offline and maintenance cameras are skipped, relative images made absolute', () => {
  const cams = parseNewZealand({ response: { camera: [
    { id: 662, name: 'SH6 Fox Glacier', latitude: -43.466945, longitude: 170.017262, imageUrl: '/camera/662.jpg', offline: false, region: { name: 'West Coast' } },
    { id: 1, name: 'Off', latitude: -41, longitude: 174, imageUrl: '/camera/1.jpg', offline: true },
    { id: 2, name: 'Fixing', latitude: -41, longitude: 174, imageUrl: '/camera/2.jpg', underMaintenance: true },
  ] } });
  assert.equal(cams.length, 1);
  assert.equal(cams[0].feed_url, 'https://trafficnz.info/camera/662.jpg');
  assert.equal(cams[0].city, 'West Coast');
});

test('WSDOT: Web Mercator converted to latitude/longitude', () => {
  const [cam] = parseWsdot({ features: [{ attributes: { CameraID: 1001, CameraTitle: 'I-5 at Interstate Bridge SB, north end', ImageURL: 'https://www.tripcheck.com/RoadCams/cams/x.jpg' }, geometry: { x: -13656007.102254549, y: 5719738.545086239 } }] });
  assert.equal(cam.id, 'wsdot-1001');
  assert.ok(Math.abs(cam.lat - 45.6205) < 0.001 && Math.abs(cam.lng - -122.674) < 0.001, `${cam.lat},${cam.lng}`);
});

test('Caltrans: reads the nested cctv record, keeps HLS, skips cameras out of service', () => {
  /** @param {string} inService @param {string} stream */
  const row = (inService, stream) => ({ cctv: { index: '1', inService, location: { district: '11', locationName: '(C 348) SR-163 : Friars N/E_B', nearbyPlace: 'San Diego', latitude: '32.772126', longitude: '-117.160577' },
    imageData: { streamingVideoURL: stream, static: { currentImageURL: 'https://cwwp2.dot.ca.gov/data/d11/cctv/image/c348sr163friarsneb/c348sr163friarsneb.jpg' } } } });
  const cams = parseCaltrans({ data: [row('true', 'https://wzmedia.dot.ca.gov/D11/x.stream/playlist.m3u8'), row('false', '')] });
  assert.equal(cams.length, 1);
  assert.equal(cams[0].id, 'cal-c348sr163friarsneb');
  assert.equal(cams[0].name, 'SR-163 : Friars N/E_B');
  assert.equal(cams[0].stream_type, 'hls');
  assert.equal(parseCaltrans({ data: [row('true', 'not a stream')] })[0].stream_url, undefined);
});
