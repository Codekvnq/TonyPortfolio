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

  function get() {
    if (!storageAvailable()) return clone(defaults);
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return clone(defaults);
      return normalize(JSON.parse(raw));
    } catch (error) {
      return clone(defaults);
    }
  }

  function announce(data) {
    window.dispatchEvent(new CustomEvent('portfolio:content-changed', { detail: data }));
  }

  function save(data) {
    var next = normalize(data);
    next.version = VERSION;
    next.meta = Object.assign({}, next.meta, { updatedAt: new Date().toISOString() });
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch (error) {
      return { ok: false, error: error, data: next };
    }
    announce(next);
    return { ok: true, data: next };
  }

  function update(mutator) {
    var data = get();
    mutator(data);
    return save(data);
  }

  function reset() {
    try {
      window.localStorage.removeItem(KEY);
    } catch (error) {
      // Storage can be blocked in an embedded preview.
    }
    var fresh = clone(defaults);
    announce(fresh);
    return fresh;
  }

  function subscribe(callback) {
    var handler = function (event) {
      callback(event.detail || get());
    };
    window.addEventListener('portfolio:content-changed', handler);
    window.addEventListener('storage', function (event) {
      if (event.key === KEY) callback(get());
    });
    return function () {
      window.removeEventListener('portfolio:content-changed', handler);
    };
  }

  window.PortfolioContent = {
    key: KEY,
    version: VERSION,
    defaults: function () { return clone(defaults); },
    get: get,
    save: save,
    update: update,
    reset: reset,
    subscribe: subscribe,
    storageAvailable: storageAvailable
  };
})();
