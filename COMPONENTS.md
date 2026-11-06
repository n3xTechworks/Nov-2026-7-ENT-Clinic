# Tridya ENT Clinic: component contract for page agents

The foundation is ready. Build with `python3 scripts/build.py` (from `site/`). It writes every page to the site root,
`treatment-<slug>.html` ×26, `doctor-<slug>.html` ×6 and `data/site-data.js`. Missing images or page CSS/JS only produce a note.

**Golden rule: port the design markup as-is.** `css/site.css` contains the client design CSS verbatim (scope `.tri` removed),
so every class in `W/src/*.html` (`.wrap .grid .sec .sh .sh-txt .eyebrow .card .tcard .organ .steps .step .doc-mini .fac .stats .clin .path
.trow .facts .prose .ol .tl .aside .mini-doc .drow .tags .week .prof .tabs .edu .days .stepper .form-card .form-grid .sum .ccard .nf .ok-hero
.ticket .kpis .kpi .next .d2 .panel .panel-h .panel-b .list .li .rx-list .rx-head .dose .legend .vtype .docpick .cal .slots .slot .aud .letter
.qr .video .vctl .alert .drop .prog .file .sk .empty .radio .switch .row-set .pill .chip .faq .hero-* .finder* .match .cta-band .table`…) already
works. Copy the markup, drop design attributes, turn `href="#"` into real links, turn fake controls into real `<button>`/`<input>`.
Inline `style="grid-column: span N"` from the design is fine. Responsive rules of the design (`.g-md-6`, `.g-md-3`, `.g-sm-2`, 1100/900/760/560 px) are included.

You own only `src/pages/<your page>.html`, `css/pages/<name>.css`, `js/pages/<name>.js` (and `src/templates/treatment.html` / `doctor.html`
for the agents that own those; `data/posts.json` for the blog agent). Do NOT edit `css/site.css`, `js/site.js`, `js/app.js`, `js/validation.js`,
`src/partials/*`, `scripts/build.py`, `tests/*`, `data/treatments.json`, `data/doctors.json`. Need a shared change? Do it in your page CSS/JS and report it.

---------------------------------------------------------------------------------------------------------------
## 1. Page files and front matter

```
---
title: Services | Tridya ENT Clinic
description: One sentence for <meta description> and site search.
layout: site            # site (default) | app (dashboard shell) | auth (split auth, no header/footer) | bare
nav: services           # active navbar item: home1 | home2 | about | services | doctors | blog | contact | dashboard
css: services           # css/pages/services.css (comma list allowed: css: doctors, booking)
js: services            # js/pages/services.js  (deferred, runs after site.js; comma list allowed)
pagehead: true          # render the standard inner hero (below) from crumbs/h1/lead/eyebrow
crumbs: Services        # "Label=url | Label" ; Home is added automatically; last item = current page
h1: Treatments and procedures
lead: Twenty-six ENT treatments across five specialties...
eyebrow:                # optional, above the h1
preload: hero-home1     # optional: <link rel=preload> for the LCP image slot
search: no              # optional: keep the page out of site search
body_class:             # optional class on <body>
---
<section class="sec">...</section>
```
- `layout: site` = head + sticky header (+ Home dropdown) + drawer + `<main id="main">` + [page head] + your body + footer + global overlays + scripts.
  Your body goes straight inside `<main>`: start with `<section class="hero">` (homes), the page head (via `pagehead: true` or your own
  `<section class="page-head">`), or for 404 `<section class="nf">`.
- **Exactly one `<h1>` per page.** Section headings are `h2`, cards `h3`.
- `layout: app` keys: `app: overview|book|appointments|prescriptions|reports|profile|video` (active sidebar item), `app_title:` (the h1 in the top bar,
  so do NOT put another h1 in the body). Body goes inside `<main class="dbody" id="main">` (grid with 24px gap).
- `layout: auth` keys: `auth_img` (slot, e.g. `auth-login`), `auth_alt`, `auth_h`, `auth_p`, `auth_points: one | two | three`. The partial renders the photo side,
  "Back to website", theme/RTL toggles and the logo; your body is the content of `.auth-box` (`.auth-head` with the `h1`, socials, `.or`, form, `.auth-foot`).
  Images on login and signup display the same way (`.auth-side .ph`).

## 2. Template syntax and macros (work in pages, templates, front-matter values)
| Syntax | Output |
|---|---|
| `{{icon name [size] [class]}}` | `<span class="ico" aria-hidden="true"><svg…></span>` Lucide stroke icon (size px optional, e.g. `{{icon arrow-right 16 flip}}`; `flip` mirrors in RTL). Names: keys of `data/icons.json` → `stroke` (135: calendar-days, stethoscope, ear, audio-lines, wind, mic, baby, scan, siren, clock, map-pin, phone, mail, star, quote, check, circle-check, x, plus, minus, chevron-*, arrow-*, search, filter, sliders, bell, pill, file-text, file-heart, download, upload, video, camera, mic-off, video-off, phone-off, users, user, user-round, user-plus, log-in, log-out, lock, key, eye, eye-off, shield, shield-check, hospital, building, ambulance, activity, heart-pulse, microscope, flask, syringe, scissors, bed-double, timer, hourglass, calendar, calendar-check, calendar-x, calendar-clock, history, wallet, credit-card, rupee, receipt, qr-code, printer, copy, share-2, link, external-link, maximize, zoom-in, zoom-out, play, pencil, trash, refresh, rotate-ccw, settings, info, circle-alert, triangle-alert, circle-x, circle-help, message-circle, message-square, send, navigation, map, car, parking, train, accessibility, globe, languages, sun, moon, menu, house, layout-dashboard, grid, list, tag, book-open, newspaper, award, graduation-cap, thumbs-up, sparkles, droplet, thermometer, headphones, volume, monitor, smartphone, wifi, paperclip, clipboard-list, clipboard-check, id-card, mail-check, loader, ellipsis…) |
| `{{svg name}}` | bare `<svg>` (inside your own wrapper) |
| `{{brand name}}` | brand logo: `google` (colour), `apple`, `facebook`, `instagram`, `x-social`, `youtube`, `whatsapp`, `linkedin` (fill currentColor) |
| `{{img slot \| alt \| sizes \| eager}}` | responsive `<img src=slot-800 srcset=800w,1600w(,2000w)>` with real width/height, `loading=lazy` unless `eager` (use `eager` only for the hero/LCP). Put it inside a `.ph` frame. |
| `{{portrait slot \| alt \| 160\|800 \| class}}` | square portrait `<img class="portrait">` from `slot-160.webp` (+800 srcset) or `slot-800.webp` |
| `{{badge OPD}}` | setting pill: `OPD` (teal) · `Day-care` (green) · `Inpatient` (amber) · `Home` (neutral) |
| `{{stars 5}}` | `.stars` row of 5 filled stars (role=img) |
| `{{crumbs Doctors=doctors.html \| Dr. Meera}}` | breadcrumb `<nav class="crumbs">` |
| `{{logo}}` | the logo (already in header/footer/drawer/app/auth; fixed 44px) |
| `{{path}}` `{{{path}}}` | data value escaped / raw. Data in every page: `tx_all` (26 treatments), `doctors` (6), `posts` (6), `specialties` (5). Templates also get `tx` or `doc`. |
| `{{#each doctors}}…{{name}}…{{/each}}` | loop; inside: item fields, `{{this}}`, `{{@index}}`, `{{@n}}`, `{{@first}}`, `{{@last}}`; nested loops fine |
| `{{#if path}}…{{else}}…{{/if}}`, `{{#unless}}` | conditionals |
| `{{> partial}}` | include `src/partials/<partial>.html` |

Macros may contain variables: `{{img {{photo}} | {{alt}}}}`, `{{portrait {{portrait}} | {{portrait_alt}} | 160}}`.

### Data fields
- **Treatment** (`data/treatments.json`): `slug name short specialty(ear|nose|throat|headneck|sleep) specialty_label setting(OPD|Day-care|Inpatient|Home)
  setting_class(opd|daycare|inpatient|home) time helps summary facts[{k,v}] who[] steps[{t,d}] recovery[{when,t,d}] risks[] faq[{q,a}] lead(doctor slug) team[] related[]
  fee fee_label test_name test_fee photo(tx-<slug>) alt page` + resolved `lead_doc team_docs related_tx siblings`.
- **Doctor** (`data/doctors.json`): `slug name short initials role specialty clinic filter(ear|nose|throat|headneck|children|audiology) room qualifications experience years
  languages[] languages_label days[Mon..Sat 1/0] days_label[{day,on}] session next_slot fee fee_label rating reviews_count lead bio[] tags[] procedures[] education[{year,title,place}]
  reviews[{q,name,initials,ctx}] treatments[] portrait(doc-x) portrait_alt profile(prof-x) profile_alt page` + resolved `tx_items posts`.
  Doctors (design copy wins): meera Otology · arjun Rhinology & sleep · kavitha Laryngology & voice · **rahul Paediatric ENT** · **farhana Head & neck** · divya Audiology.
- **Post** (`data/posts.json`, blog agent may edit): `n slug page title category author(doctor slug) date date_label read cover(blog-N) cover_alt excerpt` + `author_doc`.
- In JS: `window.TRIDYA` (= `Tridya.data`) has slim `treatments`, `doctors`, `posts`, `pages`, `specialties`.

## 3. Layout and section patterns
```html
<section class="sec">            <!-- 96/72/56 px padding; .sec.alt = sunk band; .sec + .sec gets a hairline; .sec.tight 64px -->
  <div class="wrap">             <!-- 1240px container, 24/16px gutters -->
    <div class="sh">             <!-- section head: eyebrow (+ mark), heading, intro DIRECTLY under; optional button on the end side -->
      <div class="sh-txt"><span class="eyebrow">Specialists</span><h2>Meet our doctors</h2><p>Intro sentence.</p></div>
      <a class="btn btn-ghost" href="doctors.html">All doctors{{icon arrow-right 16 flip}}</a>
    </div>
    <div class="grid">…</div>    <!-- 12 cols / 24px gap; children style="grid-column:span 4" + class g-md-6 / g-md-3 -->
  </div>
</section>
```
- Centred head: `<div class="sh center">`. Centred FAQ: `<div class="faq center-list">` under a centred `.sh`.
- **Aligned card rows (subgrid):** `<div class="cards" style="--cols:3;--rows:4">` + children `<article class="card sub">` whose **direct children**
  (e.g. `.ph`, `h3`, `p`, `a.link`) sit on shared rows; `--rows` = number of direct children. 4 cols → 2 at ≤1100 (use `class="cards c4"` or `--cols:4`),
  → 2 at ≤900, → 1 at ≤560. `.card.sub` gets 24px side padding with a full-bleed `.ph` first child. Add `lift` for hover lift.
- Photo frame: `<div class="ph" style="aspect-ratio:4/3">{{img spec-ear | Audiologist … }}</div>` (img covers, `--pos:50% 30%` to move focus; never crop faces).
  Round: `<div class="ph round" style="width:52px;height:52px">{{portrait doc-meera | Dr. Meera Raghavan}}</div>`. Avatar: `<span class="avatar">{{portrait testi-1 | Sangeetha P.}}</span>`.
- Home hero (index, home-2): `<section class="hero"><div class="ph">{{img hero-home1 | … | 100vw | eager}}</div><div class="wrap hero-in">pill, h1 (.hl span), p.lead, .hero-ctas (max 2), .hero-proof, .hero-strip</div></section>`.
  The light veil is built in (photo visible in light + dark). `.hero-in` children fade up in sequence.
- Inner hero: `pagehead: true` → `<section class="page-head">` (crumbs, eyebrow, h1, lead). **Same min-height on every inner page (360/340/340px)** —
  put search boxes/filters in the next section, not in the head. Treatment pages use the same head; doctor pages use `.prof-head`.
- Testimonials: `.card.tcard` with `{{stars 5}}`, `<blockquote>`, `.who` (`.avatar` with a portrait photo + `b` name + `small`). Home 1: testi-1..3, Home 2: testi-4..6.
- Timeline (About): `<ol class="vtl"><li><span class="yr">2009</span><h3>…</h3><p>…</p></li>…</ol>` = centred vertical timeline (stacks on mobile).
- Map: `<div class="map-embed"><iframe src="https://www.google.com/maps?q=42+Race+Course+Road+Coimbatore&output=embed" loading="lazy" title="Map to Tridya ENT Clinic"></iframe></div>`.
- Prose (legal, articles): `<div class="prose">`. Stats with count-up: `<b data-count="2400" data-suffix="+">2,400+</b>` (write the final value in HTML).
- Utilities: `.center .muted .mono .tnum .stack-sm/.stack-md/.stack-lg .h3 .sr-only .chip-row`.

## 4. Controls
- Buttons (44px, radius 10): `.btn.btn-cta` (primary CTA, the only primary style), `.btn.btn-ghost` (secondary/outline), `.btn.btn-outline` (teal outline),
  `.btn.btn-teal`, `.btn.btn-danger` (destructive only), sizes `.btn-lg` (52px) `.btn-sm`, `.btn-block`; state `.is-loading` (spinner), `[disabled]`.
  `.icon-btn` 44×44 square; `.link` text link with arrow (`{{icon arrow-right 16 flip}}`). Every CTA "Book appointment" → `book.html` with `{{icon calendar-days}}`.
- Chips: `<button class="chip" aria-pressed="true">Ear</button>` (`.on` also works). Pills: `.pill.ok/.warn/.bad/.info` or `{{badge …}}`.
- Tabs: `<div class="tabs" role="tablist"><button role="tab" aria-selected="true" aria-controls="p1">About</button>…</div><div id="p1" role="tabpanel">` (site.js switches panels, arrow keys).
- Accordion: `<div class="faq" data-accordion="single"><details><summary>Question{{icon plus}}</summary><p>Answer</p></details></div>` (smooth open/close; `single` keeps one open).
- Slots/days: `<div class="slots"><button type="button" class="slot" aria-pressed="false">17:10</button><button class="slot full" disabled>…` and `.days > button[aria-pressed]`.
  Helpers: `Tridya.opdDays(doc, n)`, `Tridya.slotsFor(doc, date)` → `[{time, full}]`, `Tridya.fmtDate(date)` "Thu 05 Nov", `Tridya.iso(date)`.
- Switch: `<button class="switch" role="switch" aria-checked="true" type="button">` (auto toggles). Radio cards: `<label class="radio"><input type="radio" name="x"><i></i>Label</label>`.
- Skeleton: `<span class="sk" style="height:16px;width:60%"></span>` (shimmer). Empty state: `.empty > .badge-ic + h3 + p + .btn`.

## 5. Forms (validation is automatic)
```html
<form data-validate novalidate data-toast="Message sent">           <!-- add data-no-reset to keep values -->
  <div class="form-grid">
    <div class="field"><label for="c-name">Full name</label><input class="inp" id="c-name" name="name" autocomplete="name" placeholder="Your full name" required></div>
    <div class="field"><label for="c-email">Email</label><input class="inp" id="c-email" name="email" type="email" placeholder="name@example.com" required></div>
    <div class="field"><label for="c-phone">Mobile number</label><div class="inp"><span class="pre">+91</span><input id="c-phone" name="phone" type="tel" inputmode="numeric" maxlength="10" placeholder="98430 12345" required></div></div>
    <div class="field full"><label for="c-msg">Message</label><textarea class="inp" id="c-msg" name="message" placeholder="How can we help?"></textarea></div>
  </div>
  <div class="alert info form-success" data-form-success hidden>{{icon circle-check}}<span><b>Message sent</b>We'll reply within one working day.</span></div>
  <button class="btn btn-cta" type="submit">Send message</button>
</form>
```
- Rules (js/validation.js): name ≥2 letters, no digits; email valid, **lower-cased on input and blur, uppercase never rejected**; phone digits only (letters stripped as you type),
  10 digits starting 6–9; password ≥8 with a letter and a number (`data-rule="required"` for a login password); OTP 6 digits (`name="otp"`); `required`; `data-match="#pw"`.
  Field names `name`/`email`/`phone` are what QA tests, so keep them. Placeholders on every field. Inline error `<p class="msg err" id="<id>-error">` is created automatically.
- Valid submit: shows `[data-form-success]` (remove `hidden`), toasts `data-toast`, resets. To take over, listen: `form.addEventListener('valid-submit', e => { e.preventDefault(); … })`.
  `data-validate-only` = validation only, your own submit listener does the rest. A form with `action="book.html"` (GET) navigates when valid.
- Password meter: `TridyaValidation.passwordStrength(v)` → 0..4 for `.pw-meter i.on`.

## 6. Global JS hooks (js/site.js, every page)
| Hook | Behaviour |
|---|---|
| `data-open-dialog="id"` | opens `<dialog class="modal" id="id">` (native, Esc + backdrop close, focus returns) |
| `data-close` (inside a dialog) | closes it. `data-static` on a dialog = no backdrop/Esc close |
| `data-quickbook="<doctor slug>"` | quick-book dialog (days, slots, name, mobile) → `book.html?doctor=&date=YYYY-MM-DD&slot=HH:MM&name=&phone=` |
| `data-open-dialog="dlg-emergency"` | emergency help dialog (also in footer + drawer) |
| `data-search-open`, `data-search-term="…"` | site search overlay (treatments, doctors, articles, pages); `/` key opens it |
| `data-cookie-prefs` | cookie preferences dialog (banner shows until a choice is saved) |
| `data-toast="Title" data-toast-text="…" data-toast-type="ok\|info\|warn\|danger"` | toast on click |
| `data-copy="text"` | copies + toast |
| `data-filter-group="g"` + `button[data-filter="key\|all"]` → `[data-filter-target="g"] [data-tags="a b"]` | chip filtering (items get `hidden`); optional `[data-filter-empty="g"]`; fires `filtered` event |
| `data-reveal` / `data-stagger` (on a parent) | scroll reveal / staggered children |
| `data-count="2400"` (+ `data-prefix`, `data-suffix`) | count-up when visible |
| `data-theme-toggle`, `data-dir-toggle` | already in header/drawer/app/auth (persisted: `tridya.theme`, `tridya.dir`) |

JS API: `Tridya.openDialog(id|el)`, `Tridya.closeDialog(el)`, `toast({title, text, type, timeout})`, `Tridya.doctor(slug)`, `Tridya.treatment(slug)`,
`Tridya.bookings.all()/add({doctor, doctorName, reason, date, slot, mode, fee})/update(id, patch)/remove(id)` (localStorage `tridya.bookings`),
`Tridya.reveal(el)` (after injecting HTML), `Tridya.motion` (false under reduced motion / webdriver), `Tridya.esc(str)`.
Dialog markup:
```html
<dialog class="modal" id="dlg-x" aria-labelledby="dlg-x-t">     <!-- sizes: .sm 440 · default 560 · .lg 820 · .xl 1040; bottom sheet ≤560px -->
  <span class="grab" aria-hidden="true"></span>
  <div class="modal-h"><div class="t"><span class="badge-ic ok">{{icon circle-check}}</span><div><h3 id="dlg-x-t">Title</h3><p>One line.</p></div></div>
    <button class="icon-btn close" type="button" aria-label="Close" data-close>{{icon x}}</button></div>
  <div class="modal-b">…</div>
  <div class="modal-f"><span class="sp">Helper text</span><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-cta" type="button">Confirm</button></div>
</dialog>
```
Badge tones: `.badge-ic` teal neutral, `.ok` success, `.warn` attention, `.danger` destructive (use `.btn-danger` there, never teal).

## 7. Dashboard (layout: app, js/app.js)
Shell = sidebar (Overview, Book appointment, Appointments, Video consult, Prescriptions, Medical reports | Profile & family, Back to website, Log out),
top bar (`app_title` h1, notifications popover, theme, RTL, profile), mobile: burger opens the sidebar + bottom tab bar (≤760). Built-in dialogs:
`dlg-logout` (sidebar Log out), `dlg-session` (open with `?expired=1`). Notifications: bell → `#ntfPanel`, "Mark all as read" works.
**Every button must give visible feedback**: use `data-toast`, a dialog or real state change; app.js shows a "Demo portal" toast as a fallback for buttons that change nothing.
Bookings seeded with 2 demo visits (TRD-24811 Dr. Meera 12 Nov 17:10; TRD-24876 Divya 21 Nov 18:00, deposit ₹1,500).
Use design classes `.next .kpis .kpi .d2 .panel .list .li .rx-* .letter .aud .legend .video .vctl .drop .file .prog .empty .sk .table`.

## 8. Photo slots (site/images, all present; images/CREDITS.md)
Scenes `<slot>-800/1600.webp` (heroes also 2000), portraits `<slot>-160/800.webp`. **No photo on two pages**, except: a doctor's `doc-*` portrait wherever that
doctor appears; a blog cover `blog-N` on its card/teaser; a `tx-*` photo on its own card/teaser. `home-cand-*` do not exist → use `doc-*` portraits there.
- index: hero-home1, spec-ear, spec-nose, spec-throat, home-theatre, testi-1..3 (+ doc-* portraits)
- home-2: hero-home2, clinic-hearing, clinic-sinus, clinic-sleep, clinic-voice, clinic-paeds, h2-child-audiometry, testi-4..6
- services: svc-ear, svc-nose, svc-throat, svc-headneck, svc-sleep (+ tx-* teasers) · treatment-*: tx-<slug> (template) · doctors: doc-* · doctor-*: prof-<x>
- about: about-story, about-booth, about-endo, about-waiting, about-team · contact: contact-front · blog/blog-N: blog-N + author doc-* portraits
- auth: auth-login, auth-signup, auth-forgot, auth-created, auth-updated · dashboard: video-self, endo-1..5

## 9. Page CSS / JS conventions
- `css/pages/<name>.css`: page-only rules, prefix selectors with a page class or section id; use tokens (`var(--teal)`, `--ink`, `--ink-2`, `--line`, `--surface`,
  `--sunk`, `--bg`, `--teal-soft`, `--cta`, `--ok/--warn/--danger(-soft)`, `--r-ctl` 10px, `--r-card` 16px, `--shadow`, `--shadow-sm`, `--f-display`, `--f-body`).
  Dark = `[data-theme="dark"] …`; RTL = logical properties (`margin-inline-start`, `inset-inline-end`, `text-align:start`) or `[dir="rtl"] …`.
- `js/pages/<name>.js`: plain IIFE, deferred, runs after site.js (use `window.Tridya`, `toast`). No console errors; guard missing elements.
- Breakpoints: 1279 (burger), 1100, 900, 760, 560. No horizontal scroll at 360–1440. Only the header is sticky (no sticky filter bars; `.aside`/`.idx` from
  the design are sticky only inside their column – keep them, or set `position:static` if QA flags it).
- Motion is off under `prefers-reduced-motion` and `navigator.webdriver` (`html:not(.motion)`), so QA screenshots are stable.

## 10. Rules recap (client)
Nav order everywhere: Home ▾ (Home 1, Home 2) · About · Services · Doctors · Blog · Contact · Dashboard + theme · RTL · Log in · Book appointment.
Hero: centred, max 2 CTAs, real photo visible. One h1. Card rows aligned. Testimonials with photos. Intro text directly under headings.
Forms: placeholders, modest labels, inline errors, success feedback. Contact: centred FAQ + embedded map. Timelines centred vertical.
Blog: 6 cards (3-col), each opens its own post with its own cover + doctor author photo, category chips filter, no pagination.
Auth pages: no header/footer, Google + Apple icons centred under the heading. RTL: punctuation stays at the end (handled globally by `unicode-bidi: plaintext`).

## 11. Test
`node --test tests/validation.test.js` · `node tests/qa.cjs "$PWD" --pages services.html,doctors.html --quick` · `bash tests/run-tests.sh [--quick]`.

## 12. Hooks the QA script looks for (keep these exact names)
- Blog list: 6 × `<article class="blog-card" data-tags="ear">` each with `img.blog-cover`, `.author-name`, `img.author-photo` (doctor `doc-*` portrait) and a link to its own `blog-N.html`; no `.pagination`.
- Blog post: `main .author-name` + `main img.author-photo` + cover image; ≥350 words.
- Home 1/2: 3 × `.tcard` each with a photo in `.who` (`<span class="avatar">{{portrait testi-1 | …}}</span>`).
- About: `<ol class="vtl">` with 4+ `<li>`. Contact: `main .faq` + `iframe[src*="map"]`.
- Auth: `.socials` inside `.auth-head` with `aria-label`s containing "Google" and "Apple" (`<button type="button" aria-label="Continue with Google" data-toast="…">{{brand google}}</button>`).
- Forms: `data-validate novalidate`, placeholders everywhere, fields named `name`, `email`, `phone`.
- Links: no `href="#"`; every `page.html#id` must exist (e.g. home links to `services.html#ear` need `id="ear"` on the services page — coordinate ids: services uses `ear nose throat headneck sleep`).
