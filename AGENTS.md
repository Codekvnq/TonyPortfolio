# Repository notes (Base44 dev sandbox)

## What this project is
A fully static portfolio site: plain HTML pages (`index.html`, `about.html`,
`resume.html`, `portfolio.html`, `contact-me.html`), CSS, jQuery plugins in
`js/`, and media in `images/`, `audio/`, `video/`, `pdf/`. The site's own
navigation is jQuery-Address based (`#/about`, `#/resume`, …) and swaps page
content by AJAX inside `index.html`.

There is **no build step, no package manager, no backend, database or external
service**. Nothing needs credentials.

## Running it
- `docker compose -f docker-compose.base44.yml up -d` → http://localhost:3000
- `nginx:1.27-alpine` serves the bind-mounted working tree directly, so edits to
  HTML/CSS/JS show up on refresh; no rebuild or restart required (use
  `reload_preview` if the preview keeps a cached frame).
- Nothing to install, migrate or seed.

## Quirks worth knowing
- Compose mounts `nginx.base44.conf` over the image's main config because the
  checkout is root-owned with mode `0700`: the image's default `user nginx;`
  workers cannot traverse `/usr/share/nginx/html` and every request returns
  `403`. The dev config runs workers as root — sandbox only, not production.
- The admin area lives at `/admin/` (a separate HTML document, `admin/index.html`),
  not a client-side route. The preview's SPA navigator cannot reach it by
  `path`; load it as a real document (e.g. an iframe) to test it.
- Admin sign-in is a prototype with hardcoded credentials in `admin/index.html`:
  `admin` / `admin123!`. Bad credentials show
  "Incorrect username or password." in `#loginError`.

## How to verify
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200`
- Check `/`, `/admin/`, `/about.html`, `/portfolio.html`, `/resume.html`,
  `/contact-me.html` and an asset such as `/css/main.css`.
- In the browser: click `ABOUT` → URL hash becomes `#/about` and the About page
  content loads into the shell. In `/admin/`: submit wrong password (error
  shown) then `admin` / `admin123!` (dashboard with sidebar and project table).
