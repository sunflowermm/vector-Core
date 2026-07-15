import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { qdrantRequest } from './client.js';
import paths from '../../../src/utils/paths.js';

export const META_COLLECTION = '_vector_core_migrations';

/** @returns {Promise<string[]>} */
async function listMigrationFiles() {
  const root = path.join(paths.root, 'core', 'vector-Core', 'migrations');
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full);
      else if (ent.name.endsWith('.js') && !ent.name.startsWith('_')) out.push(full);
    }
  }
  await walk(root);
  return out.sort();
}

/** @param {string} file */
async function loadMigration(file) {
  const mod = await import(pathToFileURL(file).href);
  const migration = mod.default ?? mod;
  if (!migration?.id || typeof migration.up !== 'function') {
    throw new Error(`[vector-Core] 无效迁移: ${file}`);
  }
  return migration;
}

async function ensureMetaCollection() {
  try {
    await qdrantRequest(`/collections/${META_COLLECTION}`, { method: 'GET' });
  } catch {
    await qdrantRequest(`/collections/${META_COLLECTION}`, {
      method: 'PUT',
      body: {
        vectors: { size: 4, distance: 'Cosine' },
      },
    });
  }
}

async function listAppliedIds() {
  await ensureMetaCollection();
  try {
    const res = await qdrantRequest(`/collections/${META_COLLECTION}/points/scroll`, {
      method: 'POST',
      body: { limit: 1000, with_payload: true, with_vector: false },
    });
    const points = res?.result?.points ?? [];
    return points.map((p) => p.payload?.id).filter(Boolean);
  } catch {
    return [];
  }
}

async function markApplied(id, file) {
  await qdrantRequest(`/collections/${META_COLLECTION}/points`, {
    method: 'PUT',
    body: {
      points: [{
        id: id,
        vector: [0, 0, 0, 0],
        payload: { id, file, appliedAt: new Date().toISOString() },
      }],
    },
  });
}

export async function getMigrationStatus() {
  const applied = await listAppliedIds();
  const files = await listMigrationFiles();
  const appliedSet = new Set(applied);
  const pending = [];
  for (const file of files) {
    const m = await loadMigration(file);
    if (!appliedSet.has(m.id)) pending.push(m.id);
  }
  return { applied, pending, total: files.length };
}

export async function runMigrations() {
  const files = await listMigrationFiles();
  const appliedSet = new Set(await listAppliedIds());
  const applied = [];
  const api = await import('./client.js');

  for (const file of files) {
    const migration = await loadMigration(file);
    if (appliedSet.has(migration.id)) continue;
    await migration.up(api);
    await markApplied(migration.id, path.relative(paths.root, file));
    applied.push(migration.id);
  }
  return applied;
}
