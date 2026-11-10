# Admin backend — Netlify Functions + Blobs

No database, no third-party auth, no email. One owner account, one content
document, and images in Netlify Blobs. Pushing to GitHub still deploys the
whole site.

## Repository layout

```
site/                     publish directory (all public files)
  admin/                  admin shell
  css/ js/ images/ ...    existing assets
  *.html, robots.txt
netlify/functions/        server code (never published as static files)
  api.mjs                 /api/* routes (auth, content, revisions, media)
  media.mjs               /media/* image delivery
netlify/lib/              shared server modules (auth, stores)
netlify.toml              publish + functions + headers
package.json              @netlify/blobs, netlify-cli
docs/                     internal documentation (not deployed)
```

## Local development

```bash
npm install
npx netlify link          # once, links this folder to the Netlify site
npm run dev               # serves site/ and functions at localhost:8888
```

`netlify dev` provides a local Blobs sandbox, so login, saves and uploads work
without touching production data.

## Deploy

Push to the connected GitHub branch. Netlify installs dependencies, publishes
`site/`, and bundles `netlify/functions/`. No build command is needed.

Production URL: `https://<site>.netlify.app`
Admin URL: `https://<site>.netlify.app/admin/`

## Planned routes

| Route | Purpose | Status |
|---|---|---|
| `POST /api/login` | Username + password, sets the session cookie | done |
| `GET /api/session` | Current session and default-password warning | done |
| `POST /api/logout` | Clears the session | done |
| `PUT /api/account` | Change username/password, invalidate other sessions | done |
| `GET /api/content` | Public site content (CDN cached ~60s, `?fresh` bypasses) | done |
| `PUT /api/content` | Owner-only save with optimistic version check | done |
| `GET /api/revisions` | Recent snapshots, newest first | done |
| `GET /api/revisions/:id` | One snapshot with its content | done |
| `POST /api/revisions/:id/restore` | Restore a snapshot as a new version | done |
| `GET/POST /api/media` | List or upload images (multipart `full` + `thumb`) | done |
| `DELETE /api/media/:id` | Delete an image that content no longer references | done |
| `GET /media/:key` | Public image bytes, one-year immutable cache | done |

Default credentials are `admin` / `admin123!` until the owner changes them in
Account. A `mustChange` flag drives the dashboard warning.

Sessions last 7 days. Signing in with “Keep me signed in” issues a 30-day
cookie and a matching 30-day token.

Preview and local builds write to the `portfolio-preview` Blobs store, so a
deploy preview can never change what the production site shows. Production
sets `CONTEXT=production` and uses the `portfolio` store.

## Blobs keys (`portfolio` store or `portfolio-preview`)

- `content.json` — live site content
- `revisions/<id>.json` — last 20 saves
- `auth.json` — username, PBKDF2 hash, salt, credential version
- `session-secret` — auto-generated signing key
- `media/<hash>.<ext>`, `media/<hash>-thumb.<ext>` — uploaded images
- `media-index.json` — media library metadata

## Limits

- Function request/response: 6 MB buffered (about 4.5 MB after base64).
  Images are compressed in the browser and capped at 4 MB.
- Videos are not uploaded through functions; keep repo files or use
  YouTube/Vimeo links.
- Netlify Free includes 300 credits/month. Typical portfolio traffic stays
  well below that; image bandwidth is the largest cost.
