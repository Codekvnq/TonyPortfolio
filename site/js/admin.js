(function () {
  'use strict';

  var Store = window.PortfolioContent;

  var loginView = document.getElementById('loginView');
  var bootView = document.getElementById('bootView');
  var bootNote = document.getElementById('bootNote');
  var adminApp = document.getElementById('adminApp');
  var adminNotice = document.getElementById('adminNotice');
  var loginForm = document.getElementById('loginForm');
  var loginError = document.getElementById('loginError');
  var loginButton = loginForm.querySelector('button[type="submit"]');
  var pageContent = document.getElementById('pageContent');
  var pageCrumb = document.getElementById('pageCrumb');
  var sidebar = document.getElementById('sidebar');
  var sidebarScrim = document.getElementById('sidebarScrim');
  var menuButton = document.getElementById('menuButton');
  var notifButton = document.getElementById('notifButton');
  var notifPop = document.getElementById('notifPop');
  var notifDot = document.getElementById('notifDot');
  var userButton = document.getElementById('userButton');
  var userPop = document.getElementById('userPop');
  var globalSearch = document.getElementById('globalSearch');
  var searchPop = document.getElementById('searchPop');
  var saveIndicator = document.getElementById('saveIndicator');
  var saveText = document.getElementById('saveText');
  var navDraftCount = document.getElementById('navDraftCount');
  var toastRegion = document.getElementById('toastRegion');
  var dialogRoot = document.getElementById('dialogRoot');

  var state = {
    route: 'overview',
    projectQuery: '',
    projectCategory: 'all',
    projectStatus: 'all',
    data: Store.get(),
    refreshPreview: null,
    snapshot: null,
    editing: false,
    session: null,
    username: '',
    mustChange: false,
    loading: false
  };

  var saveTimer = null;
  var savingNow = false;
  var savePending = false;

  /* ------------------------------------------------------------------------
     Icons
     ------------------------------------------------------------------------ */

  var ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    fileText: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.4"/><path d="m21 15-5-5L5 21"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    arrowUp: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
    phone: '<path d="M6.6 3h-.9A2.7 2.7 0 0 0 3 5.7C3 14 10 21 18.3 21a2.7 2.7 0 0 0 2.7-2.7v-.9l-4-1.6-2 2a15.4 15.4 0 0 1-5.8-5.8l2-2Z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
    graduation: '<path d="m2 9 10-4 10 4-10 4z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    spark: '<path d="M12 3v3M12 18v3M4.2 7.2l2.1 2.1M17.7 14.7l2.1 2.1M3 12h3M18 12h3M4.2 16.8l2.1-2.1M17.7 9.3l2.1-2.1"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'
  };

  var SOCIAL_PATHS = {
    facebook: '<path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V3.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8V10H8v3h3.1v8z"/>',
    instagram: '<path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.5-3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"/>',
    linkedin: '<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3Zm6 0h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21H9Z"/>',
    x: '<path d="M18.9 3H22l-7.1 8.1L23 21h-6.6l-5.1-6.6L5.2 21H2l7.6-8.7L1.7 3h6.7l4.6 6zm-1.1 16h1.7L7.5 4.7H5.7z"/>',
    tiktok: '<path d="M16.6 5.8c.9 1.1 2.2 1.8 3.7 1.9v3.1c-1.6 0-3.1-.5-4.4-1.4v6.1a6.1 6.1 0 1 1-6.1-6.1c.3 0 .6 0 .9.1v3.2a2.9 2.9 0 1 0 2.1 2.8V2h3.2c.1 1.3.6 2.6 1.6 3.8z"/>',
    whatsapp: '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.6-5.9c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1-1.3-.6-2.1-1.1-3-2.5-.2-.4.2-.4.6-1.2.1-.2 0-.4 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.8.8-1 1.9-.7 3 .3 1.1 1 2.1 1.2 2.3.1.2 2 3.1 4.9 4.3 1.8.7 2.5.8 3.4.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.5-.3Z"/>',
    behance: '<path d="M8.3 6c2.4 0 4 1 4 3.2 0 1.3-.6 2.1-1.8 2.6 1.6.4 2.4 1.5 2.4 3.2 0 2.4-1.8 3.6-4.4 3.6H2V6Zm-.5 5c1.1 0 1.8-.5 1.8-1.5S8.9 8 7.8 8H4.8v3Zm.2 5.7c1.2 0 2-.6 2-1.7s-.8-1.7-2-1.7H4.8v3.4ZM14.5 6.5h6V8h-6Zm7 9.5c0 .3 0 .5-.1.8h-6.9c.1 1.2.9 1.9 2.1 1.9.9 0 1.6-.4 1.9-1h2.7c-.5 2.1-2.3 3.4-4.7 3.4-3 0-5-2-5-5s2-5.1 5-5.1c3.1 0 5 2.2 5 5Zm-7-.9h4.1c-.2-1.1-.9-1.8-2-1.8s-1.9.7-2.1 1.8Z"/>',
    dribbble: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.6 4.6a8 8 0 0 1 1.3 4.5c-.7-.1-2.4-.3-4.4-.1-.2-.5-.4-1-.6-1.4 1.8-.8 3.1-1.9 3.7-3ZM12 4c2 0 3.8.7 5.2 2-.5.8-1.7 1.8-3.4 2.5A29 29 0 0 0 11 4.2c.3 0 .7-.2 1-.2ZM9.3 4.8a35 35 0 0 1 2.7 4.3c-2.5.7-5.2.9-7.3.9A8 8 0 0 1 9.3 4.8ZM4 12v-.3c2.3 0 5.6-.2 8.4-1.1l.7 1.4c-3.2 1-5.6 3.2-6.9 5A8 8 0 0 1 4 12Zm8 8c-1.8 0-3.5-.6-4.8-1.6 1.1-1.6 3.2-3.5 6.1-4.5.9 2.3 1.4 4.2 1.6 5.3-1 .5-1.9.8-2.9.8Zm4.6-1.9c-.2-1-.7-2.8-1.5-5 1.8-.3 3.4 0 4 .1a8 8 0 0 1-2.5 4.9Z"/>',
    youtube: '<path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5Z"/>',
    globe: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2c.8 0 1.6.5 2.4 1.4.5.6.9 1.4 1.2 2.3H8.4c.3-.9.7-1.7 1.2-2.3C10.4 4.5 11.2 4 12 4ZM4.3 9h3.5c-.1.9-.1 1.9-.1 3s0 2.1.1 3H4.3a8 8 0 0 1 0-6Zm1.4 8h2.8c.3 1 .7 1.9 1.2 2.6A8 8 0 0 1 5.7 17Zm2.8-8H5.7a8 8 0 0 1 4-2.6c-.5.7-.9 1.6-1.2 2.6ZM12 20c-.8 0-1.6-.5-2.4-1.4-.5-.6-.9-1.4-1.2-2.3h7.2c-.3.9-.7 1.7-1.2 2.3-.8.9-1.6 1.4-2.4 1.4Zm1.6-5.7H10.4c-.1-.9-.1-1.9-.1-3s0-2.1.1-3h3.2c.1.9.1 1.9.1 3s0 2.1-.1 3Zm.4 5.3c.5-.7.9-1.6 1.2-2.6h2.8a8 8 0 0 1-4 2.6Zm1.6-4.6c.1-.9.1-1.9.1-3s0-2.1-.1-3h3.5a8 8 0 0 1 0 6Z"/>'
  };

  function icon(name, className) {
    return '<svg class="icon' + (className ? ' ' + className : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.spark) + '</svg>';
  }

  function socialIcon(name) {
    var path = SOCIAL_PATHS[name] || SOCIAL_PATHS.globe;
    return '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + path + '</svg>';
  }

  function hydrateIcons(root) {
    var scope = root || document;
    Array.prototype.forEach.call(scope.querySelectorAll('[data-icon]'), function (node) {
      var name = node.getAttribute('data-icon');
      var map = { 'file-text': 'fileText', 'chevron-down': 'chevronDown', 'chevron-right': 'chevronRight', 'arrow-right': 'arrowRight', 'arrow-up': 'arrowUp', 'arrow-down': 'arrowDown' };
      node.innerHTML = icon(map[name] || name);
    });
  }

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function apiRequest(path, options, timeout) {
    var config = Object.assign({
      credentials: 'same-origin',
      headers: { accept: 'application/json' }
    }, options || {});
    var control = window.AbortController ? new window.AbortController() : null;
    if (control) config.signal = control.signal;
    var timer = control
      ? window.setTimeout(function () { control.abort(); }, timeout || 12000)
      : null;

    return window.fetch(path, config).then(function (response) {
      if (timer) window.clearTimeout(timer);
      return response;
    }, function (error) {
      if (timer) window.clearTimeout(timer);
      throw error;
    });
  }

  function apiJson(path, options, timeout) {
    return apiRequest(path, options, timeout).then(function (response) {
      return response.text().then(function (text) {
        var body = {};
        if (text) {
          try { body = JSON.parse(text); } catch (error) { body = {}; }
        }
        return { response: response, body: body };
      });
    });
  }

  function networkMessage(error) {
    if (error && error.name === 'AbortError') {
      return 'The server took too long to respond. Check your connection and try again.';
    }
    return 'Could not reach the server. Check your connection and try again.';
  }

  function skeletonHtml() {
    var rows = '';
    for (var index = 0; index < 5; index += 1) {
      rows += '<div class="skeleton-row"><span class="skeleton skeleton-avatar"></span>' +
        '<span class="skeleton skeleton-line wide"></span><span class="skeleton skeleton-line"></span>' +
        '<span class="skeleton skeleton-pill"></span></div>';
    }
    return '<div class="skeleton-page" aria-hidden="true">' +
      '<div class="skeleton-head"><span class="skeleton skeleton-title"></span><span class="skeleton skeleton-button"></span></div>' +
      '<div class="skeleton-kpis"><span class="skeleton skeleton-kpi"></span><span class="skeleton skeleton-kpi"></span><span class="skeleton skeleton-kpi"></span><span class="skeleton skeleton-kpi"></span></div>' +
      '<div class="skeleton-panel">' + rows + '</div></div>';
  }

  function setLoginBusy(busy, label) {
    loginButton.disabled = busy;
    loginButton.textContent = busy ? (label || 'Signing in…') : 'Sign in';
  }

  // The admin lives in /admin/, so site-relative assets need one level up.
  function assetUrl(src) {
    if (!src) return '';
    if (/^(data:|blob:|https?:|\/|\.\.\/)/i.test(src)) return src;
    return '../' + src.replace(/^\.\//, '');
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function getPath(object, path) {
    return path.split('.').reduce(function (value, key) {
      return value == null ? undefined : value[key];
    }, object);
  }

  function setPath(object, path, value) {
    var keys = path.split('.');
    var cursor = object;
    keys.slice(0, -1).forEach(function (key) {
      cursor = cursor[key];
    });
    cursor[keys[keys.length - 1]] = value;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function relativeSaved(iso) {
    if (!iso) return '';
    var diff = Date.now() - new Date(iso).getTime();
    if (isNaN(diff)) return '';
    var minutes = Math.round(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + ' min ago';
    var hours = Math.round(minutes / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    return formatDate(iso);
  }

  function formatBytes(bytes) {
    var size = Number(bytes);
    if (!size || size < 0) return '—';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return Math.round(size / 1024) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function toNumber(value, fallback) {
    var number = parseInt(value, 10);
    return isNaN(number) ? fallback : number;
  }

  function socialLabel(platform) {
    var labels = {
      facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X (Twitter)',
      twitter: 'X (Twitter)', tiktok: 'TikTok', whatsapp: 'WhatsApp', behance: 'Behance',
      dribbble: 'Dribbble', youtube: 'YouTube', globe: 'Website'
    };
    return labels[platform] || (platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Website');
  }

  function platformOptions(selected) {
    var options = ['facebook', 'instagram', 'linkedin', 'x', 'tiktok', 'whatsapp', 'behance', 'dribbble', 'youtube', 'globe'];
    return options.map(function (platform) {
      return '<option value="' + platform + '"' + (platform === selected ? ' selected' : '') + '>' + socialLabel(platform) + '</option>';
    }).join('');
  }

  function categoryLabel(category) {
    var labels = { illustration: 'Illustration', media: 'Media', video: 'Video' };
    return labels[category] || 'Media';
  }

  function statusPill(status) {
    var published = status === 'published';
    return '<span class="pill ' + (published ? 'pill-published' : 'pill-draft') + '">' + (published ? 'Published' : 'Draft') + '</span>';
  }

  function projectThumb(project) {
    if (project.cover) {
      return '<img class="project-thumb" src="' + esc(assetUrl(project.cover)) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
    }
    return '<span class="project-thumb placeholder">' + icon('image') + '</span>';
  }

  function toast(message, tone) {
    var node = document.createElement('div');
    node.className = 'toast' + (tone ? ' ' + tone : '');
    node.innerHTML = icon(tone === 'error' ? 'alert' : tone === 'info' ? 'info' : 'check') + '<span>' + esc(message) + '</span>';
    toastRegion.appendChild(node);
    window.setTimeout(function () {
      node.style.opacity = '0';
      node.style.transform = 'translateY(4px)';
      node.style.transition = 'opacity 140ms ease, transform 140ms ease';
      window.setTimeout(function () { node.remove(); }, 160);
    }, 2800);
  }

  function setSaveState(mode) {
    saveIndicator.classList.toggle('is-saving', mode === 'saving');
    saveIndicator.classList.toggle('is-error', mode === 'error');
    saveText.textContent = mode === 'saving' ? 'Saving…' : mode === 'error' ? 'Not saved' : 'Saved';
  }

  function showNotice() {
    if (!adminNotice) return;
    if (state.mustChange) {
      adminNotice.hidden = false;
      adminNotice.innerHTML = icon('alert') +
        '<span>You are still using the default password. <a href="#/account">Change your account</a> to protect the admin.</span>' +
        '<button class="icon-btn" type="button" data-dismiss-notice aria-label="Dismiss">' + icon('x') + '</button>';
      var dismiss = adminNotice.querySelector('[data-dismiss-notice]');
      if (dismiss) {
        dismiss.addEventListener('click', function () {
          adminNotice.hidden = true;
          adminNotice.innerHTML = '';
        });
      }
      return;
    }
    adminNotice.hidden = true;
    adminNotice.innerHTML = '';
  }

  function handleConflict() {
    setSaveState('error');
    toast('Content changed in another tab or device. Reloading the latest version…', 'error');
    state.editing = false;
    return Store.refresh({ force: true, fresh: true }).then(function (data) {
      state.data = data;
      state.snapshot = JSON.parse(JSON.stringify(data));
      renderRoute();
    });
  }

  function flushSave() {
    window.clearTimeout(saveTimer);
    saveTimer = null;
    if (savingNow) {
      savePending = true;
      return Promise.resolve();
    }
    if (!state.data) return Promise.resolve();

    savingNow = true;
    setSaveState('saving');
    var payload = JSON.parse(JSON.stringify(state.data));

    return Store.save(payload).then(function (result) {
      if (result.unauthorized) {
        expireSession('Your session expired. Sign in again.');
        return;
      }
      if (result.conflict) {
        return handleConflict();
      }
      if (!result.ok) {
        setSaveState('error');
        toast(result.error || 'Could not save your changes.', 'error');
        return;
      }
      if (!savePending && !saveTimer) {
        state.data = result.data;
        state.snapshot = JSON.parse(JSON.stringify(result.data));
      }
      setSaveState('saved');
      updateDraftBadge();
      renderNotifications(state.data);
      if (state.refreshPreview) state.refreshPreview(state.data);
    }).catch(function (error) {
      setSaveState('error');
      toast(networkMessage(error), 'error');
    }).then(function () {
      savingNow = false;
      if (savePending) {
        savePending = false;
        saveTimer = window.setTimeout(flushSave, 250);
      }
    });
  }

  function queueSave(delay) {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(flushSave, delay === undefined ? 650 : delay);
  }

  function saveData(mutator, options) {
    var opts = options || {};
    var next = JSON.parse(JSON.stringify(state.data));
    mutator(next);
    next.meta = Object.assign({}, next.meta, { updatedAt: new Date().toISOString() });
    state.data = next;

    updateDraftBadge();
    if (state.refreshPreview) state.refreshPreview(next);
    if (opts.toast) toast(opts.toast);
    queueSave(opts.immediate ? 0 : 650);
    return Promise.resolve(next);
  }

  function rerenderPreservingSnapshot() {
    var snapshot = state.snapshot;
    renderRoute();
    state.snapshot = snapshot;
  }

  function editorActionsHtml() {
    if (!state.editing) return '';
    return '<div class="editor-actions">' +
      '<p class="editor-actions-copy">' + icon('info') + '<span>Changes save as you type. Discard restores this page to how it was when you clicked Edit.</span></p>' +
      '<div class="editor-actions-buttons">' +
      '<button class="btn btn-secondary" type="button" data-editor-action="discard">Discard changes</button>' +
      '<button class="btn btn-primary" type="button" data-editor-action="save">' + icon('check') + 'Save changes</button>' +
      '</div></div>';
  }

  function editHeadButton() {
    return '<button class="btn btn-primary" type="button" data-editor-action="edit">' + icon('edit') + 'Edit</button>';
  }

  function fieldsetOpen() {
    return '<fieldset class="editor-fieldset"' + (state.editing ? '' : ' disabled') + '>';
  }

  function handleEditorActions(event) {
    var button = event.target.closest('[data-editor-action]');
    if (!button) return;
    var action = button.getAttribute('data-editor-action');

    if (action === 'edit') {
      state.snapshot = JSON.parse(JSON.stringify(state.data));
      state.editing = true;
      renderRoute();
      window.setTimeout(function () {
        var first = pageContent.querySelector('.editor-fieldset .input:not([disabled])');
        if (first) first.focus();
      }, 40);
      return;
    }

    if (action === 'save') {
      var saved = state.data;
      state.data = saved;
      flushSave().then(function () {
        state.editing = false;
        state.data = Store.get();
        state.snapshot = JSON.parse(JSON.stringify(state.data));
        renderRoute();
        toast('Changes saved.');
      });
      return;
    }

    if (action === 'discard') {
      confirmAction({
        title: 'Discard changes',
        subtitle: 'Restore this page to its earlier content.',
        message: 'Discard the edits made on this page since you clicked Edit? The fields will go back to their previous values.',
        confirmLabel: 'Discard changes',
        danger: true
      }).then(function (confirmed) {
        if (!confirmed) return;
        return Store.save(state.snapshot || Store.get()).then(function (result) {
          if (!result.ok) {
            toast(result.error || 'Could not restore the earlier content.', 'error');
            return;
          }
          state.data = result.data;
          state.editing = false;
          renderRoute();
          toast('Changes discarded.', 'info');
        });
      });
    }
  }

  function updateDraftBadge() {
    var drafts = (state.data.projects || []).filter(function (project) { return project.status !== 'published'; }).length;
    navDraftCount.textContent = drafts;
    navDraftCount.hidden = drafts === 0;
  }

  function closePopovers(except) {
    [notifPop, userPop, searchPop].forEach(function (pop) {
      if (pop !== except) pop.hidden = true;
    });
    if (notifButton) notifButton.setAttribute('aria-expanded', 'false');
    if (userButton) userButton.setAttribute('aria-expanded', 'false');
  }

  function openPopover(button, pop) {
    var willOpen = pop.hidden;
    closePopovers(pop);
    pop.hidden = !willOpen;
    if (button) button.setAttribute('aria-expanded', String(willOpen));
  }

  function confirmAction(options) {
    return new Promise(function (resolve) {
      var dialog = document.createElement('dialog');
      dialog.className = 'dialog dialog-sm';
      dialog.innerHTML =
        '<div class="dialog-head"><div><h2>' + esc(options.title) + '</h2>' +
        (options.subtitle ? '<p>' + esc(options.subtitle) + '</p>' : '') + '</div></div>' +
        '<div class="dialog-body"><p class="confirm-copy">' + options.message + '</p></div>' +
        '<div class="dialog-foot"><button class="btn btn-secondary" type="button" data-close>Cancel</button>' +
        '<button class="btn ' + (options.danger ? 'btn-danger' : 'btn-primary') + '" type="button" data-confirm>' + esc(options.confirmLabel || 'Confirm') + '</button></div>';
      dialogRoot.appendChild(dialog);
      dialog.addEventListener('close', function () {
        dialog.remove();
        resolve(false);
      });
      dialog.querySelector('[data-close]').addEventListener('click', function () { dialog.close(); });
      dialog.querySelector('[data-confirm]').addEventListener('click', function () {
        dialog.close();
        dialog.remove();
        resolve(true);
      });
      dialog.addEventListener('cancel', function () {
        dialog.remove();
        resolve(false);
      });
      dialog.showModal();
    });
  }

  function openDialog(dialog) {
    Array.prototype.forEach.call(dialogRoot.querySelectorAll('dialog'), function (existing) {
      if (!existing.open) existing.remove();
    });
    dialogRoot.appendChild(dialog);
    dialog.addEventListener('close', function () { dialog.remove(); });
    dialog.showModal();
    return dialog;
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise(function (resolve) {
      if (!canvas.toBlob) { resolve(null); return; }
      canvas.toBlob(function (blob) { resolve(blob); }, type, quality);
    });
  }

  function encodeImage(canvas, quality) {
    return canvasBlob(canvas, 'image/webp', quality).then(function (blob) {
      if (blob) return blob;
      return canvasBlob(canvas, 'image/jpeg', quality);
    });
  }

  function prepareImage(file, maxSize, quality) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//i.test(file.type) || /svg/i.test(file.type)) {
        reject(new Error('Use a WebP, JPEG or PNG image.'));
        return;
      }
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(url);
        var ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        var width = Math.max(1, Math.round(image.width * ratio));
        var height = Math.max(1, Math.round(image.height * ratio));
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(image, 0, 0, width, height);
        encodeImage(canvas, quality).then(function (blob) {
          if (!blob) {
            reject(new Error('That file could not be prepared for upload.'));
            return;
          }
          resolve({ blob: blob, width: width, height: height });
        }, reject);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('That file could not be read as an image.'));
      };
      image.src = url;
    });
  }

  function uploadImage(file, options) {
    var opts = options || {};
    if (!file) return Promise.reject(new Error('Choose an image to upload.'));
    if (file.size > 25 * 1024 * 1024) {
      return Promise.reject(new Error('Choose an image smaller than 25 MB.'));
    }

    return prepareImage(file, 1600, 0.84).then(function (full) {
      return prepareImage(file, 520, 0.8).then(function (thumb) {
        var base = String(file.name || 'image').replace(/\.[^.]+$/, '') || 'image';
        var form = new FormData();
        form.append('full', full.blob, base + '.webp');
        form.append('thumb', thumb.blob, base + '-thumb.webp');
        form.append('filename', file.name || base + '.webp');
        form.append('alt', opts.alt || '');
        form.append('width', String(full.width));
        form.append('height', String(full.height));
        return apiJson('/api/media', { method: 'POST', body: form }, 60000);
      });
    }).then(function (result) {
      if (result.response.status === 401) {
        var expired = new Error('Your session expired. Sign in again.');
        expired.unauthorized = true;
        throw expired;
      }
      if (!result.response.ok) {
        throw new Error(result.body.error || 'Could not upload the image.');
      }
      return result.body.item;
    });
  }

  function uploadCv(file) {
    if (!file) return Promise.reject(new Error('Choose a PDF file to upload.'));
    if (file.size > 25 * 1024 * 1024) {
      return Promise.reject(new Error('Choose a PDF smaller than 25 MB.'));
    }
    var name = String(file.name || '').toLowerCase();
    if (file.type !== 'application/pdf' && !name.endsWith('.pdf')) {
      return Promise.reject(new Error('Upload a PDF file.'));
    }
    var form = new FormData();
    form.append('file', file, file.name || 'cv.pdf');
    form.append('filename', file.name || 'cv.pdf');
    return apiJson('/api/cv', { method: 'POST', body: form }, 60000).then(function (result) {
      if (result.response.status === 401) {
        var expired = new Error('Your session expired. Sign in again.');
        expired.unauthorized = true;
        throw expired;
      }
      if (!result.response.ok) {
        throw new Error(result.body.error || 'Could not upload the CV.');
      }
      return result.body.item;
    });
  }

  function handleUploadError(error) {
    if (error && error.unauthorized) {
      expireSession(error.message);
      return;
    }
    toast((error && error.message) || networkMessage(error), 'error');
  }

  /* ------------------------------------------------------------------------
     Authentication
     ------------------------------------------------------------------------ */

  function applySession(payload) {
    var session = payload || {};
    state.session = {
      username: session.username || '',
      mustChange: Boolean(session.mustChange)
    };
    state.username = state.session.username;
    state.mustChange = state.session.mustChange;
    Array.prototype.forEach.call(document.querySelectorAll('.user-name'), function (node) {
      node.textContent = state.username || 'Owner';
    });
    showNotice();
  }

  function enterApp() {
    loginView.hidden = true;
    adminApp.hidden = false;
    hydrateIcons(adminApp);
    pageContent.innerHTML = skeletonHtml();
    setSaveState('saved');
    return Store.ready().then(function (data) {
      state.data = data;
      state.snapshot = JSON.parse(JSON.stringify(data));
    }).catch(function () {
      state.data = Store.get();
      state.snapshot = JSON.parse(JSON.stringify(state.data));
    }).then(function () {
      renderRoute();
    });
  }

  function showApp() {
    return enterApp();
  }

  function showLogin() {
    adminApp.hidden = true;
    loginView.hidden = false;
    hydrateIcons(loginView);
    var password = document.getElementById('loginPassword');
    password.value = '';
    password.type = 'password';
    var toggle = document.getElementById('togglePassword');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Show password');
    loginError.textContent = '';
    setLoginBusy(false);
  }

  function expireSession(message) {
    state.session = null;
    state.username = '';
    state.mustChange = false;
    state.editing = false;
    showLogin();
    loginError.textContent = message || 'Your session expired. Sign in again.';
  }

  function hideBoot() {
    if (!bootView || bootView.hidden) return;
    bootView.classList.add('is-leaving');
    window.setTimeout(function () { bootView.hidden = true; }, 200);
  }

  function boot() {
    if (bootNote) bootNote.textContent = 'Checking your session…';
    return apiJson('/api/session', { cache: 'no-store' }).then(function (result) {
      if (result.response.ok && result.body && result.body.authenticated) {
        applySession(result.body);
        return enterApp();
      }
      showLogin();
      if (result.response.status >= 500) {
        loginError.textContent = 'The server is unavailable. Try again in a moment.';
      }
    }).catch(function (error) {
      showLogin();
      loginError.textContent = networkMessage(error);
    }).then(function () {
      hideBoot();
      if (!loginView.hidden) document.getElementById('loginUsername').focus();
    });
  }

  function handleSignOut() {
    closePopovers();
    confirmAction({
      title: 'Sign out',
      subtitle: 'Leave the admin area.',
      message: 'Sign out of the portfolio admin? You will need to sign in again to make changes.',
      confirmLabel: 'Sign out',
      danger: true
    }).then(function (confirmed) {
      if (!confirmed) return;
      doSignOut();
    });
  }

  function doSignOut() {
    return apiJson('/api/logout', { method: 'POST' }).catch(function () {
      // The cookie expires on its own even if the request fails.
    }).then(function () {
      state.session = null;
      state.username = '';
      state.mustChange = false;
      state.editing = false;
      state.data = Store.get();
      location.hash = '';
      hideBoot();
      showLogin();
      toast('Signed out.', 'info');
    });
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  hydrateIcons(document);
  setSaveState('saved');
  updateDraftBadge();
  pageContent.addEventListener('click', handleEditorActions);

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var username = document.getElementById('loginUsername').value.trim();
    var password = document.getElementById('loginPassword').value;
    var remember = document.getElementById('loginRemember').checked;
    if (!username || !password) {
      loginError.textContent = 'Enter your username and password.';
      return;
    }
    loginError.textContent = '';
    setLoginBusy(true);
    apiJson('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: username, password: password, remember: remember })
    }, 20000).then(function (result) {
      if (!result.response.ok) {
        loginError.textContent = result.body.error || 'That username or password is not correct.';
        var passwordInput = document.getElementById('loginPassword');
        passwordInput.focus();
        passwordInput.select();
        return;
      }
      applySession(result.body);
      return enterApp().then(function () {
        toast(remember ? 'Signed in. This device stays signed in for 30 days.' : 'Signed in.', 'info');
      });
    }).catch(function (error) {
      loginError.textContent = networkMessage(error);
    }).then(function () {
      setLoginBusy(false);
    });
  });

  document.getElementById('togglePassword').addEventListener('click', function () {
    var input = document.getElementById('loginPassword');
    var showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    this.setAttribute('aria-pressed', String(!showing));
    this.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });

  document.getElementById('sidebarSignOut').addEventListener('click', handleSignOut);

  userButton.addEventListener('click', function (event) {
    event.stopPropagation();
    openPopover(userButton, userPop);
  });

  notifButton.addEventListener('click', function (event) {
    event.stopPropagation();
    openPopover(notifButton, notifPop);
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('.popover') && !event.target.closest('.popover-host') && !event.target.closest('.topbar-search')) {
      closePopovers();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closePopovers();
      closeSidebar();
    }
    if (event.key === '/' && document.activeElement !== globalSearch && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      event.preventDefault();
      globalSearch.focus();
    }
  });

  userPop.addEventListener('click', function (event) {
    var action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.getAttribute('data-action') === 'sign-out') {
      handleSignOut();
    }
    if (action.getAttribute('data-action') === 'reset-content') {
      closePopovers();
      confirmAction({
        title: 'Reset sample content',
        subtitle: 'This replaces the published content for everyone.',
        message: 'Restore the original portfolio content, resume, contact details and social links? Your current published content will be replaced.',
        confirmLabel: 'Reset content',
        danger: true
      }).then(function (confirmed) {
        if (!confirmed) return;
        return Store.reset().then(function (result) {
          if (!result || !result.ok) {
            toast((result && result.error) || 'Could not reset the content.', 'error');
            return;
          }
          state.data = result.data;
          state.editing = false;
          state.snapshot = JSON.parse(JSON.stringify(result.data));
          renderRoute();
          updateDraftBadge();
          toast('Content reset to the sample portfolio.', 'info');
        }).catch(function (error) {
          toast(networkMessage(error), 'error');
        });
      });
    }
  });

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarScrim.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarScrim.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }

  menuButton.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  });
  sidebarScrim.addEventListener('click', closeSidebar);

  /* ------------------------------------------------------------------------
     Routing
     ------------------------------------------------------------------------ */

  var ROUTES = {
    overview: { label: 'Overview', render: renderOverview },
    account: { label: 'Account', render: renderAccount },
    profile: { label: 'Profile & hero', render: renderProfile },
    portfolio: { label: 'Portfolio', render: renderPortfolio },
    resume: { label: 'Resume', render: renderResume },
    contact: { label: 'Contact details', render: renderContact },
    social: { label: 'Social links', render: renderSocial },
    media: { label: 'Media library', render: renderMedia },
    history: { label: 'History', render: renderHistory }
  };

  function currentRoute() {
    var match = (location.hash || '').match(/^#\/([a-z-]+)/);
    var route = match ? match[1] : 'overview';
    return ROUTES[route] ? route : 'overview';
  }

  function renderRoute() {
    var route = currentRoute();
    if (route !== state.route) state.editing = false;
    state.route = route;
    state.refreshPreview = null;
    state.data = Store.get();
    if (!state.editing) state.snapshot = JSON.parse(JSON.stringify(state.data));

    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (item) {
      item.classList.toggle('active', item.getAttribute('data-route') === route);
    });
    pageCrumb.textContent = ROUTES[route].label;
    document.title = ROUTES[route].label + ' · Portfolio admin';
    pageContent.onclick = null;
    pageContent.oninput = null;
    pageContent.onchange = null;
    pageContent.innerHTML = '';
    ROUTES[route].render(state.data);
    hydrateIcons(pageContent);
    updateDraftBadge();
    renderNotifications(state.data);
    closeSidebar();
  }

  window.addEventListener('hashchange', function () {
    if (!adminApp.hidden) renderRoute();
  });

  globalSearch.addEventListener('input', function () {
    renderSearchResults(this.value.trim());
  });
  globalSearch.addEventListener('focus', function () {
    if (this.value.trim()) renderSearchResults(this.value.trim());
  });
  globalSearch.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      searchPop.hidden = true;
      this.blur();
    }
    if (event.key === 'Enter') {
      var first = searchPop.querySelector('[data-project-id]');
      if (first) first.click();
    }
  });

  function renderSearchResults(query) {
    if (!query) {
      searchPop.hidden = true;
      return;
    }
    var needle = query.toLowerCase();
    var projects = (Store.get().projects || []).filter(function (project) {
      return (project.title + ' ' + project.client + ' ' + project.category).toLowerCase().indexOf(needle) !== -1;
    }).slice(0, 5);

    var pages = Object.keys(ROUTES).filter(function (route) {
      return route !== 'portfolio' && ROUTES[route].label.toLowerCase().indexOf(needle) !== -1;
    });

    var html = '';
    if (projects.length) {
      html += '<p class="search-group-label">Projects</p>';
      html += projects.map(function (project) {
        return '<button class="search-result" type="button" data-project-id="' + esc(project.id) + '">' +
          projectThumb(project) + '<span>' + esc(project.title) + '</span></button>';
      }).join('');
    }
    if (pages.length) {
      html += '<p class="search-group-label">Sections</p>';
      html += pages.map(function (route) {
        return '<a class="search-result" href="#/' + route + '"><span>' + esc(ROUTES[route].label) + '</span></a>';
      }).join('');
    }
    if (!html) html = '<p class="search-empty">No matches for “' + esc(query) + '”.</p>';
    searchPop.innerHTML = html;
    searchPop.hidden = false;
    Array.prototype.forEach.call(searchPop.querySelectorAll('[data-project-id]'), function (button) {
      button.addEventListener('click', function () {
        searchPop.hidden = true;
        globalSearch.value = '';
        globalSearch.blur();
        if (state.route !== 'portfolio') location.hash = '#/portfolio';
        window.setTimeout(function () { openProjectDialog(button.getAttribute('data-project-id')); }, 60);
      });
    });
  }

  /* ------------------------------------------------------------------------
     Overview
     ------------------------------------------------------------------------ */

  function pageHead(title, subtitle, actions) {
    return '<div class="page-head"><div><h1>' + esc(title) + '</h1>' +
      (subtitle ? '<p class="page-sub">' + esc(subtitle) + '</p>' : '') +
      '</div>' + (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
  }

  function attentionItems(data) {
    var items = [];
    var drafts = data.projects.filter(function (project) { return project.status !== 'published'; });
    var emptyLinks = data.socials.filter(function (social) { return social.visible && !social.url; });

    if (drafts.length) {
      items.push({
        tone: 'warning',
        title: drafts.length + (drafts.length === 1 ? ' project is still a draft' : ' projects are still drafts'),
        copy: 'Drafts stay hidden from the public portfolio grid.',
        link: '#/portfolio',
        linkLabel: 'Review drafts'
      });
    }
    if (emptyLinks.length) {
      items.push({
        tone: 'warning',
        title: emptyLinks.length + (emptyLinks.length === 1 ? ' social link has no URL' : ' social links have no URL'),
        copy: 'Those icons will not open anything until a link is added.',
        link: '#/social',
        linkLabel: 'Fix social links'
      });
    }
    if (!data.contact.email) {
      items.push({ tone: 'warning', title: 'No contact email set', copy: 'Visitors cannot send you a message.', link: '#/contact', linkLabel: 'Add email' });
    }
    if (!data.resume.cvUrl) {
      items.push({ tone: 'warning', title: 'No CV file linked', copy: 'The download button on the resume page has no target.', link: '#/resume', linkLabel: 'Link CV' });
    }
    if (!data.projects.length) {
      items.push({ tone: 'warning', title: 'The portfolio is empty', copy: 'Add your first project so the grid has something to show.', link: '#/portfolio', linkLabel: 'Add project' });
    }
    return items;
  }

  function renderNotifications(data) {
    var items = attentionItems(data);
    var updated = data.meta && data.meta.updatedAt;
    var html = '<div class="notif-head"><span>Needs attention</span><span>' + items.length + '</span></div><div class="notif-list">';
    if (items.length) {
      html += items.map(function (item) {
        return '<a class="notif-item" href="' + item.link + '">' + icon('alert') +
          '<span><strong>' + esc(item.title) + '</strong><small>' + esc(item.copy) + '</small></span></a>';
      }).join('');
    } else {
      html += '<div class="notif-item"><span>' + icon('check') + '</span><span><strong>Everything is up to date</strong><small>No drafts or missing details.</small></span></div>';
    }
    html += '</div><div class="notif-head"><span>Last saved</span><span>' + esc(relativeSaved(updated)) + '</span></div>';
    notifPop.innerHTML = html;
    notifDot.hidden = items.length === 0;
  }

  function renderOverview(data) {
    var published = data.projects.filter(function (project) { return project.status === 'published'; });
    var drafts = data.projects.length - published.length;
    var resumeEntries = data.resume.experience.length + data.resume.education.length;
    var visibleSocials = data.socials.filter(function (social) { return social.visible; });
    var recent = data.projects.slice().sort(function (a, b) {
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    }).slice(0, 6);
    var attention = attentionItems(data);

    var counts = { illustration: 0, media: 0, video: 0 };
    data.projects.forEach(function (project) {
      counts[project.category] = (counts[project.category] || 0) + 1;
    });
    var total = data.projects.length || 1;

    var mix = ['illustration', 'media', 'video'].map(function (category) {
      var percent = Math.round((counts[category] / total) * 100);
      return '<div class="mix-row"><span class="mix-label">' + categoryLabel(category) + '</span>' +
        '<span class="mix-track"><span class="mix-fill" style="width:' + percent + '%"></span></span>' +
        '<span class="mix-value">' + percent + '%</span></div>';
    }).join('');

    var recentRows = recent.length ? recent.map(function (project) {
      return '<tr><td><div class="project-cell">' + projectThumb(project) +
        '<div class="project-copy"><button class="link-button" type="button" data-open-project="' + esc(project.id) + '">' + esc(project.title) + '</button>' +
        '<small>' + (project.client || 'No client') + '</small></div></div></td>' +
        '<td>' + statusPill(project.status) + '</td>' +
        '<td class="muted-cell">' + esc(formatDate(project.updatedAt)) + '</td></tr>';
    }).join('') : '<tr><td colspan="3"><div class="empty-state">' + icon('folder') + '<strong>No projects yet</strong><p>Add a project to start building the portfolio grid.</p><button class="btn btn-primary btn-sm" type="button" data-action="new-project">' + icon('plus') + 'Add project</button></div></td></tr>';

    var attentionHtml = attention.length ? attention.map(function (item) {
      return '<li class="attention-item"><span class="attention-icon' + (item.tone === 'ok' ? ' ok' : '') + '">' +
        icon(item.tone === 'ok' ? 'check' : 'alert') + '</span>' +
        '<div class="attention-copy"><strong>' + esc(item.title) + '</strong><small>' + esc(item.copy) + '</small>' +
        '<a class="link-button" href="' + item.link + '">' + esc(item.linkLabel) + icon('chevronRight') + '</a></div></li>';
    }).join('') : '<li class="attention-empty">' + icon('check') + '<span>Nothing needs your attention. Drafts, links, contact details and CV are all in order.</span></li>';

    var html = pageHead('Overview', 'Your portfolio content at a glance.', 
      '<a class="btn btn-secondary" href="../index.html?fresh=1" target="_blank" rel="noopener">' + icon('external') + 'View site</a>' +
      '<button class="btn btn-primary" type="button" data-action="new-project">' + icon('plus') + 'New project</button>');

    html += '<section class="kpi-strip" aria-label="Portfolio summary">' +
      '<div class="kpi"><p class="kpi-label">Published projects</p><p class="kpi-value num">' + published.length + '</p><p class="kpi-note">Visible on the public grid</p></div>' +
      '<div class="kpi"><p class="kpi-label">Drafts</p><p class="kpi-value num">' + drafts + '</p><p class="kpi-note">' + (drafts ? 'Hidden until published' : 'Nothing waiting') + '</p></div>' +
      '<div class="kpi"><p class="kpi-label">Resume entries</p><p class="kpi-value num">' + resumeEntries + '</p><p class="kpi-note">' + data.resume.experience.length + ' roles · ' + data.resume.education.length + ' education</p></div>' +
      '<div class="kpi"><p class="kpi-label">Live social links</p><p class="kpi-value num">' + visibleSocials.length + '<small>of ' + data.socials.length + '</small></p><p class="kpi-note">Shown in headers and footers</p></div>' +
      '</section>';

    html += '<div class="dashboard-grid"><section class="panel recent-panel">' +
      '<div class="panel-head"><div><h2 class="panel-title">Recently updated</h2><p class="panel-sub">The last work you touched.</p></div>' +
      '<a class="panel-link" href="#/portfolio">All projects' + icon('chevronRight') + '</a></div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Project</th><th class="col-status">Status</th><th class="col-updated">Updated</th></tr></thead>' +
      '<tbody>' + recentRows + '</tbody></table></div></section>';

    html += '<div class="rail"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Portfolio mix</h2><p class="panel-sub">' + data.projects.length + ' projects across three categories.</p></div></div>' +
      '<div class="mix-list">' + mix + '<p class="mix-note">Visitors filter the grid by these categories. Add a project to change the balance.</p></div></section>' +
      '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Needs attention</h2></div></div><ul class="attention-list">' + attentionHtml + '</ul></section></div></div>';

    html += '<div class="dashboard-bottom"><section class="panel"><div class="panel-head"><div><h2 class="panel-title">Quick actions</h2><p class="panel-sub">Jump straight to the usual edits.</p></div></div>' +
      '<div class="action-list">' +
      '<a class="action-row" href="#/portfolio"><span class="action-icon">' + icon('folder') + '</span>Add or edit portfolio projects<span class="arrow">' + icon('chevronRight') + '</span></a>' +
      '<a class="action-row" href="#/resume"><span class="action-icon">' + icon('fileText') + '</span>Update resume, skills and CV<span class="arrow">' + icon('chevronRight') + '</span></a>' +
      '<a class="action-row" href="#/contact"><span class="action-icon">' + icon('mail') + '</span>Change contact details<span class="arrow">' + icon('chevronRight') + '</span></a>' +
      '<a class="action-row" href="#/social"><span class="action-icon">' + icon('link') + '</span>Manage social links<span class="arrow">' + icon('chevronRight') + '</span></a>' +
      '</div></section>';

    html += '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Site pages</h2><p class="panel-sub">Open a page to see the live result.</p></div></div>' +
      '<div class="page-grid">' +
      ['index.html|Splash home', 'index-2.html|Home', 'about.html|About', 'portfolio.html|Portfolio', 'resume.html|Resume', 'contact-me.html|Contact'].map(function (entry) {
        var parts = entry.split('|');
        return '<a class="page-row" href="../' + parts[0] + '?fresh=1" target="_blank" rel="noopener">' + icon('globe') + esc(parts[1]) +
          '<span class="page-open">' + icon('external') + '</span></a>';
      }).join('') + '</div></section></div>';

    html += '<p class="local-note">' + icon('info') + '<span>Changes publish to the live site as soon as you save. Pages opened from here load the newest version.</span></p>';

    pageContent.innerHTML = html;
    pageContent.onclick = handleOverviewClick;
    renderNotifications(data);
  }

  function handleOverviewClick(event) {
    var newProject = event.target.closest('[data-action="new-project"]');
    if (newProject) {
      openProjectDialog(null);
      return;
    }
    var open = event.target.closest('[data-open-project]');
    if (open) openProjectDialog(open.getAttribute('data-open-project'));
  }

  /* ------------------------------------------------------------------------
     Portfolio
     ------------------------------------------------------------------------ */

  function filteredProjects(data) {
    var query = state.projectQuery.toLowerCase();
    return data.projects.filter(function (project) {
      var haystack = (project.title + ' ' + project.client + ' ' + project.category).toLowerCase();
      var matchesQuery = !query || haystack.indexOf(query) !== -1;
      var matchesCategory = state.projectCategory === 'all' || project.category === state.projectCategory;
      var matchesStatus = state.projectStatus === 'all' || project.status === state.projectStatus;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }

  function projectRowsHtml(projects, total) {
    if (!projects.length) {
      return '<tr><td colspan="4"><div class="empty-state">' + icon('search') +
        '<strong>No projects match those filters</strong><p>Try a different search, or add a new project to this category.</p>' +
        '<button class="btn btn-primary btn-sm" type="button" data-project-action="new">' + icon('plus') + 'Add project</button></div></td></tr>';
    }

    return projects.map(function (project) {
      var index = state.data.projects.findIndex(function (item) { return item.id === project.id; });
      var isFirst = index <= 0;
      var isLast = index >= state.data.projects.length - 1;
      return '<tr data-row-id="' + esc(project.id) + '">' +
        '<td><div class="project-cell">' + projectThumb(project) +
        '<div class="project-copy"><button class="link-button" type="button" data-project-action="edit" data-project-id="' + esc(project.id) + '">' + esc(project.title) + '</button>' +
        '<small>' + esc(project.client || 'No client') + '</small></div></div></td>' +
        '<td class="col-category"><span class="chip">' + esc(categoryLabel(project.category)) + '</span></td>' +
        '<td class="col-status">' + statusPill(project.status) + '</td>' +
        '<td class="col-updated muted-cell">' + esc(formatDate(project.updatedAt)) + '</td>' +
        '<td class="col-actions"><details class="row-menu"><summary aria-label="Project actions">' + icon('more') + '</summary>' +
        '<div class="menu">' +
        '<button type="button" data-project-action="edit" data-project-id="' + esc(project.id) + '">' + icon('edit') + 'Edit project</button>' +
        '<button type="button" data-project-action="duplicate" data-project-id="' + esc(project.id) + '">' + icon('copy') + 'Duplicate</button>' +
        '<button type="button" data-project-action="toggle-status" data-project-id="' + esc(project.id) + '">' + icon(project.status === 'published' ? 'eye' : 'upload') + (project.status === 'published' ? 'Unpublish' : 'Publish') + '</button>' +
        '<hr><button type="button" data-project-action="move-up" data-project-id="' + esc(project.id) + '"' + (isFirst ? ' disabled' : '') + '>' + icon('arrowUp') + 'Move up</button>' +
        '<button type="button" data-project-action="move-down" data-project-id="' + esc(project.id) + '"' + (isLast ? ' disabled' : '') + '> ' + icon('arrowDown') + 'Move down</button>' +
        '<hr><button class="danger" type="button" data-project-action="delete" data-project-id="' + esc(project.id) + '">' + icon('trash') + 'Delete</button>' +
        '</div></details></td></tr>';
    }).join('');
  }

  function refreshProjectTable() {
    var projects = filteredProjects(state.data);
    var body = document.getElementById('projectTableBody');
    if (!body) return;
    body.innerHTML = projectRowsHtml(projects, state.data.projects.length);
    var count = document.getElementById('projectCount');
    if (count) {
      count.textContent = projects.length === state.data.projects.length
        ? state.data.projects.length + ' projects'
        : projects.length + ' of ' + state.data.projects.length + ' projects';
    }
    var foot = document.getElementById('projectFoot');
    if (foot) {
      var drafts = state.data.projects.filter(function (project) { return project.status !== 'published'; }).length;
      foot.innerHTML = '<span>Showing ' + projects.length + ' of ' + state.data.projects.length + '</span>' +
        '<span>' + drafts + (drafts === 1 ? ' draft hidden' : ' drafts hidden') + ' from the public grid</span>';
    }
    hydrateIcons(body);
    hydrateIcons(foot || document.createElement('div'));
  }

  function renderPortfolio(data) {
    var published = data.projects.filter(function (project) { return project.status === 'published'; }).length;
    var projects = filteredProjects(data);

    var html = pageHead('Portfolio', data.projects.length + ' projects · ' + published + ' published',
      '<a class="btn btn-secondary" href="../portfolio.html?fresh=1" target="_blank" rel="noopener">' + icon('external') + 'View grid</a>' +
      '<button class="btn btn-primary" type="button" data-project-action="new">' + icon('plus') + 'New project</button>');

    html += '<div class="toolbar">' +
      '<div class="toolbar-search"><span class="search-icon">' + icon('search') + '</span>' +
      '<input id="projectSearch" type="search" placeholder="Search projects or clients" value="' + esc(state.projectQuery) + '" aria-label="Search projects" autocomplete="off">' +
      '<button class="clear-search" type="button" data-project-action="clear-search" aria-label="Clear search"' + (state.projectQuery ? '' : ' hidden') + '>' + icon('x') + '</button>' +
      '</div>' +
      '<select class="input select-inline" id="projectCategoryFilter" aria-label="Filter by category">' +
      '<option value="all"' + (state.projectCategory === 'all' ? ' selected' : '') + '>All categories</option>' +
      ['illustration', 'media', 'video'].map(function (category) {
        return '<option value="' + category + '"' + (state.projectCategory === category ? ' selected' : '') + '>' + categoryLabel(category) + '</option>';
      }).join('') + '</select>' +
      '<select class="input select-inline" id="projectStatusFilter" aria-label="Filter by status">' +
      '<option value="all"' + (state.projectStatus === 'all' ? ' selected' : '') + '>All statuses</option>' +
      '<option value="published"' + (state.projectStatus === 'published' ? ' selected' : '') + '>Published</option>' +
      '<option value="draft"' + (state.projectStatus === 'draft' ? ' selected' : '') + '>Drafts</option>' +
      '</select>' +
      '<span class="toolbar-spacer"></span>' +
      '<span class="count-label" id="projectCount">' + (projects.length === data.projects.length ? data.projects.length + ' projects' : projects.length + ' of ' + data.projects.length + ' projects') + '</span>' +
      '</div>';

    html += '<section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th class="col-project">Project</th><th class="col-category">Category</th><th class="col-status">Status</th>' +
      '<th class="col-updated">Updated</th><th class="col-actions"><span class="sr-only">Actions</span></th>' +
      '</tr></thead><tbody id="projectTableBody">' + projectRowsHtml(projects, data.projects.length) + '</tbody></table></div>' +
      '<div class="table-foot" id="projectFoot"></div></section>';

    html += '<p class="local-note">' + icon('info') + '<span>Projects marked published appear on the portfolio page immediately, newest first. Drafts stay private to this dashboard.</span></p>';

    pageContent.innerHTML = html;
    pageContent.onclick = handlePortfolioClick;
    pageContent.onchange = handlePortfolioChange;
    pageContent.oninput = handlePortfolioInput;
    refreshProjectTable();
    renderNotifications(data);
  }

  function handlePortfolioInput(event) {
    if (event.target.id !== 'projectSearch') return;
    state.projectQuery = event.target.value.trim();
    var clear = document.querySelector('.clear-search');
    if (clear) clear.hidden = !event.target.value;
    refreshProjectTable();
  }

  function handlePortfolioChange(event) {
    if (event.target.id === 'projectCategoryFilter') {
      state.projectCategory = event.target.value;
      refreshProjectTable();
    }
    if (event.target.id === 'projectStatusFilter') {
      state.projectStatus = event.target.value;
      refreshProjectTable();
    }
  }

  function handlePortfolioClick(event) {
    var button = event.target.closest('[data-project-action]');
    if (!button) return;
    var action = button.getAttribute('data-project-action');
    var id = button.getAttribute('data-project-id');

    var menu = button.closest('details');
    if (menu) menu.open = false;

    if (action === 'new') {
      openProjectDialog(null);
      return;
    }
    if (action === 'clear-search') {
      state.projectQuery = '';
      document.getElementById('projectSearch').value = '';
      var clear = document.querySelector('.clear-search');
      if (clear) clear.hidden = true;
      document.getElementById('projectSearch').focus();
      refreshProjectTable();
      return;
    }
    if (action === 'edit') {
      openProjectDialog(id);
      return;
    }
    if (action === 'duplicate') {
      duplicateProject(id);
      return;
    }
    if (action === 'toggle-status') {
      toggleProjectStatus(id);
      return;
    }
    if (action === 'move-up' || action === 'move-down') {
      moveProject(id, action === 'move-up' ? -1 : 1);
      return;
    }
    if (action === 'delete') {
      deleteProject(id);
    }
  }

  function duplicateProject(id) {
    var source = state.data.projects.find(function (project) { return project.id === id; });
    if (!source) return;
    var copy = JSON.parse(JSON.stringify(source));
    copy.id = uid('project');
    copy.title = source.title + ' (copy)';
    copy.status = 'draft';
    copy.updatedAt = new Date().toISOString();
    saveData(function (data) {
      data.projects.unshift(copy);
    }, { toast: 'Project duplicated as a draft.' });
    refreshProjectTable();
  }

  function toggleProjectStatus(id) {
    var project = state.data.projects.find(function (item) { return item.id === id; });
    if (!project) return;
    var next = project.status === 'published' ? 'draft' : 'published';
    saveData(function (data) {
      var target = data.projects.find(function (item) { return item.id === id; });
      if (target) {
        target.status = next;
        target.updatedAt = new Date().toISOString();
      }
    }, { toast: next === 'published' ? 'Project published to the portfolio.' : 'Project moved to drafts.' });
    refreshProjectTable();
  }

  function moveProject(id, direction) {
    var index = state.data.projects.findIndex(function (project) { return project.id === id; });
    var target = index + direction;
    if (index < 0 || target < 0 || target >= state.data.projects.length) return;
    saveData(function (data) {
      var item = data.projects.splice(index, 1)[0];
      data.projects.splice(target, 0, item);
    });
    refreshProjectTable();
    toast('Project order updated.');
  }

  function deleteProject(id) {
    var project = state.data.projects.find(function (item) { return item.id === id; });
    if (!project) return;
    confirmAction({
      title: 'Delete project',
      subtitle: 'This cannot be undone.',
      message: 'Delete <strong>' + esc(project.title) + '</strong> from the portfolio? It will disappear from the public grid.',
      confirmLabel: 'Delete project',
      danger: true
    }).then(function (confirmed) {
      if (!confirmed) return;
      saveData(function (data) {
        data.projects = data.projects.filter(function (item) { return item.id !== id; });
      }, { toast: 'Project deleted.' });
      refreshProjectTable();
    });
  }

  /* ------------------------------------------------------------------------
     Project dialog
     ------------------------------------------------------------------------ */

  function blankProject() {
    return {
      id: uid('project'),
      title: '',
      client: '',
      category: 'media',
      type: 'image',
      cover: '',
      gallery: [],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: new Date().toISOString()
    };
  }

  function openProjectDialog(id) {
    var existing = id ? state.data.projects.find(function (project) { return project.id === id; }) : null;
    var project = existing ? JSON.parse(JSON.stringify(existing)) : blankProject();
    var isEdit = Boolean(existing);

    var dialog = document.createElement('dialog');
    dialog.className = 'dialog';
    dialog.innerHTML =
      '<form method="dialog" id="projectForm" novalidate>' +
      '<div class="dialog-head"><div><h2>' + (isEdit ? 'Edit project' : 'Add project') + '</h2>' +
      '<p>' + (isEdit ? 'Changes go live on the portfolio as soon as you save.' : 'New projects appear on the public grid straight away.') + '</p></div>' +
      '<button class="icon-btn" type="button" data-close aria-label="Close">' + icon('x') + '</button></div>' +
      '<div class="dialog-body">' +

      '<section class="modal-section"><p class="modal-section-title">Cover image</p>' +
      '<div class="image-field"><div class="image-drop" id="coverDrop" tabindex="0" role="button" aria-label="Cover image">' +
      '<img id="coverImage" src="' + esc(assetUrl(project.cover)) + '" alt=""' + (project.cover ? '' : ' hidden') + '>' +
      '<div class="drop-empty" id="coverEmpty"' + (project.cover ? ' hidden' : '') + '>' + icon('image') + '<span>Drop image<br>or choose a file</span></div></div>' +
      '<div class="image-field-actions"><div class="row">' +
      '<button class="btn btn-secondary btn-sm" type="button" data-choose-cover>' + icon('upload') + 'Choose image</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-clear-cover>Remove</button></div>' +
      '<div class="field"><label for="coverUrl">Image URL</label><input class="input" id="coverUrl" type="text" value="' + esc(project.cover) + '" placeholder="images/portfolio/01.jpeg" spellcheck="false"></div>' +
      '<p class="field-help">Uploads are optimised and saved to the media library with a permanent /media/ URL.</p></div></div>' +
      '<input type="file" id="coverFile" accept="image/*" hidden></section>' +

      '<section class="modal-section"><p class="modal-section-title">Details</p><div class="form-grid">' +
      '<div class="field span-2"><label for="projectTitle">Project title</label><input class="input" id="projectTitle" type="text" value="' + esc(project.title) + '" required>' +
      '<p class="field-error" id="titleError" hidden>Give the project a title.</p></div>' +
      '<div class="field"><label for="projectClient">Client or subtitle</label><input class="input" id="projectClient" type="text" value="' + esc(project.client) + '" placeholder="for Erfolg"></div>' +
      '<div class="field"><label for="projectCategory">Category</label><select class="input" id="projectCategory">' +
      ['illustration', 'media', 'video'].map(function (category) {
        return '<option value="' + category + '"' + (project.category === category ? ' selected' : '') + '>' + categoryLabel(category) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label for="projectType">Format</label><select class="input" id="projectType">' +
      ['image', 'gallery', 'video'].map(function (type) {
        return '<option value="' + type + '"' + (project.type === type ? ' selected' : '') + '>' + type.charAt(0).toUpperCase() + type.slice(1) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label for="projectStatus">Status</label><select class="input" id="projectStatus">' +
      '<option value="published"' + (project.status === 'published' ? ' selected' : '') + '>Published</option>' +
      '<option value="draft"' + (project.status === 'draft' ? ' selected' : '') + '>Draft</option>' +
      '</select></div>' +
      '<div class="field span-2"><label for="projectVideo">Video URL</label><input class="input" id="projectVideo" type="text" value="' + esc(project.videoUrl) + '" placeholder="https://youtu.be/… or video/MyLogoReview.html" spellcheck="false">' +
      '<p class="field-help">Paste a YouTube or Vimeo link (unlisted is fine), or a page like video/MyLogoReview.html. The cover image acts as the poster.</p></div>' +
      '<div class="field span-2"><label for="projectDescription">Short description</label><textarea class="input" id="projectDescription" rows="3" placeholder="Optional note about the work">' + esc(project.description) + '</textarea></div>' +
      '</div></section>' +

      '<section class="modal-section"><div class="section-head"><div><p class="modal-section-title">Gallery images</p><p class="field-help">Shown in the lightbox when a visitor opens the project.</p></div>' +
      '<div class="page-actions"><button class="btn btn-ghost btn-sm" type="button" data-add-gallery-url>' + icon('plus') + 'Add URL</button>' +
      '<button class="btn btn-secondary btn-sm" type="button" data-add-gallery-files>' + icon('upload') + 'Upload</button></div></div>' +
      '<div class="gallery-list" id="galleryList"></div>' +
      '<input type="file" id="galleryFiles" accept="image/*" multiple hidden></section>' +

      '</div><div class="dialog-foot">' +
      (isEdit ? '<button class="btn btn-outline-danger" type="button" data-delete-project>' + icon('trash') + 'Delete</button>' : '') +
      '<span class="foot-spacer"></span><button class="btn btn-secondary" type="button" data-close>Cancel</button>' +
      '<button class="btn btn-primary" type="submit">' + (isEdit ? 'Save changes' : 'Add project') + '</button></div></form>';

    openDialog(dialog);

    var coverImage = dialog.querySelector('#coverImage');
    var coverEmpty = dialog.querySelector('#coverEmpty');
    var coverUrl = dialog.querySelector('#coverUrl');
    var coverDrop = dialog.querySelector('#coverDrop');
    var coverFile = dialog.querySelector('#coverFile');
    var galleryList = dialog.querySelector('#galleryList');

    function setCover(src) {
      project.cover = src || '';
      coverImage.src = assetUrl(project.cover);
      coverImage.hidden = !project.cover;
      coverEmpty.hidden = Boolean(project.cover);
      coverUrl.value = project.cover;
    }

    function renderGallery() {
      if (!project.gallery.length) {
        galleryList.innerHTML = '<p class="modal-hint">No gallery images yet. The cover is used on its own.</p>';
        return;
      }
      galleryList.innerHTML = project.gallery.map(function (src, index) {
        return '<div class="gallery-row" data-gallery-row="' + index + '">' +
          '<span class="gallery-index">' + (index + 1) + '</span>' +
          '<input class="input" type="text" value="' + esc(src) + '" aria-label="Gallery image ' + (index + 1) + '" spellcheck="false" data-gallery-input>' +
          '<button class="icon-btn remove-row" type="button" data-gallery-remove aria-label="Remove image">' + icon('trash') + '</button></div>';
      }).join('');
    }

    function addGalleryFiles(files) {
      var list = Array.prototype.slice.call(files || []);
      if (!list.length) return;
      galleryList.classList.add('is-uploading');
      list.reduce(function (chain, file) {
        return chain.then(function () {
          return uploadImage(file).then(function (item) {
            project.gallery.push('/' + item.key);
            renderGallery();
          }).catch(handleUploadError);
        });
      }, Promise.resolve()).then(function () {
        galleryList.classList.remove('is-uploading');
        renderGallery();
      });
    }

    function uploadCover(file) {
      if (!file) return;
      coverDrop.classList.add('is-uploading');
      uploadImage(file).then(function (item) {
        setCover('/' + item.key);
      }).catch(handleUploadError).then(function () {
        coverDrop.classList.remove('is-uploading');
      });
    }

    renderGallery();

    coverDrop.addEventListener('click', function () { coverFile.click(); });
    coverDrop.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); coverFile.click(); }
    });
    coverDrop.addEventListener('dragover', function (event) {
      event.preventDefault();
      coverDrop.classList.add('is-dragging');
    });
    coverDrop.addEventListener('dragleave', function () { coverDrop.classList.remove('is-dragging'); });
    coverDrop.addEventListener('drop', function (event) {
      event.preventDefault();
      coverDrop.classList.remove('is-dragging');
      if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        uploadCover(event.dataTransfer.files[0]);
      }
    });

    coverFile.addEventListener('change', function () {
      if (this.files && this.files[0]) uploadCover(this.files[0]);
      this.value = '';
    });

    coverUrl.addEventListener('input', function () {
      setCover(this.value.trim());
    });

    dialog.querySelector('[data-choose-cover]').addEventListener('click', function () { coverFile.click(); });
    dialog.querySelector('[data-clear-cover]').addEventListener('click', function () { setCover(''); });

    dialog.querySelector('[data-add-gallery-url]').addEventListener('click', function () {
      project.gallery.push('');
      renderGallery();
      var inputs = galleryList.querySelectorAll('[data-gallery-input]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    dialog.querySelector('[data-add-gallery-files]').addEventListener('click', function () {
      dialog.querySelector('#galleryFiles').click();
    });

    dialog.querySelector('#galleryFiles').addEventListener('change', function () {
      addGalleryFiles(this.files);
      this.value = '';
    });

    galleryList.addEventListener('input', function (event) {
      if (event.target.matches('[data-gallery-input]')) {
        var index = Number(event.target.closest('[data-gallery-row]').getAttribute('data-gallery-row'));
        project.gallery[index] = event.target.value;
      }
    });

    galleryList.addEventListener('click', function (event) {
      var remove = event.target.closest('[data-gallery-remove]');
      if (!remove) return;
      var index = Number(remove.closest('[data-gallery-row]').getAttribute('data-gallery-row'));
      project.gallery.splice(index, 1);
      renderGallery();
    });

    Array.prototype.forEach.call(dialog.querySelectorAll('[data-close]'), function (button) {
      button.addEventListener('click', function () {
        dialog.close();
        dialog.remove();
      });
    });

    var deleteButton = dialog.querySelector('[data-delete-project]');
    if (deleteButton) {
      deleteButton.addEventListener('click', function () {
        dialog.close();
        dialog.remove();
        deleteProject(existing.id);
      });
    }

    dialog.querySelector('#projectForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var title = dialog.querySelector('#projectTitle').value.trim();
      var titleError = dialog.querySelector('#titleError');
      if (!title) {
        titleError.hidden = false;
        dialog.querySelector('#projectTitle').focus();
        return;
      }
      titleError.hidden = true;

      project.title = title;
      project.client = dialog.querySelector('#projectClient').value.trim();
      project.category = dialog.querySelector('#projectCategory').value;
      project.type = dialog.querySelector('#projectType').value;
      project.status = dialog.querySelector('#projectStatus').value;
      project.videoUrl = dialog.querySelector('#projectVideo').value.trim();
      project.description = dialog.querySelector('#projectDescription').value.trim();
      project.cover = coverUrl.value.trim();
      project.gallery = project.gallery.map(function (src) { return String(src).trim(); }).filter(Boolean);
      project.updatedAt = new Date().toISOString();

      if (project.type === 'video' && !project.videoUrl) {
        toast('Add the video page URL so the lightbox has something to open.', 'error');
        dialog.querySelector('#projectVideo').focus();
        return;
      }

      if (isEdit) {
        saveData(function (data) {
          var index = data.projects.findIndex(function (item) { return item.id === project.id; });
          if (index !== -1) data.projects[index] = project;
        }, { toast: 'Project updated.' });
      } else {
        saveData(function (data) {
          data.projects.unshift(project);
        }, { toast: 'Project added to the portfolio.' });
      }

      await flushSave();

      dialog.close();
      dialog.remove();
      if (state.route === 'portfolio') refreshProjectTable();
      else if (state.route === 'overview') renderRoute();
    });

    window.setTimeout(function () { dialog.querySelector('#projectTitle').focus(); }, 40);
  }

  /* ------------------------------------------------------------------------
     Profile
     ------------------------------------------------------------------------ */

  function renderProfile(data) {
    var profile = data.profile;
    var html = pageHead('Profile & hero', 'The name, title and introduction used across the site.', state.editing ? '' : editHeadButton());
    html += editorActionsHtml();

    html += fieldsetOpen() + '<div class="editor-grid"><div class="editor-main"><section class="panel">' +
      '<div class="panel-head"><div><h2 class="panel-title">Hero copy</h2><p class="panel-sub">Shown on the home and about pages.</p></div></div>' +
      '<div class="panel-form form-stack">' +
      '<div class="field"><label for="profileName">Full name</label><input class="input" id="profileName" type="text" value="' + esc(profile.name) + '" data-bind="profile.name"></div>' +
      '<div class="field"><label for="profileTitle">Job title</label><input class="input" id="profileTitle" type="text" value="' + esc(profile.title) + '" data-bind="profile.title"></div>' +
      '<div class="field"><label for="profileIntro">Introduction</label><textarea class="input" id="profileIntro" rows="3" data-bind="profile.intro">' + esc(profile.intro) + '</textarea>' +
      '<p class="field-help">Keep this to one or two sentences; it sits under your name.</p></div>' +
      '<div class="field"><label for="profileMarquee">Marquee line</label><textarea class="input" id="profileMarquee" rows="2" data-bind="profile.marquee">' + esc(profile.marquee) + '</textarea>' +
      '<p class="field-help">The scrolling line on the splash page.</p></div>' +
      '</div>' +
      '<div class="panel-form section-block"><p class="panel-title">Portrait</p><p class="panel-sub" style="margin-bottom:12px">Used on the about page.</p>' +
      '<div class="image-field"><div class="image-drop"><img id="portraitImage" src="' + esc(assetUrl(profile.portrait)) + '" alt="Portrait preview"' + (profile.portrait ? '' : ' hidden') + '></div>' +
      '<div class="image-field-actions"><div class="row"><button class="btn btn-secondary btn-sm" type="button" data-portrait-choose>' + icon('upload') + 'Choose image</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-portrait-clear>Remove</button></div>' +
      '<div class="field"><label for="portraitUrl">Image URL</label><input class="input" id="portraitUrl" type="text" value="' + esc(profile.portrait) + '" data-bind="profile.portrait" spellcheck="false"></div></div></div>' +
      '<input type="file" id="portraitFile" accept="image/*" hidden></div>' +
      '</section></div>';

    html += '<div class="editor-rail"><section class="panel preview-panel"><div class="panel-head"><div><h2 class="panel-title">Preview</h2><p class="panel-sub">How the hero reads.</p></div></div>' +
      '<div class="hero-preview">' +
      '<div class="hero-image-wrap">' +
      '<img class="hero-image" id="profilePreviewImage" src="' + esc(assetUrl(profile.portrait)) + '" alt=""' + (profile.portrait ? '' : ' style="display:none"') + '>' +
      '<div class="hero-overlay"></div>' +
      '</div>' +
      '<span class="preview-label">Hero</span><strong id="profilePreviewName">' + esc(profile.name) + '</strong>' +
      '<p id="profilePreviewTitle">' + esc(profile.title) + '</p><p id="profilePreviewIntro">' + esc(profile.intro) + '</p><span class="preview-mark">AA</span></div>' +
      '<div class="cv-preview"><div class="cv-sheet"><span class="preview-label">Marquee</span><p id="profilePreviewMarquee" style="margin-top:6px;color:#475467;font-size:11.5px;line-height:1.5">' + esc(profile.marquee) + '</p></div></div>' +
      '</section></div></div></fieldset>';

    html += '<p class="local-note">' + icon('info') + '<span>Portrait uploads stay in this browser. On the live site the image is used wherever the portrait appears.</span></p>';

    pageContent.innerHTML = html;
    pageContent.oninput = handleProfileInput;
    pageContent.onclick = handleProfileClick;
    pageContent.onchange = null;

    state.refreshPreview = function (next) {
      var nextProfile = next.profile;
      var name = document.getElementById('profilePreviewName');
      if (!name) return;
      name.textContent = nextProfile.name || 'Your name';
      document.getElementById('profilePreviewTitle').textContent = nextProfile.title || 'Your title';
      document.getElementById('profilePreviewIntro').textContent = nextProfile.intro;
      document.getElementById('profilePreviewMarquee').textContent = nextProfile.marquee;
      var portrait = document.getElementById('portraitImage');
      portrait.src = assetUrl(nextProfile.portrait);
      portrait.hidden = !nextProfile.portrait;
      var image = document.getElementById('profilePreviewImage');
      if (image) {
        image.src = assetUrl(nextProfile.portrait);
        image.style.display = nextProfile.portrait ? '' : 'none';
      }
      var url = document.getElementById('portraitUrl');
      if (url && document.activeElement !== url) url.value = nextProfile.portrait;
    };
  }

  function handleProfileInput(event) {
    var field = event.target.closest('[data-bind]');
    if (!field) return;
    var path = field.getAttribute('data-bind');
    var value = field.value;
    saveData(function (data) { setPath(data, path, value); });
  }

  function handleProfileClick(event) {
    var choose = event.target.closest('[data-portrait-choose]');
    if (choose) {
      document.getElementById('portraitFile').click();
      return;
    }
    var clear = event.target.closest('[data-portrait-clear]');
    if (clear) {
      saveData(function (data) { data.profile.portrait = ''; }, { toast: 'Portrait removed.' });
      var image = document.getElementById('portraitImage');
      var url = document.getElementById('portraitUrl');
      if (image) image.hidden = true;
      if (url) url.value = '';
      if (state.refreshPreview) state.refreshPreview(Store.get());
      return;
    }
    if (event.target.id === 'portraitFile' || event.target.matches('#portraitFile')) return;
  }

  document.addEventListener('change', function (event) {
    if (event.target.id !== 'portraitFile') return;
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var image = document.getElementById('portraitImage');
    if (image) image.classList.add('is-uploading');
    uploadImage(file).then(function (item) {
      var src = '/' + item.key;
      saveData(function (data) { data.profile.portrait = src; }, { toast: 'Portrait updated.' });
      var url = document.getElementById('portraitUrl');
      if (image) {
        image.src = src;
        image.hidden = false;
      }
      if (url) url.value = src;
    }).catch(handleUploadError).then(function () {
      if (image) image.classList.remove('is-uploading');
    });
    event.target.value = '';
  });

  /* ------------------------------------------------------------------------
     Contact
     ------------------------------------------------------------------------ */

  function renderContact(data) {
    var contact = data.contact;
    var html = pageHead('Contact details', 'How visitors reach you from the contact page.', state.editing ? '' : editHeadButton());
    html += editorActionsHtml();

    html += fieldsetOpen() + '<div class="editor-grid"><div class="editor-main"><section class="panel">' +
      '<div class="panel-head"><div><h2 class="panel-title">Details</h2><p class="panel-sub">These appear beside the contact form.</p></div></div>' +
      '<div class="panel-form form-grid">' +
      '<div class="field span-2"><label for="contactEmail">Email address</label><input class="input" id="contactEmail" type="email" value="' + esc(contact.email) + '" data-bind="contact.email" spellcheck="false"></div>' +
      '<div class="field"><label for="contactPhone">Phone</label><input class="input" id="contactPhone" type="tel" value="' + esc(contact.phone) + '" data-bind="contact.phone"></div>' +
      '<div class="field"><label for="contactLocation">Location</label><input class="input" id="contactLocation" type="text" value="' + esc(contact.location) + '" data-bind="contact.location"></div>' +
      '<div class="field"><label for="contactAvailability">Availability</label><input class="input" id="contactAvailability" type="text" value="' + esc(contact.availability) + '" data-bind="contact.availability"></div>' +
      '<div class="field"><label for="contactWhatsapp">WhatsApp link</label><input class="input" id="contactWhatsapp" type="text" value="' + esc(contact.whatsapp) + '" data-bind="contact.whatsapp" spellcheck="false"></div>' +
      '</div></section>' +
      '<p class="local-note">' + icon('info') + '<span>The contact form itself is unchanged. These details are the ones shown next to it.</span></p>' +
      '</div>';

    html += '<div class="editor-rail"><section class="panel preview-panel"><div class="panel-head"><div><h2 class="panel-title">Preview</h2><p class="panel-sub">Contact block.</p></div></div>' +
      '<div class="contact-preview">' +
      '<div><span>Location</span><strong id="contactPrevLocation">' + esc(contact.location) + '</strong></div>' +
      '<div><span>Phone</span><strong id="contactPrevPhone">' + esc(contact.phone) + '</strong></div>' +
      '<div><span>Email</span><strong id="contactPrevEmail">' + esc(contact.email) + '</strong></div>' +
      '<div><span>Availability</span><strong id="contactPrevAvailability">' + esc(contact.availability) + '</strong></div>' +
      '</div></section></div></div></fieldset>';

    pageContent.innerHTML = html;
    pageContent.oninput = handleContactInput;
    pageContent.onchange = null;
    pageContent.onclick = null;

    state.refreshPreview = function (next) {
      var contactNext = next.contact;
      var mapping = {
        contactPrevLocation: contactNext.location,
        contactPrevPhone: contactNext.phone,
        contactPrevEmail: contactNext.email,
        contactPrevAvailability: contactNext.availability
      };
      Object.keys(mapping).forEach(function (id) {
        var node = document.getElementById(id);
        if (node) node.textContent = mapping[id] || '—';
      });
    };
  }

  function handleContactInput(event) {
    var field = event.target.closest('[data-bind]');
    if (!field) return;
    var path = field.getAttribute('data-bind');
    var value = field.value;
    saveData(function (data) { setPath(data, path, value); });
  }

  /* ------------------------------------------------------------------------
     Social links
     ------------------------------------------------------------------------ */

  function socialRowsHtml(data) {
    if (!data.socials.length) {
      return '<div class="empty-state" style="margin:0 20px 20px">' + icon('link') + '<strong>No social links</strong><p>Add the platforms you want visitors to find you on.</p></div>';
    }
    return data.socials.map(function (social) {
      return '<div class="social-row" data-social-id="' + esc(social.id) + '">' +
        '<span class="social-mark" data-social-mark>' + socialIcon(social.platform) + '</span>' +
        '<select class="input" data-social-platform aria-label="Platform">' + platformOptions(social.platform) + '</select>' +
        '<input class="input social-url" type="text" value="' + esc(social.url) + '" placeholder="https://" aria-label="' + esc(socialLabel(social.platform)) + ' URL" data-social-url spellcheck="false">' +
        '<button class="switch" type="button" role="switch" aria-checked="' + (social.visible ? 'true' : 'false') + '" aria-label="Show ' + esc(socialLabel(social.platform)) + '" data-social-toggle></button>' +
        '<button class="icon-btn remove-row" type="button" aria-label="Remove link" data-social-remove>' + icon('trash') + '</button>' +
        '</div>';
    }).join('');
  }

  function socialPreviewHtml(data) {
    var visible = data.socials.filter(function (social) { return social.visible; });
    if (!visible.length) return '<p class="modal-hint">No links are visible.</p>';
    return visible.map(function (social) {
      var label = socialLabel(social.platform);
      if (!social.url) return '<span title="' + esc(label) + ' (no URL)" style="opacity:.45">' + socialIcon(social.platform) + '</span>';
      return '<a href="' + esc(social.url) + '" target="_blank" rel="noopener" title="' + esc(label) + '">' + socialIcon(social.platform) + '</a>';
    }).join('');
  }

  function renderSocial(data) {
    var visible = data.socials.filter(function (social) { return social.visible; }).length;
    var headAction = state.editing
      ? '<button class="btn btn-primary" type="button" data-social-action="add">' + icon('plus') + 'Add link</button>'
      : editHeadButton();
    var html = pageHead('Social links', visible + ' of ' + data.socials.length + ' links visible on the site.', headAction);
    html += editorActionsHtml();

    html += fieldsetOpen() + '<div class="editor-grid"><div class="editor-main"><section class="panel">' +
      '<div class="panel-head"><div><h2 class="panel-title">Links</h2><p class="panel-sub">Turn a link off to hide it without deleting it.</p></div></div>' +
      '<div class="social-list" id="socialList">' + socialRowsHtml(data) + '</div></section>' +
      '<p class="local-note">' + icon('info') + '<span>Facebook, LinkedIn, Instagram, X, Behance, Dribbble and YouTube use the site icons. WhatsApp and TikTok show their own marks.</span></p></div>';

    html += '<div class="editor-rail"><section class="panel preview-panel"><div class="panel-head"><div><h2 class="panel-title">Preview</h2><p class="panel-sub">Header and footer icons.</p></div></div>' +
      '<div class="social-preview" id="socialPreview">' + socialPreviewHtml(data) + '</div></section></div></div></fieldset>';

    pageContent.innerHTML = html;
    pageContent.onclick = handleSocialClick;
    pageContent.oninput = handleSocialInput;
    pageContent.onchange = handleSocialChange;
    pageContent.onblur = function (event) {
      var urlField = event.target.closest('[data-social-url]');
      if (!urlField) return;
      var id = urlField.closest('[data-social-id]').getAttribute('data-social-id');
      var value = urlField.value;
      saveData(function (data) {
        var social = data.socials.find(function (item) { return item.id === id; });
        if (social) social.url = value;
      }, { toast: 'Link URL updated.' });
    };

    state.refreshPreview = function (next) {
      var preview = document.getElementById('socialPreview');
      if (preview) preview.innerHTML = socialPreviewHtml(next);
    };
  }

  function handleSocialInput(event) {
    var urlField = event.target.closest('[data-social-url]');
    if (!urlField) return;
    var id = urlField.closest('[data-social-id]').getAttribute('data-social-id');
    var value = urlField.value;
    saveData(function (data) {
      var social = data.socials.find(function (item) { return item.id === id; });
      if (social) social.url = value;
    });
  }

  function handleSocialChange(event) {
    var platformField = event.target.closest('[data-social-platform]');
    if (!platformField) return;
    var id = platformField.closest('[data-social-id]').getAttribute('data-social-id');
    var value = platformField.value;
    saveData(function (data) {
      var social = data.socials.find(function (item) { return item.id === id; });
      if (social) {
        social.platform = value;
        social.label = socialLabel(value);
      }
    }, { toast: 'Platform updated.' });
    var list = document.getElementById('socialList');
    if (list) {
      list.innerHTML = socialRowsHtml(state.data);
      hydrateIcons(list);
    }
  }

  function handleSocialClick(event) {
    var add = event.target.closest('[data-social-action="add"]');
    if (add) {
      saveData(function (data) {
        data.socials.push({ id: uid('social'), platform: 'instagram', label: 'Instagram', url: '', visible: true });
      }, { toast: 'Social link added. Add its URL.' });
      var list = document.getElementById('socialList');
      if (list) {
        list.innerHTML = socialRowsHtml(state.data);
        hydrateIcons(list);
      }
      if (state.refreshPreview) state.refreshPreview(state.data);
      return;
    }

    var toggle = event.target.closest('[data-social-toggle]');
    if (toggle) {
      var toggleId = toggle.closest('[data-social-id]').getAttribute('data-social-id');
      var social = state.data.socials.find(function (item) { return item.id === toggleId; });
      var willShow = !social || !social.visible;
      saveData(function (data) {
        var s = data.socials.find(function (item) { return item.id === toggleId; });
        if (s) s.visible = willShow;
      }, { toast: willShow ? 'Link shown.' : 'Link hidden.' });
      var next = Store.get().socials.find(function (item) { return item.id === toggleId; });
      toggle.setAttribute('aria-checked', String(Boolean(next && next.visible)));
      if (state.refreshPreview) state.refreshPreview(Store.get());
      return;
    }

    var remove = event.target.closest('[data-social-remove]');
    if (remove) {
      var removeId = remove.closest('[data-social-id]').getAttribute('data-social-id');
      saveData(function (data) {
        data.socials = data.socials.filter(function (item) { return item.id !== removeId; });
      }, { toast: 'Social link removed.' });
      var listNode = document.getElementById('socialList');
      if (listNode) {
        listNode.innerHTML = socialRowsHtml(state.data);
        hydrateIcons(listNode);
      }
      if (state.refreshPreview) state.refreshPreview(state.data);
    }
  }

  /* ------------------------------------------------------------------------
     Resume
     ------------------------------------------------------------------------ */

  function experienceCard(item) {
    return '<div class="repeater-row card" data-collection="experience" data-id="' + esc(item.id) + '">' +
      '<div class="field"><label>Period</label><input class="input" type="text" value="' + esc(item.period) + '" placeholder="2024 - 2025" data-field="period"></div>' +
      '<div class="field"><label>Role</label><input class="input" type="text" value="' + esc(item.role) + '" placeholder="Graphic Designer" data-field="role"></div>' +
      '<div class="field span-2"><label>Company</label><input class="input" type="text" value="' + esc(item.company) + '" placeholder="Company, city" data-field="company"></div>' +
      '<div class="field span-2"><label>Description</label><textarea class="input" rows="3" data-field="description">' + esc(item.description) + '</textarea></div>' +
      '<div class="span-2" style="display:flex;justify-content:flex-end"><button class="link-button danger" type="button" data-repeater-remove>' + icon('trash') + 'Remove entry</button></div>' +
      '</div>';
  }

  function educationCard(item) {
    return '<div class="repeater-row card" data-collection="education" data-id="' + esc(item.id) + '">' +
      '<div class="field"><label>Period</label><input class="input" type="text" value="' + esc(item.period) + '" placeholder="2025" data-field="period"></div>' +
      '<div class="field"><label>Qualification</label><input class="input" type="text" value="' + esc(item.degree) + '" placeholder="Information Technology" data-field="degree"></div>' +
      '<div class="field span-2"><label>School</label><input class="input" type="text" value="' + esc(item.school) + '" placeholder="School, city" data-field="school"></div>' +
      '<div class="field span-2"><label>Description</label><textarea class="input" rows="3" data-field="description">' + esc(item.description) + '</textarea></div>' +
      '<div class="span-2" style="display:flex;justify-content:flex-end"><button class="link-button danger" type="button" data-repeater-remove>' + icon('trash') + 'Remove entry</button></div>' +
      '</div>';
  }

  function skillRow(item) {
    return '<div class="skill-row" data-collection="skills" data-id="' + esc(item.id) + '">' +
      '<input class="input" type="text" value="' + esc(item.name) + '" placeholder="Skill" aria-label="Skill name" data-field="name">' +
      '<span class="skill-value">' + esc(item.level) + '%</span>' +
      '<button class="icon-btn remove-row" type="button" aria-label="Remove skill" data-repeater-remove>' + icon('trash') + '</button>' +
      '<input type="range" min="0" max="100" step="5" value="' + esc(item.level) + '" aria-label="' + esc(item.name || 'Skill') + ' level" data-field="level">' +
      '</div>';
  }

  function renderResume(data) {
    var resume = data.resume;
    var actions = '<a class="btn btn-secondary" href="../resume.html" target="_blank" rel="noopener">' + icon('external') + 'View resume</a>' +
      (resume.cvUrl ? '<a class="btn btn-secondary" href="../' + esc(resume.cvUrl) + '" target="_blank" rel="noopener">' + icon('download') + 'Open CV</a>' : '') +
      (state.editing ? '' : editHeadButton());
    var html = pageHead('Resume', resume.experience.length + ' roles · ' + resume.education.length + ' education · ' + resume.skills.length + ' skills', actions);
    html += editorActionsHtml();

    html += fieldsetOpen() + '<div class="editor-grid"><div class="editor-main">' +
      '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Summary</h2><p class="panel-sub">The heading and CV link at the top of the resume page.</p></div></div>' +
      '<div class="panel-form form-grid">' +
      '<div class="field"><label for="resumeRole">Role</label><input class="input" id="resumeRole" type="text" value="' + esc(resume.role) + '" data-bind="resume.role"></div>' +
      '<div class="field"><label for="resumeYears">Experience</label><input class="input" id="resumeYears" type="text" value="' + esc(resume.years) + '" placeholder="8+ years" data-bind="resume.years"></div>' +
      '<div class="field span-2"><label for="resumeSummary">Short summary</label><textarea class="input" id="resumeSummary" rows="3" data-bind="resume.summary">' + esc(resume.summary) + '</textarea></div>' +
      '<div class="field"><label for="resumeCvFile">CV file name</label><input class="input" id="resumeCvFile" type="text" value="' + esc(resume.cvFile) + '" placeholder="MY PROFESSIONAL CV.pdf" data-bind="resume.cvFile"></div>' +
      '<div class="field"><label for="resumeCvUrl">CV file URL</label><input class="input" id="resumeCvUrl" type="text" value="' + esc(resume.cvUrl) + '" placeholder="pdf/MY PROFESSIONAL CV.pdf" data-bind="resume.cvUrl" spellcheck="false"></div>' +
      '<div class="field"><label for="resumeCvUpload">Replace CV file</label>' +
      '<input type="file" id="resumeCvUpload" accept="application/pdf" spellcheck="false">' +
      '<p class="field-help">Upload a PDF to Netlify Blobs. Replaces the existing CV link.</p></div>' +
      '</div></section>' +

      '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Experience</h2><p class="panel-sub">Newest first, as shown on the resume.</p></div>' +
      '<button class="btn btn-secondary btn-sm" type="button" data-resume-action="add-experience">' + icon('plus') + 'Add role</button></div>' +
      '<div class="panel-form" id="experienceList">' + (resume.experience.length ? resume.experience.map(experienceCard).join('') : '<p class="modal-hint">No roles yet. Add the first one.</p>') + '</div></section>' +

      '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Education</h2><p class="panel-sub">Qualifications below the experience list.</p></div>' +
      '<button class="btn btn-secondary btn-sm" type="button" data-resume-action="add-education">' + icon('plus') + 'Add education</button></div>' +
      '<div class="panel-form" id="educationList">' + (resume.education.length ? resume.education.map(educationCard).join('') : '<p class="modal-hint">No education entries yet.</p>') + '</div></section>' +

      '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Skills</h2><p class="panel-sub">The bars on the resume page.</p></div>' +
      '<button class="btn btn-secondary btn-sm" type="button" data-resume-action="add-skill">' + icon('plus') + 'Add skill</button></div>' +
      '<div class="panel-form"><div class="skills-list" id="skillsList">' + (resume.skills.length ? resume.skills.map(skillRow).join('') : '<p class="modal-hint">No skills yet.</p>') + '</div></div></section>' +
      '</div>';

    html += '<div class="editor-rail"><section class="panel preview-panel"><div class="panel-head"><div><h2 class="panel-title">Preview</h2><p class="panel-sub">Resume header and CV.</p></div></div>' +
      '<div class="cv-preview"><div class="cv-sheet"><strong id="resumePreviewName">' + esc(data.profile.name) + '</strong>' +
      '<small id="resumePreviewRole">' + esc(resume.role) + ' · ' + esc(resume.years) + '</small>' +
      '<p id="resumePreviewSummary" style="margin-top:9px;color:#475467;font-size:11px;line-height:1.55">' + esc(resume.summary) + '</p>' +
      '<div class="cv-lines"><span></span><span></span><span></span><span></span></div>' +
      '<p style="margin-top:10px;color:#667085;font-size:10.5px">' + resume.experience.length + ' roles · ' + resume.education.length + ' education · ' + resume.skills.length + ' skills</p></div>' +
      (resume.cvUrl ? '<a class="btn btn-secondary btn-block" id="resumePreviewCv" style="margin-top:10px" href="../' + esc(resume.cvUrl) + '" target="_blank" rel="noopener">' + icon('fileText') + 'Download CV</a>' : '<p class="modal-hint" id="resumePreviewCv" style="margin-top:10px">No CV linked.</p>') +
      '</div></section>' +
      '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Recent roles</h2></div></div><div class="panel-form" id="resumeRolePreview">' +
      resume.experience.slice(0, 3).map(function (item) {
        return '<div style="padding:8px 0;border-top:1px solid #eef0f3"><strong style="display:block;font-size:11.5px">' + esc(item.role || 'Untitled role') + '</strong><small style="color:#667085;font-size:10.5px">' + esc(item.period) + ' · ' + esc(item.company) + '</small></div>';
      }).join('') + '</div></section></div></div></fieldset>';

    html += '<p class="local-note">' + icon('info') + '<span>Upload a CV PDF to Netlify Blobs. The link is saved to your resume and appears on the live resume page.</span></p>';

    pageContent.innerHTML = html;
    pageContent.oninput = handleResumeInput;
    pageContent.onchange = null;
    pageContent.onclick = handleResumeClick;

    var cvUpload = document.getElementById('resumeCvUpload');
    if (cvUpload) {
      cvUpload.addEventListener('change', function () {
        var file = this.files && this.files[0];
        if (!file) return;
        uploadCv(file).then(function (item) {
          var src = '/' + item.key;
          saveData(function (data) {
            data.resume.cvUrl = src;
            data.resume.cvFile = item.filename;
          }, { toast: 'CV uploaded.' });
          if (state.refreshPreview) state.refreshPreview(Store.get());
          cvUpload.value = '';
        }).catch(handleUploadError);
      });
    }

    state.refreshPreview = function (next) {
      var nextResume = next.resume;
      var role = document.getElementById('resumePreviewRole');
      if (!role) return;
      role.textContent = (nextResume.role || 'Role') + ' · ' + (nextResume.years || 'Experience');
      document.getElementById('resumePreviewSummary').textContent = nextResume.summary;
      document.getElementById('resumePreviewName').textContent = next.profile.name;

      var cvLink = document.getElementById('resumePreviewCv');
      if (cvLink) {
        if (nextResume.cvUrl) {
          cvLink.href = assetUrl(nextResume.cvUrl);
          cvLink.className = 'btn btn-secondary btn-block';
          cvLink.style.display = '';
          cvLink.style.marginTop = '10px';
          cvLink.innerHTML = icon('fileText') + ' Download CV';
        } else {
          cvLink.style.display = 'none';
        }
      }

      var rolePreview = document.getElementById('resumeRolePreview');
      if (rolePreview && nextResume.experience.length) {
        rolePreview.innerHTML = nextResume.experience.slice(0, 3).map(function (item) {
          return '<div style="padding:8px 0;border-top:1px solid #eef0f3"><strong style="display:block;font-size:11.5px">' + esc(item.role || 'Untitled role') + '</strong><small style="color:#667085;font-size:10.5px">' + esc(item.period) + ' · ' + esc(item.company) + '</small></div>';
        }).join('');
      } else if (rolePreview) {
        rolePreview.innerHTML = '<p class="modal-hint">No roles yet.</p>';
      }
    };
  }

  function handleResumeInput(event) {
    var bind = event.target.closest('[data-bind]');
    if (bind) {
      var path = bind.getAttribute('data-bind');
      var value = bind.value;
      saveData(function (data) { setPath(data, path, value); });
      return;
    }

    var field = event.target.closest('[data-field]');
    if (!field) return;
    var row = field.closest('[data-collection]');
    if (!row) return;
    var collection = row.getAttribute('data-collection');
    var id = row.getAttribute('data-id');
    var key = field.getAttribute('data-field');
    var raw = field.value;
    var item = state.data.resume[collection].find(function (entry) { return entry.id === id; });
    if (!item) return;

    if (key === 'level') {
      var value = toNumber(raw, 70);
      saveData(function (data) {
        var target = data.resume[collection].find(function (entry) { return entry.id === id; });
        if (target) target.level = value;
      });
      var label = row.querySelector('.skill-value');
      if (label) label.textContent = value + '%';
      return;
    }

    saveData(function (data) {
      var target = data.resume[collection].find(function (entry) { return entry.id === id; });
      if (target) target[key] = raw;
    });
  }

  function handleResumeClick(event) {
    var action = event.target.closest('[data-resume-action]');
    if (action) {
      var type = action.getAttribute('data-resume-action');
      if (type === 'add-experience') {
        saveData(function (data) {
          data.resume.experience.push({ id: uid('exp'), period: '', role: '', company: '', description: '' });
        }, { toast: 'Role added.' });
        rerenderPreservingSnapshot();
        return;
      }
      if (type === 'add-education') {
        saveData(function (data) {
          data.resume.education.push({ id: uid('edu'), period: '', degree: '', school: '', description: '' });
        }, { toast: 'Education entry added.' });
        rerenderPreservingSnapshot();
        return;
      }
      if (type === 'add-skill') {
        saveData(function (data) {
          data.resume.skills.push({ id: uid('skill'), name: '', level: 70 });
        }, { toast: 'Skill added.' });
        rerenderPreservingSnapshot();
        return;
      }
    }

    var remove = event.target.closest('[data-repeater-remove]');
    if (!remove) return;
    var row = remove.closest('[data-collection]');
    if (!row) return;
    var collection = row.getAttribute('data-collection');
    var id = row.getAttribute('data-id');
    saveData(function (data) {
      data.resume[collection] = data.resume[collection].filter(function (entry) { return entry.id !== id; });
    }, { toast: 'Removed.' });
    rerenderPreservingSnapshot();
  }

  /* ------------------------------------------------------------------------
     Account
     ------------------------------------------------------------------------ */

  function renderAccount() {
    var editing = Boolean(state.accountEditing);
    var disabled = editing ? '' : ' disabled';

    var html = pageHead('Account', 'The username and password that protect this admin.');

    html += '<div class="account-grid"><section class="panel">' +
      '<div class="panel-head"><div><h2 class="panel-title">Sign-in details</h2>' +
      '<p class="panel-sub">You sign in with one username and one password.</p></div>' +
      (editing ? '' :
        '<div class="panel-actions"><button class="btn btn-primary btn-sm" type="button" data-account-action="edit-account">' +
        icon('edit') + 'Edit</button></div>') +
      '</div>' +
      '<form class="panel-form form-stack" id="accountForm" novalidate>' +
      '<div class="field"><label for="accountUsername">Username</label>' +
      '<input class="input" id="accountUsername" name="username" type="text"' + disabled +
      ' value="' + esc(state.username || '') + '" autocomplete="username" spellcheck="false" required>' +
      '<p class="field-help">At least 3 characters. Letters, numbers, dots, dashes and underscores.</p></div>' +
      '<div class="field"><label for="accountCurrent">Current password</label>' +
      '<div class="input-wrap has-toggle">' +
      '<input class="input" id="accountCurrent" name="currentPassword" type="password"' + disabled +
      ' autocomplete="current-password" required>' +
      '<button class="password-toggle" type="button" data-account-action="toggle-current" aria-label="Show password" aria-pressed="false">' +
      '<span data-icon="eye" aria-hidden="true"></span></button></div>' +
      '<p class="field-help">Required before anything changes.</p></div>' +
      '<div class="field"><label for="accountNew">New password</label>' +
      '<div class="input-wrap has-toggle">' +
      '<input class="input" id="accountNew" name="newPassword" type="password"' + disabled +
      ' autocomplete="new-password">' +
      '<button class="password-toggle" type="button" data-account-action="toggle-new" aria-label="Show password" aria-pressed="false">' +
      '<span data-icon="eye" aria-hidden="true"></span></button></div>' +
      '<p class="field-help">Leave blank to keep current. At least 10 characters, not the default.</p></div>' +
      '<div class="field"><label for="accountConfirm">Repeat new password</label>' +
      '<div class="input-wrap has-toggle">' +
      '<input class="input" id="accountConfirm" name="confirmPassword" type="password"' + disabled +
      ' autocomplete="new-password">' +
      '<button class="password-toggle" type="button" data-account-action="toggle-confirm" aria-label="Show password" aria-pressed="false">' +
      '<span data-icon="eye" aria-hidden="true"></span></button></div></div>' +
      '<p class="form-error" id="accountError" role="alert"></p>' +
      (editing ?
        '<div class="form-actions"><button class="btn btn-secondary btn-sm" type="button" data-account-action="cancel-edit">' +
        icon('x') + 'Cancel</button>' +
        '<button class="btn btn-primary btn-sm" type="submit">' + icon('check') + 'Save changes</button></div>' :
        '') +
      '</form></section>' +
      '<aside class="rail">' +
      '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Session</h2></div></div>' +
      '<div class="panel-body"><dl class="detail-list">' +
      '<div><dt>Signed in as</dt><dd>' + esc(state.username || '—') + '</dd></div>' +
      '<div><dt>Session length</dt><dd>7 days, or 30 days with “Keep me signed in”.</dd></div>' +
      '<div><dt>Stored on</dt><dd>A secure HttpOnly cookie on this device.</dd></div>' +
      '</dl><button class="btn btn-secondary btn-block" type="button" data-account-action="sign-out">' + icon('logout') + 'Sign out</button></div></section>' +
      '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Good to know</h2></div></div>' +
      '<div class="panel-body"><p class="panel-sub">Changing your password signs out other devices the next time they try to save. This device stays signed in.</p></div></section>' +
      '</aside></div>';

    pageContent.innerHTML = html;
    pageContent.onclick = handleAccountClick;
    var form = document.getElementById('accountForm');
    if (form) form.addEventListener('submit', submitAccount);
  }

  function handleAccountClick(event) {
    var action = event.target.closest('[data-account-action]');
    if (!action) return;
    var name = action.getAttribute('data-account-action');

    if (name === 'sign-out') {
      handleSignOut();
      return;
    }
    if (name === 'edit-account') {
      state.accountEditing = true;
      renderAccount();
      return;
    }
    if (name === 'cancel-edit') {
      state.accountEditing = false;
      renderAccount();
      return;
    }
    if (name === 'save-edit') {
      var form = document.getElementById('accountForm');
      if (form) form.requestSubmit();
      return;
    }
    if (name === 'toggle-current' || name === 'toggle-new' || name === 'toggle-confirm') {
      var field = name === 'toggle-current' ? '#accountCurrent'
        : name === 'toggle-new' ? '#accountNew' : '#accountConfirm';
      var input = document.querySelector(field);
      var button = action;
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      button.setAttribute('aria-pressed', String(!showing));
      button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      return;
    }
  }

  function submitAccount(event) {
    event.preventDefault();
    if (!state.accountEditing) return;
    var form = event.currentTarget;
    var username = form.querySelector('#accountUsername').value.trim();
    var current = form.querySelector('#accountCurrent').value;
    var next = form.querySelector('#accountNew').value;
    var confirm = form.querySelector('#accountConfirm').value;
    var error = form.querySelector('#accountError');
    var button = form.querySelector('button[type="submit"]');

    error.textContent = '';
    if (!current) {
      error.textContent = 'Enter your current password.';
      form.querySelector('#accountCurrent').focus();
      return;
    }
    if (next && next.length < 10) {
      error.textContent = 'Use at least 10 characters for the new password.';
      form.querySelector('#accountNew').focus();
      return;
    }
    if (next && next !== confirm) {
      error.textContent = 'The new passwords do not match.';
      form.querySelector('#accountConfirm').focus();
      return;
    }

    var payload = { currentPassword: current };
    if (username && username !== state.username) payload.username = username;
    if (next) payload.newPassword = next;
    if (!payload.username && !payload.newPassword) {
      error.textContent = 'Change your username or password to save.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Saving…';

    apiJson('/api/account', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }, 20000).then(function (result) {
      if (result.response.status === 401) {
        expireSession(result.body.error || 'Your session expired. Sign in again.');
        return;
      }
      if (!result.response.ok) {
        error.textContent = result.body.error || 'Could not update your account.';
        return;
      }
      state.accountEditing = false;
      applySession({ username: result.body.username, mustChange: false });
      toast('Account updated. Use the new details next time you sign in.', 'info');
      renderRoute();
    }).catch(function (errorObject) {
      error.textContent = networkMessage(errorObject);
    }).then(function () {
      button.disabled = false;
      button.textContent = 'Save changes';
    });
  }

  /* ------------------------------------------------------------------------
     Media library
     ------------------------------------------------------------------------ */

  var mediaState = { items: null };

  function mediaSkeleton() {
    var cards = '';
    for (var index = 0; index < 6; index += 1) {
      cards += '<div class="media-card is-loading"><span class="skeleton media-skeleton"></span></div>';
    }
    return cards;
  }

  function renderMedia() {
    var html = pageHead('Media library', 'Images uploaded here get a permanent address you can reuse anywhere on the site.',
      '<button class="btn btn-primary" type="button" data-media-action="upload">' + icon('upload') + 'Upload images</button>');

    html += '<div class="media-toolbar"><span class="count-label" id="mediaCount">Loading…</span>' +
      '<span class="toolbar-spacer"></span>' +
      '<input class="input" id="mediaSearch" type="search" placeholder="Filter by filename" aria-label="Filter images" autocomplete="off"></div>';

    html += '<section class="panel"><div class="media-grid" id="mediaGrid">' + mediaSkeleton() + '</div></section>';
    html += '<input type="file" id="mediaFiles" accept="image/*" multiple hidden>';
    html += '<p class="local-note">' + icon('info') + '<span>New uploads live in Netlify Blobs and are served from /media/. Images already in the site folder keep their old paths and still work.</span></p>';

    pageContent.innerHTML = html;
    pageContent.onclick = handleMediaClick;

    var search = document.getElementById('mediaSearch');
    if (search) {
      search.addEventListener('input', function () { renderMediaGrid(this.value.trim()); });
    }
    var picker = document.getElementById('mediaFiles');
    if (picker) {
      picker.addEventListener('change', function () {
        uploadMediaFiles(this.files);
        this.value = '';
      });
    }
    loadMedia();
  }

  function loadMedia() {
    return apiJson('/api/media').then(function (result) {
      if (result.response.status === 401) {
        expireSession();
        return;
      }
      if (!result.response.ok) throw new Error(result.body.error || 'Could not load the media library.');
      mediaState.items = result.body.items || [];
    }).catch(function (error) {
      mediaState.items = [];
      toast(networkMessage(error), 'error');
    }).then(function () {
      if (state.route !== 'media') return;
      var search = document.getElementById('mediaSearch');
      renderMediaGrid(search ? search.value.trim() : '');
    });
  }

  function renderMediaGrid(query) {
    var grid = document.getElementById('mediaGrid');
    if (!grid) return;
    var all = mediaState.items || [];
    var needle = String(query || '').toLowerCase();
    var items = all.filter(function (item) {
      return !needle || String(item.filename || '').toLowerCase().indexOf(needle) !== -1;
    });

    var count = document.getElementById('mediaCount');
    if (count) count.textContent = all.length + (all.length === 1 ? ' image' : ' images');

    if (!items.length) {
      grid.innerHTML = '<div class="empty-state">' + icon('image') +
        '<strong>' + (all.length ? 'No images match that filter' : 'No images yet') + '</strong>' +
        '<p>' + (all.length
          ? 'Try a different filename.'
          : 'Upload a logo, portrait or project image and it gets a permanent /media/ address.') + '</p>' +
        '<button class="btn btn-primary btn-sm" type="button" data-media-action="upload">' + icon('upload') + 'Upload images</button></div>';
      return;
    }

    grid.innerHTML = items.map(function (item) {
      return '<figure class="media-card">' +
        '<div class="media-thumb"><img src="' + esc('/' + item.thumbKey) + '" alt="' + esc(item.alt || item.filename) + '" loading="lazy"></div>' +
        '<figcaption><strong title="' + esc(item.filename) + '">' + esc(item.filename) + '</strong>' +
        '<small>' + (item.width && item.height ? item.width + '×' + item.height + ' · ' : '') +
        formatBytes(item.size) + ' · ' + esc(relativeSaved(item.createdAt)) + '</small>' +
        '<div class="media-actions">' +
        '<button class="btn btn-ghost btn-sm" type="button" data-media-action="copy" data-media-id="' + esc(item.id) + '">' + icon('copy') + 'Copy URL</button>' +
        '<button class="btn btn-ghost btn-sm danger" type="button" data-media-action="delete" data-media-id="' + esc(item.id) + '">' + icon('trash') + 'Delete</button>' +
        '</div></figcaption></figure>';
    }).join('');
  }

  function handleMediaClick(event) {
    var button = event.target.closest('[data-media-action]');
    if (!button) return;
    var action = button.getAttribute('data-media-action');

    if (action === 'upload') {
      var picker = document.getElementById('mediaFiles');
      if (picker) picker.click();
      return;
    }
    var item = (mediaState.items || []).find(function (candidate) {
      return candidate.id === button.getAttribute('data-media-id');
    });
    if (!item) return;

    if (action === 'copy') {
      var absolute = window.location.origin + '/' + item.key;
      copyText(absolute).then(function (copied) {
        toast(copied ? 'Image URL copied.' : absolute, 'info');
      });
      return;
    }
    if (action === 'delete') {
      confirmAction({
        title: 'Delete image',
        subtitle: 'This cannot be undone.',
        message: 'Delete <strong>' + esc(item.filename) + '</strong>? Images still used in the site content cannot be deleted.',
        confirmLabel: 'Delete image',
        danger: true
      }).then(function (confirmed) {
        if (!confirmed) return;
        apiJson('/api/media/' + encodeURIComponent(item.id), { method: 'DELETE' }, 20000).then(function (result) {
          if (result.response.status === 401) {
            expireSession();
            return;
          }
          if (result.response.status === 409) {
            toast(result.body.error || 'This image is still used in the site content.', 'error');
            return;
          }
          if (!result.response.ok) {
            toast(result.body.error || 'Could not delete that image.', 'error');
            return;
          }
          mediaState.items = (mediaState.items || []).filter(function (candidate) { return candidate.id !== item.id; });
          var search = document.getElementById('mediaSearch');
          renderMediaGrid(search ? search.value.trim() : '');
          toast('Image deleted.', 'info');
        }).catch(function (error) {
          toast(networkMessage(error), 'error');
        });
      });
    }
  }

  function uploadMediaFiles(files) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    var grid = document.getElementById('mediaGrid');
    if (grid) grid.classList.add('is-uploading');
    var uploaded = 0;

    list.reduce(function (chain, file) {
      return chain.then(function () {
        return uploadImage(file).then(function (item) {
          uploaded += 1;
          mediaState.items = [item].concat((mediaState.items || []).filter(function (existing) {
            return existing.id !== item.id;
          }));
          var search = document.getElementById('mediaSearch');
          renderMediaGrid(search ? search.value.trim() : '');
        }).catch(handleUploadError);
      });
    }, Promise.resolve()).then(function () {
      var node = document.getElementById('mediaGrid');
      if (node) node.classList.remove('is-uploading');
      if (uploaded) {
        toast(uploaded === 1 ? 'Image uploaded.' : uploaded + ' images uploaded.', 'info');
      }
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    var field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
    field.remove();
    return Promise.resolve(copied);
  }

  /* ------------------------------------------------------------------------
     History
     ------------------------------------------------------------------------ */

  var historyState = { items: null };

  function renderHistory() {
    var html = pageHead('History', 'Every save keeps a copy. Restore an earlier version if something goes wrong.',
      '<button class="btn btn-secondary" type="button" data-history-action="refresh">' + icon('rotate') + 'Refresh</button>');

    html += '<section class="panel"><div class="panel-head"><div><h2 class="panel-title">Saved versions</h2>' +
      '<p class="panel-sub">The 20 most recent versions are kept. The live version is marked.</p></div></div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Version</th><th>Saved</th><th class="col-actions"><span class="sr-only">Actions</span></th></tr></thead>' +
      '<tbody id="historyBody">' + historyRows() + '</tbody></table></div></section>';

    pageContent.innerHTML = html;
    pageContent.onclick = handleHistoryClick;
    loadHistory();
  }

  function historyRows() {
    if (!historyState.items) {
      return '<tr><td colspan="3"><div class="empty-state">' + icon('rotate') + '<strong>Loading versions…</strong><p>Reading the save history.</p></div></td></tr>';
    }
    if (!historyState.items.length) {
      return '<tr><td colspan="3"><div class="empty-state">' + icon('rotate') + '<strong>No saved versions yet</strong><p>Save the site once and the history starts here.</p></div></td></tr>';
    }
    var current = Store.serverVersion();
    return historyState.items.map(function (item) {
      var isCurrent = Number(item.version) === Number(current);
      return '<tr><td><strong>Version ' + esc(item.version) + '</strong>' + (isCurrent ? ' <span class="pill pill-published">Live</span>' : '') + '</td>' +
        '<td class="muted-cell">' + esc(relativeSaved(item.createdAt)) + ' · ' + esc(formatDate(item.createdAt)) + '</td>' +
        '<td class="col-actions">' +
        '<button class="btn btn-secondary btn-sm" type="button" data-history-action="restore" data-revision-id="' + esc(item.id) + '" data-revision-version="' + esc(item.version) + '"' +
        (isCurrent ? ' disabled' : '') + '>' + icon('rotate') + 'Restore</button></td></tr>';
    }).join('');
  }

  function loadHistory() {
    return apiJson('/api/revisions').then(function (result) {
      if (result.response.status === 401) {
        expireSession();
        return;
      }
      if (!result.response.ok) throw new Error(result.body.error || 'Could not load the history.');
      historyState.items = result.body.items || [];
    }).catch(function (error) {
      historyState.items = [];
      toast(networkMessage(error), 'error');
    }).then(function () {
      var body = document.getElementById('historyBody');
      if (!body) return;
      body.innerHTML = historyRows();
      hydrateIcons(body);
    });
  }

  function handleHistoryClick(event) {
    var button = event.target.closest('[data-history-action]');
    if (!button) return;
    var action = button.getAttribute('data-history-action');
    if (action === 'refresh') {
      historyState.items = null;
      var body = document.getElementById('historyBody');
      if (body) body.innerHTML = historyRows();
      loadHistory();
      return;
    }
    if (action === 'restore') {
      restoreRevision(button.getAttribute('data-revision-id'), button.getAttribute('data-revision-version'));
    }
  }

  function restoreRevision(id, version) {
    confirmAction({
      title: 'Restore version ' + version,
      subtitle: 'This becomes the live content.',
      message: 'Replace the published content with <strong>version ' + esc(version) + '</strong>? The current version is still kept in this history.',
      confirmLabel: 'Restore version',
      danger: true
    }).then(function (confirmed) {
      if (!confirmed) return;
      return apiJson('/api/revisions/' + encodeURIComponent(id) + '/restore', { method: 'POST' }, 20000).then(function (result) {
        if (result.response.status === 401) {
          expireSession();
          return;
        }
        if (result.response.status === 404) {
          toast('That version is no longer available.', 'error');
          return loadHistory();
        }
        if (result.response.status === 409) {
          toast(result.body.error || 'Content changed elsewhere. Reload before restoring.', 'error');
          return loadHistory();
        }
        if (!result.response.ok) {
          toast(result.body.error || 'Could not restore that version.', 'error');
          return;
        }
        return Store.ready().then(function (data) {
          state.data = data;
          state.snapshot = JSON.parse(JSON.stringify(data));
          renderRoute();
          toast('Restored version ' + version + '.', 'info');
        });
      });
    }).catch(function (error) {
      toast(networkMessage(error), 'error');
    });
  }

  /* ------------------------------------------------------------------------
     Start
     ------------------------------------------------------------------------ */

  loginError.textContent = '';
  loginForm.addEventListener('input', function () {
    if (loginError.textContent) loginError.textContent = '';
  });

  notifPop.addEventListener('click', function () { closePopovers(); });
  searchPop.addEventListener('click', function (event) {
    if (event.target.closest('a')) closePopovers();
  });

  window.addEventListener('storage', function (event) {
    if (event.key !== Store.key || adminApp.hidden) return;
    state.data = Store.get();
    renderRoute();
    renderNotifications(state.data);
    toast('Content was updated in another tab.', 'info');
  });

  boot();
})();
