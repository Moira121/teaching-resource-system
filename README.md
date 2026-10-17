# 爱教学平台

教学质量全链路数字化管理平台。

- **Sprint1**：课程信息查询核心能力（三角色查看/筛选基础课程数据）
- **Sprint2**：三角色后端鉴权 + 教学资源模块（当前，分支 `feature/sprint2-resources`）

---

## 功能概览

| 角色 | 入口页面 | Sprint1 能力 | Sprint2 新增 |
|------|----------|--------------|--------------|
| 教研室主任 | `director.html` | 全院课程多条件筛选/分页 | 按学期+学院筛选课程；只读浏览课程教学资源 |
| 教学督导 | `supervisor.html` | 按教师筛选确定听课对象 | 只读浏览课程配套资源（禁止一切写操作） |
| 教师 | `teacher.html` | 仅查看本人课程 | 查看本人课程资源；对本人课程资源增/改/删 |

课程详情弹窗内嵌「📎 教学资源」区：教师本人课程显示管理表单，主任/督导仅见只读列表。

---

## 技术栈

- 后端：Node.js + Express 5 + better-sqlite3（版本精确锁定 13.0.3）
- 前端：原生 HTML/CSS/JavaScript 多页应用
- 鉴权：登录下发 HMAC-SHA256 签名 token，`Authorization: Bearer` 校验
- 测试：Node 内置 `node:test`，零测试框架依赖
- 代码规范：ESLint 9（`npm run lint`）

---

## 运行指南

环境要求：Node.js >= 18（开发验证于 Node 24）。

```powershell
npm.cmd install        # 安装依赖
npm.cmd run init-db    # 初始化数据库（7 教师 / 12 课程 / 15 条教学资源）
npm.cmd start          # 启动服务 http://localhost:3000
npm.cmd test           # 运行全部 51 条测试（串行，约 18 秒）
npm.cmd run lint       # ESLint 检查
```

测试说明：

- 使用 `--test-concurrency=1` 串行执行（等效旧版 Node 的 `--no-concurrency`），
  配合 **每个用例独立创建/销毁临时数据库与独立服务进程**，
  规避 better-sqlite3 原生句柄复用导致的随机 SIGSEGV。
- 用例分三组：`tests/auth.test.js`（鉴权权限矩阵）、`tests/courses.test.js`（Sprint1 回归）、`tests/resources.test.js`（资源 CRUD 与越权）。

---

## 权限矩阵（Sprint2 后端强制校验）

| 接口 | 主任 | 督导 | 教师 |
|------|------|------|------|
| 课程列表 `/api/courses` | 全部 | 全部 | **强制仅本人课程**（忽略客户端 teacherId） |
| 课程详情 / 课程统计 | 全部 | 全部 | 仅本人 |
| `/api/teachers` | ✅ | ✅ | 403 |
| 全院统计 `/api/stats` | ✅ | ✅ | 403 |
| 浏览课程资源 | ✅ 只读 | ✅ 只读 | 仅本人课程 |
| 新增/修改/删除资源 | 403 | **403** | 仅本人课程资源 |

所有接口均做入参校验（ID 格式、分页边界、关键词长度、资源名称/类型/链接），错误统一返回 `{code,message}`，生产响应不泄露数据库错误细节。

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

## 目录结构

```
├── server.js                 # Express 服务 + 路由（鉴权/课程/资源）
├── lib/
│   ├── auth.js               # token 签发校验 + requireAuth/requireRole
│   └── validate.js           # 入参校验
├── scripts/
│   ├── db-init.js            # 建库模块（测试复用，支持任意路径）
│   ├── seed-data.js          # 教师/课程/资源种子数据（从 init-db 拆出）
│   └── init-db.js            # 建库 CLI
├── public/                   # 前端多页应用（登录/主任/督导/教师）
└── tests/
    ├── helpers/test-server.js# 每用例独立临时库 + 独立服务助手
    ├── auth.test.js          # 13 条鉴权/越权用例
    ├── courses.test.js       # 19 条 Sprint1 回归用例
    └── resources.test.js     # 19 条资源模块用例
```

## 分支与提交

- `main`：Sprint1 基线
- `feature/sprint2-resources`：Sprint2 全部变更（**不合入主干，等待人工 diff 审查后合并**）
