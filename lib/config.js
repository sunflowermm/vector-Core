import ConfigBase from '../../../src/infrastructure/commonconfig/commonconfig.js';

let configInstance;

export default class VectorCoreConfig extends ConfigBase {
  constructor() {
    super({
      name: 'vector-core',
      displayName: 'Vector-Core',
      description: 'Vector-Core：向量集合注册、写入、相似度检索（Qdrant）',
      filePath: 'data/vector-core/config.yaml',
      defaultTemplatePath: 'core/vector-Core/default/vector-core.yaml',
      fileType: 'yaml',
      schema: VectorCoreConfig.schemaDefinition(),
    });
  }

  static schemaDefinition() {
    return {
      fields: {
        ensureCollectionsOnBoot: {
          type: 'boolean',
          label: '启动时确保集合',
          description: '按 registerVectorCollection 声明自动创建 Qdrant 集合',
          default: true,
          component: 'Switch',
        },
        runMigrationsOnBoot: {
          type: 'boolean',
          label: '启动时执行迁移',
          description: '运行 core/vector-Core/migrations 下未应用的脚本',
          default: true,
          component: 'Switch',
        },
        collectionPrefix: {
          type: 'string',
          label: '全局集合前缀',
          description: '留空则 <core>_<entity>；非空为 <prefix>_<core>_<entity>',
          default: '',
          component: 'Input',
        },
        connection: {
          type: 'object',
          label: 'Qdrant 连接',
          component: 'SubForm',
          fields: {
            host: { type: 'string', label: '地址', default: '127.0.0.1', component: 'Input' },
            port: { type: 'number', label: '端口', default: 6333, component: 'InputNumber' },
            https: { type: 'boolean', label: 'HTTPS', default: false, component: 'Switch' },
            apiKey: { type: 'string', label: 'API Key', default: '', component: 'InputPassword' },
            timeoutMs: { type: 'number', label: '请求超时(ms)', default: 30000, component: 'InputNumber' },
          },
        },
        defaultSearchLimit: {
          type: 'number',
          label: '默认检索条数',
          default: 10,
          component: 'InputNumber',
        },
      },
    };
  }
}

/** @returns {Promise<Record<string, unknown>>} */
export async function getVectorCoreConfig() {
  if (!configInstance) configInstance = new VectorCoreConfig();
  return configInstance.read();
}

export function getVectorCoreConfigClass() {
  return VectorCoreConfig;
}
