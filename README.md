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

The pipeline is shaped by two constraints. Nortic sends no `Access-Control-Allow-Origin`, so the page cannot call it from the browser at all. And a push made with `GITHUB_TOKEN` does not retrigger `pages-build-deployment`, so a snapshot committed to `main` would sit in the repository without ever reaching the deployed site. Both are solved by having the workflow poll Nortic and commit to the orphan `ticket-data` branch, which the page reads over `raw.githubusercontent.com` — that host does send CORS headers. The site history stays clean and the data never needs a deploy.

Expect the figures to run up to about ten minutes behind: the schedule fires every five minutes, and `raw.githubusercontent.com` serves each path for five minutes regardless of any query string, so there is no busting it from the page. This is why the page shows the time it last managed to fetch rather than implying the numbers are live, and warns once that time is over twenty minutes old.

Two things are worth knowing when maintaining it:

- **Adding or changing a performance** means editing the `SHOWS` list in `scripts/fetch-ticket-supply.mjs`. A show's id is the `data-showid` attribute on its row in the Nortic event page's show listing. `STOP_AFTER` in the same file stops the polling once the run is over, so the schedule does not churn indefinitely.
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
