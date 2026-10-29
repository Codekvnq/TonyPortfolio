/**
 * Portfolio content store.
 *
 * The site is static (HTML/CSS/JS only), so editable content lives in the
 * browser's localStorage. The admin dashboard writes it; the public pages read
 * it through js/site-content.js and patch the markup in place.
 *
 * Everything here is a placeholder until the owner saves something in /admin/.
 */
(function () {
  var STORAGE_KEY = 'portfolioContent.v1';

  var DEFAULT_CONTENT = {
    profile: {
      name: 'Anthony Ampaabeng',
      title: 'Graphic Designer',
      intro: 'Crafting stunning visuals and brand identities. Always in pursuit of creative excellence.'
    },
    projects: [
      { id: 'p1', title: 'Branding illustrations', category: 'for Erfolg', image: 'images/portfolio/01.jpeg', description: 'Branding illustration series created for Erfolg.', status: 'published' },
      { id: 'p2', title: 'Flyer Designs', category: 'for AMMUSTED', image: 'images/portfolio/03.jpeg', description: 'Flyer design collection for AAMUSTED.', status: 'published' },
      { id: 'p3', title: 'My Logo Review', category: 'Video Design', image: 'images/portfolio/09.png', description: 'Logo review video presentation.', status: 'published' },
      { id: 'p4', title: 'Church', category: 'Church Designs', image: 'images/portfolio/05.jpeg', description: 'Church design material.', status: 'published' },
      { id: 'p5', title: 'Food Flyer Designs', category: 'for ERFLOG', image: 'images/portfolio/02.jpeg', description: 'Food flyer designs for ERFLOG.', status: 'published' },
      { id: 'p6', title: 'Seag Logo Review', category: 'Video Design', image: 'images/portfolio/10.png', description: 'Seag logo review video.', status: 'published' },
      { id: 'p7', title: 'Branding Presentation Kit', category: 'a Flyer Design', image: 'images/portfolio/08.jpeg', description: 'Presentation kit for a flyer design project.', status: 'published' },
      { id: 'p8', title: 'Website Advertising Design', category: 'Flyer image Design', image: 'images/portfolio/04.jpeg', description: 'Advertising artwork for web use.', status: 'published' },
      { id: 'p9', title: 'Creatin — Way The Right Way', category: 'Illustration', image: 'images/portfolio/07.jpeg', description: 'Illustration work for Creatin.', status: 'published' },
      { id: 'p10', title: 'Carols Flyer Design', category: 'Flyer Design', image: 'images/portfolio/06.jpeg', description: 'Carols night flyer design.', status: 'published' },
      { id: 'p11', title: 'Branding illustrations', category: 'for Hopexchange', image: 'images/portfolio/HX01.jpeg', description: 'Branding illustrations for Hopexchange.', status: 'published' },
      { id: 'p12', title: 'Church Design', category: 'Flyer image Design', image: 'images/portfolio/CH01.jpeg', description: 'Church flyer design.', status: 'published' },
      { id: 'p13', title: 'Birthday Design', category: 'Flyer image Design', image: 'images/portfolio/B01.jpeg', description: 'Birthday celebration design.', status: 'published' },
      { id: 'p14', title: 'EFE Branding Design', category: 'for EFE', image: 'images/portfolio/EFE01.jpeg', description: 'Branding design for EFE.', status: 'published' },
      { id: 'p15', title: 'Church Card Design', category: 'Card Design', image: 'images/portfolio/E01.jpeg', description: 'Church card design.', status: 'published' },
      { id: 'p16', title: 'Citation Design', category: 'Flyer image Design', image: 'images/portfolio/C01.jpeg', description: 'Citation design artwork.', status: 'published' },
      { id: 'p17', title: 'Cold store Design', category: 'Card Design', image: 'images/portfolio/CD01.jpg', description: 'Cold store card design.', status: 'published' },
      { id: 'p18', title: 'Chuch Design', category: 'Flyer image Design', image: 'images/portfolio/WM01.jpg', description: 'Church flyer design.', status: 'published' }
    ],
    resume: {
      jobs: [
        { period: '2026 - Present', role: 'Senior Graphic Designer', place: 'Freelance', description: 'Working with clients across Ghana and beyond to create compelling brand identities, marketing materials, and digital designs that drive business growth.' },
        { period: '2024 - 2025', role: 'Graphic Designer', place: 'Hopexchange Medical Center, Kumasi', description: 'Spearheaded all visual communications for the center. Designed patient information brochures, health campaign materials, internal documents, and engaging social media content.' },
        { period: '2024 - 2025', role: 'Design Intern', place: 'KSTS, Kumasi', description: 'Assisted the internal communications team by creating digital assets and formatting school documents. Gained practical experience in layout composition and applying brand guidelines.' }
      ],
      education: [
        { period: '2025', role: 'Information Technology', place: 'AAMUSTED, Kumasi', description: 'Built a strong foundation in computing systems, network infrastructure, and software development. Gained hands-on experience in system analysis, database management, and implementing IT solutions to solve real-world technical challenges.' },
        { period: '2019', role: 'Visual Arts', place: 'Senior High School', description: 'Developed foundational skills in drawing, painting, and visual composition that laid the groundwork for a career in graphic design.' }
      ],
      skills: [
        { name: 'Adobe Photoshop', level: 95 },
        { name: 'Adobe Illustrator', level: 70 },
        { name: 'Adobe Premiere Pro', level: 75 },
        { name: 'Adobe LightRoom', level: 90 },
        { name: 'Typography', level: 90 },
        { name: 'Brand Identity', level: 95 },
        { name: 'Print Design', level: 85 },
        { name: 'Social Media Design', level: 90 }
      ]
    },
    contact: {
      email: 'ampaabenganthony1@gmail.com',
      phone: '+233 55 252 0247',
      location: 'Kumasi, Ghana',
      availability: 'Freelance Available'
    },
    social: {
      facebook: { url: 'https://facebook.com/ampaabeng.tony', visible: true },
      linkedin: { url: 'https://www.linkedin.com/in/ampaabeng-anthony-kyeremeh-8903a2388/', visible: true },
      tiktok: { url: 'https://www.tiktok.com/@tonycage0', visible: true },
      whatsapp: { url: 'https://wa.me/2330552520247', visible: true }
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function merge(defaults, saved) {
    if (Array.isArray(defaults)) return Array.isArray(saved) ? saved : defaults;
    if (defaults && typeof defaults === 'object') {
      var out = {};
      Object.keys(defaults).forEach(function (key) {
        out[key] = merge(defaults[key], saved && typeof saved === 'object' ? saved[key] : undefined);
      });
      return out;
    }
    return saved === undefined ? defaults : saved;
  }

  function getContent() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_CONTENT);
      return merge(clone(DEFAULT_CONTENT), JSON.parse(raw));
    } catch (error) {
      return clone(DEFAULT_CONTENT);
    }
  }

  function saveContent(content) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  }

  function resetContent() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  window.PortfolioStore = {
    storageKey: STORAGE_KEY,
    defaults: clone(DEFAULT_CONTENT),
    getContent: getContent,
    saveContent: saveContent,
    resetContent: resetContent
  };
})();
