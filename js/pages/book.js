/* book.html: doctor + calendar + slots + patient details -> booking saved to Tridya.bookings ('tridya.bookings'),
   confirmed state (board 07) + confirmation dialog (board 31). URL params: ?doctor=&date=YYYY-MM-DD&slot=HH:MM&treatment=&name=&phone=&email= */
(function () {
  'use strict';
  var T = window.Tridya, form = document.getElementById('bk-form');
  if (!T || !form) return;
  var D = T.data || window.TRIDYA || {};
  var DOCS = D.doctors || [], TXS = D.treatments || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = T.esc || function (s) { return String(s); };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DH = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var SPEC = { ear: 'Ear & hearing', nose: 'Nose & sinus', throat: 'Throat & voice', headneck: 'Head & neck', children: "Children's ENT", audiology: 'Audiology' };

  var selSpec = $('#b-spec'), selDoc = $('#b-doc'), cal = $('#bk-cal'), slotsEl = $('#bk-slots');
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var maxDay = new Date(today); maxDay.setDate(maxDay.getDate() + 60);
  var state = { doc: null, month: null, date: null, time: '', tx: null, ptype: 'New patient' };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return T.iso ? T.iso(d) : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function short(d) { return WD[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }
  function long(d) { return short(d) + ' ' + d.getFullYear(); }
  function rupee(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
  function findDoc(slug) { return DOCS.filter(function (d) { return d.slug === slug; })[0]; }
  function available(d) {
    if (!state.doc || d < today || d > maxDay) return false;
    var wd = d.getDay();
    return wd !== 0 && !!state.doc.days[wd - 1];
  }
  function sessionName(doc) { return /^Evening/.test(doc.session) ? 'Evening OPD' : /^Morning/.test(doc.session) ? 'Morning OPD' : 'OPD'; }

  /* ---------- doctor select (all six, labelled with specialty) ---------- */
  selDoc.innerHTML = DOCS.map(function (d) { return '<option value="' + d.slug + '">' + esc(d.name) + '</option>'; }).join('');

  function setDoctor(doc, keepDate) {
    state.doc = doc;
    selDoc.value = doc.slug;
    if (selSpec.value !== doc.filter) selSpec.value = doc.filter;
    var ph = $('#bk-sum-photo img');
    if (ph) { ph.src = 'images/' + doc.portrait + '-160.webp'; ph.srcset = 'images/' + doc.portrait + '-160.webp 160w, images/' + doc.portrait + '-800.webp 800w'; ph.alt = doc.name; }
    $('#bk-sum-name').textContent = doc.name;
    $('#bk-sum-role').textContent = doc.specialty;
    $('#bk-sum-room').textContent = doc.room;
    $('#bk-sum-fee').textContent = rupee(doc.fee);
    if (!keepDate || !state.date || !available(state.date)) {
      state.date = firstAvailable();
      state.time = '';
    } else if (state.time && !slotFree(state.date, state.time)) state.time = '';
    state.month = new Date((state.date || today).getFullYear(), (state.date || today).getMonth(), 1);
    renderCal(); renderSlots(); renderSummary();
  }
  function firstAvailable() {
    for (var i = 0; i < 61; i++) { var x = new Date(today); x.setDate(today.getDate() + i); if (available(x) && freeSlots(x).length) return x; }
    return null;
  }
  /* site slots + today's past times (and the next 30 minutes) marked as taken */
  function slotsAt(d) {
    var now = new Date(), list = T.slotsFor(state.doc, d);
    if (+d !== +today) return list;
    var cut = now.getHours() * 60 + now.getMinutes() + 30;
    return list.map(function (s) { var m = +s.time.slice(0, 2) * 60 + +s.time.slice(3); return m <= cut ? { time: s.time, full: true } : s; });
  }
  function freeSlots(d) { return slotsAt(d).filter(function (s) { return !s.full; }); }
  function slotFree(d, t) { return freeSlots(d).some(function (s) { return s.time === t; }); }

  /* ---------- calendar ---------- */
  function renderCal() {
    var m = state.month, y = m.getFullYear(), mo = m.getMonth();
    $('#bk-month').textContent = MONTHS[mo] + ' ' + y;
    var lead = (new Date(y, mo, 1).getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate();
    var h = DH.map(function (d) { return '<span class="dh" aria-hidden="true">' + d + '</span>'; }).join('');
    for (var i = 0; i < lead; i++) h += '<span aria-hidden="true"></span>';
    for (var n = 1; n <= days; n++) {
      var d = new Date(y, mo, n), ok = available(d) && freeSlots(d).length > 0;
      var cls = 'd' + (ok ? ' av' : ' x') + (+d === +today ? ' today' : '') + (state.date && +d === +state.date ? ' sel' : '');
      h += ok
        ? '<button type="button" class="' + cls + '" data-day="' + n + '" aria-pressed="' + (state.date && +d === +state.date) + '" aria-label="' + long(d) + '">' + n + '</button>'
        : '<span class="' + cls + '" aria-label="' + long(d) + ', unavailable">' + n + '</span>';
    }
    cal.innerHTML = h;
    var prev = $('[data-cal="-1"]'), next = $('[data-cal="1"]');
    prev.disabled = y === today.getFullYear() && mo === today.getMonth();
    next.disabled = new Date(y, mo + 1, 1) > maxDay;
  }
  cal.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-day]'); if (!b) return;
    state.date = new Date(state.month.getFullYear(), state.month.getMonth(), +b.getAttribute('data-day'));
    if (state.time && !slotFree(state.date, state.time)) state.time = '';
    renderCal(); renderSlots(); renderSummary();
    var f = $('.slot:not(.full)', slotsEl); if (f && e.detail === 0) f.focus();
  });
  $$('[data-cal]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + +b.getAttribute('data-cal'), 1);
      renderCal();
    });
  });

  /* ---------- slots ---------- */
  function renderSlots() {
    var h = $('#bk-slot-h');
    if (!state.date) { h.textContent = 'No free days in the next 8 weeks'; slotsEl.innerHTML = '<p class="bk-none">Please call +91 422 245 6780.</p>'; return; }
    h.textContent = short(state.date) + ' · ' + sessionName(state.doc);
    slotsEl.innerHTML = slotsAt(state.date).map(function (s) {
      return s.full
        ? '<button type="button" class="slot full" disabled aria-label="' + s.time + ', booked">' + s.time + '</button>'
        : '<button type="button" class="slot" aria-pressed="' + (s.time === state.time) + '">' + s.time + '</button>';
    }).join('');
  }
  slotsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.slot:not(.full)'); if (!b) return;
    state.time = b.textContent;
    $$('.slot', slotsEl).forEach(function (x) { if (!x.disabled) x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    $('#bk-slot-err').hidden = true;
    renderSummary();
  });

  /* ---------- summary + stepper ---------- */
  function setSum(id, val, empty) { var el = $(id); el.textContent = val || empty; el.classList.toggle('is-empty', !val); }
  function renderSummary() {
    setSum('#bk-sum-date', state.date ? long(state.date) : '', 'Choose a day');
    setSum('#bk-sum-time', state.time, 'Choose a time');
    stepper();
  }
  function stepper(done) {
    var s1 = !!(state.doc && state.date && state.time);
    var nm = form.elements.name.value.trim(), ph = form.elements.phone.value.replace(/\D/g, '');
    var s2 = s1 && /^[A-Za-z .'-]{2,}$/.test(nm) && /^[6-9]\d{9}$/.test(ph) && form.elements.consent.checked;
    var st = done ? [1, 1, 1] : [s1, s2, false];
    var cur = done ? -1 : !s1 ? 0 : !s2 ? 1 : 2;
    $$('.bk-stepper [data-step]').forEach(function (el, i) {
      el.classList.toggle('done', !!st[i]); el.classList.toggle('cur', i === cur);
      el.setAttribute('aria-current', i === cur ? 'step' : 'false');
      el.querySelector('i').textContent = st[i] ? '✓' : String(i + 1);
    });
  }
  form.addEventListener('input', function () { stepper(); });
  form.addEventListener('change', function () { stepper(); });

  selSpec.addEventListener('change', function () {
    var d = DOCS.filter(function (x) { return x.filter === selSpec.value; })[0];
    if (d) setDoctor(d, true);
  });
  selDoc.addEventListener('change', function () { var d = findDoc(selDoc.value); if (d) setDoctor(d, true); });
  $('[data-bk-change]').addEventListener('click', function () { selSpec.focus(); });

  /* patient type chips */
  $('#b-type').addEventListener('click', function (e) {
    var c = e.target.closest('[data-ptype]'); if (!c) return;
    state.ptype = c.getAttribute('data-ptype');
    $$('[data-ptype]').forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
  });
  var age = $('#b-age');
  age.addEventListener('input', function () { age.value = age.value.replace(/\D/g, '').slice(0, 3); if (+age.value > 110) age.value = '110'; });

  /* ---------- URL params ---------- */
  var q = new URLSearchParams(location.search);
  var doc = findDoc(q.get('doctor'));
  var tx = TXS.filter(function (t) { return t.slug === q.get('treatment'); })[0];
  if (tx) {
    state.tx = tx;
    if (!doc) doc = findDoc(tx.lead);
    $('#bk-sum-tx').textContent = tx.name; $('#bk-sum-tx-row').hidden = false;
    var r = form.elements.reason; if (!r.value) r.value = 'Consultation about ' + tx.name.toLowerCase() + '.';
  }
  state.doc = doc || findDoc('arjun') || DOCS[0];
  var pd = /^\d{4}-\d{2}-\d{2}$/.test(q.get('date') || '') ? new Date(q.get('date') + 'T00:00:00') : null;
  if (pd && available(pd)) state.date = pd;
  setDoctor(state.doc, !!state.date);
  if (q.get('slot') && state.date && slotFree(state.date, q.get('slot'))) { state.time = q.get('slot'); renderSlots(); renderSummary(); }
  ['name', 'phone', 'email'].forEach(function (k) { var v = q.get(k); if (v && form.elements[k]) form.elements[k].value = k === 'phone' ? v.replace(/\D/g, '').slice(-10) : v; });
  stepper();

  /* ---------- submit ---------- */
  document.addEventListener('submit', function (e) {
    if (e.target === form && !state.time) $('#bk-slot-err').hidden = false;
  }, true);

  var last = null;
  form.addEventListener('valid-submit', function (e) {
    e.preventDefault();
    if (!state.time || !state.date) {
      $('#bk-slot-err').hidden = false;
      $('#bk-card-time').scrollIntoView({ behavior: T.motion ? 'smooth' : 'auto', block: 'center' });
      (state.date ? $('.slot:not(.full)', slotsEl) : selDoc).focus({ preventScroll: true });
      return;
    }
    var btn = $('#bk-submit'); btn.classList.add('is-loading'); btn.disabled = true;
    setTimeout(function () {
      var d = state.doc, f = form.elements, phone = f.phone.value.replace(/\D/g, '');
      var id = 'TRD-' + String(state.date.getFullYear()).slice(2) + pad(state.date.getMonth() + 1) + '-' + String(1000 + Math.floor(Math.random() * 9000));
      last = T.bookings.add({
        id: id, doctor: d.slug, doctorName: d.name, specialty: SPEC[d.filter] || d.specialty,
        reason: f.reason.value.trim() || (state.tx ? state.tx.name : 'Consultation'), treatment: state.tx ? state.tx.slug : '',
        date: iso(state.date), slot: state.time, mode: 'clinic', fee: d.fee, room: d.room,
        patient: f.name.value.trim(), phone: phone, email: f.email.value.trim(), age: f.age.value, patientType: state.ptype, payment: f.payment.value
      });
      btn.classList.remove('is-loading'); btn.disabled = false;
      showDone(last, phone, f.email.value.trim());
    }, T.motion ? 700 : 0);
  });

  function fill(key, val) { $$('[data-bk="' + key + '"]').forEach(function (el) { el.textContent = val; }); }
  function showDone(b, phone, email) {
    var when = short(state.date) + ' · ' + state.time;
    var ph = '+91 ' + phone.slice(0, 5) + ' ' + phone.slice(5);
    fill('id', b.id); fill('doctor', b.doctorName); fill('name', b.patient); fill('spec', b.specialty);
    fill('when', when); fill('room', b.room); fill('fee', rupee(b.fee) + ' at clinic');
    fill('sent', "We've sent the details to " + ph + (email ? ' and ' + email : '') + '. Please arrive 15 minutes early for registration.');
    fill('sms', 'Confirmation sent by SMS and WhatsApp to ' + ph + '.');
    stepper(true);
    $('#bk-flow').hidden = true; $('#bk-done').hidden = false;
    var head = $('.page-head h1'), lead = $('.page-head .lead'); if (head) head.textContent = 'Booking confirmed'; if (lead) { lead.setAttribute('data-orig', lead.textContent); lead.textContent = 'Your appointment is saved. Keep your booking ID handy; you can also manage it in the patient portal.'; }
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (T.reveal) T.reveal($('#bk-done'));
    T.openDialog('dlg-booked');
    var dlg = $('#dlg-booked');
    dlg.addEventListener('close', function () { var h = $('#bk-done-h'); if (h) h.focus({ preventScroll: true }); }, { once: true });
  }

  /* add to calendar (.ics download) */
  $('[data-bk-ics]').addEventListener('click', function () {
    if (!last) return;
    var p = last.date.replace(/-/g, ''), t = last.slot.replace(':', '') + '00';
    var endM = +last.slot.slice(3) + 30, endH = +last.slot.slice(0, 2) + Math.floor(endM / 60);
    var end = pad(endH) + pad(endM % 60) + '00';
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tridya ENT Clinic//Booking//EN', 'BEGIN:VEVENT',
      'UID:' + last.id + '@tridyaent.in', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART;TZID=Asia/Kolkata:' + p + 'T' + t, 'DTEND;TZID=Asia/Kolkata:' + p + 'T' + end,
      'SUMMARY:ENT appointment with ' + last.doctorName, 'LOCATION:Tridya ENT Clinic\\, ' + last.room + '\\, 42 Race Course Road\\, Coimbatore 641018',
      'DESCRIPTION:Booking ID ' + last.id + '. Please arrive 15 minutes early and bring old reports and ID.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    try {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = 'tridya-' + last.id + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    } catch (err) { /* ignore */ }
    T.toast({ title: 'Calendar file downloaded', text: 'Open it to add the appointment to your calendar.', type: 'ok' });
  });

  /* book another */
  $('[data-bk-again]').addEventListener('click', function () {
    form.reset(); state.time = ''; state.tx = null; $('#bk-sum-tx-row').hidden = true;
    $$('[data-ptype]').forEach(function (x, i) { x.setAttribute('aria-pressed', i === 0 ? 'true' : 'false'); });
    $$('.is-valid', form).forEach(function (x) { x.classList.remove('is-valid'); });
    setDoctor(state.doc, true);
    $('#bk-done').hidden = true; $('#bk-flow').hidden = false;
    var head = $('.page-head h1'), lead = $('.page-head .lead'); if (head) head.textContent = 'Book an appointment'; if (lead && lead.getAttribute('data-orig')) lead.textContent = lead.getAttribute('data-orig');
    window.scrollTo({ top: 0, behavior: 'auto' }); selSpec.focus({ preventScroll: true });
  });
})();
