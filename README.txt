FINAL PORTFOLIO VIEWER - 20 October 2026

UPLOAD
1. Unzip this package.
2. Copy index.html, style.css, viewer.js, pages.json, portfolio.pdf, .nojekyll
   and the entire pages folder directly into your local Portfolio repository.
3. Replace files with the same names. Keep your existing .git folder and README.md.
4. GitHub Desktop: Summary = Final portfolio update. Commit to main, then Push origin.
5. Wait for the GitHub Pages deployment to finish, then hard refresh your website.
   Windows: Ctrl+F5. Mac: Cmd+Shift+R.
Do not upload the ZIP itself or place these files inside an extra folder.

FEATURES AND FIXES
- Cover alone, followed by 2-3, 4-5, through 42-43 on desktop.
- Pages touch: zero CSS gap, margins, borders and page shadows.
  White margins that are part of the artwork remain unchanged.
- Directional 180 ms slide, including internal links; respects reduced-motion settings.
- Fullscreen button is now present and registered once at startup.
  Exit with the button or Esc in supporting browsers.
- Onscreen/keyboard arrows, zoom, page counter, one-page mobile layout.
- Contents link to page 4 and two Vimeo link areas on page 42.
- PDF download uses the exact supplied PDF: 19,774,322 bytes,
  approximately 18.9 MiB / 19.8 decimal MB. No further PDF compression.
- All 43 preview images regenerated from this PDF at 180 dpi, WebP quality 93.
- Fixed odd-page internal navigation and page continuity on viewport resize.
- Updated CSS/JS URLs to reduce stale browser-cache issues.

VERIFICATION
JavaScript syntax and navigation/fullscreen-handler/mobile/zoom logic checks passed.
All image paths and three link annotations checked; PDF matches supplied bytes.
Rendered technical spread visually inspected.
A browser executable was unavailable for end-to-end tests. Confirm fullscreen,
layout and links on your live site; fullscreen support depends on the browser.

QUALITY AND FUTURE UPDATES
The viewer displays raster preview images. Download the PDF for its full detail.
Replacing portfolio.pdf later changes the download only: regenerate pages and
pages.json to update displayed content and clickable link locations.
Open via the hosted site or a local HTTP server, not by double-clicking index.html.
