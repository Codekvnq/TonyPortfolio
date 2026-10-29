/**
 * Portfolio admin dashboard.
 *
 * Prototype authentication (hardcoded credentials) + content editing backed by
 * the shared localStorage store in js/site-data.js. Public pages pick the
 * changes up through js/site-content.js when they are reloaded.
 */
(function () {
  'use strict';

  var ADMIN_USERNAME = 'admin';
  var ADMIN_PASSWORD = 'admin123!';
  var SESSION_KEY = 'portfolioAdminSession';
  var SECTIONS = {
    dashboard: 'Dashboard',
    profile: 'Profile & hero',
    portfolio: 'Portfolio',
    resume: 'Resume',
    contact: 'Contact',
    social: 'Social links'
  };

  var store = window.PortfolioStore;
  if (!store) return;

  var state = store.getContent();
  var $ = function (selector, scope) { return (scope || document).querySelector(selector); };
  var $$ = function (selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Stored paths are relative to the site root; the admin lives in /admin/. */
  function assetUrl(path) {
    if (!path) return '';
    if (/^(https?:)?\/\//i.test(path) || path.charAt(0) === '/' || path.indexOf('data:') === 0) return path;
    return '../' + path.replace(/^\.?\//, '');
  }

  /* ---------------- Toast ---------------- */
  var toast = $('#toast');
  var toastTimer;
  function showToast(message, isError) {
    toast.textContent = message;
    toast.classList.toggle('error', !!isError);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2800);
  }

  /* ---------------- Auth ---------------- */
  var loginScreen = $('#loginScreen');
  var adminShell = $('#adminShell');
  var loginForm = $('#loginForm');
  var loginError = $('#loginError');

  function signedIn() {
    try { return window.sessionStorage.getItem(SESSION_KEY) === 'true'; } catch (error) { return false; }
  }
  function setSignedIn(value) {
    try {
      if (value) window.sessionStorage.setItem(SESSION_KEY, 'true');
      else window.sessionStorage.removeItem(SESSION_KEY);
    } catch (error) { /* storage can be blocked in an embedded preview */ }
  }
  function enterApp() {
    loginScreen.classList.add('is-hidden');
    adminShell.classList.remove('is-hidden');
    openSection(location.hash.replace('#', '') || 'dashboard');
    renderAll();
  }
  function leaveApp() {
    adminShell.classList.add('is-hidden');
    loginScreen.classList.remove('is-hidden');
    loginForm.reset();
    $('#loginUsername').value = 'admin';
    $('#loginPassword').value = '';
    loginError.textContent = '';
    $('#loginPassword').focus();
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var username = $('#loginUsername').value.trim();
    var password = $('#loginPassword').value;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setSignedIn(true);
      loginError.textContent = '';
      enterApp();
      return;
    }
    loginError.textContent = 'These credentials do not match our records.';
    $('#loginPassword').focus();
  });

  $('#logoutButton').addEventListener('click', function () {
    setSignedIn(false);
    leaveApp();
    showToast('Signed out.');
  });

  /* ---------------- Section routing ---------------- */
  var navItems = $$('.nav-item');
  function openSection(name) {
    if (!SECTIONS[name]) name = 'dashboard';
    navItems.forEach(function (item) { item.classList.toggle('active', item.dataset.section === name); });
    $$('.view').forEach(function (view) { view.classList.toggle('active', view.id === 'view-' + name); });
    $('#breadcrumb').textContent = SECTIONS[name];
    $('#sidebar').classList.remove('open');
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', function (event) {
    var nav = event.target.closest('.nav-item');
    if (nav) { openSection(nav.dataset.section); return; }
    var go = event.target.closest('[data-go]');
    if (go) { openSection(go.dataset.go); return; }
    var add = event.target.closest('[data-action="add-project"]');
    if (add) { openProject(); }
  });

  $('#menuButton').addEventListener('click', function () { $('#sidebar').classList.toggle('open'); });

  /* ---------------- Dashboard ---------------- */
  function renderDashboard() {
    var projects = state.projects;
    var published = projects.filter(function (p) { return p.status === 'published'; });
    var socials = Object.keys(state.social || {}).filter(function (key) { return state.social[key].visible !== false && state.social[key].url; });

    $('#statProjects').textContent = projects.length;
    $('#statProjectsMeta').textContent = projects.length === 1 ? '1 item on the site' : projects.length + ' items on the site';
    $('#statPublished').textContent = published.length;
    $('#statDrafts').textContent = projects.length - published.length;
    $('#statSocial').textContent = socials.length;

    var recent = projects.slice().reverse().slice(0, 5);
    $('#recentProjects').innerHTML = recent.length ? recent.map(function (project) {
      return '<tr>' +
        '<td><div class="cell-project"><img src="' + esc(assetUrl(project.image)) + '" alt=""><div><strong>' + esc(project.title) + '</strong><small>' + esc(project.category || 'Uncategorised') + '</small></div></div></td>' +
        '<td>' + esc(project.category || '—') + '</td>' +
        '<td><span class="badge ' + (project.status === 'draft' ? 'draft' : 'published') + '">' + esc(project.status) + '</span></td>' +
        '</tr>';
    }).join('') : '<tr class="empty-row"><td colspan="3">No projects yet — add your first design.</td></tr>';
  }

  /* ---------------- Portfolio ---------------- */
  function renderProjects() {
    var tbody = $('#projectsTable');
    if (!state.projects.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No projects yet. Use “Add project” to publish your first design.</td></tr>';
      return;
    }
    tbody.innerHTML = state.projects.map(function (project) {
      return '<tr data-id="' + esc(project.id) + '">' +
        '<td><div class="cell-project"><img src="' + esc(assetUrl(project.image)) + '" alt=""><div><strong>' + esc(project.title) + '</strong><small>' + esc(project.description || 'No description') + '</small></div></div></td>' +
        '<td>' + esc(project.category || '—') + '</td>' +
        '<td><span class="badge ' + (project.status === 'draft' ? 'draft' : 'published') + '">' + esc(project.status) + '</span></td>' +
        '<td><div class="cell-actions">' +
        '<button class="btn-icon" type="button" data-edit="' + esc(project.id) + '" title="Edit project"><svg width="15" height="15"><use href="#i-edit"/></svg></button>' +
        '<button class="btn-icon danger" type="button" data-delete="' + esc(project.id) + '" title="Delete project"><svg width="15" height="15"><use href="#i-trash"/></svg></button>' +
        '</div></td>' +
        '</tr>';
    }).join('');
  }

  $('#projectsTable').addEventListener('click', function (event) {
    var edit = event.target.closest('[data-edit]');
    if (edit) {
      var project = state.projects.filter(function (p) { return p.id === edit.dataset.edit; })[0];
      if (project) openProject(project);
      return;
    }
    var del = event.target.closest('[data-delete]');
    if (del) {
      var target = state.projects.filter(function (p) { return p.id === del.dataset.delete; })[0];
      if (!target) return;
      if (!window.confirm('Delete “' + target.title + '”? It will be removed from your portfolio page.')) return;
      state.projects = state.projects.filter(function (p) { return p.id !== target.id; });
      persist('Project deleted.');
    }
  });

  /* ---------------- Project modal ---------------- */
  var projectModal = $('#projectModal');
  var projectForm = $('#projectForm');

  function setPreview(path) {
    var wrap = $('#imagePreview');
    var img = $('#imagePreviewImg');
    if (!path) { wrap.classList.add('broken'); img.removeAttribute('src'); return; }
    wrap.classList.remove('broken');
    img.src = assetUrl(path);
    img.onerror = function () { wrap.classList.add('broken'); };
  }

  function openProject(project) {
    var editing = !!project;
    $('#projectModalTitle').textContent = editing ? 'Edit project' : 'Add project';
    $('#saveProject').textContent = editing ? 'Save changes' : 'Add project';
    $('#projectId').value = editing ? project.id : '';
    $('#projectTitle').value = editing ? project.title : '';
    $('#projectCategory').value = editing ? project.category || '' : '';
    $('#projectImage').value = editing ? project.image || '' : '';
    $('#projectDescription').value = editing ? project.description || '' : '';
    $('#projectStatus').value = editing ? project.status || 'published' : 'published';
    setPreview(editing ? project.image : '');
    projectModal.classList.add('open');
    projectModal.setAttribute('aria-hidden', 'false');
    $('#projectTitle').focus();
  }

  function closeProject() {
    projectModal.classList.remove('open');
    projectModal.setAttribute('aria-hidden', 'true');
  }

  $('#closeProjectModal').addEventListener('click', closeProject);
  $('#cancelProject').addEventListener('click', closeProject);
  projectModal.addEventListener('click', function (event) { if (event.target === projectModal) closeProject(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeProject(); });
  $('#projectImage').addEventListener('input', function (event) { setPreview(event.target.value.trim()); });

  projectForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var title = $('#projectTitle').value.trim();
    var image = $('#projectImage').value.trim();
    if (!title || !image) {
      showToast('A title and an image are required.', true);
      return;
    }
    var id = $('#projectId').value;
    var payload = {
      title: title,
      category: $('#projectCategory').value.trim(),
      image: image,
      description: $('#projectDescription').value.trim(),
      status: $('#projectStatus').value
    };
    if (id) {
      state.projects = state.projects.map(function (project) {
        return project.id === id ? Object.assign({}, project, payload) : project;
      });
      showToast('Project updated.');
    } else {
      payload.id = 'c' + Date.now();
      state.projects.push(payload);
      showToast('Project added to your portfolio.');
    }
    closeProject();
    persist(null);
  });

  /* ---------------- Profile ---------------- */
  function renderProfile() {
    $('#profileName').value = state.profile.name || '';
    $('#profileTitle').value = state.profile.title || '';
    $('#profileIntro').value = state.profile.intro || '';
  }
  $('#profileForm').addEventListener('submit', function (event) {
    event.preventDefault();
    state.profile = {
      name: $('#profileName').value.trim(),
      title: $('#profileTitle').value.trim(),
      intro: $('#profileIntro').value.trim()
    };
    persist('Hero updated.');
  });

  /* ---------------- Resume ---------------- */
  function repeatRow(kind, entry, index, label) {
    return '<div class="repeat-row" data-' + kind + '-index="' + index + '">' +
      '<div class="repeat-head"><strong>' + label + ' ' + (index + 1) + '</strong></div>' +
      '<div class="field-grid three">' +
      '<label class="field"><span>Period</span><input data-field="period" type="text" value="' + esc(entry.period) + '"></label>' +
      '<label class="field"><span>' + (kind === 'job' ? 'Role' : 'Qualification') + '</span><input data-field="role" type="text" value="' + esc(entry.role) + '"></label>' +
      '<label class="field"><span>' + (kind === 'job' ? 'Company / place' : 'School / place') + '</span><input data-field="place" type="text" value="' + esc(entry.place) + '"></label>' +
      '</div>' +
      '<label class="field" style="margin-bottom:0"><span>Description</span><textarea data-field="description" rows="2">' + esc(entry.description) + '</textarea></label>' +
      '</div>';
  }

  function renderResume() {
    $('#jobsEditor').innerHTML = state.resume.jobs.map(function (job, index) {
      return repeatRow('job', job, index, 'Position');
    }).join('');
    $('#educationEditor').innerHTML = state.resume.education.map(function (item, index) {
      return repeatRow('edu', item, index, 'Entry');
    }).join('');
    $('#skillsEditor').innerHTML = state.resume.skills.map(function (skill, index) {
      return '<div class="skill-row" data-skill-index="' + index + '">' +
        '<input data-field="name" type="text" value="' + esc(skill.name) + '" aria-label="Skill name">' +
        '<input data-field="level" type="range" min="0" max="100" step="5" value="' + esc(skill.level) + '" aria-label="Skill level">' +
        '<input data-field="levelValue" type="number" min="0" max="100" value="' + esc(skill.level) + '" aria-label="Skill percentage">' +
        '</div>';
    }).join('');
  }

  // keep range and number inputs in sync
  $('#skillsEditor').addEventListener('input', function (event) {
    var row = event.target.closest('.skill-row');
    if (!row) return;
    var range = $('input[type="range"]', row);
    var number = $('input[type="number"]', row);
    if (event.target === range) number.value = range.value;
    if (event.target === number) range.value = number.value;
  });

  function collectRepeat(kind) {
    return $$('[data-' + kind + '-index]', kind === 'job' ? $('#jobsEditor') : $('#educationEditor')).map(function (row) {
      return {
        period: $('[data-field="period"]', row).value.trim(),
        role: $('[data-field="role"]', row).value.trim(),
        place: $('[data-field="place"]', row).value.trim(),
        description: $('[data-field="description"]', row).value.trim()
      };
    });
  }

  $('#resumeForm').addEventListener('submit', function (event) {
    event.preventDefault();
    state.resume.jobs = collectRepeat('job');
    state.resume.education = collectRepeat('edu');
    state.resume.skills = $$('.skill-row', $('#skillsEditor')).map(function (row) {
      return {
        name: $('[data-field="name"]', row).value.trim(),
        level: parseInt($('input[type="number"]', row).value, 10) || 0
      };
    });
    persist('Resume updated.');
  });

  /* ---------------- Contact ---------------- */
  function renderContact() {
    $('#contactEmail').value = state.contact.email || '';
    $('#contactPhone').value = state.contact.phone || '';
    $('#contactLocation').value = state.contact.location || '';
    $('#contactAvailability').value = state.contact.availability || '';
  }
  $('#contactForm').addEventListener('submit', function (event) {
    event.preventDefault();
    state.contact = {
      email: $('#contactEmail').value.trim(),
      phone: $('#contactPhone').value.trim(),
      location: $('#contactLocation').value.trim(),
      availability: $('#contactAvailability').value.trim()
    };
    persist('Contact details updated.');
  });

  /* ---------------- Social ---------------- */
  var SOCIAL_META = [
    { key: 'facebook', label: 'Facebook', badge: 'f' },
    { key: 'linkedin', label: 'LinkedIn', badge: 'in' },
    { key: 'tiktok', label: 'TikTok', badge: '♪' },
    { key: 'whatsapp', label: 'WhatsApp', badge: 'wa' }
  ];

  function renderSocial() {
    $('#socialEditor').innerHTML = SOCIAL_META.map(function (meta) {
      var link = state.social[meta.key] || { url: '', visible: true };
      return '<div class="social-row" data-network="' + meta.key + '">' +
        '<span class="social-badge ' + meta.key + '">' + meta.badge + '</span>' +
        '<label class="social-name">' + meta.label + '</label>' +
        '<input type="url" data-field="url" value="' + esc(link.url) + '" placeholder="https://">' +
        '<label class="switch" title="Show on site"><input type="checkbox" data-field="visible"' + (link.visible === false ? '' : ' checked') + '><span class="track"></span></label>' +
        '</div>';
    }).join('');
  }

  $('#socialForm').addEventListener('submit', function (event) {
    event.preventDefault();
    state.social = {};
    $$('.social-row', $('#socialEditor')).forEach(function (row) {
      state.social[row.dataset.network] = {
        url: $('[data-field="url"]', row).value.trim(),
        visible: $('[data-field="visible"]', row).checked
      };
    });
    persist('Social links updated.');
  });

  /* ---------------- Persistence ---------------- */
  function persist(message) {
    try {
      store.saveContent(state);
    } catch (error) {
      showToast('This browser blocked local storage, so the change could not be saved.', true);
      return;
    }
    renderAll();
    if (message) showToast(message);
  }

  function renderAll() {
    renderDashboard();
    renderProjects();
    renderProfile();
    renderResume();
    renderContact();
    renderSocial();
  }

  window.addEventListener('hashchange', function () {
    if (!adminShell.classList.contains('is-hidden')) openSection(location.hash.replace('#', ''));
  });

  if (signedIn()) enterApp();
})();
