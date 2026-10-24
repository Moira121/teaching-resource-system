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

/**
 * 教学评价：督导历史查阅 / 主任汇总导出 / 教师本人统计 的数据基础（Sprint3）。
 * evaluatorRole 取值：学生 / 督导 / 同行；score 为百分制 0-100。
 * 覆盖多个学期以支持"历史评价记录"查询演示。
 */
const evaluations = [
  // C001 软件工程导论（T001 张明）
  { id: 'E001', courseId: 'C001', teacherId: 'T001', semester: '2024-2025-1', evaluatorRole: '学生', score: 92.5, comment: '案例丰富，课堂互动多', evaluatedAt: '2025-01-10' },
  { id: 'E002', courseId: 'C001', teacherId: 'T001', semester: '2024-2025-1', evaluatorRole: '督导', score: 90.0, comment: '教学组织规范，建议增加实践比重', evaluatedAt: '2025-01-12' },
  { id: 'E003', courseId: 'C001', teacherId: 'T001', semester: '2024-2025-1', evaluatorRole: '同行', score: 88.0, comment: '内容体系完整', evaluatedAt: '2025-01-15' },
  { id: 'E004', courseId: 'C001', teacherId: 'T001', semester: '2025-2026-1', evaluatorRole: '学生', score: 94.0, comment: '本学期新增项目实训，收获很大', evaluatedAt: '2025-11-05' },
  { id: 'E005', courseId: 'C001', teacherId: 'T001', semester: '2025-2026-1', evaluatorRole: '督导', score: 91.5, comment: '课堂节奏把控好', evaluatedAt: '2025-11-08' },
  // C002 数据结构与算法（T001 张明）
  { id: 'E006', courseId: 'C002', teacherId: 'T001', semester: '2024-2025-2', evaluatorRole: '学生', score: 89.0, comment: '习题讲解细致', evaluatedAt: '2025-06-20' },
  { id: 'E007', courseId: 'C002', teacherId: 'T001', semester: '2024-2025-2', evaluatorRole: '督导', score: 87.5, comment: '板书清晰，建议控制作业量', evaluatedAt: '2025-06-22' },
  { id: 'E008', courseId: 'C002', teacherId: 'T001', semester: '2025-2026-1', evaluatorRole: '学生', score: 91.0, comment: '可视化演示帮助理解', evaluatedAt: '2025-11-10' },
  { id: 'E009', courseId: 'C002', teacherId: 'T001', semester: '2025-2026-1', evaluatorRole: '同行', score: 90.0, comment: '算法推导严谨', evaluatedAt: '2025-11-12' },
  // C003 数据库系统原理（T002 李华）
  { id: 'E010', courseId: 'C003', teacherId: 'T002', semester: '2024-2025-1', evaluatorRole: '学生', score: 85.5, comment: '上机实验安排合理', evaluatedAt: '2025-01-08' },
  { id: 'E011', courseId: 'C003', teacherId: 'T002', semester: '2025-2026-1', evaluatorRole: '学生', score: 88.0, comment: 'SQL 实验指导书很实用', evaluatedAt: '2025-11-06' },
  { id: 'E012', courseId: 'C003', teacherId: 'T002', semester: '2025-2026-1', evaluatorRole: '督导', score: 86.5, comment: '建议加强事务章节案例', evaluatedAt: '2025-11-09' },
  // C010 软件项目管理（T002 李华）
  { id: 'E013', courseId: 'C010', teacherId: 'T002', semester: '2024-2025-2', evaluatorRole: '学生', score: 90.5, comment: '案例库很实用', evaluatedAt: '2025-06-18' },
  { id: 'E014', courseId: 'C010', teacherId: 'T002', semester: '2025-2026-2', evaluatorRole: '学生', score: 92.0, comment: '小组项目形式好', evaluatedAt: '2026-04-15' },
  { id: 'E015', courseId: 'C010', teacherId: 'T002', semester: '2025-2026-2', evaluatorRole: '同行', score: 89.5, comment: '项目管理工具链讲解到位', evaluatedAt: '2026-04-18' },
  // C004 计算机基础（T003 王芳）
  { id: 'E016', courseId: 'C004', teacherId: 'T003', semester: '2024-2025-1', evaluatorRole: '学生', score: 93.0, comment: '零基础也能跟上', evaluatedAt: '2025-01-05' },
  { id: 'E017', courseId: 'C004', teacherId: 'T003', semester: '2025-2026-1', evaluatorRole: '学生', score: 92.0, comment: '课件清晰', evaluatedAt: '2025-11-03' },
  { id: 'E018', courseId: 'C004', teacherId: 'T003', semester: '2025-2026-1', evaluatorRole: '督导', score: 88.5, comment: '大班课堂纪律管理良好', evaluatedAt: '2025-11-05' },
  // C005 Python程序设计（T003 王芳）
  { id: 'E019', courseId: 'C005', teacherId: 'T003', semester: '2025-2026-1', evaluatorRole: '学生', score: 91.5, comment: '微课视频配套好', evaluatedAt: '2025-11-07' },
  { id: 'E020', courseId: 'C005', teacherId: 'T003', semester: '2025-2026-1', evaluatorRole: '同行', score: 87.0, comment: '入门梯度设计合理', evaluatedAt: '2025-11-09' },
  // C006 通信原理（T004 赵强）
  { id: 'E021', courseId: 'C006', teacherId: 'T004', semester: '2024-2025-2', evaluatorRole: '学生', score: 84.0, comment: '公式推导较难，希望多些例题', evaluatedAt: '2025-06-15' },
  { id: 'E022', courseId: 'C006', teacherId: 'T004', semester: '2025-2026-1', evaluatorRole: '学生', score: 86.0, comment: '本学期增加推导材料后有改善', evaluatedAt: '2025-11-11' },
  { id: 'E023', courseId: 'C006', teacherId: 'T004', semester: '2025-2026-1', evaluatorRole: '督导', score: 85.0, comment: '理论深度够，互动可加强', evaluatedAt: '2025-11-13' },
  // C011 移动通信（T004 赵强）
  { id: 'E024', courseId: 'C011', teacherId: 'T004', semester: '2025-2026-2', evaluatorRole: '学生', score: 87.5, comment: '结合 5G 案例新颖', evaluatedAt: '2026-04-10' },
  { id: 'E025', courseId: 'C011', teacherId: 'T004', semester: '2025-2026-2', evaluatorRole: '同行', score: 86.5, comment: '前沿内容引入恰当', evaluatedAt: '2026-04-12' },
  // C007 电子信息工程导论（T005 陈丽）
  { id: 'E026', courseId: 'C007', teacherId: 'T005', semester: '2024-2025-1', evaluatorRole: '学生', score: 90.0, comment: '导论课覆盖面广', evaluatedAt: '2025-01-06' },
  { id: 'E027', courseId: 'C007', teacherId: 'T005', semester: '2025-2026-1', evaluatorRole: '学生', score: 89.5, comment: '实验演示直观', evaluatedAt: '2025-11-04' },
  { id: 'E028', courseId: 'C007', teacherId: 'T005', semester: '2025-2026-1', evaluatorRole: '督导', score: 91.0, comment: '教学目标达成度高', evaluatedAt: '2025-11-06' },
  // C008 软件测试技术（T006 刘伟）
  { id: 'E029', courseId: 'C008', teacherId: 'T006', semester: '2024-2025-2', evaluatorRole: '学生', score: 88.5, comment: '实验指导书步骤详细', evaluatedAt: '2025-06-19' },
  { id: 'E030', courseId: 'C008', teacherId: 'T006', semester: '2025-2026-1', evaluatorRole: '学生', score: 90.0, comment: '用例设计方法实用', evaluatedAt: '2025-11-08' },
  { id: 'E031', courseId: 'C008', teacherId: 'T006', semester: '2025-2026-1', evaluatorRole: '同行', score: 89.0, comment: '理论与实践结合紧密', evaluatedAt: '2025-11-10' },
  // C012 自动化测试（T006 刘伟）
  { id: 'E032', courseId: 'C012', teacherId: 'T006', semester: '2025-2026-2', evaluatorRole: '学生', score: 91.0, comment: 'pytest 框架讲解透彻', evaluatedAt: '2026-04-16' },
  { id: 'E033', courseId: 'C012', teacherId: 'T006', semester: '2025-2026-2', evaluatorRole: '督导', score: 88.0, comment: '建议补充性能测试内容', evaluatedAt: '2026-04-19' },
  // C009 数字媒体技术（T007 孙静）
  { id: 'E034', courseId: 'C009', teacherId: 'T007', semester: '2024-2025-1', evaluatorRole: '学生', score: 92.5, comment: '作品导向教学有趣', evaluatedAt: '2025-01-09' },
  { id: 'E035', courseId: 'C009', teacherId: 'T007', semester: '2025-2026-1', evaluatorRole: '学生', score: 93.5, comment: '课堂氛围好', evaluatedAt: '2025-11-05' },
  { id: 'E036', courseId: 'C009', teacherId: 'T007', semester: '2025-2026-1', evaluatorRole: '同行', score: 90.5, comment: '创意引导方法值得推广', evaluatedAt: '2025-11-07' }
];

module.exports = { teachers, courses, resources, evaluations };
