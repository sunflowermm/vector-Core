/**
 * vector-Core 启动：bootstrap + 注册 Qdrant 可选持久化探活
 * 连接失败时 soft-skip，不阻断 Runtime。
 */
import PluginBase from '../../../src/infrastructure/plugins/plugin-base.js';
import { setRuntimeGlobal } from '../../../src/utils/runtime-globals.js';
import { normalizeError } from '../../../src/utils/normalize-error.js';
import { registerPersistenceProvider } from '../../../src/infrastructure/database/persistence-registry.js';
import * as VectorService from '../lib/index.js';

export default class VectorCoreInit extends PluginBase {
  constructor() {
    super({
      name: 'vector-core-init',
      dsc: 'vector-Core bootstrap',
      event: 'message',
      priority: 1,
    });
  }

  async init() {
    if (VectorCoreInit._booted) return;
    VectorCoreInit._booted = true;
    try {
      await VectorService.bootstrap();
      setRuntimeGlobal('VectorService', VectorService);
      registerPersistenceProvider({
        id: 'qdrant',
        kind: 'vector',
        required: false,
        core: 'vector-Core',
        ping: () => VectorService.ping(),
      });
    } catch (err) {
      registerPersistenceProvider({
        id: 'qdrant',
        kind: 'vector',
        required: false,
        core: 'vector-Core',
        ping: async () => false,
        meta: { skipReason: normalizeError(err).message },
      });
    }
  }
}

VectorCoreInit._booted = false;
