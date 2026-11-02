# Portfolio admin — build plan

> Historical note: the site now lives in `site/`; paths below are relative to
> that folder. See `docs/admin-backend.md` for the current deployment layout.

Goal: a private `/admin` workspace that edits the real portfolio content, with a
WordPress/Laravel-style interface. Front-end only for now; content persists in
`localStorage` through one swappable store module.

## Slices

1. **Data layer** — `js/content-store.js`
   - Versioned defaults taken from the current site.
   - `get`, `save`, `update`, `reset`, `subscribe`, cross-tab change event.
   - Swap point for a backend later.
2. **Admin shell** — `admin/index.html`, `css/admin.css`, `js/admin.js`
   - Login gate (hardcoded, session-based), dark navy sidebar, compact topbar.
   - Hash routes: `#/overview`, `#/portfolio`, `#/resume`, `#/contact`, `#/social`, `#/profile`.
   - Working dropdowns, global search, notifications, toasts, confirms.
3. **Admin sections**
   - Overview: real counts, portfolio mix, recent work, quick actions, site pages.
   - Portfolio: search/filter, add/edit/delete/duplicate/reorder/publish, image picker.
   - Resume: work, education, skills, CV link, live preview.
   - Contact: details and preview.
   - Social: add/remove/toggle links and preview.
   - Profile & hero: copy, marquee, portrait, preview.
4. **Public hydration** — `js/site-content.js`, `css/portfolio-content.css`
   - Portfolio grid rebuilt from published projects, Isotope/lightbox safe.
   - Resume history, education, skills and CV link.
   - Contact details block.
   - Social links on every page.
   - Hero name/title/marquee.
5. **Verify**
   - Login, every dropdown/button/modal, autosave, add/edit/delete project.
   - Edit contact/social/resume → confirm changes on public pages.
   - Responsive at 1440, 768, 390; keyboard escape/close; console clean.

## Decisions

- Dark navy sidebar per supplied references, but no coloured nav pills.
- Near-black primary actions; blue reserved for data and active location.
- Inter, 13–14px working size, 18px/1.6-stroke SVG icons.
- Separate KPI cards with consistent gaps and borders, no icon circles, no sparklines.
- Editors open read-only with a single **Edit** button in the page header. Clicking Edit unlocks the fields and reveals a Save changes / Discard changes bar under the title. Save or Discard returns the page to read-only with the Edit button, so the action bar never shows in normal viewing. Autosave still runs while editing; Discard restores the snapshot taken when Edit was clicked. Modal saves on submit with its own Cancel button.
- localStorage is the current publish mechanism. Multi-device publishing needs a backend.
