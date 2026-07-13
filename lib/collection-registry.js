import { buildCollectionName, normalizeDistance } from './naming.js';

/** @typedef {{ name: string, owner: string, entity: string, dimension: number, distance: string, onDiskPayload?: boolean, schemaVersion?: number, registeredAt: number }} VectorCollectionEntry */

/** @type {Map<string, VectorCollectionEntry>} */
const registry = new Map();

/**
 * 注册向量集合（须在 bootstrap 前或 ensureCollections 前完成）
 * @param {string} owner
 * @param {string} entity
 * @param {{ dimension: number, distance?: string, onDiskPayload?: boolean, schemaVersion?: number }} options
 */
export function registerVectorCollection(owner, entity, options) {
  const o = String(owner || '').trim();
  const e = String(entity || '').trim();
  if (!o || !e) throw new Error('[vector-Core] registerVectorCollection 需要 owner 与 entity');
  if (!/^[a-z][a-z0-9_]*$/i.test(o) || !/^[a-z][a-z0-9_]*$/i.test(e)) {
    throw new Error('[vector-Core] owner/entity 仅允许字母数字下划线');
  }
  const dim = Number(options?.dimension);
  if (!Number.isFinite(dim) || dim < 1) {
    throw new Error('[vector-Core] dimension 须为正整数');
  }

  const key = `${o}:${e}`;
  if (registry.has(key)) return registry.get(key);

  const entry = {
    name: buildCollectionName(o, e),
    owner: o,
    entity: e,
    dimension: dim,
    distance: normalizeDistance(options?.distance),
    onDiskPayload: options?.onDiskPayload === true,
    schemaVersion: options?.schemaVersion ?? 1,
    registeredAt: Date.now(),
  };
  registry.set(key, entry);
  return entry;
}

/** @param {string} owner @param {string} entity */
export function getVectorCollectionEntry(owner, entity) {
  const entry = registry.get(`${owner}:${entity}`);
  if (!entry) {
    throw new Error(`[vector-Core] 集合未注册: ${owner}:${entity}`);
  }
  return entry;
}

export function listVectorCollections() {
  return [...registry.values()];
}

export function clearRegistryForTests() {
  registry.clear();
}
