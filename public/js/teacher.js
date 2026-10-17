// 教师本人页面逻辑

let filterOptions = { semesters: [], colleges: [], categories: [] };
let currentFilters = {};
let loadToken = 0;
let currentPage = 1;
const PAGE_SIZE = 50;
let teacherInfo = null;

function getTeacherInfo() {
  try {
    const raw = sessionStorage.getItem('teacherInfo');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function init() {
  setupLogout();
  setupModalClose();
  setupCourseTableDelegation();

  teacherInfo = getTeacherInfo();
  if (!teacherInfo || !teacherInfo.id) {
    safeAlert('未检测到登录状态，请重新登录');
    sessionStorage.clear();
    location.href = '/index.html';
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
        ${filterOptions.semesters.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </div>
    <div class="filter-item">
      <label>学院：</label>
      <select id="filterCollege">
        <option value="">全部学院</option>
        ${filterOptions.colleges.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
    </div>
    <div class="filter-item">
      <label>类别：</label>
      <select id="filterCategory">
        <option value="">全部类别</option>
        ${filterOptions.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
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
      <div class="stat-value">${c.value ?? 0}</div>
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
      <td>${c.code}</td>
      <td>${c.name}</td>
      <td>${c.credit}</td>
      <td>${c.hours}</td>
      <td><span class="tag tag-semester">${c.semester}</span></td>
      <td>${c.college}</td>
      <td>${c.studentCount}</td>
      <td>${c.schedule}</td>
      <td>${c.classroom}</td>
      <td><span class="tag ${c.category === '必修' ? 'tag-required' : 'tag-elective'}">${c.category}</span></td>
      <td><button class="view-btn" data-id="${c.id}">详情</button></td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', init);
