/* Home 1 + Home 2: symptom finder and OPD status */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var motion = !!(window.Tridya && window.Tridya.motion);

  /* ---- OPD open/closed (Mon–Sat 09:00–13:00, 16:30–20:00) ---- */
  var opd = $('[data-opd-status]');
  if (opd) {
    var now = new Date(), d = now.getDay(), m = now.getHours() * 60 + now.getMinutes(), txt;
    var open = d !== 0 && ((m >= 540 && m < 780) || (m >= 990 && m < 1200));
    if (open) txt = 'OPD open now';
    else if (d === 0 || (d === 6 && m >= 1200)) txt = 'OPD opens Mon 09:00';
    else if (m < 540) txt = 'OPD opens 09:00';
    else if (m < 990) txt = 'OPD reopens 16:30';
    else txt = 'OPD opens tomorrow 09:00';
    opd.classList.toggle('is-closed', !open);
    var t = $('[data-opd-text]', opd); if (t) t.textContent = txt;
  }

  /* ---- symptom finder ---- */
  var box = $('.finder-band');
  if (!box) return;
  var CLINICS = {
    ear:   { clinic: 'Hearing & Balance Clinic', doc: 'meera', spec: 'Otology' },
    nose:  { clinic: 'Sinus & Allergy Clinic', doc: 'arjun', spec: 'Rhinology' },
    sleep: { clinic: 'Sleep & Snoring Clinic', doc: 'arjun', spec: 'Rhinology & sleep' },
    voice: { clinic: 'Voice & Swallowing Clinic', doc: 'kavitha', spec: 'Laryngology' },
    neck:  { clinic: 'Head & Neck Clinic', doc: 'farhana', spec: 'Head & neck surgery' }
  };
  var FALLBACK = { meera: ['Dr. Meera Raghavan', 'Today 17:10'], arjun: ['Dr. Arjun Venkatesh', 'Sat 09:30'],
    kavitha: ['Dr. Kavitha Sundaram', 'Mon 10:15'], farhana: ['Dr. Farhana Iqbal', 'Sat 16:30'] };
  var chips = $$('.finder-chips .chip', box), panel = $('[data-match]', box), order = [];
  if (!panel) return;
  chips.forEach(function (c) { if (c.getAttribute('aria-pressed') === 'true') order.push(c); });

  function docInfo(slug) {
    var d = null;
    try { d = window.Tridya && window.Tridya.doctor ? window.Tridya.doctor(slug) : null; } catch (e) { d = null; }
    return { name: (d && d.name) || FALLBACK[slug][0], slot: (d && d.next_slot) || FALLBACK[slug][1] };
  }
  /* clinic with the most selected symptoms wins; ties go to the most recently picked */
  function best() {
    var score = {}, top = null, max = 0;
    order.forEach(function (c, i) { var k = c.getAttribute('data-sym'); score[k] = (score[k] || 0) + 1 + i * 0.01; });
    Object.keys(score).forEach(function (k) { if (score[k] > max) { max = score[k]; top = k; } });
    return top;
  }
  var h = $('[data-m-clinic]', panel), doc = $('[data-m-doc]', panel), spec = $('[data-m-spec]', panel),
      slot = $('[data-m-slot]', panel), book = $('[data-m-book]', panel);
  var bookLabel = book.firstChild;
  function paint() {
    var key = best();
    if (!key) {
      h.textContent = 'Pick a symptom to see your clinic';
      doc.parentNode.hidden = true; slot.parentNode.hidden = true;
      bookLabel.nodeValue = 'Browse all doctors'; book.setAttribute('href', 'doctors.html');
      return;
    }
    var c = CLINICS[key], info = docInfo(c.doc);
    doc.parentNode.hidden = false; slot.parentNode.hidden = false;
    h.textContent = c.clinic;
    doc.textContent = info.name; doc.setAttribute('href', 'doctor-' + c.doc + '.html');
    spec.textContent = c.spec;
    slot.textContent = info.slot;
    bookLabel.nodeValue = 'See all slots'; book.setAttribute('href', 'book.html?doctor=' + c.doc);
  }
  var timer;
  function update() {
    if (!motion) { paint(); return; }
    panel.classList.add('swap');
    clearTimeout(timer);
    timer = setTimeout(function () { paint(); panel.classList.remove('swap'); }, 200);
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var on = c.getAttribute('aria-pressed') !== 'true';
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
      var i = order.indexOf(c); if (i > -1) order.splice(i, 1);
      if (on) order.push(c);
      update();
    });
  });
  paint();
})();
