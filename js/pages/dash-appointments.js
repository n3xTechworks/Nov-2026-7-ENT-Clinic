/* Portal: Appointments. Upcoming visits come from Tridya.bookings (localStorage 'tridya.bookings',
   written by book.html / dashboard-book.html and seeded by app.js). Past/cancelled history is static demo data
   plus any visits cancelled here. Dialogs: reschedule, cancel, pay deposit (UPI), visit summary. */
(function () {
  'use strict';
  var d = document, T = window.Tridya;
  if (!T || !d.getElementById('apList')) return;
  var toast = window.toast || T.toast;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var esc = T.esc;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var list = $('#apList'), rows = $('#apRows'), view = 'upcoming', current = null;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parse(iso) { var p = String(iso || '').split('-'); var x = new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1); return isNaN(x) ? new Date() : x; }
  function nice(dt) { return DAY[dt.getDay()] + ' ' + dt.getDate() + ' ' + MON[dt.getMonth()]; }
  function longDate(dt) { return pad(dt.getDate()) + ' ' + MON[dt.getMonth()] + ' ' + dt.getFullYear(); }
  function rupee(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
  function doc(b) { return (b.doctor && T.doctor(b.doctor)) || null; }
  function docName(b) { var x = doc(b); return b.doctorName || (x && x.name) || 'Any available doctor'; }
  function where(b) {
    if (b.mode === 'video') return 'Video consult';
    var x = doc(b), room = x && x.room ? x.room.split(',').pop().trim() : 'Front desk';
    return 'In-clinic · ' + room;
  }
  function owes(b) { return b.deposit && !b.paid && !b.payAtClinic; }
  function all() { return T.bookings.all(); }
  function find(id) { return all().filter(function (b) { return b.id === id; })[0]; }
  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type || 'text/plain;charset=utf-8' }));
    var a = d.createElement('a'); a.href = url; a.download = name; d.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* ---------- upcoming cards ---------- */
  function card(b) {
    var dt = parse(b.date), pill;
    if (owes(b)) pill = '<span class="pill warn">Awaiting payment</span>';
    else if (b.payAtClinic) pill = '<span class="pill info">Pay at clinic</span>';
    else pill = '<span class="pill ok">Confirmed</span>';
    var pay = owes(b) ? '<button class="btn btn-cta" type="button" data-act="pay">' + 'Pay ' + rupee(b.deposit) + '</button>' : '';
    var join = b.mode === 'video' ? '<a class="btn btn-ghost" href="dashboard-video.html">Join room</a>' : '';
    return '<article class="card appt" data-id="' + esc(b.id) + '">' +
      '<div class="ap-date" aria-hidden="true"><small>' + MON[dt.getMonth()].toUpperCase() + '</small><b class="tnum">' + pad(dt.getDate()) + '</b><small>' + DAY[dt.getDay()].toUpperCase() + '</small></div>' +
      '<div class="ap-info"><span class="mono muted">' + esc((b.slot || '--:--') + ' · ' + where(b)) + '</span><h3>' + esc(b.reason || 'Consultation') + '</h3>' +
      '<p class="muted">' + esc(docName(b)) + ' <span class="ap-ref">· ' + esc(b.id) + '</span></p><span class="sr-only">' + esc(nice(dt)) + '</span></div>' +
      '<div class="ap-acts">' + pill + '<div class="ap-btns">' + pay + join +
      '<button class="btn btn-ghost" type="button" data-act="resched">Reschedule</button>' +
      '<button class="btn btn-ghost ap-cancel" type="button" data-act="cancel">Cancel</button></div></div></article>';
  }
  function renderUpcoming() {
    var up = all().filter(function (b) { return (b.status || 'upcoming') === 'upcoming'; })
      .sort(function (a, b) { return (a.date + a.slot).localeCompare(b.date + b.slot); });
    list.innerHTML = up.length ? up.map(card).join('') :
      '<div class="panel empty"><span class="badge-ic"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg></span></span>' +
      '<h3>No upcoming visits</h3><p>Book a clinic visit or a video consultation and it will show up here.</p><a class="btn btn-cta" href="dashboard-book.html">Book appointment</a></div>';
    return up.length;
  }

  /* ---------- cancelled bookings join the history table ---------- */
  function renderCancelledRows() {
    $$('tr[data-booking]', rows).forEach(function (r) { r.remove(); });
    var html = all().filter(function (b) { return b.status === 'cancelled'; }).map(function (b) {
      return '<tr data-status="cancelled" data-booking="' + esc(b.id) + '"><td class="tnum" data-label="Date">' + esc(longDate(parse(b.date))) + '</td><td data-label="Doctor"><b>' + esc(docName(b)) + '</b></td>' +
        '<td data-label="Visit">' + esc(b.reason || 'Consultation') + '</td><td class="muted" data-label="Outcome">' + esc(b.cancelReason || '—') + '</td>' +
        '<td data-label="Status"><span class="pill bad">Cancelled by patient</span></td><td class="act"><button class="link" type="button" data-summary>Summary</button></td></tr>';
    }).join('');
    rows.insertAdjacentHTML('afterbegin', html);
  }

  function counts(nUp) {
    var n = { upcoming: nUp, past: $$('tr[data-status="completed"]', rows).length, cancelled: $$('tr[data-status="cancelled"]', rows).length };
    Object.keys(n).forEach(function (k) { var el = $('[data-n="' + k + '"]'); if (el) el.textContent = n[k]; });
  }

  function applyView() {
    var q = ($('#apSearch').value || '').trim().toLowerCase(), shown = 0;
    list.hidden = view !== 'upcoming';
    $('#apHistT').textContent = view === 'past' ? 'Past visits' : view === 'cancelled' ? 'Cancelled visits' : 'Appointment history';
    $$('tr', rows).forEach(function (r) {
      var okView = view === 'upcoming' || r.getAttribute('data-status') === (view === 'past' ? 'completed' : 'cancelled');
      var okQ = !q || r.textContent.toLowerCase().indexOf(q) > -1;
      r.hidden = !(okView && okQ);
      if (!r.hidden) shown++;
    });
    $('#apEmpty').hidden = shown > 0;
    $('#apTable').hidden = shown === 0;
  }

  /* buttons handled here give their own feedback: keep app.js's fallback toast out of the way */
  function mark() { $$('main button').forEach(function (b) { b.setAttribute('data-no-feedback', ''); }); }
  function render() { var n = renderUpcoming(); renderCancelledRows(); counts(n); applyView(); mark(); }

  $('#apTabs').addEventListener('click', function (e) {
    var c = e.target.closest('[data-view]'); if (!c) return;
    view = c.getAttribute('data-view');
    $$('[data-view]', this).forEach(function (x) { var on = x === c; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    applyView();
  });
  $('#apSearch').addEventListener('input', applyView);
  d.addEventListener('click', function (e) {
    if (e.target.closest('[data-clear-search]')) { $('#apSearch').value = ''; applyView(); $('#apSearch').focus(); }
  });

  /* ---------- card actions ---------- */
  list.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]'); if (!btn) return;
    current = find(btn.closest('[data-id]').getAttribute('data-id'));
    if (!current) { toast({ title: 'This visit was changed in another tab', text: 'The list has been refreshed.', type: 'info' }); render(); return; }
    var act = btn.getAttribute('data-act');
    if (act === 'resched') openResched(btn);
    if (act === 'cancel') openCancel(btn);
    if (act === 'pay') openPay(btn);
  });

  /* ---------- reschedule ---------- */
  var rs = $('#dlg-resched'), rsState = {};
  function nextOpdDays(x, from, n) {
    var out = [], dt = new Date(from);
    for (var i = 1; out.length < n && i < 40; i++) {
      var t = new Date(dt); t.setDate(dt.getDate() + i);
      var wd = t.getDay();
      if (wd !== 0 && (!x || x.days[wd - 1])) out.push(t);
    }
    return out;
  }
  function slots(x, date) {
    if (x) return T.slotsFor(x, date);
    return ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'].map(function (t, i) { return { time: t, full: (i + date.getDate()) % 4 === 0 }; });
  }
  function renderRs() {
    var x = rsState.doc;
    $('[data-rs-days]', rs).innerHTML = rsState.days.map(function (dt, i) {
      var cur = i === 0, n = cur ? 0 : slots(x, dt).filter(function (s) { return !s.full; }).length;
      return '<button type="button" data-day="' + i + '" aria-pressed="' + (i === rsState.day ? 'true' : 'false') + '"' + (cur ? ' disabled' : '') + '><small>' + DAY[dt.getDay()].toUpperCase() + '</small><b>' + dt.getDate() + '</b><small>' + (cur ? 'current' : n + ' slots') + '</small></button>';
    }).join('');
    var dt = rsState.days[rsState.day], list2 = slots(x, dt);
    var sess = x && x.session ? x.session.split('·')[0].trim() : 'OPD';
    $('[data-rs-session]', rs).textContent = nice(dt) + ' · ' + sess;
    $('[data-rs-slots]', rs).innerHTML = list2.map(function (s) {
      return '<button type="button" class="slot' + (s.full ? ' full' : '') + '"' + (s.full ? ' disabled aria-label="' + s.time + ' (full)"' : '') + ' aria-pressed="' + (rsState.time === s.time ? 'true' : 'false') + '" data-time="' + s.time + '">' + s.time + '</button>';
    }).join('');
  }
  function openResched(opener) {
    var b = current, x = doc(b), dt = parse(b.date);
    rsState = { doc: x, days: [dt].concat(nextOpdDays(x, dt, 3)), day: 1, time: '' };
    var first = slots(x, rsState.days[1]).filter(function (s) { return !s.full; });
    rsState.time = first.length ? first[Math.min(3, first.length - 1)].time : '';
    $('[data-rs-sub]', rs).textContent = (b.reason || 'Consultation') + ' with ' + docName(b);
    $('[data-rs-current]', rs).textContent = nice(dt) + ' · ' + (b.slot || '') + ' · ' + docName(b);
    $('#rs-why').value = '';
    renderRs();
    T.openDialog(rs, opener);
  }
  rs.addEventListener('click', function (e) {
    var day = e.target.closest('[data-day]');
    if (day && !day.disabled) {
      rsState.day = +day.getAttribute('data-day');
      var f = slots(rsState.doc, rsState.days[rsState.day]).filter(function (s) { return !s.full; })[0];
      rsState.time = f ? f.time : ''; renderRs();
    }
    var sl = e.target.closest('[data-time]');
    if (sl && !sl.disabled) { rsState.time = sl.getAttribute('data-time'); renderRs(); }
  });
  $('[data-rs-confirm]', rs).addEventListener('click', function () {
    if (!rsState.time) { toast({ title: 'Choose a time', text: 'Pick one of the open slots first.', type: 'warn' }); return; }
    var dt = rsState.days[rsState.day];
    T.bookings.update(current.id, { date: T.iso(dt), slot: rsState.time, rescheduleReason: $('#rs-why').value || '' });
    T.closeDialog(rs);
    render();
    var c = $('[data-id="' + current.id + '"]', list); if (c) { c.classList.add('is-new'); setTimeout(function () { c.classList.remove('is-new'); }, 2400); }
    toast({ title: 'Appointment rescheduled', text: nice(dt) + ' · ' + rsState.time + ' with ' + docName(current) + '. We sent the new time by SMS.', type: 'ok' });
  });

  /* ---------- cancel ---------- */
  var cx = $('#dlg-cancel');
  function openCancel(opener) {
    var b = current;
    $('[data-cx-sub]', cx).textContent = (b.reason || 'Consultation') + ' · ' + nice(parse(b.date)) + ' · ' + (b.slot || '') + ' with ' + docName(b);
    $$('input[name="cx-why"]', cx).forEach(function (r) { r.checked = false; });
    $('[data-cx-other]', cx).hidden = true; $('#cx-note').value = '';
    $('[data-cx-err]', cx).hidden = true;
    T.openDialog(cx, opener);
  }
  cx.addEventListener('change', function (e) {
    if (e.target.name === 'cx-why') { $('[data-cx-err]', cx).hidden = true; $('[data-cx-other]', cx).hidden = e.target.value !== 'Other reason'; }
  });
  $('[data-cx-confirm]', cx).addEventListener('click', function () {
    var r = $('input[name="cx-why"]:checked', cx);
    if (!r) { $('[data-cx-err]', cx).hidden = false; $('input[name="cx-why"]', cx).focus(); return; }
    var why = r.value === 'Other reason' && $('#cx-note').value.trim() ? $('#cx-note').value.trim() : r.value;
    var card = $('[data-id="' + current.id + '"]', list);
    T.bookings.update(current.id, { status: 'cancelled', cancelReason: why });
    T.closeDialog(cx);
    function done() { render(); toast({ title: 'Appointment cancelled', text: (current.reason || 'Your visit') + ' on ' + nice(parse(current.date)) + ' is cancelled. No fee applies.', type: 'ok' }); }
    if (card && T.motion) { card.classList.add('leaving'); setTimeout(done, 250); } else done();
  });

  /* ---------- pay deposit ---------- */
  var pay = $('#dlg-pay');
  function openPay(opener) {
    var b = current;
    $('[data-pay-sub]', pay).textContent = (b.reason || 'Consultation') + ' · ' + nice(parse(b.date)) + ' · ' + (b.slot || '');
    $('[data-pay-label]', pay).textContent = (b.reason || 'Visit') + ' deposit';
    $('[data-pay-amt]', pay).textContent = rupee(b.deposit);
    $('#payLater').checked = false;
    syncPayBtn();
    T.openDialog(pay, opener);
  }
  function syncPayBtn() { $('[data-pay-confirm]', pay).textContent = $('#payLater').checked ? 'Confirm pay at clinic' : 'I have paid'; }
  $('#payLater').addEventListener('change', syncPayBtn);
  $('[data-pay-confirm]', pay).addEventListener('click', function () {
    var btn = this, later = $('#payLater').checked;
    if (later) {
      T.bookings.update(current.id, { payAtClinic: true });
      T.closeDialog(pay); render();
      toast({ title: 'Pay at the clinic', text: 'Bring ' + rupee(current.deposit) + ' on ' + nice(parse(current.date)) + '. Your slot stays booked.', type: 'info' });
      return;
    }
    btn.classList.add('is-loading'); btn.disabled = true; btn.textContent = 'Checking payment…';
    setTimeout(function () {
      btn.classList.remove('is-loading'); btn.disabled = false; syncPayBtn();
      T.bookings.update(current.id, { paid: true, paidAt: new Date().toISOString() });
      T.closeDialog(pay); render();
      toast({ title: 'Deposit received', text: rupee(current.deposit) + ' paid to tridyaent@upi. A receipt is in your email.', type: 'ok' });
    }, T.motion ? 1100 : 200);
  });

  /* ---------- visit summary ---------- */
  var sm = $('#dlg-summary'), smText = '';
  var NOTES = {
    'Hearing assessment': 'Pure-tone audiogram and tympanometry done. Mild high-frequency loss in both ears. Betahistine started; repeat audiogram in 2 weeks.',
    'Sinus follow-up': 'Endoscopy shows a well-healed cavity. Continue saline rinses and steroid spray for 6 more weeks.',
    'Day-care surgery': 'FESS with septoplasty under general anaesthesia. Discharged the same evening. Pack removed on day 7.',
    'Nasal endoscopy': 'Grade 2 polyp in the right middle meatus and a septal spur to the left. CT of the sinuses advised.',
    'Video consultation': 'Throat clearing linked to reflux. Diet changes, pantoprazole for 8 weeks and voice hygiene advice.',
    'First consultation': 'Cancelled by you before the visit. No fee was charged.',
    'Family member · Aarav': 'Ear wax removed from both ears with microsuction. Hearing normal afterwards.'
  };
  rows.addEventListener('click', function (e) {
    var b = e.target.closest('[data-summary]'); if (!b) return;
    var tr = b.closest('tr'), cells = $$('td', tr).map(function (td) { return td.textContent.trim(); });
    var visit = cells[2], pairs = [['Date', cells[0]], ['Doctor', cells[1]], ['Visit', visit], ['Outcome', cells[3]], ['Status', cells[4]]];
    $('[data-sm-title]', sm).textContent = visit;
    $('[data-sm-sub]', sm).textContent = cells[0] + ' · ' + cells[1];
    $('[data-sm-body]', sm).innerHTML = pairs.map(function (p) { return '<div><span>' + esc(p[0]) + '</span><b>' + esc(p[1]) + '</b></div>'; }).join('');
    var note = NOTES[visit] || (tr.getAttribute('data-status') === 'cancelled' ? 'Cancelled by you. No fee was charged.' : 'Summary shared by your doctor after the visit.');
    $('[data-sm-note]', sm).textContent = note;
    smText = 'Tridya ENT Clinic · Visit summary\nPatient: Sangeetha Prakash (UHID TRD-04418)\n\n' + pairs.map(function (p) { return p[0] + ': ' + p[1]; }).join('\n') + '\n\nNotes: ' + note + '\n\n42 Race Course Road, Coimbatore 641018 · +91 422 245 6780\n';
    sm.__file = 'Tridya-visit-' + cells[0].replace(/\s+/g, '-') + '.txt';
    T.openDialog(sm, b);
  });
  $('[data-sm-download]', sm).addEventListener('click', function () {
    download(sm.__file || 'Tridya-visit-summary.txt', smText);
    toast({ title: 'Summary downloaded', text: (sm.__file || 'Visit summary') + ' is in your downloads.', type: 'ok' });
  });

  /* keep in sync with bookings made in another tab */
  window.addEventListener('storage', function (e) { if (e.key === 'tridya.bookings') render(); });
  render();
  if (/[?&]booked=1/.test(location.search)) toast({ title: 'Appointment booked', text: 'Your new visit is listed under Upcoming.', type: 'ok' });
})();
