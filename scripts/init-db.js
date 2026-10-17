const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'teaching.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}
const walPath = DB_PATH + '-wal';
const shmPath = DB_PATH + '-shm';
if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

const db = new Database(DB_PATH);
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

  CREATE INDEX idx_courses_teacher ON courses(teacher_id);
  CREATE INDEX idx_courses_semester ON courses(semester);
  CREATE INDEX idx_courses_college ON courses(college);
  CREATE INDEX idx_courses_department ON courses(department);
  CREATE INDEX idx_courses_category ON courses(category);
`);

const insertTeacher = db.prepare(`
  INSERT INTO teachers (id, name, title, college, department)
  VALUES (@id, @name, @title, @college, @department)
`);

const teachers = [
  { id: 'T001', name: '张明', title: '教授', college: '计算机科学与工程学院', department: '软件工程教研室' },
  { id: 'T002', name: '李华', title: '副教授', college: '计算机科学与工程学院', department: '软件工程教研室' },
  { id: 'T003', name: '王芳', title: '讲师', college: '计算机科学与工程学院', department: '计算机基础教研室' },
  { id: 'T004', name: '赵强', title: '副教授', college: '信息科学与工程学院', department: '通信工程教研室' },
  { id: 'T005', name: '陈丽', title: '教授', college: '信息科学与工程学院', department: '电子信息教研室' },
  { id: 'T006', name: '刘伟', title: '讲师', college: '软件学院', department: '软件技术教研室' },
  { id: 'T007', name: '孙静', title: '副教授', college: '软件学院', department: '数字媒体教研室' }
];

const insertCourse = db.prepare(`
  INSERT INTO courses (id, code, name, credit, hours, semester, college, department, teacher_id, student_count, classroom, schedule, category)
  VALUES (@id, @code, @name, @credit, @hours, @semester, @college, @department, @teacherId, @studentCount, @classroom, @schedule, @category)
`);

const courses = [
  { id: 'C001', code: 'SE101', name: '软件工程导论', credit: 3, hours: 48, semester: '2025-2026-1', college: '计算机科学与工程学院', department: '软件工程教研室', teacherId: 'T001', studentCount: 90, classroom: '教学楼A301', schedule: '周一 1-2节, 周三 3-4节', category: '必修' },
  { id: 'C002', code: 'SE201', name: '数据结构与算法', credit: 4, hours: 64, semester: '2025-2026-1', college: '计算机科学与工程学院', department: '软件工程教研室', teacherId: 'T001', studentCount: 85, classroom: '教学楼A202', schedule: '周二 1-2节, 周四 3-4节', category: '必修' },
  { id: 'C003', code: 'SE301', name: '数据库系统原理', credit: 3.5, hours: 56, semester: '2025-2026-1', college: '计算机科学与工程学院', department: '软件工程教研室', teacherId: 'T002', studentCount: 88, classroom: '教学楼B101', schedule: '周一 3-4节, 周五 1-2节', category: '必修' },
  { id: 'C004', code: 'CS101', name: '计算机基础', credit: 2, hours: 32, semester: '2025-2026-1', college: '计算机科学与工程学院', department: '计算机基础教研室', teacherId: 'T003', studentCount: 120, classroom: '教学楼C101', schedule: '周三 1-2节', category: '必修' },
  { id: 'C005', code: 'CS202', name: 'Python程序设计', credit: 2.5, hours: 40, semester: '2025-2026-1', college: '计算机科学与工程学院', department: '计算机基础教研室', teacherId: 'T003', studentCount: 95, classroom: '机房301', schedule: '周二 3-4节', category: '选修' },
  { id: 'C006', code: 'CE101', name: '通信原理', credit: 4, hours: 64, semester: '2025-2026-1', college: '信息科学与工程学院', department: '通信工程教研室', teacherId: 'T004', studentCount: 70, classroom: '教学楼D201', schedule: '周一 5-6节, 周三 1-2节', category: '必修' },
  { id: 'C007', code: 'EI101', name: '电子信息工程导论', credit: 2, hours: 32, semester: '2025-2026-1', college: '信息科学与工程学院', department: '电子信息教研室', teacherId: 'T005', studentCount: 100, classroom: '教学楼D101', schedule: '周四 1-2节', category: '必修' },
  { id: 'C008', code: 'ST101', name: '软件测试技术', credit: 2.5, hours: 40, semester: '2025-2026-1', college: '软件学院', department: '软件技术教研室', teacherId: 'T006', studentCount: 60, classroom: '教学楼E201', schedule: '周二 5-6节', category: '必修' },
  { id: 'C009', code: 'DM101', name: '数字媒体技术', credit: 2, hours: 32, semester: '2025-2026-1', college: '软件学院', department: '数字媒体教研室', teacherId: 'T007', studentCount: 55, classroom: '教学楼E301', schedule: '周三 5-6节', category: '选修' },
  { id: 'C010', code: 'SE401', name: '软件项目管理', credit: 2, hours: 32, semester: '2025-2026-2', college: '计算机科学与工程学院', department: '软件工程教研室', teacherId: 'T002', studentCount: 80, classroom: '教学楼A302', schedule: '周一 1-2节', category: '必修' },
  { id: 'C011', code: 'CE201', name: '移动通信', credit: 3, hours: 48, semester: '2025-2026-2', college: '信息科学与工程学院', department: '通信工程教研室', teacherId: 'T004', studentCount: 65, classroom: '教学楼D202', schedule: '周二 1-2节, 周四 1-2节', category: '选修' },
  { id: 'C012', code: 'ST201', name: '自动化测试', credit: 2.5, hours: 40, semester: '2025-2026-2', college: '软件学院', department: '软件技术教研室', teacherId: 'T006', studentCount: 50, classroom: '机房401', schedule: '周三 3-4节', category: '选修' }
];

const insertMany = db.transaction(() => {
  for (const t of teachers) insertTeacher.run(t);
  for (const c of courses) insertCourse.run(c);
});
insertMany();

const teacherCount = db.prepare('SELECT COUNT(*) as c FROM teachers').get().c;
const courseCount = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
console.log(`数据库初始化成功：${teacherCount} 位教师，${courseCount} 门课程`);
console.log(`数据库文件：${DB_PATH}`);

db.close();
