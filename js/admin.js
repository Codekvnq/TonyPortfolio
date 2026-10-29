document.addEventListener('DOMContentLoaded', function () {
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

  if (sessionStorage.getItem('portfolioAdminAuthenticated') === 'true') showDashboard();
  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem('portfolioAdminAuthenticated', 'true');
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
    sessionStorage.removeItem('portfolioAdminAuthenticated');
    adminShell.classList.add('is-hidden');
    loginScreen.classList.remove('is-hidden');
    loginForm.reset();
    document.getElementById('loginUsername').focus();
  });
  document.querySelectorAll('.save-button').forEach((button) => button.addEventListener('click', () => showToast('Changes saved in prototype mode.')));
  document.getElementById('addProjectButton').addEventListener('click', () => showToast('Project editor coming next in the connected version.'));
  document.querySelectorAll('.switch').forEach((button) => button.addEventListener('click', () => {
    button.classList.toggle('on');
    showToast(button.classList.contains('on') ? 'Item marked as visible.' : 'Item hidden from the portfolio.');
  }));
  document.querySelectorAll('[data-demo-form] input, [data-demo-form] textarea').forEach((field) => field.addEventListener('input', () => {
    field.closest('.section-view')?.querySelector('.mini-hero strong')?.replaceChildren(document.querySelector('[value="Anthony Ampaabeng"]')?.value || 'Anthony Ampaabeng');
  }));
});
