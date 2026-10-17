// 爱教学平台 - 共享工具模块

async function rawRequest(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error('网络连接失败，请检查网络后重试');
  }
  if (!res.ok) throw new Error(`请求失败(${res.status})`);
  let json;
  try { json = await res.json(); } catch (e) { throw new Error('服务返回格式异常'); }
  if (json.code !== 0) throw new Error(json.message || '服务异常');
  return json;
}

function safeAlert(msg) {
  if (typeof alert === 'function') { alert(msg); }
}

const API = {
  async getTeachers() {
    const json = await rawRequest('/api/teachers');
    return json.data;
  },
  async getTeacher(id) {
    const json = await rawRequest(`/api/teachers/${id}`);
    return json.data;
  },
  async getCourses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/api/courses?${qs}` : '/api/courses';
    const json = await rawRequest(url);
    return json;
  },
  async getCourse(id) {
    const json = await rawRequest(`/api/courses/${id}`);
    return json.data;
  },
  async getTeacherCourses(teacherId) {
    const json = await rawRequest(`/api/teachers/${teacherId}/courses`);
    return json.data;
  },
  async getStats() {
    const json = await rawRequest('/api/stats');
    return json.data;
  },
  async getTeacherStats(teacherId) {
    const json = await rawRequest(`/api/teachers/${teacherId}/stats`);
    return json.data;
  },
  async getFilterOptions() {
    const json = await rawRequest('/api/filter-options');
    return json.data;
  }
};

function renderStats(statsRow, stats, isTeacher = false) {
  if (!stats) return;
  const cards = isTeacher
    ? [
        { label: '我的课程数', value: stats.courseCount },
        { label: '学生总人次', value: stats.studentTotal },
        { label: '总学时', value: stats.hoursTotal }
      ]
    : [
        { label: '课程总数', value: stats.courseCount },
        { label: '授课教师数', value: stats.teacherCount },
        { label: '学生总人次', value: stats.studentTotal },
        { label: '总学时', value: stats.hoursTotal }
      ];

  statsRow.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.value ?? 0}</div>
    </div>
  `).join('');
}

function setupCourseTableDelegation() {
  const tableBody = document.getElementById('tableBody');
  if (tableBody && !tableBody.dataset.delegated) {
    tableBody.dataset.delegated = '1';
    tableBody.addEventListener('click', e => {
      const btn = e.target.closest('.view-btn');
      if (btn) showCourseDetail(btn.dataset.id);
    });
  }
}

function renderCourseTable(tableBodyEl, list, showTeacher = true) {
  if (!list || list.length === 0) {
    tableBodyEl.innerHTML = `
      <tr>
        <td colspan="${showTeacher ? 10 : 9}">
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-text">暂无符合条件的课程数据</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const teacherCell = c => showTeacher ? `<td>${c.teacher}</td>` : '';
  tableBodyEl.innerHTML = list.map(c => `
    <tr>
      <td>${c.code}</td>
      <td>${c.name}</td>
      <td>${c.credit}</td>
      <td>${c.hours}</td>
      ${teacherCell(c)}
      <td><span class="tag tag-semester">${c.semester}</span></td>
      <td>${c.college}</td>
      <td>${c.studentCount}</td>
      <td><span class="tag ${c.category === '必修' ? 'tag-required' : 'tag-elective'}">${c.category}</span></td>
      <td><button class="view-btn" data-id="${c.id}">详情</button></td>
    </tr>
  `).join('');
}

function renderPagination(paginationEl, total, page, pageSize, onChange) {
  if (!paginationEl) return;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }
  let html = `<button class="page-btn" data-page="1" ${page === 1 ? 'disabled' : ''}>首页</button>`;
  html += `<button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>上一页</button>`;

  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>下一页</button>`;
  html += `<button class="page-btn" data-page="${totalPages}" ${page === totalPages ? 'disabled' : ''}>末页</button>`;
  html += `<span class="page-info">共 ${total} 条 / ${totalPages} 页</span>`;
  paginationEl.innerHTML = html;

  paginationEl.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.dataset.page, 10);
      if (!isNaN(target) && target >= 1 && target <= totalPages) onChange(target);
    });
  });
}

async function showCourseDetail(courseId) {
  try {
    const course = await API.getCourse(courseId);
    if (!course) {
      safeAlert('课程信息不存在');
      return;
    }
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">课程代码</div>
          <div class="detail-value">${course.code || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">课程名称</div>
          <div class="detail-value">${course.name || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">学分</div>
          <div class="detail-value">${course.credit ?? '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">学时</div>
          <div class="detail-value">${course.hours ?? '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">授课教师</div>
          <div class="detail-value">${course.teacher || '-'}（${course.teacherTitle || '-'}）</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">课程类别</div>
          <div class="detail-value">
            <span class="tag ${course.category === '必修' ? 'tag-required' : 'tag-elective'}">${course.category || '-'}</span>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">学期</div>
          <div class="detail-value">${course.semester || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">学生人数</div>
          <div class="detail-value">${course.studentCount ?? 0} 人</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">开课学院</div>
          <div class="detail-value">${course.college || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">教研室</div>
          <div class="detail-value">${course.department || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">上课教室</div>
          <div class="detail-value">${course.classroom || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">上课时间</div>
          <div class="detail-value">${course.schedule || '-'}</div>
        </div>
      </div>
    `;
    document.getElementById('detailModal').classList.add('show');
  } catch (e) {
    safeAlert('加载课程详情失败：' + (e.message || '未知错误'));
  }
}

function setupModalClose() {
  const closeBtn = document.getElementById('modalClose');
  const modal = document.getElementById('detailModal');
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
  if (modal) modal.addEventListener('click', e => {
    if (e.target.id === 'detailModal') modal.classList.remove('show');
  });
}

function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.addEventListener('click', () => {
    sessionStorage.clear();
    location.href = '/index.html';
  });
}
