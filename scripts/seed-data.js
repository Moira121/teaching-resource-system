/**
 * 种子数据：与建表逻辑分离，避免 init-db 脚本出现超长数据行。
 * Sprint2 新增 resources（教学资源）种子数据。
 */

const teachers = [
  { id: 'T001', name: '张明', title: '教授', college: '计算机科学与工程学院', department: '软件工程教研室' },
  { id: 'T002', name: '李华', title: '副教授', college: '计算机科学与工程学院', department: '软件工程教研室' },
  { id: 'T003', name: '王芳', title: '讲师', college: '计算机科学与工程学院', department: '计算机基础教研室' },
  { id: 'T004', name: '赵强', title: '副教授', college: '信息科学与工程学院', department: '通信工程教研室' },
  { id: 'T005', name: '陈丽', title: '教授', college: '信息科学与工程学院', department: '电子信息教研室' },
  { id: 'T006', name: '刘伟', title: '讲师', college: '软件学院', department: '软件技术教研室' },
  { id: 'T007', name: '孙静', title: '副教授', college: '软件学院', department: '数字媒体教研室' }
];

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

/**
 * 教学资源：课程配套的课件/文档/视频/链接/作业等。
 * type 取值：课件 / 文档 / 视频 / 链接 / 作业
 * url 为本地演示资源页（public/resources/ 下真实 HTML，点击可显示），
 * 由 scripts/build-demo-resources.js 生成。
 */
const resources = [
  { id: 'R001', courseId: 'C001', name: '软件工程导论-教学大纲.pdf', type: '文档', url: '/resources/se101/syllabus.html', description: '课程目标、进度与考核方式说明' },
  { id: 'R002', courseId: 'C001', name: '第1章 软件工程概述（课件）', type: '课件', url: '/resources/se101/ch01.html', description: '' },
  { id: 'R003', courseId: 'C001', name: '需求分析作业模板', type: '作业', url: '/resources/se101/homework-template.html', description: '第一次大作业使用' },
  { id: 'R004', courseId: 'C002', name: '数据结构与算法-教学大纲.pdf', type: '文档', url: '/resources/se201/syllabus.html', description: '' },
  { id: 'R005', courseId: 'C002', name: '第3章 栈与队列（课件）', type: '课件', url: '/resources/se201/ch03.html', description: '' },
  { id: 'R006', courseId: 'C002', name: '排序算法可视化演示', type: '视频', url: '/resources/se201/sort-demo.html', description: '快速排序/归并排序过程演示' },
  { id: 'R007', courseId: 'C003', name: '数据库系统原理-教学大纲.pdf', type: '文档', url: '/resources/se301/syllabus.html', description: '' },
  { id: 'R008', courseId: 'C003', name: 'SQL 上机实验指导书', type: '文档', url: '/resources/se301/sql-lab.html', description: '共 4 次上机实验' },
  { id: 'R009', courseId: 'C004', name: '计算机基础-电子课件合集', type: '课件', url: '/resources/cs101/slides.html', description: '' },
  { id: 'R010', courseId: 'C005', name: 'Python 入门微课视频', type: '视频', url: '/resources/cs202/intro.html', description: '环境搭建与第一个程序' },
  { id: 'R011', courseId: 'C006', name: '通信原理-教学大纲.pdf', type: '文档', url: '/resources/ce101/syllabus.html', description: '' },
  { id: 'R012', courseId: 'C006', name: '奈奎斯特与香农公式推导', type: '链接', url: '/resources/ce101/derivation.html', description: '课外阅读材料' },
  { id: 'R013', courseId: 'C008', name: '软件测试技术-实验指导书', type: '文档', url: '/resources/st101/lab.html', description: '' },
  { id: 'R014', courseId: 'C010', name: '软件项目管理-案例库', type: '链接', url: '/resources/se401/cases.html', description: '典型项目管理案例分析' },
  { id: 'R015', courseId: 'C012', name: '自动化测试框架演示视频', type: '视频', url: '/resources/st201/demo.html', description: '' }
];

module.exports = { teachers, courses, resources };
