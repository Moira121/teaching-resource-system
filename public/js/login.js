// 登录/角色选择页逻辑

let selectedRole = null;
let selectedTeacher = null;
let teachersCache = [];

async function init() {
  try {
    teachersCache = await API.getTeachers();
    const select = document.getElementById('teacherSelect');
    select.innerHTML = '<option value="">请选择教师</option>' +
      teachersCache.map(t => `<option value="${t.id}">${t.name} (${t.title})</option>`).join('');
  } catch (e) {
    safeAlert('加载教师列表失败：' + (e.message || '未知错误'));
  }

  const roleOptions = document.querySelectorAll('.role-option');
  const loginBtn = document.getElementById('loginBtn');
  const teacherSelectArea = document.getElementById('teacherSelectArea');

  roleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      roleOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedRole = opt.dataset.role;

      if (selectedRole === 'teacher') {
        teacherSelectArea.classList.add('show');
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
      const val = selectEl.value;
      selectedTeacher = teachersCache.find(t => t.id === val) || null;
      updateLoginBtn();
    });
  }

  loginBtn.addEventListener('click', enterApp);
}

function updateLoginBtn() {
  const loginBtn = document.getElementById('loginBtn');
  let enabled = !!selectedRole;
  if (selectedRole === 'teacher') enabled = enabled && !!selectedTeacher;
  loginBtn.disabled = !enabled;
}

function enterApp() {
  if (!selectedRole) return;
  if (selectedRole === 'teacher' && !selectedTeacher) return;

  sessionStorage.clear();
  sessionStorage.setItem('role', selectedRole);

  if (selectedRole === 'teacher') {
    sessionStorage.setItem('teacherInfo', JSON.stringify(selectedTeacher));
  }

  const target = {
    director: '/director.html',
    teacher: '/teacher.html',
    supervisor: '/supervisor.html'
  };
  location.href = target[selectedRole];
}

document.addEventListener('DOMContentLoaded', init);
