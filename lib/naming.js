/** @type {string} */
let globalPrefix = '';

export function setCollectionPrefix(prefix) {
  globalPrefix = String(prefix ?? '').trim().replace(/_+$/, '');
}

export function getCollectionPrefix() {
  return globalPrefix;
}

/** @param {string} owner @param {string} entity */
export function buildCollectionName(owner, entity) {
  const o = String(owner || '').trim();
  const e = String(entity || '').trim();
  const base = `${o}_${e}`;
  return globalPrefix ? `${globalPrefix}_${base}` : base;
}

const DISTANCES = new Set(['Cosine', 'Euclid', 'Dot', 'Manhattan']);

/** @param {string} value */
export function normalizeDistance(value) {
  const v = String(value ?? 'Cosine').trim();
  const hit = [...DISTANCES].find((d) => d.toLowerCase() === v.toLowerCase());
  return hit ?? 'Cosine';
}
