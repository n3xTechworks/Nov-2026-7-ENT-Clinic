/**
 * Site QA for Website 7 (Tridya ENT Clinic: marketing site + auth + patient dashboard).
 * Usage: node tests/qa.cjs <siteDir> [--quick] [--pages a.html,b.html] [--no-clicks]
 * Turns CLIENT_RULES.md + FEEDBACK_RULES into checks. Exit code 1 if anything fails.
 * Conventions (see COMPONENTS.md): header #siteHeader (.nav, [data-theme-toggle], [data-dir-toggle], [data-nav-login] -> login.html,
 * [data-nav-cta] -> book.html), drawer #drawer, footer #siteFooter (.ftr-links, .contact, .social), logo a.logo -> index.html,
 * inner hero .page-head, home hero .hero, testimonials .tcard (.who img), blog cards .blog-card (.author-name, img.author-photo, img.blog-cover),
 * timeline .vtl > li, map iframe, FAQ .faq, auth .auth (.socials), app #appHeader + .side.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('/private/tmp/claude-501/-Users-selvamm-Desktop-15WebSites-Project-7-Error-Cleared-Webpage/511983cb-1d28-48e6-91ce-fdd565d95b6d/scratchpad/entwork/ctools/node_modules/playwright');

const args = process.argv.slice(2);
const SITE = path.resolve(args.find(a => !a.startsWith('--') && !a.includes('.html')) || '.');
const QUICK = args.includes('--quick');
const NOCLICK = args.includes('--no-clicks');
const pi = args.indexOf('--pages');
const ONLY = pi > -1 ? (args[pi + 1] || '').split(/[,\s]+/).filter(Boolean) : null;

const TX = JSON.parse(fs.readFileSync(path.join(SITE, 'data/treatments.json'), 'utf8')).treatments.map(t => `treatment-${t.slug}.html`);
const DOCS = JSON.parse(fs.readFileSync(path.join(SITE, 'data/doctors.json'), 'utf8')).doctors.map(d => `doctor-${d.slug}.html`);
const BLOG = [1, 2, 3, 4, 5, 6].map(i => `blog-${i}.html`);
const PUBLIC = ['index.html', 'home-2.html', 'about.html', 'services.html', ...TX, 'doctors.html', ...DOCS, 'book.html', 'contact.html', 'blog.html', ...BLOG, 'privacy.html', 'terms.html', '404.html'];
const AUTH = ['login.html', 'signup.html', 'forgot-password.html'];
const APP = ['dashboard.html', 'dashboard-book.html', 'dashboard-appointments.html', 'dashboard-prescriptions.html', 'dashboard-reports.html', 'dashboard-profile.html', 'dashboard-video.html'];
const ALL = [...PUBLIC, ...AUTH, ...APP];
const PAGES = ONLY ? ALL.filter(p => ONLY.includes(p)) : (QUICK ? ALL.filter(p => !TX.slice(2).includes(p) && !DOCS.slice(2).includes(p)) : ALL);
const NAV = ['Home', 'About', 'Services', 'Doctors', 'Blog', 'Contact', 'Dashboard'];
const WIDTHS = QUICK ? [360, 768, 1024, 1440] : [360, 390, 768, 1024, 1280, 1440];
const ALT_WIDTHS = QUICK ? [360, 1440] : [360, 1024, 1440];
const kind = p => AUTH.includes(p) ? 'auth' : APP.includes(p) ? 'app' : 'public';
// photo reuse rules: doc-* anywhere; blog-N anywhere except other blog-M posts; tx-x anywhere except other treatment pages; prof-x only on its doctor page
const imgRule = (k, page) => {
  if (/^doc-/.test(k)) return null;
  let m = k.match(/^blog-(\d)$/); if (m) return /^blog-\d\.html$/.test(page) && page !== `blog-${m[1]}.html` ? `${k} cover on another article` : null;
  m = k.match(/^tx-(.+)$/); if (m) return /^treatment-/.test(page) && page !== `treatment-${m[1]}.html` ? `${k} on another treatment page` : null;
  m = k.match(/^prof-(.+)$/); if (m) return page !== `doctor-${m[1]}.html` ? `${k} belongs only on doctor-${m[1]}.html` : null;
  return 'count';
};

const fails = [], warn = [];
const fail = (page, msg) => fails.push(`${page}: ${msg}`);

(async () => {
  for (const p of PAGES) if (!fs.existsSync(path.join(SITE, p))) fail(p, 'page missing');
  if (!fs.existsSync(path.join(SITE, 'favicon.svg'))) fail('site', 'favicon.svg missing');
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('qa-cookie')) localStorage.setItem('tridya.cookies', '{"essential":true}'); } catch (e) { } });
  const imageUse = new Map();
  const heroH = {};
  const ctaStyles = { light: new Set(), dark: new Set() };
  const logoDims = new Set();
  const blogCards = [], articles = [];

  for (const page of PAGES) {
    if (!fs.existsSync(path.join(SITE, page))) continue;
    const K = kind(page);
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_INTERNET|ERR_NAME|google\.com\/maps|maps\.g/.test(m.text())) errors.push(m.text()); });
    p.on('requestfailed', r => { if (r.url().startsWith('file:')) errors.push('missing file ' + r.url().replace(/^.*\/site\//, '')); });
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.goto('file://' + path.join(SITE, page), { waitUntil: 'load' });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 15)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(250);

    const s = await p.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const txt = e => e.textContent.trim().replace(/\s+/g, ' ');
      const out = {};
      out.h1 = [...document.querySelectorAll('h1')].length;
      out.logos = [...document.querySelectorAll('a.logo')].map(a => a.getAttribute('href'));
      const lg = [...document.querySelectorAll('a.logo')].find(vis); out.logoDim = lg ? [Math.round(lg.getBoundingClientRect().height), Math.round(lg.querySelector('.logo-mark').getBoundingClientRect().width)].join('x') : null;
      out.favicon = !!document.querySelector('link[rel="icon"]');
      out.hasHeader = !!document.getElementById('siteHeader');
      out.hasFooter = !!document.getElementById('siteFooter') || !!document.querySelector('footer');
      out.hasApp = !!document.getElementById('appHeader') && !!document.querySelector('.side');
      out.nav = [...document.querySelectorAll('#siteHeader .nav > a, #siteHeader .nav .dd > button')].map(txt);
      out.drawer = [...document.querySelectorAll('#drawer .drawer-nav > a, #drawer .drawer-nav > button')].map(txt);
      out.footerNav = [...document.querySelectorAll('#siteFooter .ftr-links a')].map(txt);
      out.homeMenu = [...document.querySelectorAll('#homeMenu a')].map(a => a.getAttribute('href'));
      out.cta = [...document.querySelectorAll('[data-nav-cta]')].map(a => a.getAttribute('href'));
      out.login = [...document.querySelectorAll('[data-nav-login]')].map(a => a.getAttribute('href'));
      out.dash = [...document.querySelectorAll('#siteHeader .nav a')].some(a => a.getAttribute('href') === 'dashboard.html');
      out.imgs = [...document.images].map(i => ({ src: i.getAttribute('src'), alt: i.getAttribute('alt'), ok: i.complete && i.naturalWidth > 0, wh: i.hasAttribute('width') && i.hasAttribute('height') }));
      out.links = [...document.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), text: txt(a).slice(0, 30) }));
      out.forms = [...document.querySelectorAll('form')].map(f => ({ validate: f.hasAttribute('data-validate'), novalidate: f.noValidate, ph: [...f.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]), textarea')].filter(i => !i.placeholder).map(i => i.name || i.id) }));
      out.footer = { icons: document.querySelectorAll('#siteFooter .contact .ico').length, social: document.querySelectorAll('#siteFooter .social a').length, privacy: !!document.querySelector('#siteFooter a[href="privacy.html"]'), terms: !!document.querySelector('#siteFooter a[href="terms.html"]') };
      const hero = document.querySelector('main .hero');
      out.hero = hero ? { ctas: hero.querySelectorAll('.hero-ctas .btn').length, img: (hero.querySelector('.ph img') || {}).getAttribute?.('src') || null } : null;
      out.pageHead = !!document.querySelector('main .page-head');
      out.sticky = [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); return (cs.position === 'sticky' || cs.position === 'fixed') && vis(e) && !e.closest('#siteHeader, dialog, .toasts, .cookie, .search-layer, .side, .mobile-tabs, .app-scrim, .dtop, .auth-side'); }).map(e => e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]);
      out.testimonials = [...document.querySelectorAll('.tcard')].map(t => ({ img: !!t.querySelector('.who img'), icon: !!t.querySelector('.who .avatar') }));
      out.cards = [...document.querySelectorAll('.blog-card')].map(c => ({ name: c.querySelector('.author-name')?.textContent.trim(), photo: c.querySelector('img.author-photo')?.getAttribute('src'), cover: c.querySelector('img.blog-cover')?.getAttribute('src'), href: c.querySelector('a[href^="blog-"]')?.getAttribute('href') }));
      out.article = { name: document.querySelector('main .author-name')?.textContent.trim(), photo: document.querySelector('main img.author-photo')?.getAttribute('src'), words: (document.querySelector('main')?.innerText || '').split(/\s+/).length };
      out.pagination = !!document.querySelector('.pagination');
      out.map = !!document.querySelector('main iframe[src*="map"]');
      out.faq = !!document.querySelector('main .faq');
      out.timeline = document.querySelectorAll('main .vtl > li').length;
      const so = document.querySelector('.auth .socials'), ah = document.querySelector('.auth h1');
      out.socials = so ? { google: !!so.querySelector('[aria-label*="Google"]'), apple: !!so.querySelector('[aria-label*="Apple"]'), off: ah ? Math.abs((so.getBoundingClientRect().left + so.getBoundingClientRect().width / 2) - (ah.getBoundingClientRect().left + ah.getBoundingClientRect().width / 2)) : 0 } : null;
      return out;
    });
    if (s.h1 !== 1) fail(page, `expected exactly 1 <h1>, found ${s.h1}`);
    if (!s.favicon) fail(page, 'favicon link missing');
    if (!s.logos.length || s.logos.some(h => h !== 'index.html')) fail(page, `logo must link to index.html (${JSON.stringify(s.logos)})`);
    if (s.logoDim) logoDims.add(s.logoDim);
    if (K === 'public') {
      if (!s.hasHeader) fail(page, 'missing #siteHeader');
      if (s.nav.join('|') !== NAV.join('|')) fail(page, `navbar order ${s.nav.join(' · ')} != ${NAV.join(' · ')}`);
      if (s.drawer.join('|') !== NAV.join('|')) fail(page, `drawer order ${s.drawer.join(' · ')} != ${NAV.join(' · ')}`);
      if (s.footerNav.join('|') !== NAV.join('|')) fail(page, `footer quick links ${s.footerNav.join(' · ')} != ${NAV.join(' · ')}`);
      if (s.homeMenu.join('|') !== 'index.html|home-2.html') fail(page, 'Home dropdown must hold Home 1 + Home 2');
      if (!s.cta.length || s.cta.some(h => h !== 'book.html')) fail(page, `navbar CTA must go to book.html (${s.cta})`);
      if (!s.login.length || s.login.some(h => h !== 'login.html')) fail(page, 'Log in button must go to login.html');
      if (!s.dash) fail(page, 'Dashboard link missing in navbar');
      if (!s.hasFooter) fail(page, 'missing footer'); else {
        if (s.footer.icons < 3) fail(page, 'footer address/phone/email need icons');
        if (s.footer.social < 3) fail(page, 'footer needs social icons');
        if (!s.footer.privacy || !s.footer.terms) fail(page, 'footer needs Privacy + Terms links');
      }
      s.sticky.forEach(x => (/aside|idx/.test(x) ? warn.push(`${page}: sticky ${x} (design sidebar; make sure it is not a filter bar)`) : fail(page, `only the navbar may be sticky/fixed (found ${x})`)));
    }
    if (K === 'auth') { if (s.hasHeader || s.hasFooter) fail(page, 'auth pages must have NO site header/footer'); if (!s.socials || !s.socials.google || !s.socials.apple) fail(page, 'auth needs Google + Apple social login buttons (.socials)'); else if (s.socials.off > 6) fail(page, `social icons not centred under the heading (${Math.round(s.socials.off)}px off)`); }
    if (K === 'app') { if (s.hasHeader) fail(page, 'dashboard pages must not carry the marketing navbar'); if (!s.hasApp) fail(page, 'missing app shell (#appHeader + .side)'); }
    if (s.hero) { if (s.hero.ctas > 2) fail(page, 'hero has more than 2 CTAs'); if (!s.hero.img) fail(page, 'home hero needs a real background photo'); }
    if ((page === 'index.html' || page === 'home-2.html') && !s.hero) fail(page, 'home page needs the centred .hero');
    s.imgs.forEach(i => {
      if (!i.ok) fail(page, `image did not load: ${i.src}`);
      if (i.alt === null) fail(page, `image without alt: ${i.src}`);
      if (!i.wh && !/\.svg$/.test(i.src || '')) fail(page, `image without width/height: ${i.src}`);
      if (/images\//.test(i.src || '')) {
        const k = i.src.replace(/^.*images\//, '').replace(/-(160|800|1600|2000)\.webp$/, '');
        const r = imgRule(k, page);
        if (r === 'count') { const u = imageUse.get(k) || []; if (!u.includes(page)) u.push(page); imageUse.set(k, u); } else if (r) fail(page, r);
      }
    });
    s.forms.forEach((f, i) => { if (!f.validate || !f.novalidate) fail(page, `form #${i + 1} needs data-validate + novalidate`); if (f.ph.length) fail(page, `form #${i + 1} fields without placeholder: ${f.ph.join(', ')}`); });
    if (page === 'index.html' || page === 'home-2.html') { if (s.testimonials.length < 3) fail(page, 'needs 3 testimonials'); if (s.testimonials.some(t => !t.img)) fail(page, 'every testimonial needs a profile photo'); }
    else if (s.testimonials.some(t => !t.img && !t.icon)) fail(page, 'testimonial without photo or profile icon');
    if (page === 'blog.html') {
      blogCards.push(...s.cards);
      if (s.cards.length !== 6) fail(page, `expected 6 .blog-card, found ${s.cards.length}`);
      if (s.cards.some(c => !c.name || !c.photo || !c.cover || !c.href)) fail(page, 'each .blog-card needs .author-name, img.author-photo, img.blog-cover and a link to its blog-N.html');
      const hs = s.cards.map(c => c.href); if (new Set(hs).size !== hs.length) fail(page, 'two cards open the same article');
      if (s.pagination) fail(page, 'no pagination with 6 posts');
    }
    if (BLOG.includes(page)) { articles.push({ page, ...s.article }); if (!s.article.name || !s.article.photo) fail(page, 'article needs .author-name + img.author-photo'); if (s.article.words < 350) warn.push(`${page}: article looks thin (${s.article.words} words)`); }
    if (page === 'contact.html') { if (!s.map) fail(page, 'embedded map iframe missing'); if (!s.faq) fail(page, 'FAQ (.faq) missing'); }
    if (page === 'about.html' && s.timeline < 4) fail(page, 'about needs the centred vertical timeline (.vtl, 4+ items)');
    for (const { href, text } of s.links) {
      if (!href || href === '#') { fail(page, `dead link "${text}"`); continue; }
      if (/^(https?:|mailto:|tel:|javascript:)/.test(href)) continue;
      const [file0, hash] = href.split('#');
      const target = file0.split('?')[0] || page;
      if (!fs.existsSync(path.join(SITE, target))) { fail(page, `broken link ${href}`); continue; }
      if (hash && !new RegExp(`id=["']${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(fs.readFileSync(path.join(SITE, target), 'utf8'))) fail(page, `link ${href}: #${hash} not found`);
    }

    // ---------- per width / theme / direction ----------
    const combos = WIDTHS.map(w => [w, 'light', 'ltr']);
    ALT_WIDTHS.forEach(w => { combos.push([w, 'dark', 'ltr']); combos.push([w, 'light', 'rtl']); });
    for (const [w, theme, dir] of combos) {
      await p.setViewportSize({ width: w, height: 900 });
      await p.evaluate(([t, d]) => { document.documentElement.setAttribute('data-theme', t); document.documentElement.setAttribute('dir', d); window.dispatchEvent(new Event('resize')); }, [theme, dir]);
      await p.waitForTimeout(80);
      const tag = `${w}px ${theme} ${dir}`;
      const r = await p.evaluate((K) => {
        const vis = el => { const rc = el.getBoundingClientRect(); const cs = getComputedStyle(el); return rc.width > 0 && rc.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
        const out = {};
        out.hscroll = document.documentElement.scrollWidth - window.innerWidth;
        const sels = K === 'public' ? ['[data-theme-toggle]', '[data-dir-toggle]', '[data-nav-login]', '[data-nav-cta]'] : ['[data-theme-toggle]', '[data-dir-toggle]'];
        // visible in the bar (drawer is closed) or available in the drawer (only counted when hidden from the bar)
        out.bar = sels.map(sel => [...document.querySelectorAll(sel)].filter(e => !e.closest('dialog') && vis(e)).length);
        out.drawerHas = sels.map(sel => { const e = document.querySelector('#drawer ' + sel); if (!e) return 0; const c = e.closest('.drawer-ctl') || e; return getComputedStyle(c).display !== 'none' ? 1 : 0; });
        out.ctl = sels.map(sel => [...document.querySelectorAll(sel)].find(e => !e.closest('dialog') && vis(e))).filter(Boolean).map(e => { const rc = e.getBoundingClientRect(); return Math.round(rc.height) + '/' + getComputedStyle(e).borderTopLeftRadius; });
        const hh = document.querySelector('#siteHeader .wrap'); out.headerH = hh ? Math.round(hh.getBoundingClientRect().height) : null;
        const ph = document.querySelector('main .page-head'); out.pageHead = ph ? Math.round(ph.getBoundingClientRect().height) : null;
        out.cta = [...document.querySelectorAll('.btn-cta')].filter(vis).map(b => { const cs = getComputedStyle(b); return cs.backgroundColor + ' ' + cs.color + ' ' + cs.borderTopLeftRadius; });
        out.bidi = [...document.querySelectorAll('main p, main h2, main li')].filter(vis).slice(0, 8).some(e => getComputedStyle(e).unicodeBidi !== 'plaintext');
        // card rows aligned
        const bad = [], leaf = 'h2,h3,h4,p,ul,blockquote,.btn,a.link,.link,.pill';
        const sig = el => [...el.children].map(c => c.tagName + '.' + String(c.className || '').split(/\s+/)[0]).join(',');
        document.querySelectorAll('main *').forEach(g => {
          if (g.closest('[data-align-free]')) return;
          const cs = getComputedStyle(g);
          if (!(cs.display === 'grid' || (cs.display === 'flex' && cs.flexDirection === 'row' && cs.flexWrap !== 'nowrap'))) return;
          const items = [...g.children].filter(c => vis(c) && c.getBoundingClientRect().width > 140);
          if (items.length < 2 || items.length > 12) return;
          const s0 = sig(items[0]); if (!s0 || !items.every(i => sig(i) === s0)) return;
          const rows = {}; items.forEach(i => { const t = Math.round(i.getBoundingClientRect().top); (rows[t] ||= []).push(i); });
          for (const row of Object.values(rows)) {
            if (row.length < 2) continue;
            const L = row.map(i => [...i.querySelectorAll(leaf)].filter(vis).filter(l => !l.parentElement.closest(leaf) || l.parentElement === i).map(l => Math.round(l.getBoundingClientRect().top - i.getBoundingClientRect().top)));
            if (!L.every(x => x.length === L[0].length)) continue;
            for (let k = 0; k < L[0].length; k++) { const v = L.map(x => x[k]); if (Math.max(...v) - Math.min(...v) > 2) { const h = row[0].querySelector('h2,h3,h4'); bad.push(`row "${(h ? h.textContent : '').trim().slice(0, 28)}": item ${k + 1} tops ${v.join('/')}`); break; } }
          }
        });
        out.align = bad.slice(0, 3);
        // contrast
        const low = [];
        const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(',').map(Number); return a.length === 4 ? a : [...a, 1]; };
        const bgOf = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return null; if (cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (c && c[3] > 0.95) return c.slice(0, 3); } const b = parse(getComputedStyle(document.body).backgroundColor); return b ? b.slice(0, 3) : [255, 255, 255]; };
        const lum = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
        document.querySelectorAll('main p, main h1, main h2, main h3, main h4, main li, main a, main span, main label, main button, main td, main th, main small, main b, footer p, footer a, footer li, footer span, footer h4, header a, header button, .side a').forEach(el => {
          if (!vis(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          if (el.closest('[aria-hidden="true"], .sr-only, [disabled], .slot.full, .hero .ph, .x .d')) return;
          const bg = bgOf(el); if (!bg) return;
          const cs = getComputedStyle(el); const fg = parse(cs.color); if (!fg) return;
          const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
          const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
          const f = fg[3] < 1 ? fg.slice(0, 3).map((x, i) => x * fg[3] + bg[i] * (1 - fg[3])) : fg.slice(0, 3);
          const [a, b] = [lum(f), lum(bg)].sort((x, y) => y - x); const cr = (a + 0.05) / (b + 0.05);
          if (cr < need) low.push(`"${el.textContent.trim().slice(0, 28)}" ${cr.toFixed(2)}<${need}`);
        });
        out.contrast = [...new Set(low)].slice(0, 6);
        return out;
      }, K);
      if (r.hscroll > 1) fail(page, `${tag}: horizontal scroll ${r.hscroll}px`);
      const names = K === 'public' ? ['theme toggle', 'RTL toggle', 'Log in', 'navbar CTA'] : ['theme toggle', 'RTL toggle'];
      r.bar.forEach((n, i) => { const total = n + (r.drawerHas[i] || 0); if (total !== 1) fail(page, `${tag}: ${names[i]} available ${n}× in bar + ${r.drawerHas[i] || 0}× in drawer (must be exactly once)`); });
      if (K === 'public' && new Set(r.ctl).size > 1) fail(page, `${tag}: header controls differ in height/radius ${JSON.stringify(r.ctl)}`);
      if (K === 'public' && r.headerH > 82) fail(page, `${tag}: header wraps (${r.headerH}px)`);
      if (r.pageHead != null && theme === 'light' && dir === 'ltr') (heroH[w] ||= {})[page] = r.pageHead;
      r.cta.forEach(c => ctaStyles[theme].add(c));
      if (dir === 'rtl' && r.bidi) fail(page, `${tag}: text blocks need unicode-bidi: plaintext`);
      r.align.forEach(a => fail(page, `${tag}: card text not level: ${a}`));
      r.contrast.forEach(c => fail(page, `${tag}: low contrast ${c}`));
    }
    [...new Set(errors)].forEach(e => fail(page, `console/page error: ${e}`));

    // ---------- dashboard: every button gives feedback ----------
    if (K === 'app' && !NOCLICK && !QUICK) {
      await p.setViewportSize({ width: 1440, height: 900 });
      const sel = 'main button:not([type=submit]), main a[href="#"]';
      await p.goto('file://' + path.join(SITE, page), { waitUntil: 'load' });
      const n = await p.locator(sel).count();
      for (let i = 0; i < Math.min(n, 40); i++) {
        await p.goto('file://' + path.join(SITE, page), { waitUntil: 'load' });
        const info = await p.evaluate(([sel, i]) => { const el = document.querySelectorAll(sel)[i]; if (!el) return { skip: true }; const r = el.getBoundingClientRect(); window.__chg = 0; window.__href = location.href; new MutationObserver(m => { window.__chg += m.length; }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); return { skip: !r.width || el.disabled || !!el.closest('[hidden], dialog'), label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) }; }, [sel, i]);
        if (info.skip) continue;
        try { await p.locator(sel).nth(i).click({ timeout: 1500 }); } catch (e) { continue; }
        await p.waitForTimeout(400);
        let changed = true; try { changed = await p.evaluate(() => window.__chg > 0 || location.href !== window.__href); } catch (e) { changed = true; }
        if (!changed) fail(page, `button "${info.label}" gives no visible feedback`);
      }
    }
    await p.close();
  }

  // ---------- site-wide ----------
  for (const [img, uses] of imageUse) if (uses.length > 1) fail('site', `photo ${img} used on ${uses.length} pages (${uses.join(', ')})`);
  for (const w of Object.keys(heroH)) { const v = Object.values(heroH[w]); if (v.length > 1 && Math.max(...v) - Math.min(...v) > 2) (+w < 768 ? (m => warn.push('site: ' + m)) : (m => fail('site', m)))( `inner-page hero (.page-head) heights differ at ${w}px: ${JSON.stringify(heroH[w])}`); }
  for (const t of ['light', 'dark']) if (ctaStyles[t].size > 1) fail('site', `.btn-cta looks different across pages in ${t}: ${[...ctaStyles[t]].join(' | ')}`);
  if (logoDims.size > 1) fail('site', `logo size differs: ${[...logoDims].join(', ')}`);
  const dup = arr => arr.filter((x, i) => x && arr.indexOf(x) !== i);
  [['author', blogCards.map(c => c.name)], ['author photo', blogCards.map(c => c.photo)], ['cover', blogCards.map(c => c.cover)]].forEach(([k, a]) => { if (dup(a).length) fail('blog.html', `duplicate ${k}: ${[...new Set(dup(a))]}`); });
  if (articles.length > 1) [['author', articles.map(a => a.name)], ['author photo', articles.map(a => a.photo)]].forEach(([k, a]) => { if (dup(a).length) fail('blog posts', `duplicate ${k}: ${[...new Set(dup(a))]}`); });

  // ---------- cookie banner on first visit ----------
  if (!ONLY || ONLY.includes('index.html')) {
    const c2 = await browser.newContext(); const p = await c2.newPage();
    await p.goto('file://' + path.join(SITE, 'index.html'), { waitUntil: 'load' }); await p.waitForTimeout(300);
    if (!(await p.locator('#cookieBanner').isVisible())) fail('index.html', 'cookie banner not shown on first visit');
    else { await p.click('#cookieBanner [data-cookie="all"]'); if (await p.locator('#cookieBanner').isVisible()) fail('index.html', 'cookie banner does not close after Accept all'); }
    await c2.close();
  }

  // ---------- forms: name / email / phone validation + email lower-casing ----------
  const formPages = PAGES.filter(f => ['contact.html', 'book.html', 'signup.html', 'index.html', 'home-2.html', 'dashboard-profile.html', 'dashboard-book.html', DOCS[0]].includes(f));
  for (const fp of formPages) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.goto('file://' + path.join(SITE, fp), { waitUntil: 'load' });
    if (fp === DOCS[0]) await p.evaluate(() => { const b = document.querySelector('[data-quickbook]'); if (b) b.click(); });
    const count = await p.locator('form[data-validate]').count();
    for (let fi = 0; fi < count; fi++) {
      const form = p.locator('form[data-validate]').nth(fi);
      const nameIn = form.locator('[name="name"]').first();
      if (!(await nameIn.count()) || !(await nameIn.isVisible())) continue;
      const cases = [['name', 'A', false], ['name', 'John3', false], ['name', 'Mary Evans', true], ['email', 'mary.example.com', false], ['email', 'mary@', false], ['email', 'Mary@Example.com', true], ['phone', '98765abc', false], ['phone', '12345', false], ['phone', '5876543210', false], ['phone', '9876543210', true]];
      for (const [field, value, valid] of cases) {
        const input = form.locator(`[name="${field}"]`).first();
        if (!(await input.count()) || !(await input.isVisible())) continue;
        await input.fill(value); await input.blur();
        await form.evaluate(f => f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })));
        await p.waitForTimeout(50);
        if (!p.url().includes(fp)) { await p.goBack(); break; }
        const invalid = await input.evaluate(el => el.getAttribute('aria-invalid') === 'true');
        if (invalid === valid) fail(fp, `form #${fi + 1}: ${field} "${value}" should be ${valid ? 'accepted' : 'rejected'}`);
      }
      const em = form.locator('[name="email"]').first();
      if (await em.count() && await em.isVisible()) { await em.fill('Mary.Evans@EXAMPLE.com'); await em.blur(); const v = await em.inputValue(); if (v !== 'mary.evans@example.com') fail(fp, `email not lower-cased (got ${v})`); }
      const ph = form.locator('[name="phone"]').first();
      if (await ph.count() && await ph.isVisible()) { await ph.fill(''); await ph.type('98a4b3'); const v = await ph.inputValue(); if (/\D/.test(v)) fail(fp, `phone accepts letters while typing (${v})`); }
    }
    await p.close();
  }

  await browser.close();
  console.log(fails.length ? `FAIL: ${fails.length} problem(s)` : `PASS: all checks (${PAGES.length} pages)`);
  fails.forEach(f => console.log(' - ' + f));
  warn.forEach(f => console.log(' ~ ' + f));
  process.exit(fails.length ? 1 : 0);
})();
