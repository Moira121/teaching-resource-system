# Changelog

本文件记录 [爱教学平台](https://github.com/Moira121/teaching-resource-system) 的全部版本变更，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

版本号遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)：`主版本.次版本.修订号`。

---

## [v3.0.1] - 2026-10-27

### 新增（Added）

- **Playwright E2E 浏览器级测试**（14 条 Chromium UI 用例），覆盖三角色登录流程、教师资源 CRUD 闭环、只读权限呈现
- CI 流水线新增 `e2e` Job：Ubuntu / Node 24，自动安装 Chromium + 依赖后运行
- 用户使用手册 `docs/user-guide.md`：三角色操作指南 + 问题排查
- Release Notes 补全：`CHANGELOG.md` 三版本完整变更记录（Keep a Changelog 格式）
- README 运行指南完善：技术栈、运行命令、权限矩阵、目录结构、CI 配置、分支与发布

### 修复（Fixed）

- `package.json` 版本号从 2.0.0 修正为 3.0.0，描述更新为 Sprint3 发布就绪

### 测试（Tests）

- 全量回归：**69 条 API 测试 + 14 条 E2E 测试，全部通过**
- CI 全矩阵：Lint ✅ + Test（Ubuntu/Windows × Node 22/24）✅ + E2E ✅

### 基础设施（Infrastructure）

- `feature/e2e-and-releases` 分支合并回 `main`（`92d62a3`），发布就绪 HEAD 包含全部三个 Sprint 的功能代码、测试、文档
- `.gitignore` 补充 Playwright 产物（`test-results/`、`playwright-report/`、`.playwright/`）

### 构建

- 累计三个 Sprint，达到发布就绪状态：
  - Sprint1（v1.0.0）：课程查询核心 → Sprint2（v2.0.0）：鉴权 + 资源 → Sprint3（v3.0.0）：评价管理 → v3.0.1：测试 + 文档 + CI 全绿

---

## [v3.0.0] - 2026-10-25

### 新增（Added）

- **教学评价管理模块**（Sprint3）
  - 督导：只读查阅全校课程历史评价记录，支持按课程 / 学期 / 评价者角色（学生 / 督导 / 同行）过滤
  - 主任：CSV 格式汇总导出课程评价表（带 UTF-8 BOM，Excel 可直接打开），支持按学期 / 学院过滤；各课程教学资源数量统计
  - 教师：查看本人课程的评价统计（总体均分 + 分课程 + 分评价者角色），服务端强制限定仅本人可查
- 新接口：`GET /api/evaluations`、`GET /api/evaluations/export`、`GET /api/stats/course-resources`、`GET /api/teachers/:id/evaluation-stats`
- 种子数据新增 36 条评价记录，覆盖 7 门课程、3 个学期、3 类评价者

### 测试（Tests）

- 新增 `tests/evaluations.test.js`（18 条用例），覆盖：督导查询 + 过滤、主任 CSV 导出 + 非法入参、资源统计权限、教师评价统计越权拦截
- 全量测试：**69 条全部通过**，串行执行约 18 秒

### 修复（Fixed）

- 修复前端评价统计取值层级错误导致主任端资源统计加载失败（`fix: 修复前端评价统计取值层级错误`）

### 基础设施（Infrastructure）

- CI 流水线扩展：功能分支（`feature/**`）推送也触发 lint + test 门禁，覆盖 Sprint3 质量门禁

---

## [v2.0.0] - 2026-10-22

### 新增（Added）

- **三角色后端鉴权体系**（Sprint2 核心）
  - 登录接口 `POST /api/auth/login`：HMAC-SHA256 签名 token，`Authorization: Bearer` 校验
  - 中间件 `requireAuth` + `requireRole(...roles)`：统一权限矩阵
  - 教师角色必须提供存在的 teacherId，服务端强制限定仅本人课程可见
- **教学资源模块**
  - 数据表 `resources(id, course_id, name, type, url, description, created_at)`，外键级联
  - 资源类型白名单：课件 / 文档 / 视频 / 链接 / 作业
  - 接口：资源列表（GET）、新增（POST）、修改（PUT）、删除（DELETE）——仅课程所属教师有写权限，主任/督导只读
- **双数据库句柄隔离**：`dbRead`（只读，杜绝意外写操作）+ `dbWrite`（鉴权后才调用），WAL 模式 + 外键开启
- 资源链接全部指向 `public/resources/` 下的真实本地 HTML 演示页，点击可显示
- 建库脚本从 `init-db.js` 拆出 `db-init.js` + `seed-data.js`，CLI 与测试共用同一模块

### 修复（Fixed）

- **P0 问题全量修复**（`fix: 演示必修 P0 问题 + P1 缺陷全量修复`）
  - keyword SQL 拼接 `WHERE AND` bug：keyword 条件合并到 where 数组，保证 where 为空时不产生语法错误
  - escapeHtml 存储型 XSS：登录页教师名录字段全部 HTML 转义后再拼 DOM
  - 外键约束开启：`dbWrite.pragma('foreign_keys = ON')`，删课程时 resources 自动清除
  - 双句柄只读屏障：所有只读路由使用 `dbRead`，杜绝意外写操作
  - token 死循环：登录页不再无条件跳转，过期 token 由角色页守卫拦截后自然跳回
  - SELECT \* 消除：全部查询改为显式字段列表
  - require.main 隔离：`if (require.main === module)` 保证被测试 require 时不启动端口
  - filterCache 失效：资源写操作后自动调用 `invalidateFilterCache()`

### 测试（Tests）

- `tests/auth.test.js`（13 条）：鉴权 / 越权 / 角色权限矩阵
- `tests/resources.test.js`（19 条）：资源 CRUD 闭环 + 三角色越权拦截 + 入参校验
- **每用例独立临时数据库 + 独立服务进程**，配合 `--test-concurrency=1` 串行执行，彻底规避 better-sqlite3 原生句柄跨用例复用导致的随机 SIGSEGV

### 基础设施（Infrastructure）

- ESLint 9 + GitHub Actions CI（`.github/workflows/ci.yml`）
  - Lint 作业：Node 24 + ESLint `npm run lint`
  - Test 作业矩阵：Ubuntu / Windows-2022 × Node 22 / 24
  - 显式声明 `npm_config_build_from_source: false`，优先使用 better-sqlite3 官方预编译二进制
  - Windows runner 固定使用 `windows-2022`（预装 VS2022），规避 windows-latest 的 VS2026 兼容性问题
- 分支策略：`main` 保持 Sprint1 基线，Sprint2 变更在 `feature/sprint2-resources` 分支独立开发，经人工 diff 审查后合并

---

## [v1.0.0] - 2026-10-20

### 新增（Added）

- **课程信息查询核心能力**（Sprint1 基线）
  - 接口：`GET /api/courses`（分页 + 多条件筛选 + 关键词 LIKE 转义）、`GET /api/courses/:id`、`GET /api/teachers`、`GET /api/stats`、`GET /api/filter-options`
  - 关键词通配符 `%` / `_` / `#` 全部转义，配合 `ESCAPE '#'` 防注入
  - 入参校验：ID 格式、分页边界、keyword 长度上限、teacherId 白名单等
  - 统一错误响应 `{ code, message }`，生产环境不泄露数据库错误细节
- 多角色前端入口页：主任、督导、教师三个角色页面，根据角色呈现不同筛选维度
- 种子数据：7 位教师（计算机学院 4 人 + 信息学院 2 人 + 软件学院 1 人）、12 门课程（覆盖两个学期、4 个教研室、必修/选修两类）
- Node 内置 `node:test` 框架，零测试依赖

### 技术栈

- 后端：Node.js + Express 5 + better-sqlite3 13.0.3
- 前端：原生 HTML/CSS/JavaScript 多页应用
- 代码规范：ESLint 9

### 测试（Tests）

- `tests/courses.test.js`（19 条）：Sprint1 课程查询全量回归
- `tests/auth.test.js` 初始版本（3 条）：静态首页无鉴权、非法 token、伪造 token

---

## 版本标签与分支

| 版本 | Git Tag | 提交 | 分支 |
|------|---------|------|------|
| v1.0.0 | `v1.0.0` | `31ed484` | `main` |
| v2.0.0 | `v2.0.0` | `b47432f` | `feature/sprint2-resources` |
| v3.0.0 | `v3.0.0` | `47eeeb0` | `main`（合并自 `feature/sprint3-evaluations`） |
| v3.0.1 | `v3.0.1` | `92d62a3` | `main`（合并自 `feature/e2e-and-releases`） |

所有版本均通过 CI 流水线（Lint ✅ + 69 条 API 测试 ✅ + 14 条 E2E ✅）。

---

[Unreleased]: https://github.com/Moira121/teaching-resource-system/compare/v3.0.1...HEAD
[v3.0.1]: https://github.com/Moira121/teaching-resource-system/compare/v3.0.0...v3.0.1
[v3.0.0]: https://github.com/Moira121/teaching-resource-system/compare/v2.0.0...v3.0.0
[v2.0.0]: https://github.com/Moira121/teaching-resource-system/compare/v1.0.0...v2.0.0
[v1.0.0]: https://github.com/Moira121/teaching-resource-system/releases/tag/v1.0.0
