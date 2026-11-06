/* Portal overview: live date + greeting, next appointment from Tridya.bookings, add to calendar (.ics),
   ?state=new (empty states, d3_23), loading skeleton (d3_24, ~600 ms; skipped under webdriver; ?state=loading keeps it). */
(function () {
  'use strict';
  var d = document, T = window.Tridya || {};
  var toast = window.toast || function () {};
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var state = (new URLSearchParams(location.search).get('state') || '').toLowerCase();
  var full = $('#ovFull'), empty = $('#ovEmpty'), skel = $('#ovSkel');
  if (!full) return;

  $$('main button:not([data-toast])').forEach(function (b) { b.setAttribute('data-no-feedback', ''); });
  /* log out returns to the website */
  $$('[data-logout]').forEach(function (a) { a.setAttribute('href', 'index.html'); });

  /* date + greeting */
  var now = new Date();
  var long = now.toLocaleDateString('en-GB', { weekday: 'long' }) + ', ' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  $$('[data-today]').forEach(function (el) { el.textContent = long; });
  var h = now.getHours();
  var greet = $('[data-greet]');
  if (greet) greet.textContent = (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', Sangeetha';

  /* next appointment from the bookings store */
  var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var next = null;
  try {
    var today = T.iso ? T.iso(now) : now.toISOString().slice(0, 10);
    var up = (T.bookings ? T.bookings.all() : []).filter(function (b) { return b.status !== 'cancelled' && b.status !== 'completed' && b.date >= today; });
    up.sort(function (a, b) { return (a.date + a.slot).localeCompare(b.date + b.slot); });
    next = up[0] || null;
    var kpi = $('[data-kpi-up]'); if (kpi) kpi.textContent = up.length;
  } catch (e) { /* keep design copy */ }

  var nx = $('#ovNext');
  if (next && nx) {
    var dt = new Date(next.date + 'T00:00:00');
    var doc = T.doctor ? T.doctor(next.doctor) : null;
    var hm = (next.slot || '17:10').split(':').map(Number), arrive = new Date(dt); arrive.setHours(hm[0], hm[1] - 15);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    $('[data-n-mon]', nx).textContent = MON[dt.getMonth()];
    $('[data-n-day]', nx).textContent = dt.getDate();
    $('[data-n-wd]', nx).textContent = WD[dt.getDay()];
    $('[data-n-k]', nx).textContent = 'NEXT APPOINTMENT · ' + next.slot + (next.mode === 'video' ? ' · VIDEO' : '');
    $('[data-n-title]', nx).textContent = (next.reason || 'Consultation') + ' with ' + (next.doctorName || (doc && doc.name) || 'your doctor');
    $('[data-n-where]', nx).textContent = next.mode === 'video'
      ? 'Video consultation · Join from the portal 5 minutes early'
      : (doc ? doc.clinic + ' · ' + doc.room : 'Tridya ENT Clinic') + ' · Arrive by ' + pad(arrive.getHours()) + ':' + pad(arrive.getMinutes());
  } else if (nx && T.bookings && T.bookings.all().length) {
    $('[data-n-k]', nx).textContent = 'NO UPCOMING VISITS';
    $('[data-n-title]', nx).textContent = 'You have no appointments booked';
    $('[data-n-where]', nx).textContent = 'Book a visit with any of our six specialists in under a minute.';
    $('[data-add-cal]', nx).hidden = true;
  }

  /* add to calendar: downloads an .ics file */
  var cal = $('[data-add-cal]');
  if (cal) cal.addEventListener('click', function () {
    var b = next || { date: '2026-11-12', slot: '17:10', reason: 'Follow-up hearing test', doctorName: 'Dr. Meera Raghavan' };
    var st = b.date.replace(/-/g, '') + 'T' + b.slot.replace(':', '') + '00';
    var e = new Date(b.date + 'T' + b.slot + ':00'); e.setMinutes(e.getMinutes() + 20);
    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var en = b.date.replace(/-/g, '') + 'T' + pad2(e.getHours()) + pad2(e.getMinutes()) + '00';
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tridya ENT Clinic//Patient portal//EN', 'BEGIN:VEVENT',
      'UID:' + (b.id || 'TRD') + '@tridyaent.in', 'DTSTART;TZID=Asia/Kolkata:' + st, 'DTEND;TZID=Asia/Kolkata:' + en,
      'SUMMARY:' + (b.reason || 'Consultation') + ' with ' + b.doctorName, 'LOCATION:Tridya ENT Clinic, 42 Race Course Road, Coimbatore 641018',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    try {
      var a = d.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = 'tridya-appointment.ics';
      if (!navigator.webdriver) a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    } catch (err) { /* ignore */ }
    cal.innerHTML = cal.innerHTML.replace('Add to calendar', 'Added to calendar');
    toast({ title: 'Added to your calendar', text: (b.reason || 'Appointment') + ' · ' + b.slot + '. Open the downloaded file to save it.', type: 'ok' });
  });

  /* new patient (empty states) */
  var isNew = state === 'new';
  if (isNew) {
    full.hidden = true; empty.hidden = false;
    var me = $('.me');
    if (me) {
      $('.avatar', me).textContent = 'KR';
      var b1 = $('b', me), s1 = $('small', me);
      if (b1) b1.textContent = 'Karthik Raj';
      if (s1) s1.textContent = 'UHID TRD-05120';
    }
    var dot = $('[data-ntf-dot]'); if (dot) dot.hidden = true;
  }

  /* loading skeleton */
  var target = isNew ? empty : full;
  function showSkel(ms) {
    skel.hidden = false; target.hidden = true;
    if (ms) setTimeout(function () {
      skel.hidden = true; target.hidden = false;
      if (T.reveal) T.reveal(target);
    }, ms);
  }
  if (state === 'loading') showSkel(0);
  else if (T.motion) showSkel(600);
})();
