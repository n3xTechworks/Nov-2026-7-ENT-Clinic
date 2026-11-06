/* Services: search + setting chips filter rows; specialty index highlights the section in view. */
(function () {
  'use strict';
  var root = document.querySelector('.svc-page');
  if (!root) return;
  var q = root.querySelector('[data-svc-search]');
  var chips = root.querySelectorAll('[data-svc-chips] .chip');
  var groups = root.querySelectorAll('[data-grp]');
  var status = root.querySelector('[data-svc-status]');
  var empty = root.querySelector('[data-svc-empty]');
  var idx = root.querySelectorAll('[data-idx]');
  var setting = 'all';
  var total = root.querySelectorAll('[data-row]').length;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function matchSetting(s) {
    if (setting === 'all') return true;
    if (setting === 'opd') return s === 'opd' || s === 'home';
    return s === setting;
  }
  function apply() {
    var term = (q.value || '').trim().toLowerCase();
    var words = term.split(/\s+/).filter(Boolean);
    var shown = 0;
    groups.forEach(function (g) {
      var n = 0, last = null;
      g.querySelectorAll('[data-row]').forEach(function (r) {
        var hay = r.getAttribute('data-search') || '';
        var ok = matchSetting(r.getAttribute('data-setting')) && words.every(function (w) { return hay.indexOf(w) !== -1; });
        r.hidden = !ok;
        r.classList.remove('last-vis');
        if (ok) { n++; last = r; }
      });
      if (last) last.classList.add('last-vis');
      g.hidden = n === 0;
      var c = g.querySelector('[data-grp-count]');
      if (c) c.textContent = n + (n === 1 ? ' treatment' : ' treatments');
      var link = root.querySelector('[data-idx="' + g.id + '"]');
      if (link) { link.querySelector('[data-idx-count]').textContent = pad(n); link.classList.toggle('dim', n === 0); }
      shown += n;
    });
    empty.hidden = shown !== 0;
    status.textContent = shown === total ? 'Showing all ' + total + ' treatments' : 'Showing ' + shown + ' of ' + total + ' treatments' + (term ? ' for “' + q.value.trim() + '”' : '');
  }
  q.addEventListener('input', apply);
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      setting = c.getAttribute('data-setting');
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      apply();
    });
  });
  root.querySelector('[data-svc-clear]').addEventListener('click', function () {
    q.value = ''; setting = 'all';
    chips.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-setting') === 'all' ? 'true' : 'false'); });
    apply(); q.focus();
  });
  /* ?q= or ?setting= from links / site search */
  var params = new URLSearchParams(location.search);
  if (params.get('q')) q.value = params.get('q');
  var ps = params.get('setting');
  if (ps) { var pc = root.querySelector('[data-setting="' + ps + '"]'); if (pc) pc.click(); }
  if (params.get('q') || ps) apply();

  /* jump links: active state */
  idx.forEach(function (a) {
    a.addEventListener('click', function () { idx.forEach(function (x) { x.classList.toggle('on', x === a); }); });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        idx.forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-idx') === e.target.id); });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    groups.forEach(function (g) { io.observe(g); });
  }
})();
