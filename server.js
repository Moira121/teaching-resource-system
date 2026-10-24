/**
 * 爱教学平台服务端
 * Sprint1：课程信息查询（分页/搜索转义/合并统计/只读查询）
 * Sprint2：三角色后端鉴权 + 教学资源模块（教师可管理本人课程资源）
 * 2025-10-22: 双 DB 句柄（只读 / 可写）+ 外键开启 + SELECT * 消除 + keyword SQL 修复 + 导入启动隔离
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { issueToken, requireAuth, requireRole, ROLES } = require('./lib/auth');
const { validId, validateListQuery, validateResourceBody, validateEvaluationQuery } = require('./lib/validate');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'teaching.db');

let compression = null;
try { compression = require('compression'); } catch (_) { /* 未安装时跳过 gzip */ }
if (compression) app.use(compression());

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

if (!fs.existsSync(DB_PATH)) {
  console.error('数据库不存在，请先运行 npm run init-db');
  process.exit(1);
}

/* ---------- 数据库：双句柄隔离只读/可写 ---------- */
// 查询接口使用 dbRead（只读，杜绝意外写操作）；资源写接口使用 dbWrite（鉴权后才调用）。
// WAL 模式需要两个句柄都开 busy_timeout 以避免临时锁竞争。
const dbRead = new Database(DB_PATH, { readonly: true });
dbRead.pragma('busy_timeout = 5000');

const dbWrite = new Database(DB_PATH);
dbWrite.pragma('busy_timeout = 5000');
dbWrite.pragma('journal_mode = WAL');
dbWrite.pragma('foreign_keys = ON'); // 外键级联：删课程时 resources 自动清除

// 启动时强校验 resources / evaluations 表存在（旧库缺少 Sprint2/3 表时对应接口会直接报错）
try {
  const tables = dbRead.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  for (const required of ['resources', 'evaluations']) {
    if (!tables.includes(required)) {
      console.error(`数据库缺少 ${required} 表，请运行 npm run init-db 重建数据库`);
      process.exit(1);
    }
  }
} catch (err) {
  console.error('启动校验失败：', err.message);
  process.exit(1);
}

let filterOptionsCache = null;
function invalidateFilterCache() { filterOptionsCache = null; }

/* ---------------- 行映射 ---------------- */

function rowToCourse(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    credit: row.credit,
    hours: row.hours,
    semester: row.semester,
    college: row.college,
    department: row.department,
    teacherId: row.teacher_id,
    teacher: row.teacher_name,
    teacherTitle: row.teacher_title,
    studentCount: row.student_count,
    classroom: row.classroom,
    schedule: row.schedule,
    category: row.category
  };
}

function rowToTeacher(row) {
  return { id: row.id, name: row.name, title: row.title, college: row.college, department: row.department };
}

function rowToResource(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name,
    type: row.type,
    url: row.url,
    description: row.description,
    createdAt: row.created_at
  };
}

/** LIKE 关键词转义：# -> ##, % -> #%, _ -> #_，配合 ESCAPE '#' */
function escapeLikeKeyword(keyword) {
  return String(keyword).replace(/#/g, '##').replace(/%/g, '#%').replace(/_/g, '#_');
}

/** 统一错误处理：仅记录服务端日志，对前端返回通用文案，不泄露底层细节 */
function serverError(res, err) {
  console.error('[server error]', err && err.stack || err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
}

function badRequest(res, message) {
  res.status(400).json({ code: 400, message });
}

function notFound(res, message) {
  res.status(404).json({ code: 404, message });
}

function forbidden(res, message) {
  res.status(403).json({ code: 403, message: message || '无权访问该资源' });
}

/** 取课程归属信息（仅 id / teacher_id，资源权限校验用，不查全字段） */
function getCourseRow(courseId) {
  return dbRead.prepare('SELECT id, teacher_id FROM courses WHERE id = ?').get(courseId);
}

/* ---------------- 鉴权：登录 ---------------- */

/**
 * 登录（演示系统的简化鉴权）：
 * body { role: director|teacher|supervisor, teacherId? }
 * 教师必须提供存在的 teacherId；主任/督导无需教师身份。
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { role, teacherId } = req.body || {};
    if (!ROLES.includes(role)) return badRequest(res, '角色非法');

    let teacher = null;
    if (role === 'teacher') {
      if (!validId(teacherId || '')) return badRequest(res, '请选择教师身份');
      const row = dbRead.prepare('SELECT id, name, title FROM teachers WHERE id = ?').get(teacherId);
      if (!row) return badRequest(res, '教师不存在');
      teacher = rowToTeacher(row);
    }

    const token = issueToken({ role, teacherId: teacher ? teacher.id : null });
    res.json({ code: 0, data: { token, role, teacher } });
  } catch (err) { serverError(res, err); }
});

/**
 * 登录页教师名录（公开，仅返回登录选择所需的最小字段，不暴露学院/教研室等业务信息）。
 * 业务用 /api/teachers 仍保持主任/督导鉴权。
 */
app.get('/api/auth/teachers', (req, res) => {
  try {
    const rows = dbRead.prepare('SELECT id, name, title FROM teachers ORDER BY id').all();
    res.json({ code: 0, data: rows });
  } catch (err) { serverError(res, err); }
});

/* ---------------- 教师 ---------------- */

/** 教师列表仅主任/督导可见（督导按教师确定听课对象） */
app.get('/api/teachers', requireAuth, requireRole('director', 'supervisor'), (req, res) => {
  try {
    const rows = dbRead.prepare('SELECT id, name, title, college, department FROM teachers ORDER BY id').all();
    res.json({ code: 0, data: rows.map(rowToTeacher) });
  } catch (err) { serverError(res, err); }
});

/** 教师仅可查本人；主任/督导可查任意教师 */
app.get('/api/teachers/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return badRequest(res, 'id 参数格式错误');
    if (req.auth.role === 'teacher' && req.auth.teacherId !== id) return forbidden(res);
    const row = dbRead.prepare('SELECT id, name, title, college, department FROM teachers WHERE id = ?').get(id);
    if (!row) return notFound(res, '教师不存在');
    res.json({ code: 0, data: rowToTeacher(row) });
  } catch (err) { serverError(res, err); }
});

app.get('/api/teachers/:id/stats', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return badRequest(res, 'id 参数格式错误');
    if (req.auth.role === 'teacher' && req.auth.teacherId !== id) return forbidden(res);
    const exists = dbRead.prepare('SELECT 1 FROM teachers WHERE id = ?').get(id);
    if (!exists) return notFound(res, '教师不存在');
    const row = dbRead.prepare(`
      SELECT COUNT(*) AS courseCount,
             COALESCE(SUM(student_count), 0) AS studentTotal,
             COALESCE(SUM(hours), 0) AS hoursTotal
      FROM courses WHERE teacher_id = ?
    `).get(id);
    res.json({ code: 0, data: row });
  } catch (err) { serverError(res, err); }
});

/* ---------------- 课程 ---------------- */

/**
 * 课程列表（分页 + 多条件筛选 + 关键词 LIKE ESCAPE）。
 * 权限：教师身份强制只返回本人课程（忽略客户端 teacherId）；主任/督导可全量筛选。
 * 关键：keyword 条件合并到 where 数组，保证 where 为空时 keyword 不会造成 "WHERE AND" 语法错误。
 */
app.get('/api/courses', requireAuth, (req, res) => {
  try {
    const errMsg = validateListQuery(req.query);
    if (errMsg) return badRequest(res, errMsg);

    const { keyword, semester, college, department, category } = req.query;
    // 教师角色：服务端强制限定本人，杜绝越权查询他人课程
    const teacherId = req.auth.role === 'teacher' ? req.auth.teacherId : req.query.teacherId;

    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));

    const where = [];
    const params = [];
    if (teacherId) { where.push('c.teacher_id = ?'); params.push(teacherId); }
    if (semester) { where.push('c.semester = ?'); params.push(semester); }
    if (college) { where.push('c.college = ?'); params.push(college); }
    if (department) { where.push('c.department = ?'); params.push(department); }
    if (category) { where.push('c.category = ?'); params.push(category); }

    // 通配符转义，防止 % / _ / # 造成超范围匹配或注入式查询
    if (keyword) {
      const kw = escapeLikeKeyword(keyword);
      const like = "LIKE ? ESCAPE '#'";
      const kwSql = `(${['c.name', 'c.code', 't.name'].map(col => `${col} ${like}`).join(' OR ')})`;
      where.push(kwSql);
      const kwParam = `%${kw}%`;
      params.push(kwParam, kwParam, kwParam);
    }

    const joinSql = 'FROM courses c JOIN teachers t ON c.teacher_id = t.id';
    const fromSql = where.length
      ? `${joinSql} WHERE ${where.join(' AND ')}`
      : joinSql;

    const total = dbRead.prepare(`SELECT COUNT(*) AS c ${fromSql}`).get(...params).c;
    const rows = dbRead.prepare(`
      SELECT c.id, c.code, c.name, c.credit, c.hours, c.semester, c.college, c.department,
             c.teacher_id, c.student_count, c.classroom, c.schedule, c.category,
             t.name AS teacher_name, t.title AS teacher_title
      ${fromSql}
      ORDER BY c.semester DESC, c.college ASC, c.code ASC
      LIMIT ? OFFSET ?
    `).all(...params, size, (pageNum - 1) * size);

    res.json({ code: 0, data: rows.map(rowToCourse), total, page: pageNum, pageSize: size });
  } catch (err) { serverError(res, err); }
});

/** 课程详情：教师仅能查看本人授课课程 */
app.get('/api/courses/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return badRequest(res, 'id 参数格式错误');
    const row = dbRead.prepare(`
      SELECT c.id, c.code, c.name, c.credit, c.hours, c.semester, c.college, c.department,
             c.teacher_id, c.student_count, c.classroom, c.schedule, c.category,
             t.name AS teacher_name, t.title AS teacher_title, t.college AS teacher_college
      FROM courses c JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = ?
    `).get(id);
    if (!row) return notFound(res, '课程不存在');
    if (req.auth.role === 'teacher' && req.auth.teacherId !== row.teacher_id) return forbidden(res);

    const course = rowToCourse(row);
    course.teacherCollege = row.teacher_college;
    res.json({ code: 0, data: course });
  } catch (err) { serverError(res, err); }
});

/** 全院统计仅主任/督导可见 */
app.get('/api/stats', requireAuth, requireRole('director', 'supervisor'), (req, res) => {
  try {
    const row = dbRead.prepare(`
      SELECT
        (SELECT COUNT(*) FROM courses) AS courseCount,
        (SELECT COUNT(*) FROM teachers) AS teacherCount,
        COALESCE(SUM(c.student_count), 0) AS studentTotal,
        COALESCE(SUM(c.hours), 0) AS hoursTotal
      FROM courses c
    `).get();
    res.json({ code: 0, data: row });
  } catch (err) { serverError(res, err); }
});

/** 筛选项（进程内缓存），所有登录角色可用；写资源接口后自动失效 */
app.get('/api/filter-options', requireAuth, (req, res) => {
  try {
    if (filterOptionsCache) return res.json({ code: 0, data: filterOptionsCache });
    const semesters = dbRead.prepare('SELECT DISTINCT semester FROM courses ORDER BY semester DESC').all().map(r => r.semester);
    const colleges = dbRead.prepare('SELECT DISTINCT college FROM courses ORDER BY college').all().map(r => r.college);
    const departments = dbRead.prepare('SELECT DISTINCT department FROM courses ORDER BY department').all().map(r => r.department);
    const categories = dbRead.prepare('SELECT DISTINCT category FROM courses').all().map(r => r.category);
    filterOptionsCache = { semesters, colleges, departments, categories };
    res.json({ code: 0, data: filterOptionsCache });
  } catch (err) { serverError(res, err); }
});

/* ---------------- 教学资源（Sprint2） ---------------- */

/**
 * 查询某课程的教学资源列表（只读句柄 dbRead）。
 * 权限：教师仅能查看本人授课课程的资源；主任/督导可查看任意课程（只读）。
 */
app.get('/api/courses/:courseId/resources', requireAuth, (req, res) => {
  try {
    const { courseId } = req.params;
    if (!validId(courseId)) return badRequest(res, 'courseId 参数格式错误');
    const course = getCourseRow(courseId);
    if (!course) return notFound(res, '课程不存在');
    if (req.auth.role === 'teacher' && req.auth.teacherId !== course.teacher_id) return forbidden(res);

    const rows = dbRead.prepare(`
      SELECT id, course_id, name, type, url, description, created_at
      FROM resources WHERE course_id = ? ORDER BY created_at DESC, id ASC
    `).all(courseId);
    res.json({ code: 0, data: rows.map(rowToResource) });
  } catch (err) { serverError(res, err); }
});

/**
 * 新增教学资源（可写句柄 dbWrite）。
 * 权限：仅教师，且课程必须为本人授课；主任/督导（含督导）无写权限，返回 403。
 */
app.post('/api/courses/:courseId/resources', requireAuth, requireRole('teacher'), (req, res) => {
  try {
    const { courseId } = req.params;
    if (!validId(courseId)) return badRequest(res, 'courseId 参数格式错误');
    const course = getCourseRow(courseId);
    if (!course) return notFound(res, '课程不存在');
    if (req.auth.teacherId !== course.teacher_id) return forbidden(res);

    const { value, error } = validateResourceBody(req.body);
    if (error) return badRequest(res, error);

    const id = 'R-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    dbWrite.prepare(`
      INSERT INTO resources (id, course_id, name, type, url, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, courseId, value.name, value.type, value.url, value.description);

    const row = dbRead.prepare(`
      SELECT id, course_id, name, type, url, description, created_at FROM resources WHERE id = ?
    `).get(id);
    invalidateFilterCache();
    res.status(201).json({ code: 0, data: rowToResource(row), message: '资源添加成功' });
  } catch (err) { serverError(res, err); }
});

/** 修改教学资源：仅课程所属教师本人（可写句柄 dbWrite） */
app.put('/api/resources/:id', requireAuth, requireRole('teacher'), (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return badRequest(res, 'id 参数格式错误');
    const row = dbRead.prepare('SELECT id, course_id FROM resources WHERE id = ?').get(id);
    if (!row) return notFound(res, '资源不存在');
    const course = getCourseRow(row.course_id);
    if (!course || req.auth.teacherId !== course.teacher_id) return forbidden(res);

    const { value, error } = validateResourceBody(req.body);
    if (error) return badRequest(res, error);

    dbWrite.prepare('UPDATE resources SET name = ?, type = ?, url = ?, description = ? WHERE id = ?')
      .run(value.name, value.type, value.url, value.description, id);
    const updated = dbRead.prepare(`
      SELECT id, course_id, name, type, url, description, created_at FROM resources WHERE id = ?
    `).get(id);
    invalidateFilterCache();
    res.json({ code: 0, data: rowToResource(updated), message: '资源更新成功' });
  } catch (err) { serverError(res, err); }
});

/** 删除教学资源：仅课程所属教师本人（可写句柄 dbWrite，外键约束已开启） */
app.delete('/api/resources/:id', requireAuth, requireRole('teacher'), (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return badRequest(res, 'id 参数格式错误');
    const row = dbRead.prepare('SELECT id, course_id FROM resources WHERE id = ?').get(id);
    if (!row) return notFound(res, '资源不存在');
    const course = getCourseRow(row.course_id);
    if (!course || req.auth.teacherId !== course.teacher_id) return forbidden(res);

    dbWrite.prepare('DELETE FROM resources WHERE id = ?').run(id);
    invalidateFilterCache();
    res.json({ code: 0, data: { id }, message: '资源已删除' });
  } catch (err) { serverError(res, err); }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ---------------- 教学评价（Sprint3） ---------------- */

function rowToEvaluation(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseName: row.course_name,
    teacherId: row.teacher_id,
    teacher: row.teacher_name,
    semester: row.semester,
    evaluatorRole: row.evaluator_role,
    score: row.score,
    comment: row.comment,
    evaluatedAt: row.evaluated_at
  };
}

/**
 * 课程历史评价记录查询（用户故事1：督导只读查阅）。
 * 权限：督导/主任可查全部；教师仅能查本人授课课程（teacherId 服务端强制）。
 * 查询参数：courseId / teacherId / semester / evaluatorRole，全部经白名单校验。
 */
app.get('/api/evaluations', requireAuth, (req, res) => {
  try {
    const errMsg = validateEvaluationQuery(req.query);
    if (errMsg) return badRequest(res, errMsg);

    const { courseId, semester, evaluatorRole } = req.query;
    const teacherId = req.auth.role === 'teacher' ? req.auth.teacherId : req.query.teacherId;

    const where = [];
    const params = [];
    if (courseId) { where.push('e.course_id = ?'); params.push(courseId); }
    if (teacherId) { where.push('e.teacher_id = ?'); params.push(teacherId); }
    if (semester) { where.push('e.semester = ?'); params.push(semester); }
    if (evaluatorRole) { where.push('e.evaluator_role = ?'); params.push(evaluatorRole); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = dbRead.prepare(`
      SELECT e.id, e.course_id, e.teacher_id, e.semester, e.evaluator_role, e.score, e.comment, e.evaluated_at,
             c.code AS course_code, c.name AS course_name, t.name AS teacher_name
      FROM evaluations e
      JOIN courses c ON e.course_id = c.id
      JOIN teachers t ON e.teacher_id = t.id
      ${whereSql}
      ORDER BY e.semester DESC, e.evaluated_at DESC, e.id ASC
      LIMIT 500
    `).all(...params);
    res.json({ code: 0, data: rows.map(rowToEvaluation), total: rows.length });
  } catch (err) { serverError(res, err); }
});

/**
 * 课程评价汇总简表导出（用户故事2：主任导出 CSV）。
 * 权限：仅主任；督导/教师访问返回 403。
 * 查询参数：semester / college（可选，白名单校验），返回带 BOM 的 CSV 供 Excel 直接打开。
 */
app.get('/api/evaluations/export', requireAuth, requireRole('director'), (req, res) => {
  try {
    const errMsg = validateEvaluationQuery(req.query);
    if (errMsg) return badRequest(res, errMsg);
    const { semester, college } = req.query;

    const where = [];
    const params = [];
    if (semester) { where.push('c.semester = ?'); params.push(semester); }
    if (college) { where.push('c.college = ?'); params.push(college); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = dbRead.prepare(`
      SELECT c.code, c.name, c.semester, c.college, t.name AS teacher_name,
             COUNT(e.id) AS evalCount,
             ROUND(AVG(e.score), 1) AS avgScore,
             ROUND(AVG(CASE WHEN e.evaluator_role = '学生' THEN e.score END), 1) AS studentAvg,
             ROUND(AVG(CASE WHEN e.evaluator_role = '督导' THEN e.score END), 1) AS supervisorAvg,
             ROUND(AVG(CASE WHEN e.evaluator_role = '同行' THEN e.score END), 1) AS peerAvg
      FROM courses c
      JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN evaluations e ON e.course_id = c.id
      ${whereSql}
      GROUP BY c.id
      ORDER BY c.semester DESC, c.code ASC
    `).all(...params);

    const csvEscape = v => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = '课程代码,课程名称,授课教师,学期,学院,评价条数,平均分,学生均分,督导均分,同行均分';
    const lines = rows.map(r => [
      r.code, r.name, r.teacher_name, r.semester, r.college,
      r.evalCount, r.avgScore ?? '', r.studentAvg ?? '', r.supervisorAvg ?? '', r.peerAvg ?? ''
    ].map(csvEscape).join(','));
    // BOM 保证 Excel 正确识别 UTF-8 中文
    const csv = '﻿' + [header, ...lines].join('\r\n');

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="evaluation-summary-${stamp}.csv"`);
    res.send(csv);
  } catch (err) { serverError(res, err); }
});

/**
 * 各课程资源数量统计（用户故事3：主任统计）。
 * 权限：仅主任；其余角色 403。
 */
app.get('/api/stats/course-resources', requireAuth, requireRole('director'), (req, res) => {
  try {
    const rows = dbRead.prepare(`
      SELECT c.id AS courseId, c.code, c.name, c.semester, c.college,
             t.name AS teacher, COUNT(r.id) AS resourceCount
      FROM courses c
      JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN resources r ON r.course_id = c.id
      GROUP BY c.id
      ORDER BY resourceCount DESC, c.code ASC
    `).all();
    res.json({ code: 0, data: rows });
  } catch (err) { serverError(res, err); }
});

/**
 * 教师课程评价统计分数（用户故事4：教师查看本人课程评价统计）。
 * 权限：教师仅能查看本人（req.auth.teacherId === :id，否则 403）；主任/督导可查任意教师。
 * 返回：总体均分 + 分课程/分评价者角色均分。
 */
app.get('/api/teachers/:id/evaluation-stats', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return badRequest(res, 'id 参数格式错误');
    if (req.auth.role === 'teacher' && req.auth.teacherId !== id) return forbidden(res);
    const exists = dbRead.prepare('SELECT 1 FROM teachers WHERE id = ?').get(id);
    if (!exists) return notFound(res, '教师不存在');

    const overall = dbRead.prepare(`
      SELECT COUNT(*) AS evalCount, ROUND(AVG(score), 1) AS avgScore
      FROM evaluations WHERE teacher_id = ?
    `).get(id);

    const byCourse = dbRead.prepare(`
      SELECT c.id AS courseId, c.code, c.name, c.semester,
             COUNT(e.id) AS evalCount,
             ROUND(AVG(e.score), 1) AS avgScore,
             ROUND(AVG(CASE WHEN e.evaluator_role = '学生' THEN e.score END), 1) AS studentAvg,
             ROUND(AVG(CASE WHEN e.evaluator_role = '督导' THEN e.score END), 1) AS supervisorAvg,
             ROUND(AVG(CASE WHEN e.evaluator_role = '同行' THEN e.score END), 1) AS peerAvg
      FROM courses c
      LEFT JOIN evaluations e ON e.course_id = c.id
      WHERE c.teacher_id = ?
      GROUP BY c.id
      ORDER BY c.semester DESC, c.code ASC
    `).all(id);

    res.json({ code: 0, data: { teacherId: id, overall, byCourse } });
  } catch (err) { serverError(res, err); }
});

// 仅直接执行时启动服务，被测试 require 时不启动（避免端口冲突）
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`爱教学服务已启动: http://localhost:${PORT}`);
  });
}

module.exports = app;
