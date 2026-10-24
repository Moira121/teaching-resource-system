// 教师本人页面逻辑

let filterOptions = { semesters: [], colleges: [], categories: [] };
let currentFilters = {};
let loadToken = 0;
let currentPage = 1;
const PAGE_SIZE = 50;
let teacherInfo = null;

/** 登录守卫：无登录态或角色不符直接跳回首页（Sprint1 B3 边界兜底） */
function requireRolePage(role) {
  const auth = getAuth();
  if (!auth || !auth.token || auth.role !== role) {
    safeAlert('未检测到有效登录状态，请重新登录');
    redirectToLogin();
    return null;
  }
  return auth;
}

async function init() {
  setupLogout();
  setupModalClose();
  setupCourseTableDelegation();

  const auth = requireRolePage('teacher');
  if (!auth) return;
  teacherInfo = auth.teacher;
  if (!teacherInfo || !teacherInfo.id) {
    redirectToLogin();
    return;
  }

  document.getElementById('teacherName').textContent = teacherInfo.name || teacherInfo.id;
  document.getElementById('teacherTitle').textContent = teacherInfo.title || '';
  document.getElementById('teacherCollege').textContent = `${teacherInfo.college || ''}${teacherInfo.department ? ' / ' + teacherInfo.department : ''}`;

  try {
    filterOptions = await API.getFilterOptions();
  } catch (e) {
    safeAlert('加载筛选选项失败：' + e.message);
  }
  renderFilters();
  await loadData();
  await loadEvaluationStats();

  document.getElementById('searchBtn').addEventListener('click', () => { currentPage = 1; loadData(); });
  document.getElementById('resetBtn').addEventListener('click', resetFilters);
  document.getElementById('filterKeyword').addEventListener('keypress', e => {
    if (e.key === 'Enter') { currentPage = 1; loadData(); }
  });
}

function renderFilters() {
  const filterRow = document.getElementById('filterRow');
  filterRow.innerHTML = `
    <div class="filter-item">
      <label>学期：</label>
      <select id="filterSemester">
        <option value="">全部学期</option>
        ${filterOptions.semesters.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
      </select>
    </div>
    <div class="filter-item">
      <label>学院：</label>
      <select id="filterCollege">
        <option value="">全部学院</option>
        ${filterOptions.colleges.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
      </select>
    </div>
    <div class="filter-item">
      <label>类别：</label>
      <select id="filterCategory">
        <option value="">全部类别</option>
        ${filterOptions.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
      </select>
    </div>
    <div class="filter-item">
      <label>关键词：</label>
      <input type="text" id="filterKeyword" placeholder="课程名称/代码">
    </div>
    <button class="btn btn-primary" id="searchBtn">查询</button>
    <button class="btn btn-default" id="resetBtn">重置</button>
  `;

  document.getElementById('tableHead').innerHTML = `
    <th>课程代码</th><th>课程名称</th><th>学分</th><th>学时</th>
    <th>学期</th><th>学院</th><th>学生人数</th><th>上课时间</th><th>教室</th><th>类别</th><th>操作</th>
  `;
}

function collectFilters() {
  return {
    semester: document.getElementById('filterSemester').value,
    college: document.getElementById('filterCollege').value,
    category: document.getElementById('filterCategory').value,
    keyword: document.getElementById('filterKeyword').value.trim()
  };
}

function resetFilters() {
  document.getElementById('filterSemester').value = '';
  document.getElementById('filterCollege').value = '';
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterKeyword').value = '';
  currentPage = 1;
  loadData();
}

async function loadData() {
  const myToken = ++loadToken;
  currentFilters = collectFilters();

  try {
    const [statsRes, coursesRes] = await Promise.all([
      API.getTeacherStats(teacherInfo.id),
      API.getCourses({ teacherId: teacherInfo.id, ...currentFilters, page: currentPage, pageSize: PAGE_SIZE })
    ]);

    if (myToken !== loadToken) return;

    const stats = statsRes;
    const list = coursesRes.data;
    const total = coursesRes.total;
    const page = coursesRes.page;
    const pageSize = coursesRes.pageSize;

    renderTeacherStats(stats);
    document.getElementById('resultCount').textContent = `共 ${total} 门课程`;
    renderTeacherTable(list);

    const paginationEl = document.getElementById('pagination');
    if (paginationEl) {
      renderPagination(paginationEl, total, page, pageSize, p => {
        currentPage = p;
        loadData();
      });
    }
  } catch (e) {
    if (myToken !== loadToken) return;
    safeAlert('加载课程列表失败：' + e.message);
  }
}

function renderTeacherStats(stats) {
  const cards = [
    { label: '本学期授课数', value: stats.courseCount },
    { label: '学生总人次', value: stats.studentTotal },
    { label: '总授课学时', value: stats.hoursTotal }
  ];
  document.getElementById('statsRow').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${escapeHtml(c.value ?? 0)}</div>
    </div>
  `).join('');
}

function renderTeacherTable(list) {
  const tableBody = document.getElementById('tableBody');
  if (!list || list.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="11">
        <div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">您当前暂无授课课程</div></div>
      </td></tr>`;
    return;
  }
  tableBody.innerHTML = list.map(c => `
    <tr>
      <td>${escapeHtml(c.code)}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.credit)}</td>
      <td>${escapeHtml(c.hours)}</td>
      <td><span class="tag tag-semester">${escapeHtml(c.semester)}</span></td>
      <td>${escapeHtml(c.college)}</td>
      <td>${escapeHtml(c.studentCount)}</td>
      <td>${escapeHtml(c.schedule)}</td>
      <td>${escapeHtml(c.classroom)}</td>
      <td><span class="tag ${c.category === '必修' ? 'tag-required' : 'tag-elective'}">${escapeHtml(c.category)}</span></td>
      <td><button class="view-btn" data-id="${escapeHtml(c.id)}">详情</button></td>
    </tr>
  `).join('');
}

// ---- Sprint3：我的课程评价统计 ----

async function loadEvaluationStats() {
  try {
    const res = await API.getTeacherEvaluationStats(teacherInfo.id);
    const { overall, byCourse } = res.data;
    renderEvalStatsOverview(overall, byCourse);
    renderEvalStatTable(byCourse);
  } catch (e) {
    safeAlert('加载评价统计失败：' + e.message);
  }
}

function renderEvalStatsOverview(overall, byCourse) {
  document.getElementById('evalStatCount').textContent = `共 ${overall.evalCount} 条评价`;
  const cards = [
    { label: '评价总条数', value: overall.evalCount },
    { label: '总均分', value: overall.avgScore ?? '-' },
    { label: '被评价课程数', value: byCourse.length }
  ];
  document.getElementById('evalStatsRow').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${escapeHtml(c.value ?? 0)}</div>
    </div>
  `).join('');
}

function renderEvalStatTable(list) {
  const tbody = document.getElementById('evalStatBody');
  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-text">暂无评价数据</div></div>
      </td></tr>`;
    return;
  }
  const fmt = v => (v === null || v === undefined) ? '-' : v;
  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${escapeHtml(c.code)}</td>
      <td>${escapeHtml(c.name)}</td>
      <td><span class="tag tag-semester">${escapeHtml(c.semester)}</span></td>
      <td>${escapeHtml(c.evalCount)}</td>
      <td><strong>${escapeHtml(fmt(c.avgScore))}</strong></td>
      <td>${escapeHtml(fmt(c.studentAvg))}</td>
      <td>${escapeHtml(fmt(c.supervisorAvg))}</td>
      <td>${escapeHtml(fmt(c.peerAvg))}</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', init);
