/**
 * 生成演示资源 HTML 文件（详细版）
 * 为 15 条教学资源生成内容详实、可在浏览器直接打开的本地 HTML 页面。
 * 内容按资源类型定制：教学大纲 / 课件 / 作业 / 视频脚本 / 案例与阅读材料。
 */
const fs = require('fs');
const path = require('path');
const { courses, resources } = require('./seed-data');

const BASE_DIR = path.join(__dirname, '..', 'public', 'resources');

/* ---------------- 公共样式 ---------------- */
const STYLE = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;line-height:1.8;color:#2c3e50;max-width:860px;margin:0 auto;padding:28px 20px;background:#f5f7fa}
.page{background:#fff;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden}
.hd{background:linear-gradient(135deg,#1a237e,#3949ab);color:#fff;padding:26px 32px}
.hd h1{font-size:22px;margin-bottom:8px}
.hd .meta{font-size:13px;opacity:.85}
.badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;background:rgba(255,255,255,.2);margin-left:8px;vertical-align:middle}
.bd{padding:26px 32px}
h2{font-size:17px;color:#1a237e;margin:26px 0 10px;padding-left:10px;border-left:4px solid #3949ab}
h2:first-child{margin-top:0}
h3{font-size:15px;color:#283593;margin:16px 0 6px}
p,li{font-size:14px;color:#37474f}
ul,ol{padding-left:22px}
li{margin:4px 0}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
th{background:#e8eaf6;color:#1a237e;padding:8px 10px;text-align:left;border:1px solid #c5cae9}
td{padding:7px 10px;border:1px solid #e0e0e0}
tr:nth-child(even) td{background:#fafbfc}
.note{background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:10px 14px;font-size:13px;color:#6d4c00;margin:12px 0}
.code{background:#263238;color:#eeffff;border-radius:6px;padding:12px 16px;font-family:Consolas,Menlo,monospace;font-size:13px;overflow-x:auto;margin:10px 0;white-space:pre}
.formula{background:#e3f2fd;border-radius:6px;padding:12px 16px;text-align:center;font-size:16px;color:#0d47a1;margin:10px 0;font-family:"Cambria Math",Georgia,serif}
.tag{display:inline-block;font-size:11px;padding:1px 8px;border-radius:10px;background:#e3f2fd;color:#1565c0;margin:0 4px}
.case{border:1px solid #e0e0e0;border-radius:8px;padding:14px 18px;margin:12px 0;background:#fafbfc}
.case h3{margin-top:0}
.ft{padding:16px 32px;background:#fafbfc;border-top:1px solid #eceff1;font-size:12px;color:#90a4ae;text-align:center}
`;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function page(res, course, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(res.name)} — ${esc(course.name)}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="page">
  <div class="hd">
    <h1>${esc(res.name)}<span class="badge">${res.type}</span></h1>
    <div class="meta">课程：${esc(course.name)}（${esc(course.code)}） &nbsp;|&nbsp; ${esc(course.semester)} &nbsp;|&nbsp; 资源编号：${res.id}</div>
  </div>
  <div class="bd">${bodyHtml}</div>
  <div class="ft">爱教学平台 · 课程配套教学资源 · 仅供教学演示使用</div>
</div>
</body>
</html>`;
}

/* ---------------- 各资源详细内容 ---------------- */

/** 通用：教学大纲渲染（支持可选字段：intro / schedule / experiments） */
function renderSyllabus(d) {
  const chapterRows = d.chapters.map(c =>
    `<tr><td>${c.no}</td><td>${esc(c.title)}</td><td>${c.hours}</td><td>${esc(c.points)}</td></tr>`).join('\n');
  const introBlock = d.intro
    ? `<h2>课程简介</h2>\n${d.intro.map(p => `<p>${esc(p)}</p>`).join('\n')}\n`
    : '';
  const scheduleBlock = d.schedule
    ? `\n<h2>教学进度周历</h2>\n<table>\n<tr><th style="width:60px">周次</th><th>教学内容</th><th>课后任务</th></tr>\n${d.schedule.map(w => `<tr><td>${w.week}</td><td>${esc(w.content)}</td><td>${esc(w.task)}</td></tr>`).join('\n')}\n</table>`
    : '';
  const expBlock = d.experiments
    ? `\n<h2>课内实验安排</h2>\n${d.experiments.map(e => `<h3>${esc(e.title)}（${e.hours} 学时）</h3>\n<p>${esc(e.desc)}</p>`).join('\n')}`
    : '';
  return `
${introBlock}
<h2>课程基本信息</h2>
<table>
<tr><th style="width:130px">课程名称</th><td>${esc(d.info.name)}</td><th style="width:110px">学分 / 学时</th><td>${d.info.credit} 学分 / ${d.info.hours} 学时</td></tr>
<tr><th>开课学期</th><td>${esc(d.info.semester)}</td><th>课程类别</th><td>${esc(d.info.category)}</td></tr>
<tr><th>主讲教师</th><td>${esc(d.info.teacher)}</td><th>先修课程</th><td>${esc(d.info.prerequisite)}</td></tr>
</table>

<h2>课程目标</h2>
<ol>
${d.objectives.map(o => `<li>${esc(o)}</li>`).join('\n')}
</ol>

<h2>教学内容与学时分配</h2>
<table>
<tr><th style="width:50px">章次</th><th>教学内容</th><th style="width:60px">学时</th><th>教学要点</th></tr>
${chapterRows}
</table>
${scheduleBlock}

<h2>考核方式</h2>
<table>
<tr><th>考核环节</th><th style="width:90px">占比</th><th>说明</th></tr>
${d.assessment.map(a => `<tr><td>${esc(a.item)}</td><td>${a.pct}</td><td>${esc(a.desc)}</td></tr>`).join('\n')}
</table>
${expBlock}

<h2>教材与参考资料</h2>
<ul>
${d.textbooks.map(t => `<li>${esc(t)}</li>`).join('\n')}
</ul>`;
}

/** 通用：课件渲染 */
function renderSlides(d) {
  return d.sections.map(s => `
<h2>${esc(s.title)}</h2>
${s.paras ? s.paras.map(p => `<p>${esc(p)}</p>`).join('\n') : ''}
${s.list ? `<ul>${s.list.map(i => `<li>${esc(i)}</li>`).join('\n')}</ul>` : ''}
${s.code ? `<div class="code">${esc(s.code)}</div>` : ''}
${s.table ? `<table><tr>${s.table.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${s.table.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('\n')}</table>` : ''}
${s.note ? `<div class="note">${esc(s.note)}</div>` : ''}`).join('\n') + `
<h2>本章小结</h2>
<p>${esc(d.summary)}</p>
<h2>课后练习</h2>
<ol>
${d.exercises.map(e => `<li>${esc(e)}</li>`).join('\n')}
</ol>`;
}

/** 通用：作业渲染 */
function renderHomework(d) {
  return `
<h2>一、作业背景</h2>
<p>${esc(d.background)}</p>
<h2>二、任务要求</h2>
<ol>
${d.tasks.map(t => `<li>${esc(t)}</li>`).join('\n')}
</ol>
<h2>三、提交内容与格式</h2>
<table>
<tr><th>提交物</th><th>格式要求</th><th>命名规范</th></tr>
${d.deliverables.map(x => `<tr><td>${esc(x.item)}</td><td>${esc(x.format)}</td><td>${esc(x.naming)}</td></tr>`).join('\n')}
</table>
<h2>四、评分标准</h2>
<table>
<tr><th>评分项</th><th style="width:80px">分值</th><th>评分说明</th></tr>
${d.rubric.map(r => `<tr><td>${esc(r.item)}</td><td>${r.score}</td><td>${esc(r.desc)}</td></tr>`).join('\n')}
</table>
<div class="note">⏰ 截止时间：${esc(d.deadline)}。逾期提交每天扣 10 分，超过一周不予接收。学术诚信红线：严禁抄袭，一经发现本次作业记 0 分并按学院规定处理。</div>`;
}

/** 通用：视频（脚本/导学）渲染 */
function renderVideo(d) {
  return `
<h2>视频信息</h2>
<table>
<tr><th style="width:110px">时长</th><td>${esc(d.duration)}</td><th style="width:110px">难度</th><td>${esc(d.level)}</td></tr>
<tr><th>配套章节</th><td colspan="3">${esc(d.chapter)}</td></tr>
</table>
<h2>内容时间轴</h2>
<table>
<tr><th style="width:110px">时间点</th><th>内容</th></tr>
${d.timeline.map(t => `<tr><td>▶ ${esc(t.time)}</td><td>${esc(t.content)}</td></tr>`).join('\n')}
</table>
<h2>核心知识点</h2>
<ul>
${d.keyPoints.map(k => `<li>${esc(k)}</li>`).join('\n')}
</ul>
${d.code ? `<h2>演示代码</h2><div class="code">${esc(d.code)}</div>` : ''}
<h2>观看建议</h2>
<ul>
${d.tips.map(t => `<li>${esc(t)}</li>`).join('\n')}
</ul>`;
}

/** 通用：链接 / 案例库渲染 */
function renderLink(d) {
  return d.groups.map(g => `
<h2>${esc(g.title)}</h2>
${g.intro ? `<p>${esc(g.intro)}</p>` : ''}
${g.items.map(it => `
<div class="case">
<h3>${esc(it.title)} <span class="tag">${esc(it.tag)}</span></h3>
<p>${esc(it.desc)}</p>
${it.points ? `<ul>${it.points.map(p => `<li>${esc(p)}</li>`).join('\n')}</ul>` : ''}
</div>`).join('\n')}`).join('\n');
}

/** 通用：实验指导书渲染 */
function renderLab(d) {
  return `
<h2>实验总体说明</h2>
<p>${esc(d.intro)}</p>
${d.labs.map(l => `
<h2>实验 ${l.no}：${esc(l.title)}（${l.hours} 学时）</h2>
<p><strong>实验目的：</strong>${esc(l.goal)}</p>
<h3>实验内容与步骤</h3>
<ol>
${l.steps.map(s => `<li>${esc(s)}</li>`).join('\n')}
</ol>
${l.code ? `<h3>参考示例</h3><div class="code">${esc(l.code)}</div>` : ''}
<h3>验收要求</h3>
<ul>
${l.acceptance.map(a => `<li>${esc(a)}</li>`).join('\n')}
</ul>`).join('\n')}
<h2>实验报告要求</h2>
<ul>
${d.report.map(r => `<li>${esc(r)}</li>`).join('\n')}
</ul>`;
}

/* ---------------- 15 个资源的详细内容数据 ---------------- */

const DETAILS = {
  // C001 软件工程导论 - 教学大纲
  R001: {
    kind: 'syllabus',
    data: {
      info: { name: '软件工程导论', credit: 3, hours: 48, semester: '2025-2026-1', category: '必修', teacher: '张明 教授', prerequisite: '程序设计基础、数据结构' },
      intro: [
        '《软件工程导论》是软件工程专业的学科基础必修课，旨在将学生从"会写程序"引导到"会做软件"。课程以软件生命周期为主线，覆盖需求、设计、实现、测试、维护与项目管理六大知识域，帮助学生建立工程化、系统化、规范化的软件开发观。',
        '课程教学采用"理论讲授 + 课内实验 + 课程作业"三位一体模式：理论课讲授经典方法与模型；2 次课内实验在机房完成需求建模与测试设计实战；4 次课后作业覆盖可行性分析、需求规格说明书、总体设计与测试用例设计，形成完整的小型项目文档链。',
        '通过本课程学习，学生应能理解软件危机的成因与软件工程的对策，掌握结构化分析与设计方法，具备编写规范工程文档的能力，为后续《软件体系结构》《软件项目管理》《软件测试技术》等课程奠定基础。'
      ],
      objectives: [
        '掌握软件工程的基本概念、原理和方法，理解软件生命周期各阶段的任务、方法与产物，能阐述软件危机的表现与工程化对策；',
        '能够运用结构化方法完成中小型软件的需求分析：独立绘制分层数据流图、建立数据字典、编写符合 GB/T 9385 风格的需求规格说明书；',
        '掌握面向数据流的总体设计方法，理解模块化、耦合、内聚等设计原理，能将 DFD 变换为初始结构图并进行启发式优化；',
        '掌握白盒测试（语句/判定/条件覆盖）与黑盒测试（等价类、边界值）用例设计方法，能针对给定程序设计完整测试方案；',
        '了解软件维护的四类活动与软件项目管理的基本内容（进度、风险、配置管理），建立初步的质量意识与团队协作意识。'
      ],
      chapters: [
        { no: 1, title: '软件工程概述', hours: 4, points: '软件危机、软件工程定义、三要素、软件过程模型（瀑布/原型/增量/螺旋/敏捷）' },
        { no: 2, title: '可行性研究与项目计划', hours: 4, points: '技术/经济/操作/法律可行性、成本效益分析、投资回收期计算' },
        { no: 3, title: '需求分析', hours: 8, points: '需求获取技术、数据流图 DFD、数据字典 DD、加工逻辑描述（结构化语言/判定表/判定树）、SRS 编写' },
        { no: 4, title: '总体设计', hours: 6, points: '模块化原理、耦合七级与内聚七级、启发式规则、面向数据流的变换分析与事务分析' },
        { no: 5, title: '详细设计', hours: 4, points: '程序流程图、N-S 盒图、PAD 图、判定表、Jackson 方法简介' },
        { no: 6, title: '编码与实现', hours: 4, points: '程序设计语言选择、编码风格规范、McCabe 环路复杂度度量' },
        { no: 7, title: '软件测试', hours: 8, points: '测试V模型、白盒覆盖准则、等价类划分、边界值分析、单元/集成/确认/系统测试、调试策略' },
        { no: 8, title: '软件维护', hours: 4, points: '改正性/适应性/完善性/预防性维护、可维护性度量、逆向工程与再工程' },
        { no: 9, title: '软件项目管理', hours: 4, points: '规模估算（LOC/FP）、COCOMO 模型、进度计划（Gantt/PERT）、风险管理、配置管理' },
        { no: 10, title: '敏捷开发与 DevOps 简介', hours: 2, points: '敏捷宣言与 Scrum 框架、极限编程实践、CI/CD 流水线概念' }
      ],
      schedule: [
        { week: 1, content: '第1章 软件工程概述（上）：软件危机与软件工程', task: '阅读教材第1章，思考软件危机的成因' },
        { week: 2, content: '第1章（下）：软件过程模型对比', task: '作业1发布：过程模型选型分析' },
        { week: 3, content: '第2章 可行性研究与项目计划', task: '作业1提交' },
        { week: 4, content: '第3章 需求分析：需求获取与建模', task: '作业2发布：需求规格说明书（大作业，4周）' },
        { week: 5, content: '第3章（中）：DFD 绘制实战', task: '完成顶层图与1层图初稿' },
        { week: 6, content: '第3章（下）：数据字典与加工逻辑；实验一：需求建模', task: '实验报告1' },
        { week: 7, content: '第4章 总体设计：模块化与设计原理', task: '完善SRS并提交' },
        { week: 8, content: '第4章（下）：变换分析与事务分析', task: '作业3发布：总体设计' },
        { week: 9, content: '期中复习与答疑', task: '作业3提交；期中测验' },
        { week: 10, content: '第5章 详细设计：图形工具与判定表', task: 'PAD图绘制练习' },
        { week: 11, content: '第6章 编码与实现；代码评审实践', task: '阅读编码规范文档' },
        { week: 12, content: '第7章 软件测试：白盒测试方法', task: '作业4发布：测试用例设计' },
        { week: 13, content: '第7章（中）：黑盒测试方法', task: '等价类划分练习' },
        { week: 14, content: '第7章（下）：测试策略；实验二：测试设计', task: '实验报告2；作业4提交' },
        { week: 15, content: '第8章 软件维护；第9章 项目管理（上）', task: '整理全部作业文档归档' },
        { week: 16, content: '第9章（下）+ 第10章 敏捷简介；总复习', task: '期末复习' }
      ],
      assessment: [
        { item: '平时成绩（出勤+课堂互动）', pct: '10%', desc: '雨课堂签到与随堂测验，旷课3次取消考试资格' },
        { item: '课后作业（4次）', pct: '20%', desc: '作业1过程模型5分、作业2需求规格说明书10分（大作业）、作业3总体设计3分、作业4测试设计2分' },
        { item: '课程实验（2次）', pct: '20%', desc: '实验一需求建模（StarUML）10分、实验二测试设计10分，现场验收+实验报告' },
        { item: '期末考试', pct: '50%', desc: '闭卷笔试120分钟，题型：单选20分、填空10分、简答20分、综合应用50分（DFD/设计/测试各一题）' }
      ],
      experiments: [
        { title: '实验一：需求建模实战', hours: 2, desc: '以"图书馆管理系统"为题，使用 StarUML/Visio 完成上下文图、1层DFD与核心数据字典定义，现场验收建模的正确性与规范性。重点考察父子图平衡、数据流守恒、加工编号规则。' },
        { title: '实验二：测试用例设计', hours: 2, desc: '针对给定的"三角形分类"程序，分别用语句覆盖、判定覆盖、条件覆盖设计白盒用例，再用等价类划分与边界值分析设计黑盒用例，比较两类方法的查错能力差异。' }
      ],
      textbooks: [
        '《软件工程导论（第6版）》，张海藩、牟永敏，清华大学出版社，2013（主教材，作业与考试依据）',
        '《Software Engineering (10th Edition)》，Ian Sommerville，机械工业出版社，2018（英文参考，适合拓展）',
        '《敏捷软件开发：原则、模式与实践》，Robert C. Martin，清华大学出版社（第10章拓展阅读）',
        '《构建之法（第3版）》，邹欣，人民邮电出版社（工程实践与文化拓展，强烈推荐）'
      ]
    }
  },

  // C001 第1章课件
  R002: {
    kind: 'slides',
    data: {
      sections: [
        { title: '1.1 软件与软件危机', paras: ['软件是计算机系统中与硬件相互依存的另一部分，包括程序、数据及其相关文档的完整集合。程序是按事先设计的功能和性能要求执行的指令序列；数据是使程序能正常操纵信息的数据结构；文档是与程序开发、维护和使用有关的图文材料。', '与硬件不同，软件是逻辑实体，具有抽象性、不可见性和不会"磨损"的特点。但软件会"退化"——每次修改都可能引入新的缺陷，使软件结构逐渐腐化。', '1968 年北大西洋公约组织（NATO）在德国加尔米施召开的会议上首次提出"软件危机"（Software Crisis）一词，指软件开发与维护过程中遇到的一系列严重问题。'], list: ['软件危机的典型表现：', '① 开发成本与进度难以准确估算，项目常常严重超支超期；', '② 交付的软件产品常常不能满足用户实际需求；', '③ 软件质量不可靠，缺陷频发，典型案例：Therac-25 放疗设备软件缺陷致多人死亡；', '④ 软件可维护性差，"改一处、坏三处"，维护成本占生命周期总成本的 40%~80%；', '⑤ 缺乏规范文档，人员流动导致知识断层；', '⑥ 软件生产率提升速度远跟不上硬件与需求的增长。'], note: '课堂讨论：软件危机产生的原因是什么？提示：从软件本身特点（复杂性、不可见性、易变性）与开发方法（手工作坊式、轻视需求与维护）两个层面思考。' },
        { title: '1.2 软件工程的定义', paras: ['Fritz Bauer 在 1969 年给出经典定义：软件工程是为了经济地获得能够在实际机器上有效运行的可靠软件而建立和使用的一系列完善的工程化原则。', 'IEEE 610.12 标准定义：软件工程是将系统化的、严格约束的、可量化的方法应用于软件的开发、运行和维护，即将工程化应用于软件；同时也研究这些方法。', 'Boehm 进一步指出：软件工程是运用现代科学技术知识来设计并构造计算机程序及为开发、运行和维护这些程序所必需的相关文件资料。'], note: '记忆要点：软件工程三要素 = 方法（如何做）+ 工具（用什么做）+ 过程（何时做、按什么顺序做）。三者构成"软件工程层次图"的基础。' },
        { title: '1.3 软件工程三要素详解', table: { head: ['要素', '含义', '典型代表'], rows: [['方法', '完成软件工程任务的技术方法，回答"怎么做"', '结构化方法、面向对象方法、形式化方法'], ['工具', '为方法提供自动或半自动支撑的软件环境', 'CASE 工具：StarUML、Git、Jenkins、Jira'], ['过程', '将方法与工具综合起来的框架，规定任务步骤', 'RUP、XP、Scrum、DevOps 流水线']] }, paras: ['三要素相互支撑：没有过程约束的方法会流于随意；没有工具支撑的过程会效率低下；没有方法指导的工具只是空壳。'] },
        { title: '1.4 软件生命周期', list: ['软件定义期：问题定义 → 可行性研究 → 需求分析。回答"做什么"；', '软件开发期：总体设计 → 详细设计 → 编码 → 测试。回答"怎么做"；', '软件维护期：改正性维护、适应性维护、完善性维护、预防性维护。回答"如何改"。'], paras: ['每个阶段都有明确的任务、里程碑与交付物（文档）。软件生命周期模型回答的核心问题是：按什么样的顺序组织这些活动，才能高效、可控地交付软件？'], table: { head: ['维护类型', '占比（约）', '触发原因'], rows: [['完善性维护', '50%', '用户提出新功能与性能改进需求'], ['适应性维护', '25%', '硬件/OS/数据库等运行环境变化'], ['改正性维护', '21%', '修复潜伏的逻辑/性能缺陷'], ['预防性维护', '4%', '为提升可维护性而主动重构']]} },
        { title: '1.5 常见软件过程模型对比', table: { head: ['模型', '核心思想', '优点', '缺点', '适用场景'], rows: [['瀑布模型', '阶段顺序推进、文档驱动、里程碑评审', '过程规范、便于管理与考核', '需求变更代价高，反馈滞后', '需求明确稳定的大型项目'], ['快速原型', '快速构建可运行原型，迭代确认需求', '大幅降低需求误解风险', '原型质量差，易把原型当产品', '需求不明确、用户界面重要的项目'], ['增量模型', '系统分批交付可运行增量', '早期交付核心价值、风险分散', '体系结构需前瞻设计', '人员不足或需分阶段交付'], ['螺旋模型', '迭代 + 每轮风险分析（Boehm 提出）', '风险驱动，适合大型高风险项目', '成本高，依赖风险评估能力', '航空航天、金融核心系统'], ['敏捷开发', '拥抱变化、小步快跑、持续交付', '响应需求变化快，客户参与度高', '文档弱化，依赖团队素质', '互联网产品、需求多变的项目']] } },
        { title: '1.6 案例分析', paras: ['案例 1：某医院信息系统项目，合同额 800 万元，采用瀑布模型开发 18 个月。交付验收时发现挂号流程设计与医院实际"先分诊后挂号"的业务规则不符，需推翻重做需求与设计，返工成本超过初期开发成本的 40%。', '案例 2：某创业团队开发外卖 App，采用 2 周一个迭代的敏捷模式，每个迭代邀请真实商家试用并收集反馈。半年内完成 13 个迭代，产品功能与市场需求高度吻合，顺利获得 A 轮融资。'], list: ['讨论 1：案例 1 如果改用快速原型模型，应在哪个环节引入原型？原型验证后的代码应如何处理（抛弃式 vs 演化式）？', '讨论 2：案例 2 的成功能否说明敏捷模型优于瀑布模型？请从项目规模、需求稳定性、团队构成三个维度分析。', '讨论 3：如果让你为"铁路 12306 售票系统"选择过程模型，你会选哪种？为什么？'] }
      ],
      summary: '本章是全书总纲：软件危机推动了软件工程的诞生；软件工程以方法、工具、过程三要素构建工程化开发体系；软件生命周期划分了从定义到维护的完整阶段；五种过程模型各有优劣与适用边界。核心思想是"没有银弹"（Brooks，1986）——不存在适用于所有项目的万能模型，必须根据项目规模、需求稳定性、团队能力与风险水平进行权衡选择。',
      exercises: [
        '结合你参与过的课程设计项目，分析它更接近哪种过程模型？开发中遇到的最大困难与所选模型是否相关？',
        '为什么说"软件不会磨损，但会退化"？这一特性对软件维护策略有何启示？',
        '查阅资料写出敏捷宣言的 4 条核心价值观与 12 条原则中的任意 4 条，并谈谈你对"工作的软件高于详尽的文档"的理解。',
        '计算题：某项目使用增量模型分 3 批交付，每批工作量分别为 40%、35%、25%。若第 1 批交付后用户提出 10% 的需求变更，估算该变更对总工期的影响（假设变更只影响后续增量）。',
        '拓展：阅读 Brooks《人月神话》中"没有银弹"一章，用自己的话概括"本质困难"与"偶然困难"的区别（300 字以内）。'
      ]
    }
  },

  // C001 需求分析作业模板
  R003: {
    kind: 'homework',
    data: {
      background: '假设你是"校园二手书交易平台"项目的需求分析师。该平台面向全校 2 万名师生，核心目标是解决毕业季教材浪费与教材购置成本高的痛点。平台支持发布求购/出售信息、按课程/ISBN 检索、站内私信沟通、线下当面交易与双向信用评价。学校教务处关心平台是否会冲击教材统一征订渠道，学工部关心交易纠纷的处理机制。你的任务：运用第 3 章所学的结构化需求分析方法，在 4 周内完成该平台的需求规格说明书，并通过需求评审。',
      tasks: [
        '需求获取：设计访谈提纲（至少 8 个开放式问题），分别模拟访谈"毕业生卖家"与"新生买家"两类用户，整理 2 份访谈记录（每份不少于 500 字），归纳出用户的显性需求与隐性需求；',
        '系统边界建模：绘制系统上下文图（顶层 DFD），明确外部实体（学生、教务系统、支付平台）与系统的交互数据流；',
        '功能分解：绘制 1 层数据流图，加工数量控制在 5~7 个，保证与顶层图严格平衡（输入/输出数据流一致）；',
        '数据字典：至少定义 6 个数据流、3 个数据存储、2 个加工的逻辑说明（分别使用结构化语言与判定表各描述 1 个加工）；',
        '编写需求规格说明书（SRS）：按模板完成引言、总体描述、功能需求（FR-01 ~ FR-15）、性能需求、接口需求、约束条件六个章节；',
        '用例补充：选择"发布出售信息""在线沟通议价""交易评价"3 个核心功能，每个用例给出基本流与至少 2 个备选流；',
        '非功能需求：明确响应时间（列表页 < 2s）、并发能力（支持 500 在线）、可用性（99.5%）等可量化指标；',
        '自查与评审：对照课程发布的《需求评审检查单》逐项自查并打勾，随 SRS 一并提交。'
      ],
      deliverables: [
        { item: '需求规格说明书（SRS）', format: 'PDF，按课程模板章节编排，正文 12~15 页，A4 宋体小四', naming: 'SRS-学号-姓名.pdf' },
        { item: 'DFD 建模源文件', format: 'drawio / Visio / StarUML 源文件打包，图清晰可读', naming: 'DFD-学号-姓名.zip' },
        { item: '访谈记录 2 份', format: '并入 SRS 附录 A，含访谈时间/对象/问题/记录', naming: '与 SRS 合并提交' },
        { item: '需求评审检查单', format: '课程平台下载模板，逐项勾选并签名', naming: 'Checklist-学号-姓名.pdf' }
      ],
      rubric: [
        { item: 'DFD 正确性与平衡', score: '30 分', desc: '父子图平衡 10 分、数据流守恒 10 分、加工编号与分解合理性 10 分；出现数据流断流或黑洞加工每处扣 5 分' },
        { item: '数据字典完整性', score: '20 分', desc: '定义格式规范（使用 = + [ ] { } 符号）8 分，覆盖 DFD 全部数据流与存储 8 分，加工逻辑无歧义 4 分' },
        { item: 'SRS 文档质量', score: '25 分', desc: '结构完整 5 分、需求可验证（无二义性词汇如"快速""友好"）10 分、功能需求编号与追踪性 5 分、非功能需求可量化 5 分' },
        { item: '用例描述', score: '15 分', desc: '基本流/备选流划分合理 8 分，前置/后置条件清晰 4 分，异常流覆盖 3 分' },
        { item: '排版与规范', score: '10 分', desc: '图表编号连续、术语表完整、参考文献符合 GB/T 7714 格式' }
      ],
      deadline: '第 8 周周五 23:59（教学平台提交，第 4 周发布，共 4 周完成）'
    }
  },

  // C002 数据结构与算法 - 教学大纲
  R004: {
    kind: 'syllabus',
    data: {
      info: { name: '数据结构与算法', credit: 4, hours: 64, semester: '2025-2026-1', category: '必修', teacher: '张明 教授', prerequisite: 'C 语言程序设计、离散数学' },
      objectives: [
        '掌握线性表、栈、队列、树、图等基本数据结构的逻辑结构、存储结构与运算实现；',
        '熟练掌握排序与查找的经典算法，能进行时间/空间复杂度分析；',
        '能够根据实际问题选择合适的数据结构并设计高效算法；',
        '通过上机实践培养算法实现与调试能力。'
      ],
      chapters: [
        { no: 1, title: '绪论', hours: 4, points: '数据结构基本概念、算法复杂度分析、大 O 记号' },
        { no: 2, title: '线性表', hours: 8, points: '顺序表、单链表、双向链表、循环链表' },
        { no: 3, title: '栈与队列', hours: 8, points: '栈的应用（表达式求值、递归）、循环队列、链队列' },
        { no: 4, title: '串、数组与广义表', hours: 4, points: 'KMP 模式匹配、稀疏矩阵压缩存储' },
        { no: 5, title: '树与二叉树', hours: 10, points: '遍历、线索二叉树、哈夫曼树、二叉搜索树' },
        { no: 6, title: '图', hours: 10, points: '邻接矩阵/邻接表、DFS/BFS、最小生成树、最短路径、拓扑排序' },
        { no: 7, title: '查找', hours: 8, points: '折半查找、B 树/B+ 树、散列表与冲突处理' },
        { no: 8, title: '排序', hours: 8, points: '插入、交换、选择、归并、基数排序及稳定性分析' },
        { no: 9, title: '算法设计策略初步', hours: 4, points: '分治、动态规划、贪心、回溯' }
      ],
      assessment: [
        { item: '平时成绩', pct: '20%', desc: '课后习题 + 课堂测验（雨课堂）' },
        { item: '上机实验', pct: '30%', desc: '6 次实验，OJ 平台在线评测，含查重' },
        { item: '期末考试', pct: '50%', desc: '闭卷，算法设计与分析题占比不低于 50%' }
      ],
      textbooks: [
        '《数据结构（C 语言版 第 2 版）》，严蔚敏、李冬梅，人民邮电出版社（主教材）',
        '《算法导论（原书第 3 版）》，Cormen 等，机械工业出版社（参考）',
        '《大话数据结构》，程杰，清华大学出版社（入门拓展）'
      ]
    }
  },

  // C002 第3章 栈与队列 课件
  R005: {
    kind: 'slides',
    data: {
      sections: [
        { title: '3.1 栈的定义与抽象数据类型', paras: ['栈（Stack）是限定仅在表尾进行插入和删除操作的线性表。表尾称为栈顶（top），表头称为栈底（bottom）。不含元素的空表称为空栈。'], list: ['核心特性：后进先出（LIFO, Last In First Out）；', '基本运算：InitStack、Push、Pop、GetTop、StackEmpty；', 'n 个不同元素依次进栈，合法出栈序列数为卡特兰数 C(2n,n)/(n+1)。'], note: '高频考点：给定入栈序列 1,2,3,4，判断出栈序列 3,4,2,1 是否合法？（合法）4,3,1,2 呢？（不合法）' },
        { title: '3.2 顺序栈的实现', code: '#define MAXSIZE 100\ntypedef struct {\n    ElemType data[MAXSIZE];\n    int top;          // 栈顶指针，空栈时为 -1\n} SqStack;\n\n// 入栈\nint Push(SqStack *S, ElemType e) {\n    if (S->top == MAXSIZE - 1) return 0;  // 栈满\n    S->data[++S->top] = e;\n    return 1;\n}\n\n// 出栈\nint Pop(SqStack *S, ElemType *e) {\n    if (S->top == -1) return 0;           // 栈空\n    *e = S->data[S->top--];\n    return 1;\n}' },
        { title: '3.3 栈的典型应用', list: ['括号匹配：扫描表达式，左括号入栈，遇右括号弹栈匹配；', '表达式求值：中缀转后缀（调度场算法）+ 后缀表达式求值；', '递归消除：函数调用栈帧、汉诺塔的非递归实现；', '浏览器前进/后退：两个栈分别保存历史与前进记录。'] },
        { title: '3.4 队列的定义与实现', paras: ['队列（Queue）是只允许在表的一端（队尾）插入、另一端（队头）删除的线性表，具有先进先出（FIFO）特性。', '顺序队列的"假溢出"问题：rear 到达数组末尾但队头仍有空位。解决方案是采用循环队列，通过取模运算实现数组首尾相接。'], code: '// 循环队列：牺牲一个存储单元区分队空/队满\n#define MAXQSIZE 100\ntypedef struct {\n    ElemType data[MAXQSIZE];\n    int front;   // 队头指针\n    int rear;    // 队尾指针（指向下一插入位置）\n} SqQueue;\n\n// 队空条件：front == rear\n// 队满条件：(rear + 1) % MAXQSIZE == front\n// 队列长度：(rear - front + MAXQSIZE) % MAXQSIZE' },
        { title: '3.5 栈与队列对比', table: { head: ['对比项', '栈（Stack）', '队列（Queue）'], rows: [['操作端', '仅栈顶', '队尾插入、队头删除'], ['特性', '后进先出 LIFO', '先进先出 FIFO'], ['典型应用', '函数调用、撤销操作、DFS', '任务调度、消息缓冲、BFS'], ['顺序实现难点', '栈满判断', '假溢出 → 循环队列']] } }
      ],
      summary: '栈与队列是操作受限的线性表。栈的核心是"后进先出"，广泛应用于递归实现、表达式求值与深度优先遍历；队列的核心是"先进先出"，是任务调度与广度优先遍历的基础。循环队列通过牺牲一个存储单元解决假溢出问题，是考试与面试的高频考点。',
      exercises: [
        '写出中缀表达式 (3+4)*5-6 转换为后缀表达式的完整过程（画出栈的变化）；',
        '编程实现：利用栈判断字符串中的括号是否匹配，要求支持 ()、[]、{} 三种括号；',
        '证明：循环队列中牺牲一个存储单元时，队列长度公式为 (rear - front + MAXQSIZE) % MAXQSIZE；',
        '思考：如何用两个栈实现一个队列？分析 enqueue/dequeue 的均摊时间复杂度。'
      ]
    }
  },

  // C002 排序算法可视化演示（视频脚本）
  R006: {
    kind: 'video',
    data: {
      duration: '23 分 45 秒',
      level: '★★★☆☆（需要先修第 1 章复杂度分析）',
      chapter: '第 8 章 排序 · 8.3 交换排序 / 8.4 归并排序',
      timeline: [
        { time: '00:00', content: '问题导入：为什么不同的排序算法效率差异巨大？从一个 10 万元素排序实测对比开始' },
        { time: '02:15', content: '快速排序思想：分治策略、基准元素（pivot）的选择' },
        { time: '05:30', content: '动画演示：一趟划分（partition）的完整指针移动过程' },
        { time: '09:00', content: '快速排序递归树展开，分析最好 O(nlogn) 与最坏 O(n²) 的成因' },
        { time: '12:40', content: '归并排序思想：先分后合，两个有序子表的归并过程' },
        { time: '16:20', content: '动画演示：8 元素数组的完整归并排序过程' },
        { time: '19:00', content: '稳定性对比：为什么快排不稳定、归并稳定？用实例说明' },
        { time: '21:30', content: '工程实践：Java/C++ 标准库排序函数的混合策略（TimSort/Introsort）' }
      ],
      keyPoints: [
        '快速排序平均时间复杂度 O(nlogn)，最坏 O(n²)，原地排序但不稳定；',
        '归并排序稳定保持 O(nlogn)，需要 O(n) 辅助空间，是外部排序的基础；',
        '基准元素选择策略：固定首元素 vs 随机选择 vs 三数取中；',
        '小规模子数组（n≤16）切换插入排序可提升实际性能约 10%~20%。'
      ],
      code: 'int partition(int a[], int low, int high) {\n    int pivot = a[low];\n    while (low < high) {\n        while (low < high && a[high] >= pivot) high--;\n        a[low] = a[high];\n        while (low < high && a[low] <= pivot) low++;\n        a[high] = a[low];\n    }\n    a[low] = pivot;\n    return low;\n}\n\nvoid quickSort(int a[], int low, int high) {\n    if (low < high) {\n        int mid = partition(a, low, high);\n        quickSort(a, low, mid - 1);\n        quickSort(a, mid + 1, high);\n    }\n}',
      tips: [
        '第一遍正常速度观看，理解整体流程；',
        '05:30 与 16:20 两段动画建议反复观看，并在纸上同步模拟指针移动；',
        '看完后完成 OJ 平台"排序专项训练"第 3、5 题进行巩固。'
      ]
    }
  },

  // C003 数据库系统原理 - 教学大纲
  R007: {
    kind: 'syllabus',
    data: {
      info: { name: '数据库系统原理', credit: 3.5, hours: 56, semester: '2025-2026-1', category: '必修', teacher: '李华 副教授', prerequisite: '数据结构、操作系统' },
      objectives: [
        '掌握数据库系统的基本概念、数据模型与体系结构；',
        '熟练使用 SQL 完成数据定义、查询、更新与视图操作；',
        '掌握关系规范化理论，能够进行数据库逻辑设计；',
        '理解事务、并发控制与数据库恢复的基本原理。'
      ],
      chapters: [
        { no: 1, title: '数据库系统概述', hours: 6, points: '三级模式两级映像、数据独立性、DBMS 功能' },
        { no: 2, title: '关系模型与关系代数', hours: 8, points: '关系运算、完整性约束、关系代数表达式' },
        { no: 3, title: 'SQL 语言', hours: 12, points: 'DDL/DML/DQL、连接查询、嵌套查询、视图' },
        { no: 4, title: '关系规范化理论', hours: 10, points: '函数依赖、1NF~BCNF、模式分解' },
        { no: 5, title: '数据库设计', hours: 8, points: 'E-R 模型、概念结构→逻辑结构转换' },
        { no: 6, title: '事务与并发控制', hours: 6, points: 'ACID、封锁协议、死锁、两段锁' },
        { no: 7, title: '数据库恢复与安全性', hours: 4, points: '日志、检查点、权限管理' },
        { no: 8, title: '新型数据库简介', hours: 2, points: 'NoSQL、NewSQL、分布式数据库' }
      ],
      assessment: [
        { item: '平时成绩', pct: '20%', desc: '作业 4 次 + 课堂互动' },
        { item: '上机实验', pct: '30%', desc: '4 次 SQL 实验（见《SQL 上机实验指导书》）' },
        { item: '期末考试', pct: '50%', desc: '闭卷，SQL 编程与规范化大题各占 20%' }
      ],
      textbooks: [
        '《数据库系统概论（第 6 版）》，王珊、杜小勇、陈红，高等教育出版社（主教材）',
        '《Database System Concepts (7th Edition)》，Silberschatz 等（参考）',
        '《MySQL 技术内幕：InnoDB 存储引擎》，姜承尧（工程拓展）'
      ]
    }
  },

  // C003 SQL 上机实验指导书
  R008: {
    kind: 'lab',
    data: {
      intro: '本课程共安排 4 次 SQL 上机实验（每次 2 学时），实验环境为 MySQL 8.0 + MySQL Workbench。实验数据库统一使用教务管理系统（jwgl）样例库，含 student、course、sc、teacher、department 五张表。请提前在个人电脑完成环境安装并导入建库脚本。',
      labs: [
        { no: 1, title: '数据定义与单表查询', hours: 2, goal: '掌握 CREATE TABLE、约束定义与 SELECT 基本查询。', steps: ['连接数据库，创建 jwgl 库并切换；', '按给定表结构创建 student 表（含主键、非空、默认值约束）；', '插入 10 条样例数据；', '完成查询练习：全体学生信息、按姓氏模糊查询、按入学年份分组统计；', '练习 ALTER TABLE 增加/删除列。'], code: "CREATE TABLE student (\n  sno CHAR(10) PRIMARY KEY,\n  sname VARCHAR(20) NOT NULL,\n  gender CHAR(2) DEFAULT '男',\n  birthday DATE,\n  dno CHAR(4)\n);\n\n-- 查询姓'张'的学生\nSELECT sno, sname FROM student WHERE sname LIKE '张%';", acceptance: ['5 张表创建语句正确，约束完整；', '10 道查询练习题全部在 Workbench 中运行通过并截图。'] },
        { no: 2, title: '连接查询与嵌套查询', hours: 2, goal: '掌握等值连接、外连接、IN/EXISTS 嵌套查询。', steps: ['三表连接：查询学生姓名、课程名与成绩；', '左外连接：查询所有课程及其选修人数（含无人选修的课程）；', 'IN 子查询：查询选修了"数据库"课程的学生姓名；', 'EXISTS 相关子查询：查询选修了全部课程的学生；', '对比 NOT IN 与 NOT EXISTS 在含 NULL 时的行为差异并记录。'], code: "-- 查询每门课程的平均分并降序排列\nSELECT c.cname, AVG(sc.grade) AS avg_grade\nFROM sc JOIN course c ON sc.cno = c.cno\nGROUP BY c.cno, c.cname\nORDER BY avg_grade DESC;", acceptance: ['8 道练习题运行结果正确；', '在实验报告中解释 NOT IN 遇到 NULL 返回空集的原因。'] },
        { no: 3, title: '视图、索引与数据更新', hours: 2, goal: '掌握视图创建与更新限制、索引创建与执行计划分析。', steps: ['创建视图 v_avg：每个学生的学号、姓名、平均成绩；', '尝试对视图执行 UPDATE，观察并记录更新限制；', '在 sc(grade) 上创建索引，用 EXPLAIN 对比创建前后的查询计划；', '批量更新：将"数据库"课程成绩整体上调 5 分（不超过 100）；', '事务练习：显式开启事务执行更新，验证 ROLLBACK 效果。'], code: "CREATE VIEW v_avg AS\nSELECT s.sno, s.sname, AVG(sc.grade) AS avg_grade\nFROM student s JOIN sc ON s.sno = sc.sno\nGROUP BY s.sno, s.sname;\n\nEXPLAIN SELECT * FROM sc WHERE grade > 90;", acceptance: ['视图可正常查询且更新限制解释正确；', 'EXPLAIN 输出截图中能看到索引命中（key 列非 NULL）。'] },
        { no: 4, title: '综合实验：迷你选课系统', hours: 2, goal: '综合运用 DDL/DML/视图/事务完成小型数据库应用设计。', steps: ['自行设计并创建"选课系统"数据库（不少于 4 张表，含外键）；', '实现选课登记（含事务：校验容量 + 插入选课记录）；', '实现统计视图：各班选课率排行；', '编写 3 个业务查询 SQL 并附设计说明；', '两人一组互评：检查对方数据库的约束完整性与范式合理性。'], acceptance: ['现场演示选课登记事务（成功与回滚各一次）；', '提交完整建库脚本与查询脚本，命名规范。'] }
      ],
      report: [
        '每次实验后 1 周内提交实验报告（PDF），含实验步骤、运行截图、问题与解决记录；',
        '报告第 4 节必须包含"思考与讨论"：分析实验中遇到的至少 1 个报错及排查过程；',
        '实验报告占总评的 30%，抄袭一经发现当次实验记 0 分。'
      ]
    }
  },

  // C004 计算机基础 - 课件合集
  R009: {
    kind: 'slides',
    data: {
      sections: [
        { title: '合集说明', paras: ['本合集包含《计算机基础》全学期 16 次课件的电子版，按教学周组织。每章课件包含知识要点、课堂例题与课后自测题。以下为核心章节的内容摘要。'] },
        { title: '第 1 章 计算机系统概述', list: ['冯·诺依曼体系结构：五大部件（运算器、控制器、存储器、输入/输出设备）；', '计算机分类：巨型机、大型机、微型机、嵌入式系统；', '性能指标：主频、字长、内存容量、MIPS。'] },
        { title: '第 2 章 数制与编码', list: ['二进制、八进制、十六进制及其相互转换；', '原码、反码、补码：补码如何解决负数表示与减法统一为加法；', '字符编码：ASCII、GB2312、Unicode/UTF-8 的演进。'], note: '课堂例题：求 -37 的 8 位补码。（答案：11011011）' },
        { title: '第 3 章 操作系统基础', list: ['操作系统五大功能：进程管理、存储管理、文件管理、设备管理、作业管理；', '进程与程序的区别：进程是动态的执行实例，具有生命周期；', '常用命令：文件目录操作、权限管理（chmod/chown）。'] },
        { title: '第 4 章 计算机网络入门', list: ['OSI 七层模型与 TCP/IP 四层模型对照；', 'IP 地址分类与子网划分基础；', '常见应用层协议：HTTP/HTTPS、DNS、FTP、SMTP。'], table: { head: ['OSI 层次', '对应 TCP/IP', '典型协议/设备'], rows: [['应用层/表示层/会话层', '应用层', 'HTTP、DNS、SMTP'], ['传输层', '传输层', 'TCP、UDP'], ['网络层', '网际层', 'IP、ICMP、路由器'], ['数据链路层/物理层', '网络接口层', 'Ethernet、交换机']] } },
        { title: '第 5 章 信息安全常识', list: ['计算机病毒特征与传播途径；', '密码安全：强密码原则、双因素认证；', '社交工程攻击识别：钓鱼邮件的常见特征。'] }
      ],
      summary: '本合集覆盖计算机系统的硬件基础、数制编码、操作系统、网络与信息安全五大模块，是全学期课程的核心学习资料。建议结合课堂讲授按周复习，并完成每章自测题。',
      exercises: [
        '将十进制数 2024 分别转换为二进制、八进制与十六进制；',
        '用补码计算 25 - 37（8 位字长），并验证结果正确性；',
        '画出局域网中两台主机通信时数据在 TCP/IP 各层的封装过程。'
      ]
    }
  },

  // C005 Python 入门微课视频
  R010: {
    kind: 'video',
    data: {
      duration: '32 分 15 秒（含 3 段随堂动手环节）',
      level: '★☆☆☆☆（零基础入门，无需任何编程经验）',
      chapter: '第 1 章 Python 概述 · 环境搭建与第一个程序',
      timeline: [
        { time: '00:00', content: '课程介绍：Python 能做什么？—— Web 后端（豆瓣/Instagram）、数据分析（Pandas）、人工智能（PyTorch）、办公自动化（Excel 批处理）' },
        { time: '03:20', content: '为什么选择 Python：语法简洁、生态丰富、社区活跃；TIOBE 排行榜常年第一' },
        { time: '05:40', content: '【动手 1】官网下载 Python 3.12 安装包，Windows 安装时务必勾选 "Add python.exe to PATH"，演示忘记勾选后的补救方法' },
        { time: '09:10', content: '验证安装：Win+R 打开 cmd，执行 python --version 显示版本号；进入交互式解释器（REPL），输入 1+1 实时求值' },
        { time: '12:30', content: '【动手 2】安装 VS Code：安装 Python 官方扩展、选择解释器、新建 hello.py 文件、运行按钮的三种方式' },
        { time: '17:00', content: '编写并运行 Hello World：print 函数的 sep/end 参数、单行注释 # 与多行注释三引号' },
        { time: '21:20', content: '变量与基本数据类型：int / float / str / bool；动态类型 vs 静态类型对比演示（type() 函数查看类型）' },
        { time: '25:00', content: 'f-string 格式化输出：姓名、年龄、成绩拼接成一句话；input() 接收用户输入并完成"年龄+1"小程序' },
        { time: '28:30', content: '【动手 3】常见报错实战：NameError（变量未定义）、SyntaxError（中文括号）、TypeError（字符串与数字相加）的识别与排查' },
        { time: '31:00', content: '本课小结与下节预告：if 分支与 while 循环' }
      ],
      keyPoints: [
        'Python 是解释型、动态类型语言：无需编译、无需声明变量类型，赋值即创建变量；',
        '缩进即语法：Python 用 4 个空格缩进表示代码块，Tab 与空格混用会报 IndentationError；',
        'REPL（交互式解释器）是验证小片段代码的最高效工具，输入 exit() 退出；',
        'print() 默认以换行结尾，可用 end="" 取消；多值输出默认空格分隔，可用 sep 定制；',
        'input() 永远返回字符串，做数值运算前必须用 int() 或 float() 转换；',
        '命名规范：变量名用蛇形命名法（snake_case），如 student_name；常量全大写，如 MAX_SIZE。'
      ],
      code: '# ===== 第 1 个程序：Hello World =====\nprint("Hello, 爱教学！")\n\n# ===== 变量与数据类型 =====\nname = "小明"          # str：字符串，双引号单引号均可\nage = 20                # int：整数\nscore = 95.5            # float：浮点数\npassed = True           # bool：布尔值，注意首字母大写\n\nprint(type(name))       # <class \'str\'>\n\n# ===== f-string 格式化（Python 3.6+ 推荐写法）=====\nprint(f"{name}今年{age}岁，Python成绩：{score}分")\n\n# ===== input 与用户交互 =====\nbirth_year = input("请输入你的出生年份：")   # input 返回 str\nage_calc = 2025 - int(birth_year)             # 必须先转 int\nprint(f"你今年大约 {age_calc} 岁")\n\n# ===== print 高级用法 =====\nprint("语文", "数学", "英语", sep=" | ")     # 语文 | 数学 | 英语\nprint("不换行", end="")\nprint("接着上一行")',
      tips: [
        '三段【动手】环节请务必暂停视频同步操作，编程是"做"会的，不是"看"会的；',
        '12:30 的 VS Code 配置对后续全部实验课通用，完成后截图保存配置界面备查；',
        '遇到报错先读最后一行（错误类型+原因），再回看提示的行号；把错误信息复制到搜索引擎是最快的排查方式；',
        '配套练习：完成课程平台"第 1 章闯关练习"共 10 题（在线自动判题），截止本周日 23:59。'
      ]
    }
  },

  // C006 通信原理 - 教学大纲
  R011: {
    kind: 'syllabus',
    data: {
      info: { name: '通信原理', credit: 4, hours: 64, semester: '2025-2026-1', category: '必修', teacher: '王芳 教授', prerequisite: '高等数学、概率论与随机过程、信号与系统' },
      objectives: [
        '掌握通信系统的组成、分类与主要性能指标；',
        '理解模拟调制与数字调制的原理，能分析抗噪声性能；',
        '掌握数字基带传输与频带传输的基本理论与方法；',
        '理解信道容量定理与差错控制编码的基本原理。'
      ],
      chapters: [
        { no: 1, title: '绪论', hours: 4, points: '通信系统模型、信息量与熵、有效性与可靠性指标' },
        { no: 2, title: '随机信号分析', hours: 6, points: '平稳随机过程、高斯过程、窄带随机过程' },
        { no: 3, title: '信道', hours: 4, points: '恒参/随参信道、香农公式' },
        { no: 4, title: '模拟调制系统', hours: 10, points: 'AM/DSB/SSB/FM 调制解调与抗噪声性能' },
        { no: 5, title: '数字基带传输', hours: 10, points: '码型、码间串扰、奈奎斯特准则、眼图' },
        { no: 6, title: '数字频带传输', hours: 10, points: 'ASK/FSK/PSK/QPSK 调制解调' },
        { no: 7, title: '模拟信号的数字传输', hours: 8, points: '抽样定理、PCM、增量调制' },
        { no: 8, title: '差错控制编码', hours: 8, points: '线性分组码、循环码、卷积码简介' },
        { no: 9, title: '同步原理', hours: 4, points: '载波同步、位同步、帧同步' }
      ],
      assessment: [
        { item: '平时成绩', pct: '25%', desc: '作业 6 次 + 章节测验' },
        { item: '实验', pct: '15%', desc: 'SystemView/MATLAB 仿真实验 3 次' },
        { item: '期末考试', pct: '60%', desc: '闭卷，计算题占 50% 以上' }
      ],
      textbooks: [
        '《通信原理（第 7 版）》，樊昌信、曹丽娜，国防工业出版社（主教材）',
        '《Digital Communications (5th Edition)》，Proakis（参考）'
      ]
    }
  },

  // C006 奈奎斯特与香农公式推导（链接/阅读材料）
  R012: {
    kind: 'link',
    data: {
      groups: [
        { title: '一、奈奎斯特准则（无噪声信道）', intro: '1924 年奈奎斯特（Nyquist）推导出：在理想低通信道中，无码间串扰的最高码元传输速率受带宽限制。', items: [
          { title: '奈奎斯特第一准则', tag: '公式', desc: '若信道带宽为 B（Hz），则无码间串扰的最大码元速率为：', points: ['R_Bmax = 2B （码元/秒，波特）', '物理含义：理想低通信道每赫兹带宽每秒最多传输 2 个码元；', '若每个码元携带 M 进制信息（log₂M 比特），则最大信息速率 R_b = 2B·log₂M (bit/s)。'] },
          { title: '推导要点', tag: '推导', desc: '从抽样定理与 sinc 函数的正交性出发：', points: ['理想低通信道的冲激响应为 h(t) = sinc(2Bt)，其在码元间隔 T = 1/(2B) 的整数倍处取值为零；', '以 R_B = 2B 的速率发送时，抽样时刻其他码元的响应均为零 → 无码间串扰；', '超过 2B 时抽样点不再正交，码间串扰不可避免。'] }
        ] },
        { title: '二、香农公式（有噪声信道）', intro: '1948 年香农（Shannon）在《通信的数学理论》中给出了加性高斯白噪声（AWGN）信道的容量上限。', items: [
          { title: '香农信道容量公式', tag: '公式', desc: '带宽为 B、信噪比为 S/N 的连续信道，其信道容量为：', points: ['C = B·log₂(1 + S/N)  (bit/s)', '若用分贝表示信噪比：(S/N)dB = 10·lg(S/N)，注意计算时须先换算回功率比；', '当信噪比趋于无穷大，C 也趋于无穷；但带宽一定时，容量增长受 log 关系约束。'] },
          { title: '香农公式的意义与推论', tag: '理解', desc: '香农公式给出了可靠通信的理论极限，是信道编码理论的基础：', points: ['只要信息速率 R < C，总存在某种编码使误码率任意小；反之 R > C 时不可能可靠传输；', '带宽与信噪比可以互换：带宽有限时可用提高信噪比弥补（卫星通信）；', '扩展形式：C = B·log₂(1 + S/(n₀B))，当 B→∞ 时 C→1.44·S/n₀（极限容量）。'] }
        ] },
        { title: '三、典型例题', intro: '以下两道例题覆盖本材料核心考点，建议先独立求解再对照解析。', items: [
          { title: '例题 1：无噪声信道', tag: '计算', desc: '某理想低通信道带宽 3 kHz，采用 8 进制码元传输，求最大信息传输速率。', points: ['解：R_b = 2B·log₂M = 2×3000×log₂8 = 2×3000×3 = 18000 bit/s = 18 kbps。'] },
          { title: '例题 2：香农公式', tag: '计算', desc: '电话信道带宽 3.4 kHz，信噪比 30 dB，求信道容量；若信噪比提高到 40 dB，容量增加多少？', points: ['30 dB → S/N = 10³ = 1000，C = 3400×log₂(1001) ≈ 3400×9.97 ≈ 33.9 kbps；', '40 dB → S/N = 10⁴，C = 3400×log₂(10001) ≈ 3400×13.29 ≈ 45.2 kbps；', '信噪比提高 10 dB，容量仅增加约 11.3 kbps，体现 log 增长的"边际递减"。'] }
        ] }
      ]
    }
  },

  // C008 软件测试技术 - 实验指导书
  R013: {
    kind: 'lab',
    data: {
      intro: '本课程共 4 次实验（每次 2 学时），围绕"三角形分类"经典案例与 Web 应用展开，覆盖单元测试、黑盒测试设计、自动化测试与性能测试。实验环境：JDK 17 + JUnit 5 + Selenium + JMeter。',
      labs: [
        { no: 1, title: 'JUnit 单元测试入门', hours: 2, goal: '掌握 JUnit 5 测试框架的基本使用与断言机制。', steps: ['创建 Maven 项目，引入 junit-jupiter 依赖；', '编写被测类 Triangle.classify(a,b,c)：判断等边/等腰/普通/非三角形；', '为 classify 编写不少于 12 个测试用例；', '使用 @ParameterizedTest + @CsvSource 改造重复用例；', '运行测试并查看 Jacoco 覆盖率报告（行覆盖 ≥ 90%）。'], code: "@ParameterizedTest\n@CsvSource({\n    \"3,4,5, 普通三角形\",\n    \"3,3,3, 等边三角形\",\n    \"3,3,5, 等腰三角形\",\n    \"1,2,3, 非三角形\",\n    \"0,4,5, 非法输入\"\n})\nvoid testClassify(int a, int b, int c, String expected) {\n    assertEquals(expected, Triangle.classify(a, b, c));\n}", acceptance: ['12 个用例全部通过；', 'Jacoco 报告显示 Triangle 类行覆盖率 ≥ 90%。'] },
        { no: 2, title: '黑盒测试用例设计', hours: 2, goal: '掌握等价类划分与边界值分析两种方法。', steps: ['对 classify 方法进行等价类划分：画出有效/无效等价类表；', '基于等价类表设计测试用例（强一般等价类）；', '对三条边取值范围 [1,200] 进行边界值分析：4n+1 个用例；', '对比两种方法设计出的用例集，分析查错能力差异；', '引入一个含缺陷的实现版本，用两组用例分别测试并记录发现缺陷数。'], acceptance: ['等价类表格式规范、覆盖输入域；', '边界值用例数量与选取点正确（含略小于/等于/略大于边界）。'] },
        { no: 3, title: 'Selenium Web 自动化测试', hours: 2, goal: '掌握 Web 元素定位与 Page Object 模式。', steps: ['搭建 Selenium + ChromeDriver 环境；', '对教学平台登录页编写自动化脚本：正例 + 3 个反例；', '使用显式等待 WebDriverWait 替代 Thread.sleep；', '按 Page Object 模式重构：LoginPage 类封装元素定位；', '加入断言与失败截图（TakesScreenshot）。'], code: "WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));\nWebElement btn = wait.until(\n    ExpectedConditions.elementToBeClickable(By.id(\"loginBtn\"))\n);\nbtn.click();", acceptance: ['4 个登录场景脚本全部运行通过；', '代码符合 Page Object 分层，无硬编码等待。'] },
        { no: 4, title: 'JMeter 性能测试', hours: 2, goal: '掌握并发压测计划的设计与结果分析。', steps: ['创建线程组：50 并发、Ramp-up 10 秒、循环 20 次；', '添加 HTTP 请求取样器（课程列表接口）与响应断言；', '添加聚合报告、响应时间图、吞吐量监听器；', '执行压测，记录平均响应时间、90% 分位、错误率；', '调整并发到 100/200，观察性能拐点并撰写分析结论。'], acceptance: ['压测计划配置正确并执行成功；', '报告中给出性能拐点并发数与可能瓶颈分析。'] }
      ],
      report: [
        '每次实验提交测试设计文档 + 源代码 + 运行截图；',
        '实验 2 与实验 4 需提交对比分析（不少于 300 字）；',
        '实验成绩 = 现场验收 50% + 报告质量 50%。'
      ]
    }
  },

  // C010 软件项目管理 - 案例库
  R014: {
    kind: 'link',
    data: {
      groups: [
        { title: '一、进度与范围管理案例（第 5、6 章课堂研讨用）', intro: '使用方法：课前 10 分钟独立阅读案例并写下初步判断；课堂按 4~6 人分组研讨 15 分钟，每组形成书面结论并派代表陈述；教师最后点评并回归教材知识点。', items: [
          { title: '案例 A：电商平台"双 11"版本延期', tag: '进度管理', desc: '某电商平台计划 11 月 1 日上线促销系统新版本（含秒杀、直播、会员券三大功能），项目周期 10 周，团队 15 人。第 4 周起，运营部门三次绕过项目经理直接向开发组追加需求：第 4 周增加"砍价玩法"、第 6 周增加"直播间红包雨"、第 8 周要求会员券支持跨店叠加。项目经理碍于情面未走变更流程直接安排开发，测试时间被压缩至 3 天，最终版本延期 3 周上线，错过双 11 预热期，且上线首日出券模块发生超发事故，造成直接损失约 120 万元。', points: ['研讨 1：范围蔓延（Scope Creep）在本案例中是如何一步步发生的？哪三个环节本可以阻断？', '研讨 2：变更控制委员会（CCB）应如何介入？画出你认为合理的变更控制流程图（提交→评估→审批→实施→验证）。', '研讨 3：若第 8 周的需求必须响应，可采取什么进度压缩技术？赶工（Crashing）与快速跟进（Fast Tracking）的代价分别是什么？', '研讨 4：测试时间被压缩与"出券超发"事故之间存在什么因果关系？这体现了项目管理三角形（范围-时间-成本/质量）的什么规律？', '延伸思考：如果团队采用敏捷模式（2 周迭代），运营部门的"插单"行为应以什么机制消化？'] },
          { title: '案例 B：关键路径误判导致资源浪费', tag: '进度管理', desc: '某政务系统项目组绘制 PERT 网络图时将"接口联调"（5 天）与"性能调优"（7 天）画成并行活动，实际两者共享唯一的一台等保测评环境，存在隐性资源依赖。项目中期才发现真实关键路径比计划长 10 天，而前期按错误关键路径进行的"赶工"全部投入在非关键活动上，浪费人力成本约 8 万元。', points: ['研讨 1：技术依赖与资源依赖有何区别？资源依赖应如何在网络图/甘特图中显式表达？', '研讨 2：使用关键链法（CCM，Goldratt 提出）应如何设置项目缓冲与汇入缓冲？', '研讨 3：本案例中"赶工错投"的根因是什么？如何用资源平衡（Resource Leveling）技术提前暴露？'] }
        ] },
        { title: '二、风险与质量管理案例（第 8、9 章课堂研讨用）', intro: '以下两个案例分别对应风险管理过程组（识别→定性→定量→应对→监控）与质量成本模型。', items: [
          { title: '案例 C：核心开发离职引发的项目危机', tag: '风险管理', desc: '某金融外包项目共 20 人，其中支付清结算模块由入职 5 年的高级工程师张某独立负责：代码无注释、无文档、无 Code Review，全部业务规则只存在其个人笔记中。项目联调前两周张某突然离职加入竞对，团队无人能接手该模块，被迫紧急招聘并延期 1 个月交付，违约金 60 万元。事后复盘发现：项目经理在 8 个月前就已知晓该风险，但未登记、未上报、未采取任何应对措施。', points: ['研讨 1：在风险登记册中，该风险的概率与影响应如何定级？用 5×5 风险矩阵标出其位置。', '研讨 2：规避 / 转移 / 减轻 / 接受四种应对策略分别对应本案例的什么具体措施？结对编程、文档强制、知识分享会各属于哪一类？', '研讨 3："大巴系数"（Bus Factor，即多少人离职会让项目瘫痪）如何度量？本案例的大巴系数是多少？如何将其提升到 3 以上？', '研讨 4：风险早已识别却未应对，暴露了项目风险管理流程中的什么漏洞？'] },
          { title: '案例 D：千行代码缺陷率之争', tag: '质量管理', desc: '两个团队交付同一 ERP 系统的不同模块：A 团队严格执行结对编程 + 每日 Code Review + 静态扫描，缺陷密度 0.8/KLOC，但进度滞后 2 周、人力成本超支 18%；B 团队无评审流程、依赖测试阶段集中修复，缺陷密度 2.3/KLOC，但提前 1 周交付。上线 3 个月后统计：A 模块线上缺陷 2 个、修复成本 1.5 万元；B 模块线上缺陷 17 个、含 1 个资损事故，修复与赔偿成本合计 26 万元。管理层就是否在全公司推广 A 团队的评审流程产生分歧。', points: ['研讨 1：用质量成本（COQ）模型拆解本案例：A、B 两团队的预防成本、评估成本、内部失败成本、外部失败成本各是多少？', '研讨 2：缺陷密度是否是唯一的质量度量？还应引入哪些指标（如 MTTR、逃逸率、客户满意度）？', '研讨 3：B 团队"提前 1 周交付"的短期收益与 26 万元外部失败成本如何权衡？这反映了什么管理短视？', '研讨 4：若要在全公司推广评审流程，你会设计怎样的试点与度量方案来说服管理层？'] }
        ] },
        { title: '三、敏捷实践案例（第 12 章课堂研讨 + 课程实践复盘用）', intro: '敏捷案例建议结合本课程的 Scrum 模拟实践环节使用，对照自身 sprint 中遇到的真实问题进行复盘。', items: [
          { title: '案例 E：Scrum 落地水土不服', tag: '敏捷实践', desc: '某传统软件公司引入 Scrum：每日站会变成向 PM 的进度汇报会（每人讲 10 分钟，全员 1.5 小时）；产品负责人（PO）由销售总监兼任，从不参加迭代计划会，需求优先级朝令夕改；迭代评审会流于 PPT 演示，无真实用户参与；更致命的是，管理层在迭代进行中频繁插入"紧急需求"，三个迭代的完成率分别为 40%、55%、35%。三个迭代后团队士气低落，普遍认为"敏捷不如瀑布"。', points: ['研讨 1：对照 Scrum 指南，本案例至少违反了哪 6 条规定？逐条列出并给出正确做法。', '研讨 2：PO 长期缺席会导致什么后果？ product backlog 失去优先级排序会引发哪些连锁反应？', '研讨 3：迭代中插入紧急需求的正确处理机制是什么？（提示：Sprint Backlog 的保护原则与"中止 Sprint"的极端情形）', '研讨 4：敏捷转型需要哪些组织层面的配套条件（考核方式、合同模式、中层角色转变）？为什么"只改团队、不改组织"的转型必然失败？'] }
        ] }
      ]
    }
  },

  // C012 自动化测试框架演示视频
  R015: {
    kind: 'video',
    data: {
      duration: '25 分 10 秒',
      level: '★★★★☆（需完成实验 1~3）',
      chapter: '第 6 章 自动化测试框架 · pytest 分层架构实战',
      timeline: [
        { time: '00:00', content: '从痛点出发：为什么裸脚本式的自动化用例无法维护？' },
        { time: '03:00', content: '框架总体分层：用例层 / 业务层 / 页面对象层 / 驱动层' },
        { time: '06:30', content: '动手搭建：项目目录结构与 conftest.py 固件设计' },
        { time: '10:00', content: '数据驱动实战：pytest.mark.parametrize + YAML 测试数据分离' },
        { time: '14:30', content: '失败重试与截图：pytest-rerunfailures 与钩子函数自动截图' },
        { time: '17:45', content: 'Allure 报告：步骤注解、附件嵌入与趋势图' },
        { time: '21:00', content: '接入 CI：在 GitHub Actions 中定时执行回归套件并推送结果' }
      ],
      keyPoints: [
        '分层框架的核心收益：用例可读性 ↑、重复代码 ↓、页面变更时只需改页面对象层；',
        'conftest.py 的 fixture 是 pytest 依赖注入的灵魂，scope 参数控制复用粒度；',
        '测试数据与测试逻辑分离是数据驱动的前提，推荐 YAML 管理；',
        'CI 集成的关键：无头模式运行、失败产物（截图/日志/报告）作为构件归档。'
      ],
      code: '# conftest.py —— WebDriver 固件\nimport pytest\nfrom selenium import webdriver\n\n@pytest.fixture(scope="session")\ndef driver():\n    options = webdriver.ChromeOptions()\n    options.add_argument("--headless=new")\n    d = webdriver.Chrome(options=options)\n    yield d\n    d.quit()\n\n# test_login.py —— 数据驱动用例\nimport pytest, yaml\n\ndata = yaml.safe_load(open("login_data.yaml", encoding="utf-8"))\n\n@pytest.mark.parametrize("case", data)\ndef test_login(login_page, case):\n    login_page.login(case["user"], case["pwd"])\n    assert login_page.get_tip() == case["expect"]',
      tips: [
        '先看 06:30 完成骨架搭建，再跟随后续章节逐层填充；',
        '配套的完整代码仓库地址见课程公告，建议拉取后对照视频单步调试；',
        '课后任务：把实验 3 的 Selenium 脚本迁移到本框架结构，下周课上抽查。'
      ]
    }
  }
};

/* ---------------- 生成 ---------------- */

const RENDERERS = {
  syllabus: renderSyllabus,
  slides: renderSlides,
  homework: renderHomework,
  video: renderVideo,
  link: renderLink,
  lab: renderLab
};

function run() {
  fs.mkdirSync(BASE_DIR, { recursive: true });
  let count = 0;

  for (const r of resources) {
    const course = courses.find(c => c.id === r.courseId);
    if (!course) throw new Error(`资源 ${r.id} 关联的课程不存在`);
    const detail = DETAILS[r.id];
    if (!detail) throw new Error(`资源 ${r.id} 缺少详细内容定义`);
    const body = RENDERERS[detail.kind](detail.data);

    const html = page(r, course, body);
    const relative = r.url.replace(/^\/resources\//, '');
    const filePath = path.join(BASE_DIR, relative);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  ${relative}`);
    count++;
  }

  // 索引页
  const indexItems = courses.map(c => {
    const crs = resources.filter(r => r.courseId === c.id);
    if (!crs.length) return '';
    const li = crs.map(r => `<li><a href="${r.url.replace(/^\/resources\//, '')}">${esc(r.name)}</a> <span class="tag">${r.type}</span></li>`).join('\n');
    return `<section><h2>${esc(c.name)} <small>${esc(c.code)}</small></h2><ul>\n${li}\n</ul></section>`;
  }).filter(Boolean).join('\n');

  const index = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>教学资源预览 — 爱教学平台</title>
<style>
body{font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#334;background:#f5f7fa}
h1{font-size:22px;color:#1a237e;border-bottom:2px solid #3949ab;padding-bottom:8px}
h2{font-size:16px;color:#1565c0;margin:22px 0 8px}
small{color:#78909c;font-weight:400}
ul{list-style:none;padding:0}
li{padding:7px 0;border-bottom:1px dashed #e0e0e0;font-size:14px}
li a{text-decoration:none;color:#1976d2}
li a:hover{text-decoration:underline}
.tag{display:inline-block;font-size:11px;padding:1px 8px;border-radius:10px;background:#e3f2fd;color:#1565c0;margin-left:6px}
</style></head>
<body>
<h1>教学资源预览</h1>
<p>以下为平台全部 ${resources.length} 条课程配套资源，点击名称即可打开查看详细内容。</p>
${indexItems}
</body></html>`;

  fs.writeFileSync(path.join(BASE_DIR, 'index.html'), index, 'utf8');
  console.log('  index.html');
  console.log(`\n✅ 详细版演示资源生成完成：${count} 个资源页 + 1 个索引页。`);
}

run();