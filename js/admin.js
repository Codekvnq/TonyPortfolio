(function initializeAdmin() {
  const loginScreen = document.getElementById('loginScreen');
  const adminShell = document.querySelector('.admin-shell');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123!';

  function showDashboard() {
    loginScreen.classList.add('is-hidden');
    adminShell.classList.remove('is-hidden');
  }

  function hasActiveSession() {
    try {
      return window.sessionStorage.getItem('portfolioAdminAuthenticated') === 'true';
    } catch {
      return false;
    }
  }

  function saveSession() {
    try {
      window.sessionStorage.setItem('portfolioAdminAuthenticated', 'true');
    } catch {
      // The preview can block storage access; the in-memory login still works.
    }
  }

  if (hasActiveSession()) showDashboard();
  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      saveSession();
      loginError.textContent = '';
      showDashboard();
      return;
    }
    loginError.textContent = 'Incorrect username or password.';
  });

  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section-view');
  const breadcrumb = document.getElementById('breadcrumb');
  const sidebar = document.getElementById('sidebar');
  const toast = document.getElementById('toast');
  const labels = { dashboard: 'Dashboard', profile: 'Profile & hero', portfolio: 'Portfolio', resume: 'Resume', contact: 'Contact details', social: 'Social links' };

  function openSection(name) {
    navItems.forEach((item) => item.classList.toggle('active', item.dataset.section === name));
    sections.forEach((section) => section.classList.toggle('active', section.id === `${name}-section`));
    breadcrumb.textContent = labels[name] || 'Dashboard';
    sidebar.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }

  navItems.forEach((item) => item.addEventListener('click', () => openSection(item.dataset.section)));
  document.querySelectorAll('[data-section-target]').forEach((button) => button.addEventListener('click', () => openSection(button.dataset.sectionTarget)));
  document.getElementById('menuButton').addEventListener('click', () => sidebar.classList.toggle('open'));
  document.getElementById('logoutButton').addEventListener('click', () => {
    try {
      window.sessionStorage.removeItem('portfolioAdminAuthenticated');
    } catch {
      // Storage may be unavailable in an embedded preview.
    }
    adminShell.classList.add('is-hidden');
    loginScreen.classList.remove('is-hidden');
    loginForm.reset();
    document.getElementById('loginUsername').focus();
  });
  document.querySelectorAll('.save-button').forEach((button) => button.addEventListener('click', () => showToast('Changes saved in prototype mode.')));
  const projectModal = document.getElementById('projectModal');
  const projectForm = document.getElementById('projectForm');
  const portfolioList = document.getElementById('portfolioList');
  const closeProjectModal = () => { projectModal.classList.remove('open'); projectModal.setAttribute('aria-hidden', 'true'); };
  document.getElementById('addProjectButton').addEventListener('click', () => { projectModal.classList.add('open'); projectModal.setAttribute('aria-hidden', 'false'); document.getElementById('projectTitle').focus(); });
  document.getElementById('closeProjectModal').addEventListener('click', closeProjectModal);
  document.getElementById('cancelProject').addEventListener('click', closeProjectModal);
  projectModal.addEventListener('click', (event) => { if (event.target === projectModal) closeProjectModal(); });
  projectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = document.getElementById('projectTitle').value.trim();
    const category = document.getElementById('projectCategory').value;
    const status = document.getElementById('projectStatus').value;
    const image = document.getElementById('projectImage').value.trim();
    const item = document.createElement('div');
    item.className = 'portfolio-item';
    item.innerHTML = `<img src="../${image.replace(/^\\//, '')}" alt="${title} project thumbnail"><div><strong>${title}</strong><small>Added just now</small></div><span>${category}</span><span class="toggle-row"><button class="switch ${status === 'published' ? 'on' : ''}" aria-label="Toggle project visibility"></button> ${status === 'published' ? 'Published' : 'Draft'}</span><button class="more-button" aria-label="More options">•••</button>`;
    portfolioList.appendChild(item);
    const projectCount = document.getElementById('projectCount');
    if (projectCount) projectCount.textContent = String(Number(projectCount.textContent) + 1);
    item.querySelector('.switch').addEventListener('click', (event) => { event.currentTarget.classList.toggle('on'); showToast(event.currentTarget.classList.contains('on') ? 'Project marked as visible.' : 'Project hidden from portfolio.'); });
    projectForm.reset();
    closeProjectModal();
    showToast('Project added in prototype mode.');
  });
  document.querySelectorAll('.switch').forEach((button) => button.addEventListener('click', () => {
    button.classList.toggle('on');
    showToast(button.classList.contains('on') ? 'Item marked as visible.' : 'Item hidden from the portfolio.');
  }));
  document.querySelectorAll('[data-demo-form] input, [data-demo-form] textarea').forEach((field) => field.addEventListener('input', () => {
    field.closest('.section-view')?.querySelector('.mini-hero strong')?.replaceChildren(document.querySelector('[value="Anthony Ampaabeng"]')?.value || 'Anthony Ampaabeng');
  }));
})();
