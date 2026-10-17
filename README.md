# 爱教学 · Sprint1

教学质量全链路数字化管理平台 —— Sprint1 最小可用版本：**课程信息查询核心能力**。

三种角色（教研室主任 / 教学督导 / 教师）均可查看、筛选基础课程数据，前后端分离，数据持久化于 SQLite。

---

## 功能概览

| 角色 | 入口页面 | 核心能力 |
|------|----------|----------|
| 教研室主任 | `director.html` | 统筹视角：全院课程总览，支持学期/学院/教研室/类别/关键词组合筛选与分页 |
| 教学督导 | `supervisor.html` | 听课视角：按教师筛选课程确定听课对象，统计口径随选中教师动态切换 |
| 教师 | `teacher.html` | 个人视角：仅查看本人所授课程，核对开课信息 |

通用能力：

- 课程列表分页（后端 `LIMIT/OFFSET`，前端分页器）
- 关键词搜索（SQL 通配符 `%/_/#` 已转义，防误匹配）
- 课程详情弹窗（含空值保护）
- 统计卡片（课程数 / 教师数 / 学生人次 / 总学时）
- 请求统一兜底（HTTP 状态码 + 业务码检查 + 友好提示，杜绝白屏）
- 搜索竞态防护（递增令牌，旧响应自动丢弃）

---

## 技术栈

- **后端**：Node.js + Express 5 + better-sqlite3（只读模式打开）
- **前端**：原生 HTML/CSS/JavaScript，多页应用
- **数据库**：SQLite（WAL 模式，5 个查询索引）
- **测试**：Node 内置 `node:test`，无需额外测试框架

---

## 运行指南

### 环境要求

- Node.js >= 18（建议 20+，开发验证于 v24）

### 1. 安装依赖

```powershell
npm.cmd install
```

### 2. 初始化数据库

```powershell
npm.cmd run init-db
```

输出 `数据库初始化成功：7 位教师，12 门课程` 即完成。数据库文件位于 `data/teaching.db`。

### 3. 启动服务

```powershell
npm.cmd start
```

访问 http://localhost:3000 ，选择角色进入系统（选择"教师"时需再选具体教师身份）。

### 4. 运行测试

```powershell
npm.cmd test
```

测试会在 **3100 端口**自动拉起独立服务实例，执行 13 个 API 集成用例后自动关闭，不影响开发服务器。

---

## 目录结构

```
Sprint1/
├── server.js              # Express 服务 + 全部 REST API
├── package.json
├── scripts/
│   └── init-db.js         # 数据库初始化（建表/索引/种子数据/WAL 清理）
├── data/
│   └── teaching.db        # SQLite 数据库（init-db 生成，勿提交）
├── public/                # 前端静态资源
│   ├── index.html         # 角色选择（登录）页
│   ├── director.html      # 教研室主任
│   ├── supervisor.html    # 教学督导
│   ├── teacher.html       # 教师
│   ├── css/style.css
│   └── js/
│       ├── common.js      # 共享层：rawRequest 兜底 / API 封装 / 分页器 / 事件委托 / 详情弹窗
│       ├── login.js
│       ├── director.js
│       ├── supervisor.js
│       └── teacher.js
└── tests/
    └── api.test.js        # API 集成测试（13 用例）
```

---

## API 一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/courses` | 课程列表，支持 `keyword/semester/college/department/category/teacherId/page/pageSize` |
| GET | `/api/courses/:id` | 课程详情（不存在返回 404） |
| GET | `/api/teachers` | 教师列表 |
| GET | `/api/teachers/:id` | 教师详情 |
| GET | `/api/teachers/:id/courses` | 某教师的全部课程 |
| GET | `/api/teachers/:id/stats` | 教师维度统计 |
| GET | `/api/stats` | 全局统计（单条聚合 SQL） |
| GET | `/api/filter-options` | 筛选项（进程内缓存） |

统一响应格式：`{ code: 0, data: ... }`；课程列表额外返回 `total/page/pageSize`；错误统一 `{ code: 500, message: '服务器内部错误' }`（不泄露内部细节）。

---

## 安全与性能要点

- 数据库以 `readonly: true` 打开，服务端无写入面
- 搜索关键词使用 `LIKE ... ESCAPE '#'` 转义 `%/_/#`
- 静态资源 `maxAge: 1h` 缓存 + `compression` gzip 压缩
- `courses` 表建有 5 个索引（teacher_id / semester / college / department / category）
