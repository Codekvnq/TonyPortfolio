/**
 * Applies content saved from /admin/ onto the public pages.
 * Loaded before js/main.js so masonry/lightbox initialise with the final items.
 */
(function () {
  var store = window.PortfolioStore;
  if (!store) return;
  var content = store.getContent();

  function text(selector, value) {
    document.querySelectorAll(selector).forEach(function (node) {
      if (value !== undefined && value !== null) node.textContent = value;
    });
  }

  /* Profile & hero */
  if (content.profile) {
    text('[data-profile="title"]', content.profile.title);
    text('[data-profile="name"]', content.profile.name);
    var intro = document.querySelector('[data-profile="intro"]');
    if (intro && content.profile.intro) {
      intro.textContent = content.profile.intro + ' ' + content.profile.intro;
    }
  }

  /* Portfolio grid */
  var grid = document.querySelector('.portfolio-items');
  if (grid) {
    var byId = {};
    content.projects.forEach(function (project) { byId[project.id] = project; });

    grid.querySelectorAll('.hentry[data-project-id]').forEach(function (cell) {
      var project = byId[cell.getAttribute('data-project-id')];
      if (!project || project.status !== 'published') {
        cell.remove();
        return;
      }
      var title = cell.querySelector('.media-cell-desc h3');
      var category = cell.querySelector('.media-cell-desc .category');
      var image = cell.querySelector('.media-box img');
      var link = cell.querySelector('.media-box .lightbox');
      if (title && project.title) title.textContent = project.title;
      if (category && project.category) category.textContent = project.category;
      if (image && project.image) image.src = project.image;
      if (link && project.image) link.setAttribute('href', project.image);
    });

    content.projects.forEach(function (project) {
      if (project.status !== 'published' || grid.querySelector('[data-project-id="' + project.id + '"]')) return;
      var cell = document.createElement('div');
      cell.className = 'media-cell media format-image hentry';
      cell.setAttribute('data-project-id', project.id);
      cell.innerHTML = '<div class="media-box">' +
        '<img src="' + project.image + '" alt="' + project.title + '">' +
        '<div class="mask"></div>' +
        '<a href="' + project.image + '" class="lightbox" data-title="' + project.title + '"></a>' +
        '</div>' +
        '<div class="media-cell-desc"><h3></h3><p class="category"></p></div>';
      cell.querySelector('h3').textContent = project.title;
      cell.querySelector('.category').textContent = project.category || '';
      grid.appendChild(cell);
    });
  }

  /* Resume */
  if (content.resume) {
    (content.resume.jobs || []).forEach(function (job, index) {
      var node = document.querySelector('[data-resume-job="' + index + '"]');
      if (!node) return;
      var period = node.querySelector('h3');
      var role = node.querySelector('h4');
      var place = node.querySelector('h5');
      var description = node.querySelector('p');
      if (period) period.textContent = job.period;
      if (role) role.textContent = job.role;
      if (place) place.textContent = job.place;
      if (description) description.textContent = job.description;
    });

    (content.resume.education || []).forEach(function (item, index) {
      var node = document.querySelector('[data-resume-edu="' + index + '"]');
      if (!node) return;
      var period = node.querySelector('h3');
      var role = node.querySelector('h4');
      var place = node.querySelector('h5');
      var description = node.querySelector('p');
      if (period) period.textContent = item.period;
      if (role) role.textContent = item.role;
      if (place) place.textContent = item.place;
      if (description) description.textContent = item.description;
    });

    (content.resume.skills || []).forEach(function (skill, index) {
      var unit = document.querySelector('[data-skill="' + index + '"]');
      if (!unit) return;
      var label = unit.querySelector('h4');
      var bar = unit.querySelector('.bar');
      var progress = unit.querySelector('.progress');
      if (label) label.textContent = skill.name;
      if (bar) bar.setAttribute('data-percent', skill.level);
      if (progress) progress.style.width = skill.level + '%';
    });
  }

  /* Contact details */
  if (content.contact) {
    text('[data-contact="location"]', content.contact.location ? 'based in ' + content.contact.location : '');
    text('[data-contact="phone"]', content.contact.phone ? 'Tel: ' + content.contact.phone : '');
    text('[data-contact="email"]', content.contact.email);
    text('[data-contact="availability"]', content.contact.availability);
  }

  /* Social links */
  if (content.social) {
    Object.keys(content.social).forEach(function (network) {
      var link = content.social[network];
      document.querySelectorAll('.social-link.' + network).forEach(function (anchor) {
        if (!link || link.visible === false || !link.url) {
          anchor.style.display = 'none';
          return;
        }
        anchor.style.display = '';
        anchor.setAttribute('href', link.url);
      });
    });
  }
})();
