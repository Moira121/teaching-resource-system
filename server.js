/**
 * 爱教学平台服务端
 * Sprint1：课程信息查询（分页/搜索转义/合并统计/只读查询）
 * Sprint2：三角色后端鉴权 + 教学资源模块（教师可管理本人课程资源）
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { issueToken, requireAuth, requireRole, ROLES } = require('./lib/auth');
const { validId, validateListQuery, validateResourceBody } = require('./lib/validate');

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
// Sprint2 存在教师写入资源的合法场景，数据库以读写方式打开；
// 写操作仅限鉴权后的资源接口，其余接口全部为只读查询。
const db = new Database(DB_PATH);
db.pragma('busy_timeout = 5000');

let filterOptionsCache = null;

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

/** 取课程原始行（含 teacher_id，用于归属校验） */
function getCourseRow(courseId) {
  return db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
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
      const row = db.prepare('SELECT * FROM teachers WHERE id = ?').get(teacherId);
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
    const rows = db.prepare('SELECT id, name, title FROM teachers ORDER BY id').all();
    res.json({ code: 0, data: rows });
  } catch (err) { serverError(res, err); }
});

/* ---------------- 教师 ---------------- */

/** 教师列表仅主任/督导可见（督导按教师确定听课对象） */
app.get('/api/teachers', requireAuth, requireRole('director', 'supervisor'), (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM teachers ORDER BY id').all();
    res.json({ code: 0, data: rows.map(rowToTeacher) });
  } catch (err) { serverError(res, err); }
});

/** 教师仅可查本人；主任/督导可查任意教师 */
app.get('/api/teachers/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return badRequest(res, 'id 参数格式错误');
    if (req.auth.role === 'teacher' && req.auth.teacherId !== id) return forbidden(res);
    const row = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
    if (!row) return notFound(res, '教师不存在');
    res.json({ code: 0, data: rowToTeacher(row) });
  } catch (err) { serverError(res, err); }
});

app.get('/api/teachers/:id/stats', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return badRequest(res, 'id 参数格式错误');
    if (req.auth.role === 'teacher' && req.auth.teacherId !== id) return forbidden(res);
    const exists = db.prepare('SELECT 1 FROM teachers WHERE id = ?').get(id);
    if (!exists) return notFound(res, '教师不存在');
    const row = db.prepare(`
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
 * 课程列表（分页 + 多条件筛选）。
 * 权限：教师身份强制只返回本人课程（忽略客户端 teacherId）；主任/督导可全量筛选。
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

    const joinSql = 'FROM courses c JOIN teachers t ON c.teacher_id = t.id';
    let fromSql = where.length ? `${joinSql} WHERE ${where.join(' AND ')}` : joinSql;

    // 通配符转义，防止 % / _ 造成超范围匹配
    if (keyword) {
      const kw = escapeLikeKeyword(keyword);
      const like = "LIKE ? ESCAPE '#'";
      const kwSql = `(${['c.name', 'c.code', 't.name'].map(col => `${col} ${like}`).join(' OR ')})`;
      fromSql += ` AND ${kwSql}`;
      const kwParam = `%${kw}%`;
      params.push(kwParam, kwParam, kwParam);
    }

    const total = db.prepare(`SELECT COUNT(*) AS c ${fromSql}`).get(...params).c;
    const rows = db.prepare(`
      SELECT c.*, t.name AS teacher_name, t.title AS teacher_title
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
    const row = db.prepare(`
      SELECT c.*, t.name AS teacher_name, t.title AS teacher_title, t.college AS teacher_college
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
    const row = db.prepare(`
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

/** 筛选项（进程内缓存），所有登录角色可用 */
app.get('/api/filter-options', requireAuth, (req, res) => {
  try {
    if (filterOptionsCache) return res.json({ code: 0, data: filterOptionsCache });
    const semesters = db.prepare('SELECT DISTINCT semester FROM courses ORDER BY semester DESC').all().map(r => r.semester);
    const colleges = db.prepare('SELECT DISTINCT college FROM courses ORDER BY college').all().map(r => r.college);
    const departments = db.prepare('SELECT DISTINCT department FROM courses ORDER BY department').all().map(r => r.department);
    const categories = db.prepare('SELECT DISTINCT category FROM courses').all().map(r => r.category);
    filterOptionsCache = { semesters, colleges, departments, categories };
    res.json({ code: 0, data: filterOptionsCache });
  } catch (err) { serverError(res, err); }
});

/* ---------------- 教学资源（Sprint2） ---------------- */

/**
 * 查询某课程的教学资源列表。
 * 权限：教师仅能查看本人授课课程的资源；主任/督导可查看任意课程（只读）。
 */
app.get('/api/courses/:courseId/resources', requireAuth, (req, res) => {
  try {
    const { courseId } = req.params;
    if (!validId(courseId)) return badRequest(res, 'courseId 参数格式错误');
    const course = getCourseRow(courseId);
    if (!course) return notFound(res, '课程不存在');
    if (req.auth.role === 'teacher' && req.auth.teacherId !== course.teacher_id) return forbidden(res);

    const rows = db.prepare('SELECT * FROM resources WHERE course_id = ? ORDER BY created_at DESC, id ASC').all(courseId);
    res.json({ code: 0, data: rows.map(rowToResource) });
  } catch (err) { serverError(res, err); }
});

/**
 * 新增教学资源。
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
    db.prepare(`
      INSERT INTO resources (id, course_id, name, type, url, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, courseId, value.name, value.type, value.url, value.description);

    const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    res.status(201).json({ code: 0, data: rowToResource(row), message: '资源添加成功' });
  } catch (err) { serverError(res, err); }
});

/** 修改教学资源：仅课程所属教师本人 */
app.put('/api/resources/:id', requireAuth, requireRole('teacher'), (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return badRequest(res, 'id 参数格式错误');
    const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    if (!row) return notFound(res, '资源不存在');
    // 资源归属教师需通过其所属课程校验
    const course = getCourseRow(row.course_id);
    if (!course || req.auth.teacherId !== course.teacher_id) return forbidden(res);

    const { value, error } = validateResourceBody(req.body);
    if (error) return badRequest(res, error);

    db.prepare('UPDATE resources SET name = ?, type = ?, url = ?, description = ? WHERE id = ?')
      .run(value.name, value.type, value.url, value.description, id);
    const updated = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    res.json({ code: 0, data: rowToResource(updated), message: '资源更新成功' });
  } catch (err) { serverError(res, err); }
});

/** 删除教学资源：仅课程所属教师本人 */
app.delete('/api/resources/:id', requireAuth, requireRole('teacher'), (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return badRequest(res, 'id 参数格式错误');
    const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    if (!row) return notFound(res, '资源不存在');
    const course = getCourseRow(row.course_id);
    if (!course || req.auth.teacherId !== course.teacher_id) return forbidden(res);

    db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    res.json({ code: 0, data: { id }, message: '资源已删除' });
  } catch (err) { serverError(res, err); }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`爱教学服务已启动: http://localhost:${PORT}`);
});

module.exports = app;
