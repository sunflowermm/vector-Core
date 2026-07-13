import { getVectorCoreConfig } from './config.js';

/**
 * @param {Record<string, unknown>} conn
 */
function buildBaseUrl(conn) {
  const host = conn.host || '127.0.0.1';
  const port = conn.port ?? 6333;
  const protocol = conn.https ? 'https' : 'http';
  return `${protocol}://${host}:${port}`;
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, timeoutMs?: number }} [opts]
 */
export async function qdrantRequest(path, opts = {}) {
  const config = await getVectorCoreConfig();
  const conn = config.connection && typeof config.connection === 'object' ? config.connection : {};
  const base = buildBaseUrl(conn);
  const timeoutMs = opts.timeoutMs ?? conn.timeoutMs ?? 30000;
  const headers = { 'Content-Type': 'application/json' };
  const apiKey = String(conn.apiKey ?? '').trim();
  if (apiKey) headers['api-key'] = apiKey;

  const resp = await fetch(`${base}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await resp.text().catch(() => '');
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (!resp.ok) {
    const msg = json?.status?.error || json?.message || text || resp.statusText;
    throw new Error(`[vector-Core] Qdrant ${resp.status}: ${msg}`);
  }
  return json;
}

export async function ping() {
  try {
    await qdrantRequest('/collections', { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}

/** @param {string} name */
export async function collectionExists(name) {
  try {
    await qdrantRequest(`/collections/${encodeURIComponent(name)}`, { method: 'GET' });
    return true;
  } catch (err) {
    if (String(err.message).includes('404')) return false;
    throw err;
  }
}

/**
 * @param {string} name
 * @param {{ dimension: number, distance: string, onDiskPayload?: boolean }} spec
 */
export async function createCollection(name, spec) {
  await qdrantRequest(`/collections/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: {
      vectors: {
        size: spec.dimension,
        distance: spec.distance,
        on_disk: spec.onDiskPayload === true,
      },
    },
  });
}

/** @param {string} name @param {Array<{ id: string|number, vector: number[], payload?: object }>} points */
export async function upsertPoints(name, points) {
  return qdrantRequest(`/collections/${encodeURIComponent(name)}/points`, {
    method: 'PUT',
    body: { points },
  });
}

/**
 * @param {string} name
 * @param {number[]} vector
 * @param {{ limit?: number, filter?: object, scoreThreshold?: number, withPayload?: boolean }} [opts]
 */
export async function searchPoints(name, vector, opts = {}) {
  const body = {
    vector,
    limit: opts.limit ?? 10,
    with_payload: opts.withPayload !== false,
    score_threshold: opts.scoreThreshold,
    filter: opts.filter,
  };
  const res = await qdrantRequest(`/collections/${encodeURIComponent(name)}/points/search`, {
    method: 'POST',
    body,
  });
  return res?.result ?? [];
}

/** @param {string} name @param {Array<string|number>} ids */
export async function deletePoints(name, ids) {
  return qdrantRequest(`/collections/${encodeURIComponent(name)}/points/delete`, {
    method: 'POST',
    body: { points: ids },
  });
}

/** @param {string} name */
export async function countPoints(name) {
  const res = await qdrantRequest(`/collections/${encodeURIComponent(name)}`, { method: 'GET' });
  return res?.result?.points_count ?? 0;
}
