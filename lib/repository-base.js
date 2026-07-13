import {
  collectionExists,
  createCollection,
  upsertPoints,
  searchPoints,
  deletePoints,
  countPoints,
} from './client.js';
import { getVectorCollectionEntry } from './collection-registry.js';
import { getVectorCoreConfig } from './config.js';

export async function ensureCollections() {
  const results = [];
  const { listVectorCollections } = await import('./collection-registry.js');
  for (const entry of listVectorCollections()) {
    const exists = await collectionExists(entry.name);
    if (exists) {
      results.push({ collection: entry.name, created: false });
      continue;
    }
    await createCollection(entry.name, {
      dimension: entry.dimension,
      distance: entry.distance,
      onDiskPayload: entry.onDiskPayload,
    });
    results.push({ collection: entry.name, created: true });
  }
  return results;
}

/**
 * 向量 Repository 基类
 * @example
 * const DOCS = registerVectorCollection('rag', 'docs', { dimension: 1536 });
 * class DocVectorRepo extends VectorRepository {
 *   constructor() { super(DOCS); }
 * }
 */
export class VectorRepository {
  /** @param {import('./collection-registry.js').VectorCollectionEntry | { name: string }} ref */
  constructor(ref) {
    const name = ref?.name ?? ref;
    if (!name) throw new Error('[vector-Core] VectorRepository 需要集合引用');
    this.collectionName = String(name);
  }

  /** @param {Array<{ id: string|number, vector: number[], payload?: object }>} points */
  upsert(points) {
    return upsertPoints(this.collectionName, points);
  }

  /**
   * @param {number[]} vector
   * @param {{ limit?: number, filter?: object, scoreThreshold?: number }} [opts]
   */
  async search(vector, opts = {}) {
    const config = await getVectorCoreConfig();
    const limit = opts.limit ?? config.defaultSearchLimit ?? 10;
    return searchPoints(this.collectionName, vector, { ...opts, limit });
  }

  /** @param {Array<string|number>} ids */
  delete(ids) {
    return deletePoints(this.collectionName, ids);
  }

  count() {
    return countPoints(this.collectionName);
  }

  /** @param {string} owner @param {string} entity */
  static fromRegistered(owner, entity) {
    return new VectorRepository(getVectorCollectionEntry(owner, entity));
  }
}
