# Gangbangbrudar Site

Static promo site for the theater play **Gangbangbrudar**.

The site is a mobile-first, static public information page for the production. It is effectively a 1.0 version: the main content, gallery, trailer, show dates, ticket purchase link, actor portraits, credits, contact details, and site chrome are in place.

## Current Status

- Landing page with the play logo and trailer
- Sections for the play description, gallery, cast, production credits, show dates, tickets, and contact
- Custom domain configured through `CNAME`
- Contact section with production email address
- SVG favicon based on the Vixen Produktion mark
- Swipe gestures for navigating the mobile gallery lightbox
- Internal ticket status page at `/biljetter`, fed automatically from Nortic

## Design Direction

The site should be designed mobile-first, since most visitors are expected to arrive from social media links. Key content such as the trailer, show dates, gallery, and ticket link should be easy to reach on small screens.

## Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── ticket-supply.yml
├── assets/
│   ├── css/
│   │   └── site.css
│   ├── images/
│   │   ├── favicon.svg
│   │   ├── logo.svg
│   │   └── gallery/
│   │       ├── images.js
│   │       └── ...
│   └── videos/
│       └── trailer-portrait.mp4
├── biljetter/
│   └── index.html
├── CNAME
├── index.html
├── scripts/
│   ├── fetch-ticket-supply.mjs
│   ├── optimize-gallery-images.ps1
│   └── update-gallery-images.ps1
└── README.md
```

## Development

This is expected to stay a plain static HTML site. There is currently no framework, package manager, or build step.

Open `index.html` directly in a browser to preview changes locally.

## Ticket Status Page

`biljetter/index.html` is served at `/biljetter` and shows the production how ticket sales are going: released allocation, sold and remaining per performance. It is meant for the production rather than the audience, so it is marked `noindex` and is not linked from the site — but GitHub Pages cannot authenticate anyone, so treat the URL as readable by whoever has it.

The numbers come from Nortic's own supply endpoint, `https://nortic.se/dagny/ajax/event/supply?showIds=...`. Note that its `remainingPercentage` field actually counts what has been **sold**, not what remains — Nortic's own code treats 100 as sold out. `fetch-ticket-supply.mjs` therefore derives everything from the two raw counts and never passes that field on.

Nortic sends no `Access-Control-Allow-Origin`, so the page cannot call it from the browser directly. `proxy/nortic-supply-worker.js` is a Cloudflare Worker that forwards that one endpoint with the header added, deployed at `https://nortic-supply.tomaselison.workers.dev/`. The page reads it on load and on every press of Uppdatera, so the figures are current to the second. The Worker is locked to the show ids in its own source rather than taking them from the query string, so it cannot be used as an open proxy, and it answers with the same JSON shape as the snapshot below.

The fallback is a snapshot on the orphan `ticket-data` branch, written by the workflow and read over `raw.githubusercontent.com`, which unlike Nortic does send CORS headers. The page only touches it when the Worker or Nortic cannot be reached, and says so in the line above the figures rather than passing stale numbers off as live. It lives on an orphan branch for two reasons: it keeps a commit every few minutes out of the site history, and a push made with `GITHUB_TOKEN` does not retrigger `pages-build-deployment`, so a snapshot committed to `main` would never reach the deployed site.

Treat the snapshot as a safety net rather than a second source of truth. GitHub schedules `cron` on a best-effort basis and was observed ignoring a `*/5` schedule entirely for the better part of an hour, so the snapshot can be arbitrarily old. That is survivable precisely because it is only the fallback; `gh workflow run ticket-supply.yml` forces it to refresh if it has drifted badly.

Three things are worth knowing when maintaining it:

- **The show list is in two places** and they have to agree: `SHOWS` in `scripts/fetch-ticket-supply.mjs` and `SHOWS` in `proxy/nortic-supply-worker.js`. Nortic returns counts but no dates, so both need the run's dates to label the figures.

- **Adding or changing a performance** means editing both `SHOWS` lists. A show's id is the `data-showid` attribute on its row in the Nortic event page's show listing. `STOP_AFTER` in `scripts/fetch-ticket-supply.mjs` stops the polling once the run is over, so the schedule does not churn indefinitely. The Worker is redeployed by pasting its file into the Cloudflare dashboard's editor — there is no build step.
- **`SALONG_KAPACITET`** at the top of the script block in `biljetter/index.html` is `null` by default. Set it to the venue's real per-performance capacity and the page adds an "Ej släppta" tile showing how many seats are held outside Nortic. Left at `null`, the page makes no claim about house capacity at all, because the released figure is only the quota put up for sale.

## Updating Play Images

The gallery is rendered from optimized WebP images listed in `assets/images/gallery/images.js`. After adding or removing images in `assets/images/gallery`, regenerate the image manifest:

```powershell
.\scripts\update-gallery-images.ps1
```

If new source images are added as JPG or PNG files, optimize them to WebP and update the manifest:

```powershell
.\scripts\optimize-gallery-images.ps1
```

The production domain is configured as:

```text
gangbangbrudar.se
```
