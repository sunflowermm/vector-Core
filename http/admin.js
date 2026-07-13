import { HttpResponse } from '#utils/http-utils.js';

export default {
  name: 'vector-core-admin',
  dsc: 'Vector-Core 健康检查与管理 API',
  priority: 90,

  routes: [
    {
      method: 'GET',
      path: '/api/vector-core/health',
      systemAuth: false,
      handler: HttpResponse.asyncHandler(async (_req, res) => {
        let ok = false;
        let migration = { applied: [], pending: [] };
        try {
          const svc = globalThis.VectorService;
          if (svc?.ping) ok = await svc.ping();
          if (ok && svc?.getMigrationStatus) {
            migration = await svc.getMigrationStatus();
          }
        } catch {
          ok = false;
        }
        HttpResponse.success(res, {
          status: ok ? 'operational' : 'down',
          qdrant: ok ? 'connected' : 'disconnected',
          migrations: migration,
          timestamp: Date.now(),
        });
      }, 'vector-core.health'),
    },
    {
      method: 'GET',
      path: '/api/vector-core/collections',
      handler: HttpResponse.asyncHandler(async (_req, res) => {
        const svc = globalThis.VectorService;
        if (!svc?.listVectorCollections) {
          return HttpResponse.error(res, new Error('VectorService 未初始化'), 503, 'vector-core.collections');
        }
        HttpResponse.success(res, { collections: svc.listVectorCollections() });
      }, 'vector-core.collections'),
    },
    {
      method: 'GET',
      path: '/api/vector-core/admin/stats',
      handler: HttpResponse.asyncHandler(async (_req, res) => {
        const svc = globalThis.VectorService;
        if (!svc?.countPoints) {
          return HttpResponse.error(res, new Error('VectorService 未初始化'), 503, 'vector-core.stats');
        }
        const registered = svc.listVectorCollections?.() ?? [];
        const stats = [];
        for (const entry of registered) {
          try {
            const count = await svc.countPoints(entry.name);
            stats.push({
              name: entry.name,
              owner: entry.owner,
              entity: entry.entity,
              dimension: entry.dimension,
              distance: entry.distance,
              points: count,
            });
          } catch (err) {
            stats.push({ name: entry.name, error: err.message });
          }
        }
        HttpResponse.success(res, { stats });
      }, 'vector-core.stats'),
    },
  ],
};
