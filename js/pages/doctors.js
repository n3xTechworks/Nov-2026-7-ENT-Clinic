/* Doctors: specialty chips, search, filter dialog (specialty, day, language), live next-slot per card. */
(function () {
  'use strict';
  var root = document.querySelector('.docs-page');
  if (!root) return;
  var T = window.Tridya || {};
  var rows = [].slice.call(root.querySelectorAll('[data-doc]'));
  var chips = [].slice.call(root.querySelectorAll('[data-doc-chips] .chip'));
  var q = root.querySelector('[data-doc-search]');
  var status = root.querySelector('[data-doc-status]');
  var badge = root.querySelector('[data-doc-badge]');
  var empty = root.querySelector('[data-doc-empty]');
  var dlg = document.getElementById('dlg-docfilters');
  var state = { specs: [], day: '', langs: [] };
  var pending = null;

  function now() { return new Date(); }
  function dayIdx(d) { return d.getDay(); } /* 0 Sun..6 Sat */
  var KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  function onDay(row, wd) { return (' ' + row.getAttribute('data-days') + ' ').indexOf(' ' + KEYS[wd] + ' ') !== -1; }
  function dayOk(row, day) {
    if (!day) return true;
    var t = dayIdx(now());
    if (day === 'today') return onDay(row, t);
    if (day === 'tomorrow') return onDay(row, (t + 1) % 7);
    if (day === 'sat') return onDay(row, 6);
    /* this week: from today until Saturday (on Sunday: the coming week) */
    for (var i = t === 0 ? 1 : t; i <= 6; i++) if (onDay(row, i)) return true;
    return false;
  }
  function matches(row, s, term) {
    var f = ' ' + row.getAttribute('data-filters') + ' ', l = ' ' + row.getAttribute('data-langs') + ' ';
    if (s.specs.length && !s.specs.some(function (x) { return f.indexOf(' ' + x + ' ') !== -1; })) return false;
    if (s.langs.length && !s.langs.some(function (x) { return l.indexOf(' ' + x + ' ') !== -1; })) return false;
    if (!dayOk(row, s.day)) return false;
    var hay = row.getAttribute('data-search') || '';
    return term.split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) !== -1; });
  }
  function count(s) { var term = (q.value || '').trim().toLowerCase(); return rows.filter(function (r) { return matches(r, s, term); }).length; }
  function apply() {
    var term = (q.value || '').trim().toLowerCase(), n = 0, last = null;
    rows.forEach(function (r) { var ok = matches(r, state, term); r.hidden = !ok; r.classList.remove('first-vis'); if (ok) { n++; if (!last) { last = r; } } });
    if (last) last.classList.add('first-vis');
    empty.hidden = n !== 0;
    var active = state.specs.length + (state.day ? 1 : 0) + state.langs.length;
    status.textContent = n === rows.length ? 'Showing all ' + rows.length + ' specialists' : 'Showing ' + n + ' of ' + rows.length + ' specialists';
    root.querySelectorAll('.docs-reset[data-doc-clear]').forEach(function (b) { b.hidden = !(active || term); });
    var extra = (state.day ? 1 : 0) + state.langs.length + (state.specs.length > 1 ? state.specs.length : 0);
    badge.hidden = !extra; badge.textContent = extra;
    /* bar chips mirror a single specialty */
    chips.forEach(function (c) {
      var v = c.getAttribute('data-spec');
      c.setAttribute('aria-pressed', (v === 'all' ? state.specs.length === 0 : state.specs.length === 1 && state.specs[0] === v) ? 'true' : 'false');
    });
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () { var v = c.getAttribute('data-spec'); state.specs = v === 'all' ? [] : [v]; apply(); });
  });
  q.addEventListener('input', apply);
  function clearAll() { state = { specs: [], day: '', langs: [] }; q.value = ''; apply(); }
  root.querySelectorAll('[data-doc-clear]').forEach(function (b) { b.addEventListener('click', clearAll); });

  /* filter dialog: edit a pending copy, live count, apply on "Show N doctors" */
  if (dlg) {
    var applyBtn = dlg.querySelector('[data-df-apply]');
    var sync = function () {
      dlg.querySelectorAll('[data-df-spec] .chip').forEach(function (c) { c.setAttribute('aria-pressed', pending.specs.indexOf(c.getAttribute('data-v')) !== -1 ? 'true' : 'false'); });
      dlg.querySelectorAll('[data-df-day] .chip').forEach(function (c) { c.setAttribute('aria-pressed', pending.day === c.getAttribute('data-v') ? 'true' : 'false'); });
      dlg.querySelectorAll('[data-df-lang] input').forEach(function (i) { i.checked = pending.langs.indexOf(i.value) !== -1; });
      var n = count(pending);
      applyBtn.textContent = n === 0 ? 'No doctors match' : 'Show ' + n + (n === 1 ? ' doctor' : ' doctors');
      applyBtn.disabled = n === 0;
    };
    root.querySelector('.docs-more').addEventListener('click', function () {
      pending = { specs: state.specs.slice(), day: state.day, langs: state.langs.slice() }; sync();
    });
    dlg.addEventListener('click', function (e) {
      var c = e.target.closest('.chip');
      if (c && pending) {
        var v = c.getAttribute('data-v');
        if (c.closest('[data-df-spec]')) { var i = pending.specs.indexOf(v); if (i === -1) pending.specs.push(v); else pending.specs.splice(i, 1); }
        else if (c.closest('[data-df-day]')) pending.day = pending.day === v ? '' : v;
        sync();
      }
      if (e.target.closest('[data-df-clear]')) { pending = { specs: [], day: '', langs: [] }; sync(); }
      if (e.target.closest('[data-df-apply]') && pending) {
        state = pending; apply();
        if (T.closeDialog) T.closeDialog(dlg); else dlg.close();
      }
    });
    dlg.addEventListener('change', function (e) {
      if (!pending || !e.target.matches('[data-df-lang] input')) return;
      pending.langs = [].slice.call(dlg.querySelectorAll('[data-df-lang] input:checked')).map(function (i) { return i.value; });
      sync();
    });
  }

  /* ?specialty= / ?q= deep links */
  var p = new URLSearchParams(location.search);
  if (p.get('specialty')) state.specs = [p.get('specialty')];
  if (p.get('q')) q.value = p.get('q');
  apply();

  /* live "next slot" from OPD days + slot helper */
  if (T.doctor && T.opdDays && T.slotsFor) {
    var t0 = now(), tom = new Date(t0); tom.setDate(t0.getDate() + 1);
    rows.forEach(function (r) {
      var doc = T.doctor(r.getAttribute('data-doc')), out = r.querySelector('[data-next]');
      if (!doc || !out) return;
      var days = T.opdDays(doc, 6);
      for (var i = 0; i < days.length; i++) {
        var d = days[i], isToday = T.iso(d) === T.iso(t0);
        var open = T.slotsFor(doc, d).filter(function (s) {
          if (s.full) return false;
          if (!isToday) return true;
          var hm = s.time.split(':'); return (+hm[0] * 60 + +hm[1]) > t0.getHours() * 60 + t0.getMinutes();
        })[0];
        if (open) { out.textContent = (isToday ? 'Today' : T.iso(d) === T.iso(tom) ? 'Tomorrow' : T.fmtDate(d).slice(0, 3)) + ' ' + open.time; break; }
      }
    });
  }
})();
