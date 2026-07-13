/**
 * Vector-Core 公开 API
 *
 * @example
 * import { registerVectorCollection, VectorRepository, bootstrap } from '../../../vector-Core/lib/index.js';
 */
export {
  ping,
  qdrantRequest,
  collectionExists,
  createCollection,
  upsertPoints,
  searchPoints,
  deletePoints,
  countPoints,
} from './client.js';
export {
  registerVectorCollection,
  getVectorCollectionEntry,
  listVectorCollections,
  clearRegistryForTests,
} from './collection-registry.js';
export { VectorRepository, ensureCollections } from './repository-base.js';
export { runMigrations, getMigrationStatus, META_COLLECTION } from './migration-runner.js';
export { getVectorCoreConfig } from './config.js';
export { setCollectionPrefix, getCollectionPrefix, buildCollectionName, normalizeDistance } from './naming.js';

import { registerVectorCollection } from './collection-registry.js';
import { getVectorCoreConfig } from './config.js';
import { ensureCollections } from './repository-base.js';
import { runMigrations } from './migration-runner.js';
import { ping } from './client.js';
import { setCollectionPrefix } from './naming.js';

function registerSystemCollections() {
  registerVectorCollection('system', 'chunks', {
    dimension: 1536,
    distance: 'Cosine',
    schemaVersion: 1,
  });
}

let bootstrapped = false;

/** @returns {Promise<{ ok: boolean, migrations?: string[], collections?: object[] }>} */
export async function bootstrap() {
  if (bootstrapped) return { ok: true, skipped: true };
  bootstrapped = true;

  const alive = await ping();
  if (!alive) {
    throw new Error('[vector-Core] Qdrant 不可用，请检查 connection 与 Qdrant 服务');
  }

  const config = await getVectorCoreConfig();
  setCollectionPrefix(config.collectionPrefix);
  registerSystemCollections();

  /** @type {string[]} */
  let migrations = [];
  /** @type {object[]} */
  let collections = [];

  if (config.runMigrationsOnBoot !== false) {
    migrations = await runMigrations();
  }
  if (config.ensureCollectionsOnBoot !== false) {
    collections = await ensureCollections();
  }

  return { ok: true, migrations, collections };
}
