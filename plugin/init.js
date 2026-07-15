import PluginBase from '../../../src/infrastructure/plugins/plugin-base.js';
import { setRuntimeGlobal } from '../../../src/utils/runtime-globals.js';
import { normalizeError } from '../../../src/utils/normalize-error.js';
import * as VectorService from '../lib/index.js';

export default class VectorCoreInit extends PluginBase {
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
      const error = normalizeError(err);
      logger.warn(`[vector-Core] bootstrap 跳过: ${error.message}`);
    }
  }
}

VectorCoreInit._booted = false;
