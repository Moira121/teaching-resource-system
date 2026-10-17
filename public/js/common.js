// 爱教学平台 - 共享工具模块（Sprint2：鉴权头/401 兜底/教学资源）

const AUTH_KEY = 'auth';

/* ---------------- 登录态 ---------------- */

function getAuth() {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setAuth(auth) {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

function clearAuth() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.clear();
}

/** 未登录/过期统一跳回登录页 */
function redirectToLogin() {
  clearAuth();
  if (!location.pathname.endsWith('/index.html') && location.pathname !== '/') {
    location.href = '/index.html';
  }
}

/**
 * 统一请求兜底层（Sprint1 B1）：
 * 自动携带鉴权头；网络异常/HTTP 非 2xx/业务码非 0 一律抛错；401 清理登录态。
 */
async function rawRequest(url, options = {}) {
  const auth = getAuth();
  const headers = options.headers || {};
  if (auth && auth.token) headers.Authorization = `Bearer ${auth.token}`;

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    throw new Error('网络连接失败，请检查网络后重试');
  }
  if (res.status === 401) {
    redirectToLogin();
    throw new Error('未登录或登录已过期，请重新登录');
  }
  if (!res.ok) throw new Error(`请求失败(${res.status})`);
  let json;
  try { json = await res.json(); } catch (e) { throw new Error('服务返回格式异常'); }
  if (json.code !== 0) throw new Error(json.message || '服务异常');
  return json;
}

function safeAlert(msg) {
  if (typeof alert === 'function') alert(msg);
}

const API = {
  /** 登录：成功后返回 { token, role, teacher }，由调用方持久化 */
  async login(role, teacherId) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, teacherId })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.code !== 0) {
      throw new Error((json && json.message) || `登录失败(${res.status})`);
    }
    return json.data;
  },
  async getTeachers() {
    return (await rawRequest('/api/teachers')).data;
  },
  /** 登录页公开名录（仅 id/name/title） */
  async getLoginTeachers() {
    return (await rawRequest('/api/auth/teachers')).data;
  },
  async getCourses(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return rawRequest(qs ? `/api/courses?${qs}` : '/api/courses');
  },
  async getCourse(id) {
    return (await rawRequest(`/api/courses/${id}`)).data;
  },
  async getStats() {
    return (await rawRequest('/api/stats')).data;
  },
  async getTeacherStats(teacherId) {
    return (await rawRequest(`/api/teachers/${teacherId}/stats`)).data;
  },
  async getFilterOptions() {
    return (await rawRequest('/api/filter-options')).data;
  },
  // ---- 教学资源（Sprint2）----
  async listResources(courseId) {
    return (await rawRequest(`/api/courses/${courseId}/resources`)).data;
  },
  async createResource(courseId, body) {
    const json = await rawRequest(`/api/courses/${courseId}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return json.data;
  },
  async updateResource(id, body) {
    const json = await rawRequest(`/api/resources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return json.data;
  },
  async deleteResource(id) {
    return rawRequest(`/api/resources/${id}`, { method: 'DELETE' });
  }
};

/* ---------------- 表格/分页/事件委托（Sprint1） ---------------- */

function setupCourseTableDelegation() {
  const tableBody = document.getElementById('tableBody');
  if (tableBody && !tableBody.dataset.delegated) {
    tableBody.dataset.delegated = '1';
    // 事件委托：一个监听器服务全部"详情"按钮，避免逐行绑定
    tableBody.addEventListener('click', e => {
      const btn = e.target.closest('.view-btn');
      if (btn) showCourseDetail(btn.dataset.id);
    });
  }
}

function renderPagination(paginationEl, total, page, pageSize, onChange) {
  if (!paginationEl) return;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }
  let html = `<button class="page-btn" data-page="1" ${page === 1 ? 'disabled' : ''}>首页</button>`;
  html += `<button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>上一页</button>`;
  let start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
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

/* ---------------- 课程详情 + 教学资源（Sprint2） ---------------- */

/** 详情弹窗打开后加载教学资源；教师本人课程显示增删改表单，其余角色只读 */
async function renderResourceSection(course) {
  const box = document.getElementById('resourceBox');
  if (!box) return;
  box.innerHTML = '<div class="res-loading">教学资源加载中...</div>';
  try {
    const list = await API.listResources(course.id);
    const auth = getAuth();
    const canManage = !!(auth && auth.role === 'teacher' && auth.teacher && auth.teacher.id === course.teacherId);

    let html = '<div class="res-list">';
    if (list.length === 0) {
      html += '<div class="res-empty">该课程暂无教学资源</div>';
    } else {
      list.forEach(r => {
        html += `
          <div class="res-item" data-res-id="${r.id}">
            <span class="res-type-tag">${r.type}</span>
            <a class="res-name" href="${r.url}" target="_blank" rel="noopener noreferrer">${r.name}</a>
            ${r.description ? `<span class="res-desc">${r.description}</span>` : ''}
            ${canManage ? `<button class="res-edit-btn" data-id="${r.id}">编辑</button><button class="res-delete-btn" data-id="${r.id}">删除</button>` : ''}
          </div>`;
      });
    }
    html += '</div>';

    if (canManage) {
      html += `
        <form class="res-form" id="resForm" data-course-id="${course.id}">
          <div class="res-form-title" id="resFormTitle">添加教学资源</div>
          <input type="hidden" id="resEditId" value="">
          <div class="res-form-row">
            <input type="text" id="resName" placeholder="资源名称（必填，≤100字）" maxlength="100" required>
            <select id="resType">
              <option value="课件">课件</option>
              <option value="文档">文档</option>
              <option value="视频">视频</option>
              <option value="链接">链接</option>
              <option value="作业">作业</option>
            </select>
          </div>
          <div class="res-form-row">
            <input type="url" id="resUrl" placeholder="资源链接 https://...（必填）" maxlength="500" required>
          </div>
          <div class="res-form-row">
            <input type="text" id="resDesc" placeholder="资源描述（选填，≤500字）" maxlength="500">
          </div>
          <div class="res-form-row">
            <button type="submit" class="btn btn-primary" id="resSubmitBtn">添加</button>
            <button type="button" class="btn btn-default" id="resCancelBtn" style="display:none;">取消编辑</button>
          </div>
        </form>`;
    }
    box.innerHTML = html;
    box.dataset.courseId = course.id;
    box.dataset.canManage = canManage ? '1' : '0';
  } catch (e) {
    box.innerHTML = `<div class="res-empty">教学资源加载失败：${e.message || '未知错误'}</div>`;
  }
}

/** 提交新增/编辑表单 */
async function submitResourceForm(form) {
  const courseId = form.dataset.courseId;
  const editId = document.getElementById('resEditId').value;
  const body = {
    name: document.getElementById('resName').value.trim(),
    type: document.getElementById('resType').value,
    url: document.getElementById('resUrl').value.trim(),
    description: document.getElementById('resDesc').value.trim()
  };
  if (!body.name || !body.url) { safeAlert('资源名称和链接为必填项'); return; }
  try {
    if (editId) {
      await API.updateResource(editId, body);
    } else {
      await API.createResource(courseId, body);
    }
    const course = await API.getCourse(courseId);
    await renderResourceSection(course);
  } catch (e) {
    safeAlert('保存教学资源失败：' + (e.message || '未知错误'));
  }
}

/** 点击"编辑"：把资源内容填入表单 */
async function fillResourceForm(resId) {
  const box = document.getElementById('resourceBox');
  const courseId = box.dataset.courseId;
  try {
    const list = await API.listResources(courseId);
    const r = list.find(x => x.id === resId);
    if (!r) return;
    document.getElementById('resEditId').value = r.id;
    document.getElementById('resName').value = r.name;
    document.getElementById('resType').value = r.type;
    document.getElementById('resUrl').value = r.url;
    document.getElementById('resDesc').value = r.description || '';
    document.getElementById('resFormTitle').textContent = '编辑教学资源';
    document.getElementById('resSubmitBtn').textContent = '保存修改';
    document.getElementById('resCancelBtn').style.display = '';
    document.getElementById('resName').focus();
  } catch (e) {
    safeAlert('加载资源信息失败：' + (e.message || '未知错误'));
  }
}

function resetResourceForm() {
  const form = document.getElementById('resForm');
  if (!form) return;
  form.reset();
  document.getElementById('resEditId').value = '';
  document.getElementById('resFormTitle').textContent = '添加教学资源';
  document.getElementById('resSubmitBtn').textContent = '添加';
  document.getElementById('resCancelBtn').style.display = 'none';
}

/** 弹窗内教学资源区事件委托（提交/编辑/删除），只绑定一次 */
function setupResourceDelegation() {
  const modal = document.getElementById('detailModal');
  if (!modal || modal.dataset.resDelegated) return;
  modal.dataset.resDelegated = '1';

  modal.addEventListener('submit', e => {
    if (e.target.id === 'resForm') {
      e.preventDefault();
      submitResourceForm(e.target);
    }
  });
  modal.addEventListener('click', async e => {
    const delBtn = e.target.closest('.res-delete-btn');
    const editBtn = e.target.closest('.res-edit-btn');
    const cancelBtn = e.target.closest('#resCancelBtn');
    if (delBtn) {
      if (!confirm('确认删除该教学资源？')) return;
      try {
        await API.deleteResource(delBtn.dataset.id);
        const courseId = document.getElementById('resourceBox').dataset.courseId;
        const course = await API.getCourse(courseId);
        await renderResourceSection(course);
      } catch (err) {
        safeAlert('删除失败：' + (err.message || '未知错误'));
      }
    } else if (editBtn) {
      await fillResourceForm(editBtn.dataset.id);
    } else if (cancelBtn) {
      resetResourceForm();
    }
  });
}

/** 打开课程详情：基础信息 + 教学资源（Sprint1 B3：空值保护 + try/catch） */
async function showCourseDetail(courseId) {
  try {
    const course = await API.getCourse(courseId);
    if (!course) { safeAlert('课程信息不存在'); return; }
    document.getElementById('modalBody').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">课程代码</div><div class="detail-value">${course.code || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">课程名称</div><div class="detail-value">${course.name || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">学分</div><div class="detail-value">${course.credit ?? '-'}</div></div>
        <div class="detail-item"><div class="detail-label">学时</div><div class="detail-value">${course.hours ?? '-'}</div></div>
        <div class="detail-item"><div class="detail-label">授课教师</div><div class="detail-value">${course.teacher || '-'}（${course.teacherTitle || '-'}）</div></div>
        <div class="detail-item"><div class="detail-label">课程类别</div><div class="detail-value">${course.category || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">学期</div><div class="detail-value">${course.semester || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">学生人数</div><div class="detail-value">${course.studentCount ?? 0} 人</div></div>
        <div class="detail-item"><div class="detail-label">开课学院</div><div class="detail-value">${course.college || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">教研室</div><div class="detail-value">${course.department || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">上课教室</div><div class="detail-value">${course.classroom || '-'}</div></div>
        <div class="detail-item"><div class="detail-label">上课时间</div><div class="detail-value">${course.schedule || '-'}</div></div>
      </div>
      <div class="resource-section">
        <div class="resource-title">📎 教学资源</div>
        <div id="resourceBox" data-course-id="${course.id}"></div>
      </div>`;
    document.getElementById('detailModal').classList.add('show');
    renderResourceSection(course);
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
  setupResourceDelegation();
}

function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.addEventListener('click', () => {
    clearAuth();
    location.href = '/index.html';
  });
}
