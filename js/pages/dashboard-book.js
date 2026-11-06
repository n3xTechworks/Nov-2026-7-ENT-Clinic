/* Portal booking: specialty chips -> doctor cards -> month calendar (doctor's OPD days) -> slots -> summary -> confirm
   (saved with Tridya.bookings.add to localStorage 'tridya.bookings' + toast + inline confirmation). ?doctor=<slug> preselects. */
(function () {
  'use strict';
  var d = document, T = window.Tridya || {};
  var toast = window.toast || function () {};
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var form = $('#bkForm');
  if (!form || !T.doctor) return;

  $$('main button:not([data-toast])').forEach(function (b) { b.setAttribute('data-no-feedback', ''); });
  $$('.docpick img').forEach(function (i) { i.loading = 'eager'; }); /* hidden cards still load their portrait */
  $$('[data-logout]').forEach(function (a) { a.setAttribute('href', 'index.html'); });

  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var maxDay = new Date(today); maxDay.setDate(maxDay.getDate() + 60);
  var booked = {}; /* "slug|date|time" booked in this session */
  (T.bookings ? T.bookings.all() : []).forEach(function (b) { booked[b.doctor + '|' + b.date + '|' + b.slot] = 1; });

  var st = { doc: null, date: null, time: '', vy: today.getFullYear(), vm: today.getMonth() };
  var iso = T.iso || function (x) { return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); };
  function avail(doc, x) { var wd = x.getDay(); return x >= today && x <= maxDay && wd !== 0 && !!doc.days[wd - 1]; }
  function dayLabel(x, yr) { return DOW[x.getDay()] + ', ' + x.getDate() + ' ' + MONTHS[x.getMonth()].slice(0, 3) + (yr ? ' ' + x.getFullYear() : ''); }
  function slots(doc, x) {
    var now = new Date(), list = T.slotsFor(doc, x);
    return list.map(function (s) {
      var full = s.full || !!booked[doc.slug + '|' + iso(x) + '|' + s.time];
      if (iso(x) === iso(now)) { var hm = s.time.split(':'); if (+hm[0] * 60 + +hm[1] <= now.getHours() * 60 + now.getMinutes() + 30) full = true; }
      return { time: s.time, full: full };
    });
  }
  function firstAvail(doc) {
    for (var i = 0; i < 61; i++) { var x = new Date(today); x.setDate(x.getDate() + i); if (avail(doc, x) && slots(doc, x).some(function (s) { return !s.full; })) return x; }
    return null;
  }

  /* ---------- calendar ---------- */
  var calEl = $('[data-cal]', form);
  function renderCal() {
    var doc = st.doc, first = new Date(st.vy, st.vm, 1), lead = (first.getDay() + 6) % 7, days = new Date(st.vy, st.vm + 1, 0).getDate();
    var html = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(function (h) { return '<span class="dh" role="columnheader">' + h + '</span>'; }).join('');
    for (var i = 0; i < lead; i++) html += '<span aria-hidden="true"></span>';
    for (var n = 1; n <= days; n++) {
      var x = new Date(st.vy, st.vm, n), ok = avail(doc, x), sel = st.date && iso(x) === iso(st.date), isT = iso(x) === iso(today);
      var cls = 'd' + (ok ? ' av' : ' x') + (sel ? ' sel' : '') + (isT ? ' today' : '');
      html += ok
        ? '<button type="button" data-no-feedback class="' + cls + '" data-date="' + iso(x) + '" aria-pressed="' + (sel ? 'true' : 'false') + '" aria-label="' + dayLabel(x, true) + '">' + n + '</button>'
        : '<span class="' + cls + '" aria-label="' + dayLabel(x, true) + ', not available">' + n + '</span>';
    }
    calEl.innerHTML = html;
    $('[data-month]', form).textContent = MONTHS[st.vm] + ' ' + st.vy;
    $('[data-mprev]', form).disabled = st.vy === today.getFullYear() && st.vm === today.getMonth();
    $('[data-mnext]', form).disabled = new Date(st.vy, st.vm + 1, 1) > maxDay;
  }
  function renderSlots() {
    var box = $('[data-slots]', form), head = $('[data-slot-head]', form);
    if (!st.date) { head.textContent = 'Choose a date'; box.innerHTML = '<p class="none">Pick a highlighted date to see open times.</p>'; return; }
    head.textContent = dayLabel(st.date) + ' · ' + st.doc.session.split(' · ')[0];
    var list = slots(st.doc, st.date);
    box.innerHTML = list.map(function (s) {
      return '<button type="button" data-no-feedback class="slot' + (s.full ? ' full' : '') + (st.time === s.time ? ' sel' : '') + '" data-time="' + s.time + '"' +
        (s.full ? ' disabled aria-label="' + s.time + ', booked"' : ' aria-pressed="' + (st.time === s.time ? 'true' : 'false') + '"') + '>' + s.time + '</button>';
    }).join('');
  }
  function pickDate(x, keepTime) {
    st.date = x;
    if (x) { st.vy = x.getFullYear(); st.vm = x.getMonth(); }
    if (!keepTime) { var f = x ? slots(st.doc, x).filter(function (s) { return !s.full; })[0] : null; st.time = f ? f.time : ''; }
    renderCal(); renderSlots(); renderSum();
  }

  /* ---------- summary ---------- */
  function mode() { var r = form.querySelector('input[name="mode"]:checked'); return r ? r.value : 'clinic'; }
  function renderSum() {
    var visit = $('#db-type').value || 'consultation';
    $('[data-s-doc]', form).textContent = st.doc.name;
    $('[data-s-date]', form).textContent = st.date ? dayLabel(st.date, true) : 'Choose a date';
    $('[data-s-time]', form).textContent = st.time || 'Choose a time';
    $('[data-s-visit]', form).textContent = (mode() === 'video' ? 'Video ' : 'In-clinic ') + visit.toLowerCase();
    $('[data-s-fee]', form).textContent = '₹' + st.doc.fee.toLocaleString('en-IN');
  }

  /* ---------- doctor + specialty ---------- */
  function daysLabel(doc) { return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].filter(function (x, i) { return doc.days[i]; }).join(', '); }
  function pickDoc(slug) {
    var doc = T.doctor(slug); if (!doc) return;
    st.doc = doc;
    $$('[data-doc]', form).forEach(function (b) { var on = b.getAttribute('data-doc') === slug; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    $('[data-doc-days]', form).textContent = doc.short + ' · ' + daysLabel(doc);
    pickDate(firstAvail(doc));
  }
  function pickSpec(key, keepDoc) {
    $$('[data-spec-key]', form).forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-spec-key') === key ? 'true' : 'false'); });
    var firstVis = null;
    $$('[data-doc]', form).forEach(function (b) {
      var vis = (' ' + b.getAttribute('data-spec-in') + ' ').indexOf(' ' + key + ' ') > -1;
      b.hidden = !vis; if (vis && !firstVis) firstVis = b;
    });
    if (!keepDoc && firstVis) pickDoc(firstVis.getAttribute('data-doc'));
  }

  form.addEventListener('click', function (e) {
    var c = e.target.closest('[data-spec-key]'); if (c) { pickSpec(c.getAttribute('data-spec-key')); return; }
    var b = e.target.closest('[data-doc]'); if (b) { pickDoc(b.getAttribute('data-doc')); return; }
    var dd = e.target.closest('[data-date]'); if (dd) { pickDate(new Date(dd.getAttribute('data-date') + 'T00:00:00')); return; }
    var sl = e.target.closest('[data-time]'); if (sl && !sl.disabled) { st.time = sl.getAttribute('data-time'); renderSlots(); renderSum(); $('[data-booked]', form).hidden = true; return; }
    if (e.target.closest('[data-mprev]')) { st.vm--; if (st.vm < 0) { st.vm = 11; st.vy--; } renderCal(); }
    if (e.target.closest('[data-mnext]')) { st.vm++; if (st.vm > 11) { st.vm = 0; st.vy++; } renderCal(); }
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'mode' || e.target.id === 'db-type') {
      if (mode() === 'video' && $('#db-type').value === 'Hearing test') {
        form.querySelector('input[name="mode"][value="clinic"]').checked = true;
        toast({ title: 'Hearing tests are in-clinic', text: 'The audiometry booth is at the clinic, so we kept this as an in-clinic visit.', type: 'warn' });
      }
      $$('.vtype label', form).forEach(function (l) { l.classList.toggle('on', $('input', l).checked); });
      renderSum();
    }
    if (e.target.id === 'db-for') renderSum();
  });

  /* ---------- confirm ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!st.date || !st.time) { toast({ title: 'Choose a date and time', text: 'Pick one of the open slots first.', type: 'warn' }); $('[data-slots]', form).scrollIntoView({ block: 'center' }); return; }
    var btn = $('[data-confirm]', form), visit = $('#db-type').value, who = $('#db-for').value;
    btn.classList.add('is-loading');
    setTimeout(function () {
      var b = T.bookings.add({
        doctor: st.doc.slug, doctorName: st.doc.name, reason: visit + (who !== 'Sangeetha Prakash' ? ' for ' + who.split(' ')[0] : ''),
        date: iso(st.date), slot: st.time, mode: mode(), fee: st.doc.fee, patient: who, note: $('#db-note').value.trim()
      });
      booked[st.doc.slug + '|' + b.date + '|' + b.slot] = 1;
      btn.classList.remove('is-loading');
      var txt = st.doc.name + ' · ' + dayLabel(st.date) + ' · ' + st.time;
      $('[data-booked-txt]', form).textContent = txt + ' · Booking ID ' + b.id;
      $('[data-booked]', form).hidden = false;
      toast({ title: 'Appointment booked', text: txt + '. We sent the details by SMS.', type: 'ok' });
      st.time = ''; renderSlots(); renderSum();
    }, T.motion ? 500 : 0);
  });

  /* ---------- init ---------- */
  var want = new URLSearchParams(location.search).get('doctor');
  var wantBtn = want && $('[data-doc="' + want + '"]', form);
  if (wantBtn) {
    var spec = wantBtn.getAttribute('data-spec-in').split(' ')[0];
    pickSpec(spec, true); pickDoc(want);
  } else pickDoc('meera');
})();
