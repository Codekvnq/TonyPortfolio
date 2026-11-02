/* Public site hydration.
 * Reads the shared content store and writes it into the static templates.
 * Runs before js/main.js so Isotope and the lightbox pick up the markup.
 */
(function () {
  'use strict';

  var Store = window.PortfolioContent;
  if (!Store) return;

  var FONTELLO = ['facebook', 'twitter', 'x', 'linkedin', 'instagram', 'behance', 'dribbble', 'youtube', 'pinterest', 'github', 'vimeo', 'tumblr', 'flickr', 'skype', 'wordpress'];

  var SVG_ICONS = {
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.6-5.9c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1-1.3-.6-2.1-1.1-3-2.5-.2-.4.2-.4.6-1.2.1-.2 0-.4 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.8.8-1 1.9-.7 3 .3 1.1 1 2.1 1.2 2.3.1.2 2 3.1 4.9 4.3 1.8.7 2.5.8 3.4.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.5-.3Z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 5.8c.9 1.1 2.2 1.8 3.7 1.9v3.1c-1.6 0-3.1-.5-4.4-1.4v6.1a6.1 6.1 0 1 1-6.1-6.1c.3 0 .6 0 .9.1v3.2a2.9 2.9 0 1 0 2.1 2.8V2h3.2c.1 1.3.6 2.6 1.6 3.8z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/></svg>'
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function get() {
    return Store.get();
  }

  /* ------------------------------------------------------------------ */
  /* Social links                                                        */
  /* ------------------------------------------------------------------ */

  function socialAnchor(social) {
    var platform = String(social.platform || 'globe').toLowerCase();
    var label = social.label || platform;
    var href = social.url || '#';
    var className = FONTELLO.indexOf(platform) !== -1 ? (platform === 'x' ? 'twitter' : platform) : platform;

    if (FONTELLO.indexOf(platform) !== -1) {
      return '<a class="social-link ' + className + '" href="' + esc(href) + '" title="' + esc(label) + '" aria-label="' + esc(label) + '"' + (social.url ? '' : ' aria-disabled="true"') + '></a>';
    }

    var svg = SVG_ICONS[platform] || SVG_ICONS.globe;
    return '<a class="social-link ' + esc(className) + '" href="' + esc(href) + '" title="' + esc(label) + '" aria-label="' + esc(label) + '"' + (social.url ? '' : ' aria-disabled="true"') + '>' + svg + '</a>';
  }

  function renderSocials(data) {
    var visible = data.socials.filter(function (social) { return social.visible; });
    var html = visible.map(socialAnchor).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.home-social, .header-bottom'), function (container) {
      container.innerHTML = html;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero copy                                                           */
  /* ------------------------------------------------------------------ */

  function renderHero(data) {
    var profile = data.profile;
    Array.prototype.forEach.call(document.querySelectorAll('.home-job-title'), function (node) {
      node.textContent = profile.title;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.home-marquee'), function (node) {
      node.textContent = profile.marquee + ' ' + profile.marquee;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.home-text-container-placeholder, .home-text'), function (node) {
      node.textContent = profile.name;
    });

    var words = String(profile.title || '').trim().split(/\s+/);
    var left = words.length > 1 ? words.slice(0, -1).join(' ') : words[0] || '';
    var right = words.length > 1 ? words[words.length - 1] : words[0] || '';
    Array.prototype.forEach.call(document.querySelectorAll('.home-logo-left span'), function (node) { node.textContent = left; });
    Array.prototype.forEach.call(document.querySelectorAll('.home-logo-right span'), function (node) { node.textContent = right; });
  }

  /* ------------------------------------------------------------------ */
  /* Portfolio grid                                                      */
  /* ------------------------------------------------------------------ */

  function portfolioItem(project) {
    var category = ['illustration', 'media', 'video'].indexOf(project.category) !== -1 ? project.category : 'media';
    var type = project.type || 'image';
    var title = project.title || 'Untitled';
    var anchors = '';

    if (type === 'video' && project.videoUrl) {
      anchors = '<a href="' + esc(project.videoUrl) + '" data-title="' + esc(title) + '" class="lightbox mfp-iframe"></a>';
    } else {
      var gallery = (project.gallery && project.gallery.length ? project.gallery : [project.cover]).filter(Boolean);
      anchors = gallery.map(function (src) {
        return '<a href="' + esc(src) + '" data-title="' + esc(title) + '" class="lightbox"></a>';
      }).join('');
    }

    return '<div class="media-cell ' + category + ' format-' + esc(type) + ' hentry' + (project.cover ? '' : ' no-cover') + '">' +
      '<div class="media-box">' +
      (project.cover ? '<img src="' + esc(project.cover) + '" alt="' + esc(title) + '">' : '') +
      '<div class="mask"></div>' + anchors +
      '</div>' +
      '<div class="media-cell-desc"><h3>' + esc(title) + '</h3>' +
      '<p class="category">' + esc(project.client || '') + '</p></div>' +
      '</div>';
  }

  function renderPortfolio(data) {
    var grid = document.querySelector('.portfolio-items');
    if (!grid) return;
    var published = data.projects.filter(function (project) { return project.status === 'published'; });
    grid.innerHTML = published.length
      ? published.map(portfolioItem).join('')
      : '<p class="portfolio-empty">No projects have been published yet. Add work in the admin to fill this grid.</p>';

    if (window.jQuery && window.jQuery.fn.isotope && window.jQuery(grid).data('isotope')) {
      var $grid = window.jQuery(grid);
      $grid.isotope('reloadItems').isotope('layout');
      if (window.jQuery.fn.imagesLoaded) {
        $grid.imagesLoaded(function () { $grid.isotope('layout'); });
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Resume                                                              */
  /* ------------------------------------------------------------------ */

  function eventBlock(item, kind) {
    var heading = kind === 'work' ? 'h4' : 'h4';
    return '<div class="event"><h3>' + esc(item.period) + '</h3>' +
      '<' + heading + '>' + esc(kind === 'work' ? item.role : item.degree) + '</' + heading + '>' +
      '<h5>' + esc(kind === 'work' ? item.company : item.school) + '</h5>' +
      '<p>' + esc(item.description) + '</p></div>';
  }

  function renderResume(data) {
    var history = document.getElementById('resumeHistory');
    if (history) {
      var resume = data.resume;
      var work = resume.experience.map(function (item) { return eventBlock(item, 'work'); }).join('');
      var education = resume.education.map(function (item) { return eventBlock(item, 'education'); }).join('');
      history.innerHTML =
        '<div class="event"><h2>WORK HISTORY</h2><p><i class="pw-icon-badge"></i></p></div>' + work +
        '<div class="event"><h2>EDUCATION</h2><p><i class="pw-icon-education"></i></p></div>' + education;

      var summary = document.getElementById('resumeSummary');
      if (summary) summary.textContent = resume.summary;

      var cvLink = document.getElementById('resumeCvLink');
      if (cvLink) {
        cvLink.hidden = !resume.cvUrl;
        if (resume.cvUrl) {
          cvLink.setAttribute('href', resume.cvUrl);
          if (resume.cvFile) cvLink.setAttribute('download', resume.cvFile);
        }
      }
    }

    var primary = document.getElementById('resumeSkillsPrimary');
    var secondary = document.getElementById('resumeSkillsSecondary');
    if (!primary && !secondary) return;

    var skills = data.resume.skills.slice();
    var split = Math.ceil(skills.length / 2);
    var primaryHtml = skills.slice(0, split).map(skillUnit).join('');
    var secondaryHtml = skills.slice(split).map(skillUnit).join('');
    if (primary) primary.innerHTML = primaryHtml;
    if (secondary) secondary.innerHTML = secondaryHtml;
  }

  function skillUnit(skill) {
    return '<div class="skill-unit"><h4>' + esc(skill.name) + '</h4>' +
      '<div class="bar" data-percent="' + esc(skill.level) + '"><div class="progress"></div></div></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Contact                                                             */
  /* ------------------------------------------------------------------ */

  function renderContact(data) {
    var block = document.getElementById('contactDetails');
    if (!block) return;
    var contact = data.contact;
    var email = esc(contact.email);
    block.innerHTML = '<div class="row">' +
      '<div class="col-xs-6 col-sm-3"><div class="fun-fact">' +
      '<img src="images/site/icon-location.svg" alt="">' +
      '<h4>based in ' + esc(contact.location) + '</h4></div></div>' +
      '<div class="col-xs-6 col-sm-3"><div class="fun-fact">' +
      '<img src="images/site/icon-phone.svg" alt="">' +
      '<h4 style="font-size:15px;">Tel: ' + esc(contact.phone) + '</h4></div></div>' +
      '<div class="col-xs-6 col-sm-3"><div class="fun-fact" style="text-align:center;">' +
      '<img src="images/site/icon-mail.svg" alt="" style="display:block;margin:0 auto 12px auto;">' +
      '<h4 style="font-size:13px;margin:0;line-height:1.4;text-align:center;">' +
      (contact.email ? '<a class="contact-email" href="mailto:' + email + '">' + email + '</a>' : 'Add an email in the admin') +
      '</h4></div></div>' +
      '<div class="col-xs-6 col-sm-3"><div class="fun-fact">' +
      '<img src="images/site/icon-check.svg" alt="">' +
      '<h4>' + esc(contact.availability) + '</h4></div></div>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* About                                                               */
  /* ------------------------------------------------------------------ */

  function renderAbout(data) {
    var portrait = document.getElementById('aboutPortrait');
    if (portrait && data.profile.portrait) portrait.src = data.profile.portrait;

    var intro = document.getElementById('aboutIntro');
    if (intro) {
      intro.innerHTML = 'Hello, I am ' + esc(data.profile.name) + ', a <strong>' +
        esc(data.profile.title.toLowerCase()) + '</strong> based in ' + esc(data.contact.location) +
        '. I create beautiful <strong>brand identities</strong>, <strong>visual designs</strong>, and <strong>print media</strong> that bring ideas to life.';
    }
  }

  /* ------------------------------------------------------------------ */

  function renderAll() {
    var data = get();
    renderSocials(data);
    renderHero(data);
    renderPortfolio(data);
    renderResume(data);
    renderContact(data);
    renderAbout(data);
  }

  renderAll();
  Store.subscribe(renderAll);
})();
