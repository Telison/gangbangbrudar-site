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
- Internal ticket status page at `/biljetter`, frozen on the September 2026 result and ready to switch back to live figures for a future run

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
├── data/
│   └── 2026-09-ticket-sales.json
├── index.html
├── proxy/
│   └── nortic-supply-worker.js
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

`biljetter/index.html` is served at `/biljetter`. It has two modes, and the switch between them is the `mode-frozen` class on `<body>` — nothing else.

**Frozen (what it is now).** The September 2026 run is over, so the page shows the figures it finished on and fetches nothing at all. It leads with what sold rather than what was left, because that is the number that means something once nobody is selling. It is marked `noindex` and is not linked from the site, but GitHub Pages cannot authenticate anyone, so treat the URL as readable by whoever has it.

**Live.** With `mode-frozen` removed the page reads current figures for whatever run is on sale, refreshes itself every two minutes, and offers an Uppdatera button. Both sets of Swedish wording live in the markup side by side under `data-mode="live"` and `data-mode="frozen"`, so switching modes never means rewriting copy.

### The September 2026 result

199 of 230 released tickets sold: 109 of 115 on Saturday the 19th, 90 of 115 on Sunday the 20th. The full record is in `data/2026-09-ticket-sales.json`. The page itself renders two figures from the `SLUTRESULTAT` and `FORSALJNINGSHISTORIK` constants at the top of its script block — the headline result, and a chart per performance showing the climb over the four days before opening. Both are embedded rather than fetched, so the frozen page makes no network request at all.

The charts are one per performance rather than two lines on one, which keeps each to a single series and avoids inventing a second hue the palette does not have. They keep a zero baseline: the run was already about 80 % sold when measuring began, so the slope is genuinely gentle and truncating the axis to dramatise it would misrepresent what happened. Exact readings sit under "Visa siffrorna" so no value is reachable only by hovering.

Two caveats on those numbers, both of which also apply to any future run. They count tickets issued through Nortic only — seats never loaded into Nortic, and anything sold at the door, are invisible here. And the released allocation is a quota somebody sets, not the size of the room: it was raised from 110 to 115 per performance, which is why the total is 230 rather than 220. The exact moment is not recorded — the snapshot still read 110 at 21:43 UTC on the 18th and read 115 at 11:37 UTC on the 19th, and nothing was sampled in between. The chart draws that as a step at the later reading rather than a slope, since the quota changed at one instant rather than gradually.

### Where the numbers come from

Nortic's supply endpoint, `https://nortic.se/dagny/ajax/event/supply?showIds=...`. Its `remainingPercentage` field counts what has been **sold**, not what remains — Nortic's own code treats 100 as sold out. Both `scripts/fetch-ticket-supply.mjs` and `proxy/nortic-supply-worker.js` derive everything from the two raw counts and never pass that field on.

Nortic sends no `Access-Control-Allow-Origin`, so the page cannot call it from the browser directly. `proxy/nortic-supply-worker.js` is a Cloudflare Worker that forwards that one endpoint with the header added; it is pinned to the show ids in its own source rather than reading them from the query string, so it cannot be used as an open proxy, and it answers with the same JSON shape as the snapshot. **No Worker is currently deployed** — the September 2026 one was deleted after the run, which is why `LIVE_URL` in the page is empty. Nothing is lost by that: the source here is the whole of it, and step 3 below redeploys it.

Deploying and managing the Worker is done through the Cloudflare dashboard in a browser session. There is deliberately no API token: a token would be a long-lived credential sitting in the account for the sake of a job that happens once a run.

The fallback is a snapshot on the orphan `ticket-data` branch, written by `.github/workflows/ticket-supply.yml` and read over `raw.githubusercontent.com`, which unlike Nortic does send CORS headers. The page only touches it when the Worker or Nortic cannot be reached, and says so above the figures rather than passing stale numbers off as live. It lives on an orphan branch for two reasons: it keeps a commit every few minutes out of the site history, and a push made with `GITHUB_TOKEN` does not retrigger `pages-build-deployment`, so a snapshot committed to `main` would never reach the deployed site.

Do not rely on the schedule being punctual. GitHub honours `cron` on a best-effort basis and throttles hard: a `*/5` produced nothing whatsoever for the first ninety minutes, and the `*/15` that replaced it actually ran about every two to five hours. That is survivable only because it is the fallback and never the live figure. `gh workflow run ticket-supply.yml --repo Telison/gangbangbrudar-site` forces a refresh.

### Turning it back on for a new run

1. **Collect the new show ids.** Open the Nortic event page and read `data-showid` off each row in the show listing.
2. **Update the two `SHOWS` lists** so they agree: `scripts/fetch-ticket-supply.mjs` and `proxy/nortic-supply-worker.js`. Nortic returns counts but no dates, so both need the run's dates to label the figures. Move `STOP_AFTER` in the script past the new run, or it exits without doing anything.
3. **Deploy the Worker.** Cloudflare dashboard → Workers & Pages → create a Worker → paste `proxy/nortic-supply-worker.js` into the editor → Deploy. There is no build step and no dependencies. Check `ALLOWED_ORIGINS` still lists the site.
4. **Point the page at it.** Put the Worker's URL in `LIVE_URL` in `biljetter/index.html`.
5. **Flip the page to live** by removing `mode-frozen` from its `<body>` tag, and update the `data-mode="frozen"` wording if you want the old result kept somewhere.
6. **Restart the snapshot** by uncommenting the `schedule` block in `.github/workflows/ticket-supply.yml`.
7. **Check it.** `curl` the Worker directly, then load `/biljetter` and confirm the line above the figures says *Hämtat direkt från Nortic*. If it says anything else, the page is on the fallback and the Worker is not being reached.

Before archiving a finished run, copy its final snapshot and history off the `ticket-data` branch into `data/` as was done for September 2026 — that branch is rewritten by the next run.

### Other things worth knowing

- **`SALONG_KAPACITET`** at the top of the page's script block is `null`. Set it to the venue's real per-performance capacity and the page adds an "Ej släppta" tile showing how many seats are held outside Nortic. Left at `null` the page makes no claim about house capacity at all, because the released figure is only the quota put up for sale. Nothing in Nortic's data reveals the true capacity.

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
