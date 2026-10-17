// 登录/角色选择页逻辑（Sprint2：后端登录换取 token）

let selectedRole = null;
let selectedTeacher = null;
let teachersCache = [];

async function init() {
  // 已登录直接进入对应页面
  const existing = getAuth();
  if (existing && existing.token && existing.role) {
    const targets = { director: '/director.html', teacher: '/teacher.html', supervisor: '/supervisor.html' };
    if (targets[existing.role]) location.href = targets[existing.role];
    return;
  }

  const roleOptions = document.querySelectorAll('.role-option');
  const loginBtn = document.getElementById('loginBtn');
  const teacherSelectArea = document.getElementById('teacherSelectArea');

  roleOptions.forEach(opt => {
    opt.addEventListener('click', async () => {
      roleOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedRole = opt.dataset.role;

      if (selectedRole === 'teacher') {
        teacherSelectArea.classList.add('show');
        await ensureTeacherOptions();
      } else {
        teacherSelectArea.classList.remove('show');
        const sel = document.getElementById('teacherSelect');
        if (sel) sel.value = '';
        selectedTeacher = null;
      }
      updateLoginBtn();
    });
  });

  const selectEl = document.getElementById('teacherSelect');
  if (selectEl) {
    selectEl.addEventListener('change', () => {
      selectedTeacher = teachersCache.find(t => t.id === selectEl.value) || null;
      updateLoginBtn();
    });
  }

  loginBtn.addEventListener('click', enterApp);
}

/** 首次选择教师角色时拉取公开登录名录，失败有兜底提示 */
async function ensureTeacherOptions() {
  const select = document.getElementById('teacherSelect');
  if (teachersCache.length > 0) return;
  try {
    teachersCache = await API.getLoginTeachers();
    select.innerHTML = '<option value="">请选择教师</option>' +
      teachersCache.map(t => `<option value="${t.id}">${t.name} (${t.title})</option>`).join('');
  } catch (e) {
    safeAlert('加载教师列表失败：' + (e.message || '未知错误'));
  }
}

function updateLoginBtn() {
  const loginBtn = document.getElementById('loginBtn');
  let enabled = !!selectedRole;
  if (selectedRole === 'teacher') enabled = enabled && !!selectedTeacher;
  loginBtn.disabled = !enabled;
}

/** 调用后端登录接口，成功后持久化 token 并跳转 */
async function enterApp() {
  if (!selectedRole) return;
  if (selectedRole === 'teacher' && !selectedTeacher) return;

  const loginBtn = document.getElementById('loginBtn');
  loginBtn.disabled = true;
  loginBtn.textContent = '登录中...';
  try {
    const data = await API.login(selectedRole, selectedTeacher ? selectedTeacher.id : undefined);
    setAuth({ token: data.token, role: data.role, teacher: data.teacher });
    const target = {
      director: '/director.html',
      teacher: '/teacher.html',
      supervisor: '/supervisor.html'
    };
    location.href = target[selectedRole];
  } catch (e) {
    safeAlert('登录失败：' + (e.message || '未知错误'));
    loginBtn.disabled = false;
    loginBtn.textContent = '进入系统';
  }
}

document.addEventListener('DOMContentLoaded', init);
