/* Tridya ENT Clinic: shared behaviour for every page (loaded with defer).
   Public API (window.Tridya): openDialog(idOrEl), closeDialog(el), toast(opts) (also window.toast), bookings, doctor(slug),
   treatment(slug), fmtDate(d), reveal(root), motion (bool). Hooks are data-attributes; see COMPONENTS.md. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var DATA = window.TRIDYA || { treatments: [], doctors: [], posts: [], pages: [] };
  var motion = root.classList.contains('motion');
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function iconSvg(paths) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>'; }
  var IC = {
    ok: '<circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    warn: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    danger: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>',
    doc: '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
    file: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    page: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'
  };

  /* ---------------- theme + direction ---------------- */
  function syncToggles() {
    var dark = root.getAttribute('data-theme') === 'dark', rtl = root.getAttribute('dir') === 'rtl';
    $$('[data-theme-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', dark ? 'true' : 'false'); b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme'); });
    $$('[data-dir-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', rtl ? 'true' : 'false'); b.setAttribute('aria-label', rtl ? 'Switch to left-to-right' : 'Switch to right-to-left'); });
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0A1514' : '#0A6B66');
  }
  d.addEventListener('click', function (e) {
    var t = e.target.closest('[data-theme-toggle]');
    if (t) {
      var dark = root.getAttribute('data-theme') !== 'dark';
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      store.set('tridya.theme', dark ? 'dark' : 'light');
      syncToggles();
      return;
    }
    var r = e.target.closest('[data-dir-toggle]');
    if (r) {
      var rtl = root.getAttribute('dir') !== 'rtl';
      root.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      store.set('tridya.dir', rtl ? 'rtl' : 'ltr');
      syncToggles();
    }
  });

  /* ---------------- header height (search panel sits under it) ---------------- */
  var hdr = $('#siteHeader');
  function setHdr() { if (hdr) root.style.setProperty('--hdr-h', Math.round(hdr.getBoundingClientRect().height) + 'px'); }

  /* ---------------- Home dropdown: hover, click, keyboard ---------------- */
  $$('[data-dd]').forEach(function (dd) {
    var btn = $('[data-dd-btn]', dd), menu = $('.dd-menu', dd), timer;
    function open(v) { dd.classList.toggle('open', v); btn.setAttribute('aria-expanded', v ? 'true' : 'false'); }
    btn.addEventListener('click', function () { open(!dd.classList.contains('open')); });
    dd.addEventListener('mouseenter', function () { if (matchMedia('(hover: hover)').matches) { clearTimeout(timer); open(true); } });
    dd.addEventListener('mouseleave', function () { if (matchMedia('(hover: hover)').matches) timer = setTimeout(function () { open(false); }, 150); });
    dd.addEventListener('keydown', function (e) {
      var items = $$('a', menu), i = items.indexOf(d.activeElement);
      if (e.key === 'Escape') { open(false); btn.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); open(true); (items[i + 1] || items[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); open(true); (items[i - 1] || items[items.length - 1]).focus(); }
    });
    dd.addEventListener('focusout', function (e) { if (!dd.contains(e.relatedTarget)) open(false); });
    d.addEventListener('click', function (e) { if (!dd.contains(e.target)) open(false); });
  });

  /* ---------------- dialogs (native <dialog>) ---------------- */
  function openDialog(x, opener) {
    var dlg = typeof x === 'string' ? d.getElementById(x) : x;
    if (!dlg) return null;
    if (dlg.open) return dlg;
    dlg.classList.remove('closing');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.__opener = opener || d.activeElement;
    var f = $('[autofocus]', dlg) || $('input:not([type=hidden]):not([disabled]), select, textarea', dlg);
    if (f && !dlg.classList.contains('drawer') && !$('[autofocus]', dlg)) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }, 30);
    dlg.dispatchEvent(new CustomEvent('dialog-open'));
    return dlg;
  }
  function closeDialog(dlg) {
    if (!dlg || !dlg.open) return;
    function done() { dlg.classList.remove('closing'); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
    if (motion && dlg.classList.contains('modal')) { dlg.classList.add('closing'); setTimeout(done, 150); } else done();
  }
  d.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open-dialog]');
    if (o) { e.preventDefault(); var cur = o.closest('dialog'); if (cur && cur.id !== o.getAttribute('data-open-dialog')) closeDialog(cur); openDialog(o.getAttribute('data-open-dialog'), o); return; }
    var c = e.target.closest('[data-close]');
    if (c && c.closest('dialog')) { e.preventDefault(); closeDialog(c.closest('dialog')); return; }
    /* backdrop click closes (not for data-static dialogs) */
    if (e.target.tagName === 'DIALOG' && e.target.open && !e.target.hasAttribute('data-static')) {
      var r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(e.target);
    }
  });
  d.addEventListener('cancel', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-static')) e.preventDefault(); }, true);

  /* ---------------- mobile drawer ---------------- */
  var drawer = $('#drawer');
  if (drawer) {
    $$('[data-drawer-open]').forEach(function (b) { b.addEventListener('click', function () { openDialog(drawer, b); b.setAttribute('aria-expanded', 'true'); }); });
    drawer.addEventListener('close', function () { $$('[data-drawer-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); });
    var hb = $('[data-drawer-home]', drawer), sub = $('#drawerHome');
    if (hb && sub) hb.addEventListener('click', function () { var v = hb.getAttribute('aria-expanded') !== 'true'; hb.setAttribute('aria-expanded', v ? 'true' : 'false'); sub.hidden = !v; });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a[href]')) closeDialog(drawer); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1280 && drawer.open) closeDialog(drawer); });
  }

  /* ---------------- toasts ---------------- */
  function toast(o) {
    if (typeof o === 'string') o = { title: o };
    o = o || {};
    var host = $('#toasts') || d.body.appendChild(Object.assign(d.createElement('div'), { className: 'toasts', id: 'toasts' }));
    var type = o.type || 'ok';
    var el = d.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    el.innerHTML = '<span class="badge-ic ' + (type === 'info' ? '' : type) + '"><span class="ico">' + iconSvg(IC[type] || IC.ok) + '</span></span><div><b>' + esc(o.title || 'Done') + '</b>' + (o.text ? '<p>' + esc(o.text) + '</p>' : '') + '</div><button class="x" type="button" aria-label="Dismiss"><span class="ico">' + iconSvg(IC.x) + '</span></button>';
    host.appendChild(el);
    function remove() { if (!el.parentNode) return; if (motion) { el.classList.add('out'); setTimeout(function () { el.remove(); }, 200); } else el.remove(); }
    $('.x', el).addEventListener('click', remove);
    var ms = o.timeout != null ? o.timeout : (type === 'danger' ? 0 : 5000);
    if (ms) setTimeout(remove, ms);
    return el;
  }
  window.toast = toast;
  d.addEventListener('click', function (e) {
    var t = e.target.closest('[data-toast]');
    if (t && t.tagName !== 'FORM') toast({ title: t.getAttribute('data-toast'), text: t.getAttribute('data-toast-text') || '', type: t.getAttribute('data-toast-type') || 'ok' });
    var c = e.target.closest('[data-copy]');
    if (c) {
      var txt = c.getAttribute('data-copy');
      var ok = function () { toast({ title: 'Copied', text: txt, type: 'ok' }); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, ok); else ok();
    }
  });

  /* ---------------- site search ---------------- */
  var layer = $('#searchLayer'), sInput = $('[data-search-input]'), sOut = $('[data-search-results]');
  function hl(text, q) {
    var s = esc(text);
    if (!q) return s;
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return s;
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function res(href, icon, title, sub, q) {
    return '<a class="res" href="' + esc(href) + '"><span class="badge-ic"><span class="ico">' + iconSvg(icon) + '</span></span><div><b>' + hl(title, q) + '</b><small>' + hl(sub, q) + '</small></div></a>';
  }
  function runSearch() {
    if (!sOut) return;
    var q = (sInput.value || '').trim(), ql = q.toLowerCase();
    var m = function (arr) { return arr.filter(function (x) { return !ql || arr.__fields.some(function (f) { return String(x[f] || '').toLowerCase().indexOf(ql) > -1; }); }); };
    var tx = DATA.treatments.slice(); tx.__fields = ['name', 'helps', 'specialty_label', 'setting'];
    var dc = DATA.doctors.slice(); dc.__fields = ['name', 'specialty', 'role', 'tags', 'clinic'];
    var ps = DATA.posts.slice(); ps.__fields = ['title', 'category', 'excerpt'];
    var pg = DATA.pages.slice(); pg.__fields = ['title', 'text'];
    var T = m(tx), D = m(dc), P = m(ps), G = m(pg);
    if (!ql) { T = T.slice(0, 4); D = D.slice(0, 3); P = P.slice(0, 2); G = []; }
    var total = T.length + D.length + P.length + G.length;
    if (!total) { sOut.innerHTML = '<p class="search-empty">No results for “' + esc(q) + '”. Try “hearing”, “sinus” or a doctor\'s name, or call +91 422 245 6780.</p>'; return; }
    var col = function (title, arr, fn) { return '<div class="res-col"><h4>' + title + ' · ' + arr.length + '</h4>' + (arr.length ? arr.slice(0, 6).map(fn).join('') : '<p class="search-empty">No matches</p>') + '</div>'; };
    sOut.innerHTML =
      col('Treatments', T, function (t) { return res(t.page, IC.scan, t.name, t.setting + ' · ' + t.specialty_label, q); }) +
      col('Doctors', D, function (x) { return res(x.page, IC.doc, x.name, x.specialty, q); }) +
      col(G.length ? 'Articles & pages' : 'Articles', P.concat(G), function (x) { return x.url ? res(x.url, IC.page, x.title, 'Page', q) : res(x.page, IC.file, x.title, x.read, q); });
  }
  function openSearch(term) {
    if (!layer) return;
    setHdr();
    layer.hidden = false;
    d.body.style.overflow = 'hidden';
    if (term != null) sInput.value = term;
    runSearch();
    setTimeout(function () { sInput.focus(); }, 20);
  }
  function closeSearch() { if (!layer || layer.hidden) return; layer.hidden = true; d.body.style.overflow = ''; var b = $('[data-search-open]'); if (b) b.focus(); }
  d.addEventListener('click', function (e) {
    if (e.target.closest('[data-search-open]')) { e.preventDefault(); openSearch(); }
    else if (e.target.closest('[data-search-close]')) closeSearch();
    var term = e.target.closest('[data-search-term]');
    if (term) { sInput.value = term.getAttribute('data-search-term'); runSearch(); sInput.focus(); }
  });
  if (sInput) {
    sInput.addEventListener('input', runSearch);
    sInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var a = $('.res', sOut); if (a) location.href = a.getAttribute('href'); } });
  }
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeSearch(); var p = $('.dd.open'); if (p) p.classList.remove('open'); }
    if (e.key === '/' && layer && layer.hidden && !/INPUT|TEXTAREA|SELECT/.test((d.activeElement || {}).tagName || '')) { e.preventDefault(); openSearch(); }
  });

  /* ---------------- cookie banner + preferences ---------------- */
  var banner = $('#cookieBanner'), prefs = $('#dlg-cookies');
  function saveCookies(mode) {
    var v = { essential: true, analytics: false, preferences: false, marketing: false };
    if (mode === 'all') v = { essential: true, analytics: true, preferences: true, marketing: false };
    if (mode === 'save' && prefs) $$('[data-cookie-key]', prefs).forEach(function (s) { v[s.getAttribute('data-cookie-key')] = s.getAttribute('aria-checked') === 'true'; });
    store.set('tridya.cookies', JSON.stringify(v));
    if (banner) banner.hidden = true;
    if (prefs && prefs.open) closeDialog(prefs);
    toast({ title: 'Cookie preferences saved', text: mode === 'all' ? 'Thanks. Analytics helps us improve the site.' : 'Only the cookies you allowed will be used.', type: 'ok' });
  }
  if (banner && !store.get('tridya.cookies')) setTimeout(function () { banner.hidden = false; }, motion ? 800 : 0);
  d.addEventListener('click', function (e) {
    var c = e.target.closest('[data-cookie]');
    if (c) { saveCookies(c.getAttribute('data-cookie')); return; }
    if (e.target.closest('[data-cookie-prefs]') && prefs) {
      var saved = {}; try { saved = JSON.parse(store.get('tridya.cookies') || '{}'); } catch (err) { saved = {}; }
      $$('[data-cookie-key]', prefs).forEach(function (s) { var k = s.getAttribute('data-cookie-key'); if (k in saved) s.setAttribute('aria-checked', saved[k] ? 'true' : 'false'); });
      openDialog(prefs);
    }
    var sw = e.target.closest('button.switch[role="switch"]');
    if (sw && sw.getAttribute('aria-disabled') !== 'true') sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
  });

  /* ---------------- dates + slots (shared by quick book and page JS) ---------------- */
  var DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }
  function fmtDate(dt) { return DAYS[dt.getDay()].charAt(0) + DAYS[dt.getDay()].slice(1).toLowerCase() + ' ' + pad(dt.getDate()) + ' ' + MONTHS[dt.getMonth()]; }
  function opdDays(doc, n) {
    var out = [], dt = new Date(); dt.setHours(0, 0, 0, 0);
    for (var i = 0; out.length < (n || 4) && i < 30; i++) {
      var x = new Date(dt); x.setDate(dt.getDate() + i);
      var wd = x.getDay(); /* 0 Sun .. 6 Sat; doc.days = [Mon..Sat] */
      if (wd !== 0 && doc.days[wd - 1]) out.push(x);
    }
    return out;
  }
  function slotsFor(doc, date) {
    var evening = /16:30/.test(doc.session) && !/09:00/.test(doc.session);
    var list = evening ? ['16:30', '16:50', '17:10', '17:30', '17:50', '18:30', '19:10', '19:30'] : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
    var seed = (date.getDate() * 7 + doc.slug.length) % 5;
    var now = new Date(), today = date.toDateString() === now.toDateString();
    var mins = now.getHours() * 60 + now.getMinutes();
    return list.map(function (t, i) {
      var p = t.split(':'), past = today && (+p[0] * 60 + +p[1]) <= mins;
      return { time: t, full: past || (i + seed) % 5 === 0 || (i * 3 + seed) % 7 === 0 };
    });
  }

  /* ---------------- bookings store (localStorage 'tridya.bookings') ---------------- */
  var bookings = {
    key: 'tridya.bookings',
    all: function () { try { return JSON.parse(store.get(this.key) || '[]'); } catch (e) { return []; } },
    save: function (list) { store.set(this.key, JSON.stringify(list)); return list; },
    add: function (b) { var list = this.all(); b.id = b.id || 'TRD-' + Date.now().toString(36).toUpperCase(); b.status = b.status || 'upcoming'; b.created = new Date().toISOString(); list.unshift(b); this.save(list); return b; },
    update: function (id, patch) { return this.save(this.all().map(function (b) { return b.id === id ? Object.assign(b, patch) : b; })); },
    remove: function (id) { return this.save(this.all().filter(function (b) { return b.id !== id; })); }
  };

  /* ---------------- quick book from doctor cards: [data-quickbook="slug"] ---------------- */
  var qb = $('#dlg-quickbook');
  function doctor(slug) { return DATA.doctors.filter(function (x) { return x.slug === slug; })[0]; }
  function treatment(slug) { return DATA.treatments.filter(function (x) { return x.slug === slug; })[0]; }
  if (qb) {
    var qbState = {};
    var renderSlots = function () {
      var doc = qbState.doc, list = slotsFor(doc, qbState.date);
      $('[data-qb-slots]', qb).innerHTML = list.map(function (s) { return '<button type="button" class="slot' + (s.full ? ' full' : '') + '"' + (s.full ? ' disabled aria-label="' + s.time + ' (full)"' : '') + ' aria-pressed="' + (qbState.time === s.time ? 'true' : 'false') + '" data-time="' + s.time + '">' + s.time + '</button>'; }).join('');
      $('[data-qb-summary]', qb).textContent = qbState.time ? fmtDate(qbState.date) + ' · ' + qbState.time + ' · ₹' + doc.fee.toLocaleString('en-IN') + ' at clinic' : 'Choose a time';
    };
    var renderDays = function () {
      $('[data-qb-days]', qb).innerHTML = qbState.days.map(function (x, i) {
        var n = slotsFor(qbState.doc, x).filter(function (s) { return !s.full; }).length;
        return '<button type="button" aria-pressed="' + (iso(x) === iso(qbState.date) ? 'true' : 'false') + '" data-day="' + i + '"><small>' + DAYS[x.getDay()] + '</small><b>' + pad(x.getDate()) + '</b><small>' + n + ' slots</small></button>';
      }).join('');
    };
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-quickbook]');
      if (!t) return;
      e.preventDefault();
      var doc = doctor(t.getAttribute('data-quickbook'));
      if (!doc) { location.href = 'book.html'; return; }
      qbState = { doc: doc, days: opdDays(doc, 4) };
      qbState.date = qbState.days[0];
      var first = slotsFor(doc, qbState.date).filter(function (s) { return !s.full; })[0];
      qbState.time = first ? first.time : '';
      $('[data-qb-name]', qb).textContent = doc.name;
      $('[data-qb-sub]', qb).textContent = doc.specialty + ' · ' + doc.room;
      $('[data-qb-session]', qb).textContent = doc.session;
      renderDays(); renderSlots();
      openDialog(qb, t);
    });
    qb.addEventListener('click', function (e) {
      var day = e.target.closest('[data-day]');
      if (day) { qbState.date = qbState.days[+day.getAttribute('data-day')]; var f = slotsFor(qbState.doc, qbState.date).filter(function (s) { return !s.full; })[0]; qbState.time = f ? f.time : ''; renderDays(); renderSlots(); }
      var sl = e.target.closest('[data-time]');
      if (sl && !sl.disabled) { qbState.time = sl.getAttribute('data-time'); renderSlots(); }
    });
    var form = $('[data-quickbook-form]', qb);
    form.addEventListener('valid-submit', function (e) {
      e.preventDefault();
      if (!qbState.time) { toast({ title: 'Choose a time', text: 'Pick one of the open slots first.', type: 'warn' }); return; }
      var p = new URLSearchParams({ doctor: qbState.doc.slug, date: iso(qbState.date), slot: qbState.time, name: form.elements.name.value.trim(), phone: form.elements.phone.value.trim() });
      location.href = 'book.html?' + p.toString();
    });
  }

  /* ---------------- accordions: smooth <details> ---------------- */
  $$('.faq details, details[data-smooth]').forEach(function (det) {
    var sum = $('summary', det);
    if (!sum) return;
    sum.addEventListener('click', function (e) {
      var group = det.closest('[data-accordion="single"]');
      if (group && !det.open) $$('details[open]', group).forEach(function (o) { if (o !== det) o.open = false; });
      if (!motion) return;
      e.preventDefault();
      var start = det.offsetHeight, opening = !det.open;
      if (opening) det.open = true;
      var end = opening ? det.scrollHeight : sum.offsetHeight + parseFloat(getComputedStyle(det).paddingTop) + parseFloat(getComputedStyle(det).paddingBottom);
      det.style.overflow = 'hidden';
      var a = det.animate({ height: [start + 'px', end + 'px'] }, { duration: 220, easing: 'ease-out' });
      a.onfinish = function () { if (!opening) det.open = false; det.style.overflow = ''; };
    });
  });

  /* ---------------- tabs: [role=tablist] > [role=tab][aria-controls] ---------------- */
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    function select(t) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; var p = d.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on; });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, dir = root.getAttribute('dir') === 'rtl' ? -1 : 1, n = null;
        if (k === 'ArrowRight') n = tabs[(i + dir + tabs.length) % tabs.length];
        if (k === 'ArrowLeft') n = tabs[(i - dir + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); n.focus(); select(n); }
      });
    });
  });

  /* ---------------- chip filters: [data-filter-group=x] [data-filter=key] -> [data-filter-target=x] [data-tags~=key] ---------------- */
  $$('[data-filter-group]').forEach(function (group) {
    var name = group.getAttribute('data-filter-group');
    var target = $('[data-filter-target="' + name + '"]');
    if (!target) return;
    group.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip) return;
      var key = chip.getAttribute('data-filter');
      $$('[data-filter]', group).forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); c.classList.toggle('on', c === chip); });
      var shown = 0;
      $$('[data-tags]', target).forEach(function (it) { var ok = key === 'all' || (' ' + it.getAttribute('data-tags') + ' ').indexOf(' ' + key + ' ') > -1; it.hidden = !ok; if (ok) shown++; });
      var empty = $('[data-filter-empty="' + name + '"]'); if (empty) empty.hidden = shown > 0;
      target.dispatchEvent(new CustomEvent('filtered', { detail: { key: key, shown: shown } }));
    });
  });

  /* ---------------- reveal, stagger, count-up ---------------- */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count')), dec = (el.getAttribute('data-count').split('.')[1] || '').length;
    var pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
    var fmt = function (v) { return pre + v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; };
    if (!motion) { el.textContent = fmt(to); return; }
    var t0 = null;
    function step(t) { t0 = t0 || t; var p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function reveal(scope) {
    $$('[data-stagger]', scope).forEach(function (g) { Array.prototype.forEach.call(g.children, function (c, i) { if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', ''); c.style.setProperty('--d', (i % 8) * 80 + 'ms'); }); });
    $$('.hero-in', scope).forEach(function (h) { Array.prototype.forEach.call(h.children, function (c, i) { c.style.setProperty('--i', i); }); });
    var items = $$('[data-reveal]:not(.in), [data-count]:not([data-counted])', scope);
    if (!motion || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('in'); if (el.hasAttribute('data-count')) { el.setAttribute('data-counted', ''); countUp(el); } }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add('in');
        if (el.hasAttribute('data-count') && !el.hasAttribute('data-counted')) { el.setAttribute('data-counted', ''); countUp(el); }
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    syncToggles();
    setHdr();
    window.addEventListener('resize', setHdr);
    if (window.TridyaValidation) window.TridyaValidation.wireAll();
    reveal(d);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();

  window.Tridya = { openDialog: openDialog, closeDialog: closeDialog, toast: toast, bookings: bookings, doctor: doctor, treatment: treatment, opdDays: opdDays, slotsFor: slotsFor, iso: iso, fmtDate: fmtDate, reveal: reveal, motion: motion, data: DATA, store: store, esc: esc };
})();
