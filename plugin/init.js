import plugin from '#infrastructure/plugins/plugin.js';
import { setRuntimeGlobal } from '#utils/runtime-globals.js';
import * as VectorService from '../lib/index.js';

export default class VectorCoreInit extends plugin {
  constructor() {
    super({
      name: 'vector-core-init',
      dsc: 'Vector-Core 启动：Qdrant 集合、迁移、挂载 VectorService',
      event: 'message',
      priority: 1,
    });
  }

  async init() {
    if (VectorCoreInit._booted) return;
    VectorCoreInit._booted = true;
    try {
      const result = await VectorService.bootstrap();
      setRuntimeGlobal('VectorService', VectorService);
      const mig = result.migrations?.length ? result.migrations.join(',') : 'none';
      logger.mark(`[vector-Core] bootstrap OK migrations=[${mig}]`);
    } catch (err) {
      logger.error(`[vector-Core] bootstrap 失败: ${err.message}`);
      throw err;
    }
  }
}

VectorCoreInit._booted = false;
