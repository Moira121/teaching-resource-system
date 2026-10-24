/**
 * 数据库建库模块（可被测试复用）：
 * 每个测试用例可调用 initDatabase(独立临时路径) 创建全新实例，用完销毁，
 * 避免 better-sqlite3 原生句柄在并发场景下的随机 SIGSEGV。
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { teachers, courses, resources, evaluations } = require('./seed-data');

/** 清理主库及可能残留的 WAL/SHM 文件 */
function removeDbFiles(dbPath) {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = dbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

/**
 * 在指定路径创建全新数据库（建表 + 索引 + 种子数据）。
 * @param {string} dbPath 数据库文件绝对路径
 * @returns {Database} 已写入数据且已关闭前的实例（调用方负责 close）
 */
function initDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  removeDbFiles(dbPath);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      college TEXT NOT NULL,
      department TEXT NOT NULL
    );

    CREATE TABLE courses (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      credit REAL NOT NULL,
      hours INTEGER NOT NULL,
      semester TEXT NOT NULL,
      college TEXT NOT NULL,
      department TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      student_count INTEGER NOT NULL,
      classroom TEXT NOT NULL,
      schedule TEXT NOT NULL,
      category TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    );

    CREATE TABLE resources (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT '链接',
      url TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE evaluations (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      semester TEXT NOT NULL,
      evaluator_role TEXT NOT NULL,
      score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
      comment TEXT NOT NULL DEFAULT '',
      evaluated_at TEXT NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    );

    CREATE INDEX idx_courses_teacher ON courses(teacher_id);
    CREATE INDEX idx_courses_semester ON courses(semester);
    CREATE INDEX idx_courses_college ON courses(college);
    CREATE INDEX idx_courses_department ON courses(department);
    CREATE INDEX idx_courses_category ON courses(category);
    CREATE INDEX idx_resources_course ON resources(course_id);
    CREATE INDEX idx_evaluations_course ON evaluations(course_id);
    CREATE INDEX idx_evaluations_teacher ON evaluations(teacher_id);
    CREATE INDEX idx_evaluations_semester ON evaluations(semester);
  `);

  const insertTeacher = db.prepare(`
    INSERT INTO teachers (id, name, title, college, department)
    VALUES (@id, @name, @title, @college, @department)
  `);
  const insertCourse = db.prepare(`
    INSERT INTO courses (id, code, name, credit, hours, semester, college, department,
                         teacher_id, student_count, classroom, schedule, category)
    VALUES (@id, @code, @name, @credit, @hours, @semester, @college, @department,
            @teacherId, @studentCount, @classroom, @schedule, @category)
  `);
  const insertResource = db.prepare(`
    INSERT INTO resources (id, course_id, name, type, url, description)
    VALUES (@id, @courseId, @name, @type, @url, @description)
  `);
  const insertEvaluation = db.prepare(`
    INSERT INTO evaluations (id, course_id, teacher_id, semester, evaluator_role, score, comment, evaluated_at)
    VALUES (@id, @courseId, @teacherId, @semester, @evaluatorRole, @score, @comment, @evaluatedAt)
  `);

  const insertAll = db.transaction(() => {
    for (const t of teachers) insertTeacher.run(t);
    for (const c of courses) insertCourse.run(c);
    for (const r of resources) insertResource.run(r);
    for (const e of evaluations) insertEvaluation.run(e);
  });
  insertAll();

  return db;
}

module.exports = { initDatabase, removeDbFiles };
