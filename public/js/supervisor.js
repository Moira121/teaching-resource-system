// 教学督导页面逻辑 - 听课评估视角

let teachers = [];
let filterOptions = { semesters: [], colleges: [], categories: [] };
let currentFilters = {};
let loadToken = 0;
let currentPage = 1;
const PAGE_SIZE = 50;

async function init() {
  const auth = getAuth();
  if (!auth || !auth.token || auth.role !== 'supervisor') { redirectToLogin(); return; }

  setupLogout();
  setupModalClose();
  setupCourseTableDelegation();

  try {
    const [t, fo] = await Promise.all([
      API.getTeachers(),
      API.getFilterOptions()
    ]);
    teachers = t;
    filterOptions = fo;
  } catch (e) {
    safeAlert('加载基础数据失败：' + e.message);
  }
  renderFilters();
  await loadData();
  renderEvalFilters();
  await loadEvaluations();

  document.getElementById('searchBtn').addEventListener('click', () => { currentPage = 1; loadData(); });
  document.getElementById('resetBtn').addEventListener('click', resetFilters);
  document.getElementById('filterKeyword').addEventListener('keypress', e => {
    if (e.key === 'Enter') { currentPage = 1; loadData(); }
  });
  document.getElementById('filterTeacher').addEventListener('change', () => {
    currentPage = 1;
    loadData();
    loadEvaluations();
  });
  document.getElementById('evalFilterSemester').addEventListener('change', loadEvaluations);
  document.getElementById('evalFilterRole').addEventListener('change', loadEvaluations);
}

function renderFilters() {
  const filterRow = document.getElementById('filterRow');
  filterRow.innerHTML = `
    <div class="filter-item" style="flex:1;min-width:260px;">
      <label>授课教师：</label>
      <select id="filterTeacher" style="min-width:200px;font-weight:600;">
        <option value="">全部教师（选择教师以确定听课对象）</option>
        ${teachers.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}（${escapeHtml(t.title)}）</option>`).join('')}
      </select>
    </div>
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
    <th>课程代码</th><th>课程名称</th><th>授课教师</th><th>职称</th>
    <th>学期</th><th>学院</th><th>学生人数</th><th>上课时间</th><th>教室</th><th>类别</th><th>操作</th>
  `;
}

function collectFilters() {
  return {
    teacherId: document.getElementById('filterTeacher').value,
    semester: document.getElementById('filterSemester').value,
    college: document.getElementById('filterCollege').value,
    category: document.getElementById('filterCategory').value,
    keyword: document.getElementById('filterKeyword').value.trim()
  };
}

function resetFilters() {
  document.getElementById('filterTeacher').value = '';
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
  const selectedTeacherId = currentFilters.teacherId;

  try {
    let statsPromise;
    if (selectedTeacherId) {
      statsPromise = API.getTeacherStats(selectedTeacherId);
    } else {
      statsPromise = API.getStats();
    }

    const coursesPromise = API.getCourses({ ...currentFilters, page: currentPage, pageSize: PAGE_SIZE });
    const [statsRes, coursesRes] = await Promise.all([statsPromise, coursesPromise]);

    if (myToken !== loadToken) return;

    const stats = statsRes;
    const list = coursesRes.data;
    const total = coursesRes.total;
    const page = coursesRes.page;
    const pageSize = coursesRes.pageSize;

    renderSupervisorStats(stats, selectedTeacherId);
    document.getElementById('resultCount').textContent = `共 ${total} 门课程`;
    renderSupervisorTable(list);

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

function renderSupervisorStats(stats, selectedTeacherId) {
  let teacherLabel, teacherValue;
  if (selectedTeacherId) {
    const t = teachers.find(x => x.id === selectedTeacherId);
    teacherLabel = '当前听课教师';
    teacherValue = t ? `${t.name}（${t.title}）` : '-';
  } else {
    teacherLabel = '可选听教师数';
    teacherValue = stats.teacherCount ?? stats.courseCount;
  }
  const cards = [
    { label: teacherLabel, value: teacherValue },
    { label: selectedTeacherId ? '该教师课程数' : '课程总数', value: stats.courseCount },
    { label: '学生总人次', value: stats.studentTotal },
    { label: '总学时', value: stats.hoursTotal }
  ];
  document.getElementById('statsRow').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${escapeHtml(c.value ?? 0)}</div>
    </div>
  `).join('');
}

function renderSupervisorTable(list) {
  const tableBody = document.getElementById('tableBody');
  if (!list || list.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="11">
        <div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">请选择教师查看其课程，确定听课对象</div></div>
      </td></tr>`;
    return;
  }
  tableBody.innerHTML = list.map(c => `
    <tr>
      <td>${escapeHtml(c.code)}</td>
      <td>${escapeHtml(c.name)}</td>
      <td><strong>${escapeHtml(c.teacher)}</strong></td>
      <td>${escapeHtml(c.teacherTitle || '-')}</td>
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

// ---- Sprint3：课程历史教学评价记录 ----

let evalLoadToken = 0;

function renderEvalFilters() {
  const row = document.getElementById('evalFilterRow');
  row.innerHTML = `
    <div class="filter-item">
      <label>学期：</label>
      <select id="evalFilterSemester">
        <option value="">全部学期</option>
        ${filterOptions.semesters.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
      </select>
    </div>
    <div class="filter-item">
      <label>评价来源：</label>
      <select id="evalFilterRole">
        <option value="">全部来源</option>
        <option value="学生">学生</option>
        <option value="督导">督导</option>
        <option value="同行">同行</option>
      </select>
    </div>
    <span class="user-sub">评价记录随上方"授课教师"筛选联动</span>
  `;
}

async function loadEvaluations() {
  const myToken = ++evalLoadToken;
  const params = {
    semester: document.getElementById('evalFilterSemester').value,
    evaluatorRole: document.getElementById('evalFilterRole').value
  };
  const teacherEl = document.getElementById('filterTeacher');
  if (teacherEl && teacherEl.value) params.teacherId = teacherEl.value;

  try {
    const res = await API.getEvaluations(params);
    if (myToken !== evalLoadToken) return;
    document.getElementById('evalCount').textContent = `共 ${res.total} 条评价`;
    renderEvaluationTable(res.data);
  } catch (e) {
    if (myToken !== evalLoadToken) return;
    safeAlert('加载评价记录失败：' + e.message);
  }
}

function renderEvaluationTable(list) {
  const tbody = document.getElementById('evalTableBody');
  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">暂无评价记录</div></div>
      </td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(ev => `
    <tr>
      <td><span class="tag tag-semester">${escapeHtml(ev.semester)}</span></td>
      <td>${escapeHtml(ev.courseCode)} ${escapeHtml(ev.courseName)}</td>
      <td><strong>${escapeHtml(ev.teacher)}</strong></td>
      <td>${escapeHtml(ev.evaluatorRole)}</td>
      <td><strong>${escapeHtml(ev.score)}</strong></td>
      <td>${escapeHtml(ev.comment || '-')}</td>
      <td>${escapeHtml(ev.evaluatedAt)}</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', init);
