// 教研室主任页面逻辑 - 统筹管理视角

let filterOptions = { semesters: [], colleges: [], departments: [], categories: [] };
let currentFilters = {};
let loadToken = 0;
let currentPage = 1;
const PAGE_SIZE = 50;

async function init() {
  const auth = getAuth();
  if (!auth || !auth.token || auth.role !== 'director') { redirectToLogin(); return; }

  setupLogout();
  setupModalClose();
  setupCourseTableDelegation();

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
      <label>教研室：</label>
      <select id="filterDepartment">
        <option value="">全部教研室</option>
        ${filterOptions.departments.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('')}
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
      <input type="text" id="filterKeyword" placeholder="课程名称/代码/教师">
    </div>
    <button class="btn btn-primary" id="searchBtn">查询</button>
    <button class="btn btn-default" id="resetBtn">重置</button>
  `;

  document.getElementById('tableHead').innerHTML = `
    <th>课程代码</th><th>课程名称</th><th>学分</th><th>学时</th>
    <th>授课教师</th><th>学期</th><th>学院</th><th>教研室</th>
    <th>教室</th><th>上课时间</th><th>学生人数</th><th>类别</th><th>操作</th>
  `;
}

function collectFilters() {
  return {
    semester: document.getElementById('filterSemester').value,
    college: document.getElementById('filterCollege').value,
    department: document.getElementById('filterDepartment').value,
    category: document.getElementById('filterCategory').value,
    keyword: document.getElementById('filterKeyword').value.trim()
  };
}

function resetFilters() {
  document.getElementById('filterSemester').value = '';
  document.getElementById('filterCollege').value = '';
  document.getElementById('filterDepartment').value = '';
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
      API.getStats(),
      API.getCourses({ ...currentFilters, page: currentPage, pageSize: PAGE_SIZE })
    ]);

    if (myToken !== loadToken) return;

    const stats = statsRes;
    const list = coursesRes.data;
    const total = coursesRes.total;
    const page = coursesRes.page;
    const pageSize = coursesRes.pageSize;

    renderDirectorStats(stats, list);
    document.getElementById('resultCount').textContent = `共 ${total} 门课程`;
    renderDirectorTable(list);

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

function renderDirectorStats(stats, courses) {
  const collegeCount = new Set(courses.map(c => c.college)).size;
  const deptCount = new Set(courses.map(c => c.department)).size;
  const cards = [
    { label: '课程总数', value: stats.courseCount, icon: '📚' },
    { label: '授课教师数', value: stats.teacherCount, icon: '👨‍🏫' },
    { label: '开课学院数', value: collegeCount, icon: '🏛️' },
    { label: '教研室数', value: deptCount, icon: '🏢' }
  ];
  document.getElementById('statsRow').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label} ${c.icon}</div>
      <div class="stat-value">${escapeHtml(c.value ?? 0)}</div>
    </div>
  `).join('');
}

function renderDirectorTable(list) {
  const tableBody = document.getElementById('tableBody');
  if (!list || list.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="13">
        <div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">暂无符合条件的课程</div></div>
      </td></tr>`;
    return;
  }
  tableBody.innerHTML = list.map(c => `
    <tr>
      <td>${escapeHtml(c.code)}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.credit)}</td>
      <td>${escapeHtml(c.hours)}</td>
      <td>${escapeHtml(c.teacher)}</td>
      <td><span class="tag tag-semester">${escapeHtml(c.semester)}</span></td>
      <td>${escapeHtml(c.college)}</td>
      <td>${escapeHtml(c.department)}</td>
      <td>${escapeHtml(c.classroom)}</td>
      <td>${escapeHtml(c.schedule)}</td>
      <td>${escapeHtml(c.studentCount)}</td>
      <td><span class="tag ${c.category === '必修' ? 'tag-required' : 'tag-elective'}">${escapeHtml(c.category)}</span></td>
      <td><button class="view-btn" data-id="${escapeHtml(c.id)}">详情</button></td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', init);
