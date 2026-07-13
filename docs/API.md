# Vector-Core API 参考

本文档描述 vector-Core 的公开 API。后端为 [Qdrant](https://qdrant.tech/)，经 REST 访问（Node 原生 `fetch` + `AbortSignal.timeout`）。

---

## 模块结构

```text
lib/
├── index.js
├── client.js              # Qdrant REST
├── collection-registry.js
├── repository-base.js     # VectorRepository + ensureCollections
├── migration-runner.js
├── naming.js
└── config.js
```

---

## 生命周期

| 函数 | 说明 |
|------|------|
| `bootstrap()` | 读配置、注册系统集合、迁移、ensureCollections |
| `ping()` | Qdrant 可达性 |
| 全局 `VectorService` | `plugin/init.js` 挂载 |

---

## 集合注册

| 函数 | 说明 |
|------|------|
| `registerVectorCollection(owner, entity, options)` | 声明维度与距离度量 |
| `getVectorCollectionEntry(owner, entity)` | 取注册项 |
| `listVectorCollections()` | 列表 |
| `buildCollectionName(owner, entity)` | 物理集合名 |
| `ensureCollections()` | 在 Qdrant 创建缺失集合 |

### options

| 字段 | 必填 | 说明 |
|------|------|------|
| `dimension` | 是 | 向量维度，须与 Embedding 模型一致 |
| `distance` | 否 | `Cosine`（默认）、`Euclid`、`Dot`、`Manhattan` |
| `onDiskPayload` | 否 | payload 落盘 |

```javascript
const DOCS = registerVectorCollection('rag', 'docs', {
  dimension: 1536,
  distance: 'Cosine',
});
```

物理集合名：`<core>_<entity>`（可加 `collectionPrefix`）。

---

## VectorRepository

```javascript
import { registerVectorCollection, VectorRepository } from '../../../vector-Core/lib/index.js';

const DOCS = registerVectorCollection('rag', 'docs', { dimension: 1536 });

export class DocVectorRepo extends VectorRepository {
  constructor() {
    super(DOCS);
  }

  indexChunk(id, vector, payload) {
    return this.upsert([{ id, vector, payload }]);
  }

  searchSimilar(vector, limit = 8) {
    return this.search(vector, { limit, scoreThreshold: 0.72 });
  }
}
```

| 方法 | 说明 |
|------|------|
| `upsert(points)` | `{ id, vector, payload? }[]` |
| `search(vector, opts?)` | 相似检索，返回 Qdrant hit 列表 |
| `delete(ids)` | 按 id 删除 |
| `count()` | 点数 |

### search opts

| 字段 | 说明 |
|------|------|
| `limit` | 条数，默认读配置 `defaultSearchLimit` |
| `filter` | Qdrant filter 对象 |
| `scoreThreshold` | 最低相似度 |

---

## 底层 client（高级用法）

| 函数 | 说明 |
|------|------|
| `qdrantRequest(path, { method, body })` | 原始 REST |
| `createCollection(name, spec)` | 创建集合 |
| `upsertPoints` / `searchPoints` / `deletePoints` | 点操作 |

---

## 迁移

`migrations/**/*.js` 导出 `{ id, async up(api) }`，`api` 为 `client.js` 导出对象。

---

## HTTP Admin

| 路径 | 说明 |
|------|------|
| `GET /api/vector-core/health` | 连接与迁移 |
| `GET /api/vector-core/collections` | 已注册集合 |
| `GET /api/vector-core/admin/stats` | 各集合点数 |

---

## 配置

路径：`data/vector-core/config.yaml`

| 字段 | 默认 | 说明 |
|------|------|------|
| `connection.host` | `127.0.0.1` | Qdrant 地址 |
| `connection.port` | `6333` | REST 端口 |
| `connection.apiKey` | 空 | 云端或鉴权部署 |
| `ensureCollectionsOnBoot` | `true` | 自动建集合 |
| `defaultSearchLimit` | `10` | 检索默认 top-K |

---

## 与其它 Core 的关系

| Core | 用途 |
|------|------|
| vector-Core | 向量相似检索（RAG 召回） |
| mongodb-Core | 原文、元数据、业务文档 |
| postgres-Core | 结构化业务数据 |
| system `database` stream | 本地文件知识库 MCP |

典型 RAG：`mongodb` 存 chunk 正文，`vector-Core` 存 embedding，检索后回表取文本。

---

## 注意事项

| 场景 | 做法 |
|------|------|
| 维度 | 与 Embedding 模型输出一致 |
| 原文存储 | Mongo / Postgres，向量库只存 id + 可选摘要 payload |
| 请求超时 | `connection.timeoutMs`，内部使用 `AbortSignal.timeout` |
