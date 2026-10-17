/**
 * 生成演示资源 HTML 文件
 * 将 seed-data.js 中的 15 条教学资源生成为可在浏览器中直接打开的本地 HTML 页面。
 */
const fs = require('fs');
const path = require('path');
const { courses, resources } = require('./seed-data');

const BASE_DIR = path.join(__dirname, '..', 'public', 'resources');

// 按类型提供差异化内容大纲
const typeOutlines = {
  文档: [
    '一、课程目标与毕业要求对应关系',
    '二、教学内容与学时分配',
    '三、考核方式与成绩构成',
    '四、教材与参考资料',
    '五、教学进度安排表'
  ],
  课件: [
    '1. 知识目标与学习要点',
    '2. 核心概念详解',
    '3. 例题解析与课堂练习',
    '4. 课后思考题',
    '5. 延伸阅读推荐'
  ],
  视频: [
    '▶ 00:00 - 课程导入与学习目标',
    '▶ 05:30 - 核心原理讲解',
    '▶ 12:00 - 操作演示 / 案例展示',
    '▶ 18:45 - 常见误区分析',
    '▶ 22:00 - 小结与课后任务'
  ],
  链接: [
    '相关章节延伸阅读',
    '学术文献推荐',
    '工程实践参考',
    '在线工具与数据集',
    '拓展思考题'
  ],
  作业: [
    '一、作业背景与任务说明',
    '二、提交内容与格式要求',
    '三、评分标准与扣分细则',
    '四、参考示例与注意事项',
    '五、提交截止时间'
  ]
};

const colors = {
  文档: { bg: '#e3f2fd', fg: '#1565c0', badge: '#1976d2' },
  课件: { bg: '#f3e5f5', fg: '#6a1b9a', badge: '#7b1fa2' },
  视频: { bg: '#fce4ec', fg: '#c2185b', badge: '#d81b60' },
  链接: { bg: '#e8f5e9', fg: '#2e7d32', badge: '#388e3c' },
  作业: { bg: '#fff3e0', fg: '#ef6c00', badge: '#f57c00' }
};

function buildPage(resource) {
  const course = courses.find(c => c.id === resource.courseId);
  const courseName = course ? course.name : '';
  const c = colors[resource.type] || colors.文档;
  const outlines = typeOutlines[resource.type] || typeOutlines.文档;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${resource.name} — 爱教学平台</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.7;color:#333;max-width:720px;margin:0 auto;padding:24px 16px;background:#f8fafc}
header{border-left:4px solid ${c.badge};padding-left:16px;margin-bottom:24px}
h1{font-size:22px;color:#1a237e;margin-bottom:6px}
.sub{color:#546e7a;font-size:14px}
.badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600;color:#fff;background:${c.badge};margin-left:8px;vertical-align:middle}
.desc{background:#fff;border-radius:8px;padding:16px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.desc p{color:#455a64;font-size:14px}
.outline{background:#fff;border-radius:8px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.outline h2{font-size:16px;color:#1a237e;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #eceff1}
.outline ul{list-style:none}
.outline li{padding:10px 0;border-bottom:1px dashed #eceff1;font-size:14px;color:#37474f}
.outline li:last-child{border-bottom:none}
.outline li::before{content:"•";color:${c.badge};margin-right:8px;font-weight:700}
footer{margin-top:28px;text-align:center;font-size:12px;color:#90a4ae}
a{color:${c.badge}}
</style>
</head>
<body>
<header>
<h1>${resource.name}<span class="badge">${resource.type}</span></h1>
<div class="sub">所属课程：${courseName} &nbsp;|&nbsp; 资源编号：${resource.id}</div>
</header>
<section class="desc">
<p>${resource.description || '本资源为课程配套教学资料，仅供教学使用。'}</p>
</section>
<section class="outline">
<h2>内容概要</h2>
<ul>
${outlines.map(o => `<li>${o}</li>`).join('\n')}
</ul>
</section>
<footer>
  爱教学平台 &middot; 演示资源
</footer>
</body>
</html>`;
}

function run() {
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR, { recursive: true });
  }

  for (const r of resources) {
    const html = buildPage(r);
    // url 形如 /resources/se101/syllabus.html
    const relative = r.url.replace(/^\/resources\//, '');
    const filePath = path.join(BASE_DIR, relative);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  ${relative}`);
  }

  // 生成课程资源索引页（可选，供快速浏览）
  const indexItems = courses.map(c => {
    const crs = resources.filter(r => r.courseId === c.id);
    if (!crs.length) return '';
    const li = crs.map(r => `<li><a href="${r.url.replace(/^\/resources\//, '')}">${r.name}</a> <span class="tag">${r.type}</span></li>`).join('\n');
    return `<section><h2>${c.name} <small>${c.code}</small></h2><ul>\n${li}\n</ul></section>`;
  }).filter(Boolean).join('\n');

  const index = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>教学资源预览</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#334;background:#f8fafc}
h1{font-size:24px;color:#1a237e;border-bottom:2px solid #1976d2;padding-bottom:8px}
h2{font-size:16px;color:#1565c0;margin:24px 0 8px}
small{color:#78909c}
ul{list-style:none;padding-left:0}
li{padding:6px 0;border-bottom:1px dashed #eceff1}
li a{text-decoration:none;color:#1976d2}
li a:hover{text-decoration:underline}
.tag{display:inline-block;font-size:11px;padding:1px 8px;border-radius:4px;background:#e3f2fd;color:#1565c0;margin-left:6px}
</style></head>
<body>
<h1>教学资源预览</h1>
<p>以下为平台全部 15 条演示资源，点击即可打开对应页面。</p>
${indexItems}
</body></html>`;

  fs.writeFileSync(path.join(BASE_DIR, 'index.html'), index, 'utf8');
  console.log('  index.html');
  console.log('\n✅ 演示资源 HTML 生成完成，共 ' + resources.length + ' 个页面 + 1 个索引。');
}

run();