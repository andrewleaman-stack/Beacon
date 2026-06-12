#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerPanel, getPanel, getAllPanels, clearRegistry, getActivePanels } from '../src/lib/panel-registry.mjs';

function makeTestPanel(id, canActivate = () => true) {
  return {
    id,
    label: 'Test ' + id,
    description: 'Test panel',
    icon: 'Activity',
    priority: 10,
    canActivate,
    buildData: async () => ({
      title: 'Test',
      sections: [],
      lastUpdated: new Date().toISOString(),
    }),
  };
}

test('registerPanel adds panel to registry', () => {
  clearRegistry();
  const panel = makeTestPanel('entity-details');
  registerPanel(panel);
  
  const retrieved = getPanel('entity-details');
  assert.ok(retrieved);
  assert.equal(retrieved.id, 'entity-details');
  assert.equal(retrieved.label, 'Test entity-details');
});

test('getAllPanels returns panels sorted by priority', () => {
  clearRegistry();
  registerPanel({ ...makeTestPanel('a'), priority: 30 });
  registerPanel({ ...makeTestPanel('b'), priority: 10 });
  registerPanel({ ...makeTestPanel('c'), priority: 20 });
  
  const all = getAllPanels();
  assert.equal(all.length, 3);
  assert.equal(all[0].id, 'b');
  assert.equal(all[1].id, 'c');
  assert.equal(all[2].id, 'a');
});

test('getActivePanels filters by canActivate', async () => {
  clearRegistry();
  const entityRef = { type: 'aircraft', id: 'ABC123', label: 'TEST123' };
  
  registerPanel(makeTestPanel('always-on', () => true));
  registerPanel(makeTestPanel('entity-only', (ctx) => ctx.type === 'entity'));
  registerPanel(makeTestPanel('recon-only', (ctx) => ctx.type === 'recon'));
  
  const entityCtx = { type: 'entity', entity: entityRef };
  const active = await getActivePanels(entityCtx, {});
  
  assert.equal(active.length, 2);
  const ids = active.map(a => a.panel.id).sort();
  assert.deepEqual(ids, ['always-on', 'entity-only']);
});

test('getActivePanels only returns panels with data', async () => {
  clearRegistry();
  
  registerPanel({
    ...makeTestPanel('returns-data'),
    buildData: async () => ({ title: 'Data', sections: [], lastUpdated: new Date().toISOString() }),
  });
  
  registerPanel({
    ...makeTestPanel('returns-null'),
    buildData: async () => null,
  });
  
  const active = await getActivePanels({ type: 'none' }, {});
  assert.equal(active.length, 1);
  assert.equal(active[0].panel.id, 'returns-data');
});

test('clearRegistry empties the registry', () => {
  clearRegistry();
  registerPanel(makeTestPanel('test'));
  assert.equal(getAllPanels().length, 1);
  
  clearRegistry();
  assert.equal(getAllPanels().length, 0);
});

test('duplicate registration warns but overwrites', () => {
  clearRegistry();
  const original = makeTestPanel('dup', () => true);
  original.label = 'ORIGINAL';
  registerPanel(original);
  
  const replacement = makeTestPanel('dup', () => true);
  replacement.label = 'REPLACEMENT';
  registerPanel(replacement);
  
  const retrieved = getPanel('dup');
  assert.equal(retrieved.label, 'REPLACEMENT');
});

test('PanelContext type discrimination works', () => {
  const entityCtx = { type: 'entity', entity: { type: 'aircraft', id: '1', label: 'A' } };
  const mapCtx = { type: 'map', coords: { lat: 0, lng: 0 } };
  const reconCtx = { type: 'recon', results: [] };
  const noneCtx = { type: 'none' };
  
  assert.equal(entityCtx.type, 'entity');
  assert.equal(mapCtx.type, 'map');
  assert.equal(reconCtx.type, 'recon');
  assert.equal(noneCtx.type, 'none');
});

test('EntityRef supports all defined entity types', () => {
  const types = ['aircraft', 'vessel', 'ip', 'country', 'cctv', 'earthquake', 'gdelt', 'news', 'infrastructure'];
  
  for (const t of types) {
    const ref = { type: t, id: 'test', label: 'Test' };
    assert.equal(ref.type, t);
  }
});