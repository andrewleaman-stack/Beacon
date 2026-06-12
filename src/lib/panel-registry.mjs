/**
 * BEACON Panel Registry
 * 
 * Central registry for right-drawer panels. Panels are registered by type and
 * can be dynamically activated based on entity selection, map context, or user action.
 * All panel data must be source-grounded — no hallucinated content.
 */

/**
 * @typedef {'entity-details'|'recon-output'|'related-incidents'|'source-links-timeline'|'ai-brief'} PanelId
 */

/**
 * @typedef {Object} PanelContext
 * @property {'entity'|'map'|'recon'|'none'} type
 * @property {EntityRef} [entity]
 * @property {{lat: number, lng: number}} [coords]
 * @property {number} [radiusKm]
 * @property {ReconResult[]} [results]
 */

/**
 * @typedef {Object} EntityRef
 * @property {'aircraft'|'vessel'|'ip'|'country'|'cctv'|'earthquake'|'gdelt'|'news'|'infrastructure'} type
 * @property {string} id
 * @property {string} label
 * @property {Record<string, unknown>} [properties]
 * @property {{lat: number, lng: number}} [coords]
 */

/**
 * @typedef {Object} ReconResult
 * @property {string} target
 * @property {string} targetType
 * @property {Record<string, unknown>} findings
 * @property {string[]} sources
 * @property {string} timestamp
 * @property {'high'|'medium'|'low'} confidence
 */

/**
 * @typedef {Object} PanelData
 * @property {string} title
 * @property {string} [subtitle]
 * @property {PanelSection[]} sections
 * @property {string} lastUpdated
 * @property {string} [sourceAttribution]
 */

/**
 * @typedef {Object} PanelSection
 * @property {string} id
 * @property {string} label
 * @property {'key-value'|'list'|'table'|'timeline'|'links'|'brief'} kind
 * @property {unknown} data
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @typedef {Object} PanelRegistration
 * @property {PanelId} id
 * @property {string} label
 * @property {string} description
 * @property {string} icon
 * @property {number} priority
 * @property {(context: PanelContext) => boolean} canActivate
 * @property {(context: PanelContext, beaconData: Record<string, unknown>) => Promise<PanelData|null>} buildData
 * @property {number} [defaultWidth]
 * @property {number} [maxWidth]
 */

/** @type {Map<PanelId, PanelRegistration>} */
const registry = new Map();

/**
 * Register a panel in the registry
 * @param {PanelRegistration} registration
 */
export function registerPanel(registration) {
  if (registry.has(registration.id)) {
    console.warn(`[BEACON] Panel ${registration.id} already registered, overwriting`);
  }
  registry.set(registration.id, registration);
}

/**
 * Get a panel by ID
 * @param {PanelId} id
 * @returns {PanelRegistration|undefined}
 */
export function getPanel(id) {
  return registry.get(id);
}

/**
 * Get all panels sorted by priority
 * @returns {PanelRegistration[]}
 */
export function getAllPanels() {
  return Array.from(registry.values()).sort((a, b) => a.priority - b.priority);
}

/**
 * Get all active panels for a given context
 * @param {PanelContext} context
 * @param {Record<string, unknown>} beaconData
 * @returns {Promise<Array<{panel: PanelRegistration, data: PanelData}>>}
 */
export async function getActivePanels(context, beaconData) {
  const results = [];
  
  for (const panel of getAllPanels()) {
    if (panel.canActivate(context)) {
      const data = await panel.buildData(context, beaconData);
      if (data) {
        results.push({ panel, data });
      }
    }
  }
  
  return results;
}

/**
 * Clear the registry (mainly for testing)
 */
export function clearRegistry() {
  registry.clear();
}