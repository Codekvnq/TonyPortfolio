/* Portfolio content store
 * One place for every editable piece of site content.
 *
 * Today it persists to localStorage. When a backend exists, replace the
 * read/write functions in this file only; the admin and the public pages
 * keep using the same API:
 *   PortfolioContent.get()
 *   PortfolioContent.save(data) -> { ok, data } | { ok: false, error }
 *   PortfolioContent.update(mutator) -> same
 *   PortfolioContent.reset()
 *   PortfolioContent.subscribe(callback)
 */
(function () {
  'use strict';

  var KEY = 'anthonyPortfolio.content.v1';
  var CACHE_KEY = 'anthonyPortfolio.content.v2';
  var API = '/api/content';
  var VERSION = 1;

  function daysAgo(days) {
    var date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  function dateAt(days, hours, minutes) {
    var date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hours || 9, minutes || 42, 0, 0);
    return date.toISOString();
  }

  var projects = [
    {
      id: 'project-1',
      title: 'Branding illustrations',
      client: 'for Erfolg',
      category: 'illustration',
      type: 'gallery',
      cover: 'images/portfolio/01.jpeg',
      gallery: ['images/portfolio/EF01.jpeg', 'images/portfolio/EF02.jpeg', 'images/portfolio/EF03.jpeg', 'images/portfolio/EF04.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(0)
    },
    {
      id: 'project-2',
      title: 'Flyer Designs',
      client: 'for AMMUSTED',
      category: 'media',
      type: 'gallery',
      cover: 'images/portfolio/03.jpeg',
      gallery: ['images/portfolio/lightbox-01.jpeg', 'images/portfolio/lightbox-02.jpeg', 'images/portfolio/lightbox-03.jpeg', 'images/portfolio/lightbox-04.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(3)
    },
    {
      id: 'project-3',
      title: 'My Logo Review',
      client: 'Video Design',
      category: 'video',
      type: 'video',
      cover: 'images/portfolio/09.png',
      gallery: [],
      videoUrl: 'video/MyLogoReview.html',
      description: '',
      status: 'published',
      updatedAt: daysAgo(6)
    },
    {
      id: 'project-4',
      title: 'Church',
      client: 'Church Designs',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/05.jpeg',
      gallery: ['images/portfolio/05.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(9)
    },
    {
      id: 'project-5',
      title: 'Food Flyer Designs',
      client: 'for ERFLOG',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/02.jpeg',
      gallery: ['images/portfolio/02.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(12)
    },
    {
      id: 'project-6',
      title: 'Seag Logo Review',
      client: 'Video Design',
      category: 'video',
      type: 'video',
      cover: 'images/portfolio/10.png',
      gallery: [],
      videoUrl: 'video/SeagLogoReview.html',
      description: '',
      status: 'published',
      updatedAt: daysAgo(15)
    },
    {
      id: 'project-7',
      title: 'Branding Presentation Kit',
      client: 'a Flyer Design',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/08.jpeg',
      gallery: ['images/portfolio/08.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(18)
    },
    {
      id: 'project-8',
      title: 'Website Advertising Design',
      client: 'Flyer image Design',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/04.jpeg',
      gallery: ['images/portfolio/04.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(21)
    },
    {
      id: 'project-9',
      title: 'Creatin — Way The Right Way',
      client: 'Illustration',
      category: 'illustration',
      type: 'image',
      cover: 'images/portfolio/07.jpeg',
      gallery: ['images/portfolio/07.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(24)
    },
    {
      id: 'project-10',
      title: 'Carols Flyer Design',
      client: 'Flyer Design',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/06.jpeg',
      gallery: ['images/portfolio/06.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(27)
    },
    {
      id: 'project-11',
      title: 'Branding illustrations',
      client: 'for Hopexchange',
      category: 'illustration',
      type: 'gallery',
      cover: 'images/portfolio/HX01.jpeg',
      gallery: ['images/portfolio/HX01.jpeg', 'images/portfolio/HX02.jpeg', 'images/portfolio/HX03.jpeg', 'images/portfolio/HX04.jpeg', 'images/portfolio/HX05.jpeg', 'images/portfolio/HX06.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(30)
    },
    {
      id: 'project-12',
      title: 'Church Design',
      client: 'Flyer image Design',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/CH01.jpeg',
      gallery: ['images/portfolio/CH01.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(33)
    },
    {
      id: 'project-13',
      title: 'Birthday Design',
      client: 'Flyer image Design',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/B01.jpeg',
      gallery: ['images/portfolio/B01.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(36)
    },
    {
      id: 'project-14',
      title: 'EFE Branding Design',
      client: 'for EFE',
      category: 'illustration',
      type: 'gallery',
      cover: 'images/portfolio/EFE01.jpeg',
      gallery: ['images/portfolio/EFE01.jpeg', 'images/portfolio/EFE02.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(39)
    },
    {
      id: 'project-15',
      title: 'Church Card Design',
      client: 'Card Design',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/E01.jpeg',
      gallery: ['images/portfolio/E01.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(42)
    },
    {
      id: 'project-16',
      title: 'Citation Design',
      client: 'Flyer image Design',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/C01.jpeg',
      gallery: ['images/portfolio/C01.jpeg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(45)
    },
    {
      id: 'project-17',
      title: 'Cold store Design',
      client: 'Card Design',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/CD01.jpg',
      gallery: ['images/portfolio/CD01.jpg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(48)
    },
    {
      id: 'project-18',
      title: 'Chuch Design',
      client: 'Flyer image Design',
      category: 'media',
      type: 'image',
      cover: 'images/portfolio/WM01.jpg',
      gallery: ['images/portfolio/WM01.jpg'],
      videoUrl: '',
      description: '',
      status: 'published',
      updatedAt: daysAgo(51)
    }
  ];

  var defaults = {
    version: VERSION,
    profile: {
      name: 'Anthony Ampaabeng',
      title: 'Graphic Designer',
      intro: 'Crafting stunning visuals and brand identities. Always in pursuit of creative excellence.',
      marquee: 'Creating stunning visuals for the world\u2019s people. Always in search of the great user experience.',
      portrait: 'images/site/about.jpeg'
    },
    contact: {
      email: 'ampaabenganthony1@gmail.com',
      phone: '+233 55 252 0247',
      location: 'Kumasi, Ghana',
      availability: 'Freelance Available',
      whatsapp: 'https://wa.me/2330552520247'
    },
    socials: [
      { id: 'social-facebook', platform: 'facebook', label: 'Facebook', url: 'https://facebook.com/ampaabeng.tony', visible: true },
      { id: 'social-linkedin', platform: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/ampaabeng-anthony-kyeremeh-8903a2388/', visible: true },
      { id: 'social-whatsapp', platform: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/2330552520247', visible: true },
      { id: 'social-tiktok', platform: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@tonycage0', visible: true },
      { id: 'social-instagram', platform: 'instagram', label: 'Instagram', url: '', visible: false },
      { id: 'social-x', platform: 'x', label: 'X (Twitter)', url: '', visible: false }
    ],
    resume: {
      role: 'Senior Graphic Designer',
      years: '8+ years',
      summary: 'Visual designer focused on thoughtful identities, clear communication, and memorable brand experiences across Ghana and beyond.',
      cvFile: 'MY PROFESSIONAL CV.pdf',
      cvUrl: 'pdf/MY PROFESSIONAL CV.pdf',
      cvUpdatedAt: dateAt(172, 9, 0),
      experience: [
        {
          id: 'exp-1',
          period: '2026 - Present',
          role: 'Senior Graphic Designer',
          company: 'Freelance',
          description: 'Working with clients across Ghana and beyond to create compelling brand identities, marketing materials, and digital designs that drive business growth.'
        },
        {
          id: 'exp-2',
          period: '2024 - 2025',
          role: 'Graphic Designer',
          company: 'Hopexchange Medical Center, Kumasi',
          description: 'Spearheaded all visual communications for the center. Designed patient information brochures, health campaign materials, internal documents, and engaging social media content.'
        },
        {
          id: 'exp-3',
          period: '2024 - 2025',
          role: 'Design Intern',
          company: 'KSTS, Kumasi',
          description: 'Assisted the internal communications team by creating digital assets and formatting school documents. Gained practical experience in layout composition and applying brand guidelines.'
        }
      ],
      education: [
        {
          id: 'edu-1',
          period: '2025',
          degree: 'Information Technology',
          school: 'AAMUSTED, Kumasi',
          description: 'Built a strong foundation in computing systems, network infrastructure, and software development. Gained hands-on experience in system analysis, database management, and implementing IT solutions to solve real-world technical challenges.'
        },
        {
          id: 'edu-2',
          period: '2019',
          degree: 'Visual Arts',
          school: 'Senior High School',
          description: 'Developed foundational skills in drawing, painting, and visual composition that laid the groundwork for a career in graphic design.'
        }
      ],
      skills: [
        { id: 'skill-1', name: 'Adobe Photoshop', level: 95 },
        { id: 'skill-2', name: 'Adobe Illustrator', level: 70 },
        { id: 'skill-3', name: 'Adobe Premiere Pro', level: 75 },
        { id: 'skill-4', name: 'Adobe Lightroom', level: 90 },
        { id: 'skill-5', name: 'Typography', level: 90 },
        { id: 'skill-6', name: 'Brand Identity', level: 95 },
        { id: 'skill-7', name: 'Print Design', level: 85 },
        { id: 'skill-8', name: 'Social Media Design', level: 90 }
      ]
    },
    projects: projects,
    meta: {
      updatedAt: dateAt(0, 9, 42)
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(saved) {
    if (!saved || typeof saved !== 'object') return clone(defaults);
    var resume = saved.resume || {};
    return {
      version: VERSION,
      profile: Object.assign({}, defaults.profile, saved.profile || {}),
      contact: Object.assign({}, defaults.contact, saved.contact || {}),
      socials: Array.isArray(saved.socials) ? saved.socials : clone(defaults.socials),
      resume: Object.assign({}, defaults.resume, resume, {
        experience: Array.isArray(resume.experience) ? resume.experience : clone(defaults.resume.experience),
        education: Array.isArray(resume.education) ? resume.education : clone(defaults.resume.education),
        skills: Array.isArray(resume.skills) ? resume.skills : clone(defaults.resume.skills)
      }),
      projects: Array.isArray(saved.projects) ? saved.projects : clone(defaults.projects),
      meta: Object.assign({}, defaults.meta, saved.meta || {})
    };
  }

  function storageAvailable() {
    try {
      var probe = '__portfolio_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (error) {
      return false;
    }
  }

  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return normalize(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      // The network copy is still the source of truth.
    }
  }

  var current = readCache() || clone(defaults);
  var currentVersion = 0;
  var currentUpdatedAt = current.meta && current.meta.updatedAt;
  var refreshPromise = null;
  var writeChain = Promise.resolve();
  var csrfToken = null;

  function fetchCsrfToken() {
    return apiFetch(API.replace('/content', '/csrf'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' }
    }).then(function (response) {
      return response.json();
    }).then(function (payload) {
      if (payload.csrfToken) {
        csrfToken = payload.csrfToken;
      }
    }).catch(function () {
      // Ignore failures; the save will fail with 403 and the user can retry.
    });
  }

  function get() {
    return clone(current);
  }

  function announce(data) {
    var detail = clone(data);
    try {
      window.dispatchEvent(new CustomEvent('portfolio:content-changed', { detail: detail }));
    } catch (error) {
      // Old browsers without CustomEvent still hydrate on the next page load.
    }
  }

  function apiFetch(url, options, timeout) {
    if (!window.fetch) return Promise.reject(new Error('This browser cannot reach the server.'));
    var control = window.AbortController ? new window.AbortController() : null;
    var config = Object.assign({ credentials: 'same-origin' }, options || {});
    if (control) config.signal = control.signal;
    var timer = control
      ? window.setTimeout(function () { control.abort(); }, timeout || 12000)
      : null;
    return window.fetch(url, config).then(function (response) {
      if (timer) window.clearTimeout(timer);
      return response;
    }, function (error) {
      if (timer) window.clearTimeout(timer);
      throw error;
    });
  }

  function refresh(options) {
    var opts = options || {};
    if (!window.fetch) return Promise.resolve(get());
    if (refreshPromise && !opts.force) return refreshPromise;

    var fresh = opts.fresh !== undefined
      ? opts.fresh
      : /(?:^|[?&])fresh(?:=|&|$)/.test(window.location.search || '');

    refreshPromise = apiFetch(API + (fresh ? '?fresh=1' : ''), {
      headers: { accept: 'application/json' }
    }).then(function (response) {
      if (!response.ok) throw new Error('Content request failed');
      return response.json();
    }).then(function (payload) {
      if (payload && payload.content) {
        current = normalize(payload.content);
        currentVersion = Number(payload.version) || 0;
        currentUpdatedAt = payload.updatedAt || current.meta.updatedAt;
      } else {
        current = clone(defaults);
        currentVersion = 0;
        currentUpdatedAt = null;
      }
      writeCache(current);
      announce(current);
      return get();
    }).catch(function () {
      return get();
    }).then(function (data) {
      refreshPromise = null;
      return data;
    });

    return refreshPromise;
  }

  function doSave(data) {
    var next = normalize(data);
    next.meta = Object.assign({}, next.meta, { updatedAt: new Date().toISOString() });

    var headers = { 'content-type': 'application/json', accept: 'application/json' };
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    return apiFetch(API, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify({ content: next, baseVersion: currentVersion })
    }, 20000).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (response.status === 401) {
          return { ok: false, unauthorized: true, error: 'Your session expired. Sign in again.' };
        }
        if (response.status === 403) {
          // CSRF token may be stale; fetch a fresh one and retry once
          return fetchCsrfToken().then(function () {
            headers['x-csrf-token'] = csrfToken;
            return apiFetch(API, {
              method: 'PUT',
              headers: headers,
              body: JSON.stringify({ content: next, baseVersion: currentVersion })
            }, 20000);
          }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (payload) {
              if (response.status === 401) {
                return { ok: false, unauthorized: true, error: 'Your session expired. Sign in again.' };
              }
              if (response.status === 409) {
                return {
                  ok: false,
                  conflict: true,
                  currentVersion: payload.currentVersion,
                  error: payload.error || 'Content changed elsewhere. Reload before saving.'
                };
              }
              if (!response.ok) {
                return { ok: false, error: payload.error || 'Could not save your changes.' };
              }
              current = next;
              currentVersion = Number(payload.version) || currentVersion + 1;
              currentUpdatedAt = payload.updatedAt || next.meta.updatedAt;
              current.meta.updatedAt = currentUpdatedAt;
              writeCache(current);
              announce(current);
              return { ok: true, data: clone(current), version: currentVersion };
            });
          });
        }
        if (!response.ok) {
          return { ok: false, error: payload.error || 'Could not save your changes.' };
        }
        current = next;
        currentVersion = Number(payload.version) || currentVersion + 1;
        currentUpdatedAt = payload.updatedAt || next.meta.updatedAt;
        current.meta.updatedAt = currentUpdatedAt;
        writeCache(current);
        announce(current);
        return { ok: true, data: clone(current), version: currentVersion };
      });
    }).catch(function (error) {
      return {
        ok: false,
        error: error && error.name === 'AbortError'
          ? 'The save timed out. Check your connection and try again.'
          : 'Could not reach the server. Check your connection and try again.'
      };
    });
  }

  function save(data) {
    var run = function () { return doSave(data); };
    writeChain = writeChain.then(run, run);
    return writeChain;
  }

  function update(mutator) {
    var next = get();
    mutator(next);
    return save(next);
  }

  function reset() {
    return save(clone(defaults));
  }

  function subscribe(callback) {
    var handler = function (event) {
      callback(event.detail || get());
    };
    window.addEventListener('portfolio:content-changed', handler);
    window.addEventListener('storage', function (event) {
      if (event.key === CACHE_KEY) callback(get());
    });
    return function () {
      window.removeEventListener('portfolio:content-changed', handler);
    };
  }

  window.PortfolioContent = {
    key: CACHE_KEY,
    version: VERSION,
    defaults: function () { return clone(defaults); },
    get: get,
    refresh: refresh,
    ready: function () { return refresh({ force: true, fresh: true }); },
    save: save,
    update: update,
    reset: reset,
    subscribe: subscribe,
    storageAvailable: storageAvailable,
    serverVersion: function () { return currentVersion; },
    updatedAt: function () { return currentUpdatedAt; },
    setCsrfToken: function (token) { csrfToken = token; }
  };
})();
