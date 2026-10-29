# Repository notes (Base44 dev sandbox)

## What this project is
A static portfolio site: plain HTML pages (`index.html`, `about.html`,
`resume.html`, `portfolio.html`, `contact-me.html`), CSS, jQuery plugins in
`js/`, and media in `images/`, `audio/`, `video/`, `pdf/`. Site navigation is
jQuery-Address based (`#/about`, …) and swaps page content by AJAX inside
`index.html`.

There is **no build step, package manager, backend, database or external
service**. Nothing needs credentials.

## Running it
- `docker compose -f docker-compose.base44.yml up -d` → http://localhost:3000
- `nginx:1.27-alpine` serves the bind-mounted working tree directly, so edits to
  HTML/CSS/JS show up on refresh; no rebuild or restart required (use
  `reload_preview` if the preview keeps a cached frame).
- Nothing to install, migrate or seed.

## Admin dashboard (`/admin`)
- `admin/index.html` + `css/admin.css` + `js/admin.js`. Login gate, then a
  Laravel/WordPress-style dashboard (Dashboard, Profile & hero, Portfolio,
  Resume, Contact, Social links).
- `/admin` (no trailing slash) and `/admin/` both serve the dashboard; the
  `location = /admin` block in `nginx.base44.conf` provides the former.
  `index.html` links to it nowhere on purpose.
- Prototype credentials are hardcoded in `js/admin.js`: `admin` / `admin123!`.
  The signed-in flag lives in `sessionStorage`.
- Content is stored in `localStorage` (`portfolioContent.v1`) because the site
  has no server. The admin writes it; `js/site-content.js` reads it on the
  public pages and patches the markup. **Changes are per browser** — they are
  not visible to other visitors until the site gets a backend.
- `js/site-data.js` holds the default content (seeded from the shipped markup)
  and the load/save helpers shared by the admin and the public pages.
- Public markup is bound through data attributes: `data-project-id` on portfolio
  cells, `data-resume-job` / `data-resume-edu` / `data-skill` on resume entries,
  `data-contact` on the contact blocks, `data-profile` on the hero, and the
  existing `.social-link.<network>` classes.

## Quirks worth knowing
- Compose mounts `nginx.base44.conf` over the image's main config because the
  checkout is root-owned with mode `0700`: the image's default `user nginx;`
  workers cannot traverse `/usr/share/nginx/html` and every request returns
  `403`. The dev config runs workers as root — sandbox only, not production.
- The admin is a separate HTML document, not a client-side route, so the
  preview's SPA navigator cannot reach it by `path`; load it as a real document
  (e.g. an iframe) to test it.
- Pre-existing: `audio/tick.mp3` (referenced by every page's
  `data-audio-tick`) and `images/home/cover.jpg` are not in the repo and log a
  404. They were missing before the admin work; nothing was added for them.

## How to verify
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200`
- Check `/admin`, `/`, `/about.html`, `/portfolio.html`, `/resume.html`,
  `/contact-me.html` and an asset such as `/css/main.css`.
- Admin: wrong password shows "These credentials do not match our records.";
  `admin` / `admin123!` opens the dashboard.
- Admin → Portfolio → Add project: the new card appears on `portfolio.html`.
  Resume / Contact / Social edits appear on their pages after a reload.
  Hidden (draft) projects and unchecked social links disappear from the site.
