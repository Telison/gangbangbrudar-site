# Gangbangbrudar Site

Static promo site for the theater play **Gangbangbrudar**.

The site is a mobile-first, static public information page for the production. It is effectively a 1.0 version: the main content, gallery, trailer, show dates, credits, contact details, and site chrome are in place. The remaining production updates are the ticket purchase link and actor portraits.

## Current Status

- Landing page with the play logo and trailer
- Sections for the play description, gallery, cast, production credits, show dates, tickets, and contact
- Custom domain configured through `CNAME`
- Contact section with production email address
- SVG favicon based on the Vixen Produktion mark
- Swipe gestures for navigating the mobile gallery lightbox

## Remaining Content

- Ticket purchase link
- Actor portraits
- Trailer edit: remove or update the outdated play dates at the end of the current trailer.

## Design Direction

The site should be designed mobile-first, since most visitors are expected to arrive from social media links. Key content such as the trailer, show dates, gallery, and ticket link should be easy to reach on small screens.

## Project Structure

```text
.
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
├── CNAME
├── index.html
├── scripts/
│   ├── optimize-gallery-images.ps1
│   └── update-gallery-images.ps1
└── README.md
```

## Development

This is expected to stay a plain static HTML site. There is currently no framework, package manager, or build step.

Open `index.html` directly in a browser to preview changes locally.

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
