# 爱教学平台

教学质量全链路数字化管理平台。

- **Sprint1**：课程信息查询核心能力（三角色查看/筛选基础课程数据）
- **Sprint2**：三角色后端鉴权 + 教学资源模块
- **Sprint3**：教学评价管理（督导查阅历史记录 / 主任导出汇总 CSV / 教师查看本人统计）

---

## 功能概览

| 角色 | 入口页面 | Sprint1 能力 | Sprint2 新增 | Sprint3 新增 |
|------|----------|--------------|--------------|--------------|
| 教研室主任 | `director.html` | 全院课程多条件筛选/分页 | 只读浏览课程教学资源 | 评价汇总 CSV 导出；各课程资源数量统计 |
| 教学督导 | `supervisor.html` | 按教师筛选确定听课对象 | 只读浏览课程配套资源（禁止一切写操作） | 历史评价记录查阅（按课程/学期/评价者过滤） |
| 教师 | `teacher.html` | 仅查看本人课程 | 查看本人课程资源；对本人课程资源增/改/删 | 查看本人课程评价统计（总体+分课程+分角色） |

课程详情弹窗内嵌「📎 教学资源」区：教师本人课程显示管理表单，主任/督导仅见只读列表。

---

## 技术栈

- 后端：Node.js + Express 5 + better-sqlite3（版本精确锁定 13.0.3）
- 前端：原生 HTML/CSS/JavaScript 多页应用
- 鉴权：登录下发 HMAC-SHA256 签名 token，`Authorization: Bearer` 校验
- API 测试：Node 内置 `node:test`，零测试框架依赖（69 条）
- E2E 测试：Playwright 1.52（14 条 Chromium 浏览器级 UI 用例）
- 代码规范：ESLint 9（`npm run lint`）

---

## 运行指南

环境要求：Node.js >= 18（开发验证于 Node 24）。

```powershell
npm.cmd install        # 安装依赖
npm.cmd run init-db    # 初始化数据库（7 教师 / 12 课程 / 15 条教学资源 / 36 条评价）
npm.cmd start          # 启动服务 http://localhost:3000
npm.cmd test           # 运行 69 条 API 测试（串行，约 18 秒）
npm.cmd run test:e2e   # 运行 14 条 E2E 测试（需先 npm.cmd install --save-dev @playwright/test + npx playwright install chromium）
npm.cmd run lint       # ESLint 检查
```

测试说明：

- API 测试使用 `--test-concurrency=1` 串行执行，配合 **每个用例独立创建/销毁临时数据库与独立服务进程**，规避 better-sqlite3 原生句柄复用导致的随机 SIGSEGV。
- 用例分四组：`tests/auth.test.js`（13 条鉴权/越权）、`tests/courses.test.js`（19 条 Sprint1 回归）、`tests/resources.test.js`（19 条资源 CRUD）、`tests/evaluations.test.js`（18 条评价模块）。
- E2E 测试由 Playwright globalSetup 启动独立临时 DB + 独立服务（端口 4321），串行执行，覆盖三角色登录流程、教师资源 CRUD 闭环、只读权限呈现。

---

## 权限矩阵

| 接口 | 主任 | 督导 | 教师 |
|------|------|------|------|
| 课程列表 `/api/courses` | 全部 | 全部 | **强制仅本人课程**（忽略客户端 teacherId） |
| 课程详情 / 课程统计 | 全部 | 全部 | 仅本人 |
| `/api/teachers` | ✅ | ✅ | 403 |
| 全院统计 `/api/stats` | ✅ | ✅ | 403 |
| 浏览课程资源 | ✅ 只读 | ✅ 只读 | 仅本人课程 |
| 新增/修改/删除资源 | 403 | **403** | 仅本人课程资源 |
| 评价记录 `/api/evaluations` | 全部 | 全部 | 仅本人课程（服务端强制） |
| 评价 CSV 导出 `/api/evaluations/export` | ✅ | 403 | 403 |
| 各课程资源数量 `/api/stats/course-resources` | ✅ | 403 | 403 |
| 教师评价统计 `/api/teachers/:id/evaluation-stats` | 任意教师 | 任意教师 | **仅本人**（越权返回 403） |

所有接口均做入参校验（ID 格式、分页边界、关键词长度、资源名称/类型/链接、评价者角色枚举），错误统一返回 `{code,message}`，生产响应不泄露数据库错误细节。

---

## 教学资源模块

数据表 `resources`：`id / course_id / name / type(课件|文档|视频|链接|作业) / url / description / created_at`，外键关联课程，建有 `idx_resources_course` 索引。

| 方法 | 路径 | 权限 |
|------|------|------|
| GET | `/api/courses/:courseId/resources` | 主任/督导/课程所属教师 |
| POST | `/api/courses/:courseId/resources` | 课程所属教师 |
| PUT | `/api/resources/:id` | 资源所属课程的教师 |
| DELETE | `/api/resources/:id` | 资源所属课程的教师 |

全部 SQL 均为参数化查询；登录接口 `POST /api/auth/login` 与登录名录 `GET /api/auth/teachers` 公开。

---

## 教学评价模块（Sprint3）

数据表 `evaluations`：`id / course_id / teacher_id / semester / evaluator_role(学生|督导|同行) / score(0-100) / comment / evaluated_at`，覆盖多个学期的历史数据。

| 方法 | 路径 | 权限 |
|------|------|------|
| GET | `/api/evaluations` | 主任/督导全部；教师仅本人课程 |
| GET | `/api/evaluations/export` | 仅主任（CSV + UTF-8 BOM） |
| GET | `/api/stats/course-resources` | 仅主任 |
| GET | `/api/teachers/:id/evaluation-stats` | 任意（教师仅本人） |

---

## 目录结构

```
├── server.js                 # Express 服务 + 路由（鉴权/课程/资源/评价）
├── lib/
│   ├── auth.js               # token 签发校验 + requireAuth/requireRole
│   └── validate.js           # 入参校验
├── scripts/
│   ├── db-init.js            # 建库模块（测试复用，支持任意路径）
│   ├── seed-data.js          # 教师/课程/资源/评价种子数据
│   └── init-db.js            # 建库 CLI
├── public/                   # 前端多页应用（登录/主任/督导/教师）
├── tests/
│   ├── helpers/test-server.js# 每用例独立临时库 + 独立服务助手
│   ├── auth.test.js          # 13 条鉴权/越权用例
│   ├── courses.test.js       # 19 条 Sprint1 回归用例
│   ├── resources.test.js     # 19 条资源 CRUD + 越权用例
│   ├── evaluations.test.js   # 18 条评价模块用例
│   └── e2e/                  # Playwright E2E 浏览器级测试
│       ├── global-setup.js   # 启动独立临时 DB + 服务
│       ├── global-teardown.js# 清理
│       ├── login.spec.js     # 三角色登录流程（4 条）
│       ├── teacher-resources.spec.js # 教师资源 CRUD 闭环（5 条）
│       └── readonly.spec.js  # 只读权限呈现验证（5 条）
├── docs/user-guide.md        # 三角色用户使用手册
└── CHANGELOG.md              # 版本变更记录（Keep a Changelog 格式）
```

---

## CI（GitHub Actions）

- 配置文件：`.github/workflows/ci.yml`，push / PR / 手动触发
- **Lint 作业**：Node 24 + ESLint（`npm run lint`）
- **Test 作业**：`npm ci` → `init-db` 冒烟 → 69 条 API 测试串行执行，
  矩阵覆盖 Ubuntu/Windows-2022 × Node 22/24，验证 better-sqlite3 稳定性修复跨平台不回归
- **E2E 作业**：`npm ci` → `playwright install chromium --with-deps` → 14 条 E2E 测试，Ubuntu / Node 24
- 远端仓库已配置：`https://github.com/Moira121/teaching-resource-system.git`，push 后自动触发

## 分支与发布

- `main`：主分支，包含全部三个 Sprint 的稳定代码
- `feature/sprint2-resources`：Sprint2 独立开发分支（已合并）
- `feature/sprint3-evaluations`：Sprint3 独立开发分支（已合并）

### Release Tags

| 版本 | Tag | 说明 |
|------|-----|------|
| v1.0.0 | `v1.0.0` | Sprint1 课程查询基线（commit `31ed484`） |
| v2.0.0 | `v2.0.0` | Sprint2 鉴权 + 教学资源（commit `b47432f`） |
| v3.0.0 | `v3.0.0` | Sprint3 教学评价管理（commit `47eeeb0`） |

详细变更见 [CHANGELOG.md](CHANGELOG.md)；用户操作指引见 [docs/user-guide.md](docs/user-guide.md)。
