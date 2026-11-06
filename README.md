# Tridya ENT Clinic: website + patient portal (frontend only)

Static HTML/CSS/vanilla JS. Open `index.html` in a browser (works from `file://`, no server needed).

## Structure
```
*.html              built pages (do not edit: generated)
src/pages/          page sources (front matter + body)        src/partials/  header, footer, drawer, overlays, app shell, auth layout
src/templates/      treatment.html, doctor.html (generated ×26 / ×6 from data/)
data/               treatments.json, doctors.json, posts.json, icons.json, site-data.js (generated)
css/site.css        design system (ported from the client design) + foundation layer      css/pages/  page CSS
js/site.js          shared behaviour   js/app.js  dashboard   js/validation.js  forms   js/pages/  page JS
images/             WebP photos (credits-*.md)     scripts/build.py  build     tests/  unit + Playwright QA
```

## Commands
```
python3 scripts/build.py                 # build all pages
node --test tests/validation.test.js     # unit tests for the form rules
node tests/qa.cjs "$PWD" [--quick] [--pages a.html,b.html]   # Playwright QA (all pages, 360-1440, light/dark/RTL)
bash tests/run-tests.sh [--quick]        # build + unit + QA
```
See COMPONENTS.md for the component contract (macros, layouts, classes, JS hooks).
Demo portal: any mobile number/password logs in; data lives in localStorage (`tridya.bookings`, `tridya.theme`, `tridya.dir`, `tridya.cookies`).
