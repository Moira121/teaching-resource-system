const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

let compression = null;
try { compression = require('compression'); } catch (_) {}
if (compression) app.use(compression());

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

const DB_PATH = path.join(__dirname, 'data', 'teaching.db');
if (!fs.existsSync(DB_PATH)) {
  console.error('数据库不存在，请先运行 npm run init-db');
  process.exit(1);
}
const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

let filterOptionsCache = null;

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
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    college: row.college,
    department: row.department
  };
}

function escapeLikeKeyword(keyword) {
  return String(keyword).replace(/#/g, '##').replace(/%/g, '#%').replace(/_/g, '#_');
}

function serverError(res, err) {
  console.error('[server error]', err && err.stack || err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
}

app.get('/api/teachers', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM teachers ORDER BY id').all();
    res.json({ code: 0, data: rows.map(rowToTeacher) });
  } catch (err) { serverError(res, err); }
});

app.get('/api/teachers/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ code: 404, message: '教师不存在' });
    res.json({ code: 0, data: rowToTeacher(row) });
  } catch (err) { serverError(res, err); }
});

app.get('/api/courses', (req, res) => {
  try {
    const { keyword, semester, college, department, category, teacherId } = req.query;
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

    if (keyword) {
      const kw = escapeLikeKeyword(keyword);
      const like = "LIKE ? ESCAPE '#'";
      const kwSql = `(${['c.name', 'c.code', 't.name'].map(col => `${col} ${like}`).join(' OR ')})`;
      fromSql += ` AND ${kwSql}`;
      const kwParam = `%${kw}%`;
      params.push(kwParam, kwParam, kwParam);
    }

    const countSql = `SELECT COUNT(*) as c ${fromSql}`;
    const total = db.prepare(countSql).get(...params).c;

    const rows = db.prepare(`
      SELECT c.*, t.name as teacher_name, t.title as teacher_title
      ${fromSql}
      ORDER BY c.semester DESC, c.college ASC, c.code ASC
      LIMIT ? OFFSET ?
    `).all(...params, size, (pageNum - 1) * size);

    res.json({
      code: 0,
      data: rows.map(rowToCourse),
      total,
      page: pageNum,
      pageSize: size
    });
  } catch (err) { serverError(res, err); }
});

app.get('/api/courses/:id', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT c.*, t.name as teacher_name, t.title as teacher_title, t.college as teacher_college
      FROM courses c JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!row) return res.status(404).json({ code: 404, message: '课程不存在' });

    const course = rowToCourse(row);
    course.teacherCollege = row.teacher_college;
    res.json({ code: 0, data: course });
  } catch (err) { serverError(res, err); }
});

app.get('/api/teachers/:id/courses', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*, t.name as teacher_name
      FROM courses c JOIN teachers t ON c.teacher_id = t.id
      WHERE c.teacher_id = ?
      ORDER BY c.semester DESC, c.code ASC
    `).all(req.params.id);
    res.json({ code: 0, data: rows.map(rowToCourse) });
  } catch (err) { serverError(res, err); }
});

app.get('/api/stats', (req, res) => {
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

app.get('/api/teachers/:id/stats', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT
        COUNT(*) AS courseCount,
        COALESCE(SUM(student_count), 0) AS studentTotal,
        COALESCE(SUM(hours), 0) AS hoursTotal
      FROM courses WHERE teacher_id = ?
    `).get(req.params.id);
    res.json({ code: 0, data: row });
  } catch (err) { serverError(res, err); }
});

app.get('/api/filter-options', (req, res) => {
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`爱教学 Sprint1 服务已启动: http://localhost:${PORT}`);
});
