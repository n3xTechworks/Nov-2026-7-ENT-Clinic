/* Tridya patient portal: shared dashboard behaviour (layout: app pages only, loaded after site.js).
   - mobile sidebar drawer ([data-side-toggle], [data-side-close])
   - notifications popover ([data-ntf-toggle], [data-ntf-read])
   - log out (dialog #dlg-logout via data-open-dialog; [data-logout] clears the demo session)
   - session expired: ?expired=1 in the URL -> #dlg-session
   - every button inside <main> gives visible feedback: [data-toast] (site.js) or, as a fallback,
     a "demo" toast when a click changed nothing on the page.
   - bookings: Tridya.bookings (localStorage 'tridya.bookings'), seeded with two demo visits on first use. */
(function () {
  'use strict';
  var d = document, T = window.Tridya || {};
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var toast = window.toast || function () {};

  /* ---------- sidebar (mobile) ---------- */
  var side = $('#appSidebar'), scrim = $('.app-scrim'), tog = $('[data-side-toggle]');
  function setSide(open) {
    if (!side) return;
    side.classList.toggle('open', open);
    if (scrim) scrim.hidden = !open;
    if (tog) tog.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { var a = $('nav a', side); if (a) a.focus(); }
  }
  if (tog) tog.addEventListener('click', function () { setSide(!side.classList.contains('open')); });
  d.addEventListener('click', function (e) { if (e.target.closest('[data-side-close]')) setSide(false); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && side && side.classList.contains('open')) { setSide(false); tog.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 760) setSide(false); });

  /* ---------- notifications ---------- */
  var nBtn = $('[data-ntf-toggle]'), panel = $('#ntfPanel');
  function setNtf(open) {
    if (!panel) return;
    panel.hidden = !open;
    nBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var br = nBtn.getBoundingClientRect(), pr = panel.getBoundingClientRect();
      var rtl = d.documentElement.getAttribute('dir') === 'rtl';
      var off = rtl ? (br.left + br.width / 2 - pr.left - 6) : (pr.right - (br.left + br.width / 2) - 6);
      panel.style.setProperty('--arrow', Math.max(12, Math.min(pr.width - 24, off)) + 'px');
    }
  }
  if (nBtn && panel) {
    nBtn.addEventListener('click', function (e) { e.stopPropagation(); setNtf(panel.hidden); });
    d.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target)) setNtf(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setNtf(false); nBtn.focus(); } });
    var read = $('[data-ntf-read]', panel);
    if (read) read.addEventListener('click', function () {
      $$('.ntf.unread', panel).forEach(function (n) { n.classList.remove('unread'); var dot = $('.dot', n); if (dot) dot.remove(); });
      var c = $('[data-ntf-count]', panel); if (c) c.textContent = 'All read';
      var dot = $('[data-ntf-dot]'); if (dot) dot.hidden = true;
      toast({ title: 'All notifications marked as read', type: 'ok' });
    });
    try { if (localStorage.getItem('tridya.ntfRead') === '1') { var dt = $('[data-ntf-dot]'); if (dt) dt.hidden = true; } } catch (e) { /* ignore */ }
  }

  /* ---------- log out + session expired ---------- */
  d.addEventListener('click', function (e) {
    if (e.target.closest('[data-logout]')) { try { localStorage.removeItem('tridya.session'); } catch (err) { /* ignore */ } }
  });
  if (/[?&]expired=1/.test(location.search) && T.openDialog) T.openDialog('dlg-session');

  /* ---------- demo bookings seed ---------- */
  if (T.bookings && !(function () { try { return localStorage.getItem('tridya.bookings'); } catch (e) { return '1'; } })()) {
    T.bookings.save([
      { id: 'TRD-24811', doctor: 'meera', doctorName: 'Dr. Meera Raghavan', reason: 'Follow-up hearing test', date: '2026-11-12', slot: '17:10', mode: 'clinic', status: 'upcoming', fee: 900 },
      { id: 'TRD-24876', doctor: 'divya', doctorName: 'Divya Prakash', reason: 'Hearing aid trial', date: '2026-11-21', slot: '18:00', mode: 'clinic', status: 'upcoming', fee: 500, deposit: 1500 }
    ]);
  }

  /* ---------- feedback fallback for buttons in <main> ---------- */
  var main = $('main');
  if (main) main.addEventListener('click', function (e) {  /* capture: observe before page handlers run */
    var b = e.target.closest('button, a[href="#"]');
    if (!b || !main.contains(b) || b.disabled || b.type === 'submit') return;
    if (b.hasAttribute('data-toast') || b.hasAttribute('data-open-dialog') || b.hasAttribute('data-close') || b.hasAttribute('data-no-feedback') || b.closest('[role="tablist"],[data-filter-group],dialog')) return;
    if (b.getAttribute('href') === '#') e.preventDefault();
    var changed = 0;
    var mo = new MutationObserver(function (m) { changed += m.length; });
    mo.observe(d.body, { subtree: true, childList: true, attributes: true, characterData: true });
    setTimeout(function () {
      mo.disconnect();
      if (!changed) toast({ title: (b.getAttribute('aria-label') || b.textContent || 'Done').trim().replace(/\s+/g, ' '), text: 'Demo portal: this action is simulated.', type: 'info' });
    }, 150);
  }, true);
})();
