/**
 * 数据库初始化 CLI：npm run init-db
 * 建库逻辑见 scripts/db-init.js，种子数据见 scripts/seed-data.js。
 */
const path = require('path');
const { initDatabase } = require('./db-init');

const DB_PATH = path.join(__dirname, '..', 'data', 'teaching.db');

const db = initDatabase(DB_PATH);
const teacherCount = db.prepare('SELECT COUNT(*) AS c FROM teachers').get().c;
const courseCount = db.prepare('SELECT COUNT(*) AS c FROM courses').get().c;
const resourceCount = db.prepare('SELECT COUNT(*) AS c FROM resources').get().c;
const evaluationCount = db.prepare('SELECT COUNT(*) AS c FROM evaluations').get().c;
db.close();

console.log(`数据库初始化成功：${teacherCount} 位教师，${courseCount} 门课程，${resourceCount} 条教学资源，${evaluationCount} 条教学评价`);
console.log(`数据库文件：${DB_PATH}`);
