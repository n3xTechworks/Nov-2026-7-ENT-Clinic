/* Portal: Prescriptions. List -> detail switching (hash deep links), preview dialog (d3_37),
   print (window.print of the letter only), download (generated HTML file), share (Web Share API or copy). */
(function () {
  'use strict';
  var d = document, T = window.Tridya;
  var listEl = d.getElementById('rxList');
  if (!T || !listEl) return;
  var toast = window.toast || T.toast, esc = T.esc;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var PATIENT = { name: 'Sangeetha Prakash', uhid: 'TRD-04418', age: '38 / F' };
  var MARK = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#0A6B66"/><g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M17.5 15.2a6 6 0 0 1 0 9.6"/><path d="M20.8 11.4a11 11 0 0 1 0 17.2"/><path d="M24.2 7.8a16 16 0 0 1 0 24.4"/></g><circle cx="12.6" cy="20" r="2.6" fill="#fff"/></svg>';

  var RX = [
    { id: 'RX-2610-118', date: '26 Oct 2026', label: 'Tinnitus · hearing loss', title: 'Tinnitus with mild hearing loss', diag: 'Tinnitus, mild SNHL',
      doc: 'Dr. Meera Raghavan', quals: 'MS (ENT), DNB', reg: 'TNMC 74219',
      meds: [['Betahistine 16 mg', 'Tablet', [1, 0, 1], 'After food', '30 days'], ['Fluticasone furoate 27.5 mcg', 'Nasal spray', [1, 0, 0], '2 puffs each nostril', '30 days'], ['Ginkgo biloba + vitamin B-complex', 'Capsule', [0, 0, 1], 'After dinner', '15 days']],
      advice: ['Avoid loud environments and earphones above 60% volume.', 'Use a fan or soft background sound at night.', 'Limit caffeine after 4 pm.'],
      fu: 'Repeat audiogram and review in 2 weeks.', fuWhen: 'Booked · Thu 12 Nov · 17:10', fuLink: ['View appointment', 'dashboard-appointments.html'], review: 'Thu 12 Nov 2026, 17:10' },
    { id: 'RX-2609-064', date: '12 Sep 2026', label: 'Post-operative care', title: 'Post-operative sinus care', diag: 'Post-FESS, healing well',
      doc: 'Dr. Arjun Venkatesh', quals: 'MS (ENT), FRCS (Edin.)', reg: 'TNMC 68102',
      meds: [['Saline nasal rinse', 'Rinse kit, 240 ml', [1, 0, 1], 'Rinse each side slowly', '30 days'], ['Mometasone furoate 50 mcg', 'Nasal spray', [1, 0, 0], '2 sprays each nostril', '60 days'], ['Montelukast 10 mg', 'Tablet', [0, 0, 1], 'After dinner', '30 days']],
      advice: ['Rinse before the steroid spray, not after.', 'Avoid dusty places and smoke for 4 weeks.', 'Steam inhalation once a day if blocked.'],
      fu: 'Endoscopic review of the sinus cavity in 6 weeks.', fuWhen: 'Due · late Oct 2026', fuLink: ['Book a review', 'dashboard-book.html'], review: 'late October 2026' },
    { id: 'RX-2608-201', date: '20 Aug 2026', label: 'After FESS surgery', title: 'After FESS and septoplasty', diag: 'CRS with polyps, DNS',
      doc: 'Dr. Arjun Venkatesh', quals: 'MS (ENT), FRCS (Edin.)', reg: 'TNMC 68102',
      meds: [['Amoxicillin + clavulanate 625 mg', 'Tablet', [1, 0, 1], 'After food', '7 days'], ['Paracetamol 650 mg', 'Tablet', [1, 1, 1], 'Only if in pain', '5 days'], ['Pantoprazole 40 mg', 'Tablet', [1, 0, 0], 'Before breakfast', '7 days'], ['Saline nasal spray', 'Nasal spray', [1, 1, 1], '2 sprays each nostril', '14 days']],
      advice: ['Do not blow your nose for 7 days.', 'Sleep with your head raised on two pillows.', 'No heavy lifting or bending for a week.'],
      fu: 'Pack removal and cavity cleaning on day 7.', fuWhen: 'Done · Thu 27 Aug 2026', fuLink: ['View visit history', 'dashboard-appointments.html'], review: 'Thu 27 Aug 2026' },
    { id: 'RX-2607-033', date: '18 Jul 2026', label: 'Laryngopharyngeal reflux', title: 'Laryngopharyngeal reflux', diag: 'LPR, throat clearing',
      doc: 'Dr. Kavitha Sundaram', quals: 'MS (ENT), Fellowship in Laryngology', reg: 'TNMC 81377',
      meds: [['Pantoprazole 40 mg', 'Tablet', [1, 0, 0], '30 min before breakfast', '56 days'], ['Sodium alginate suspension', 'Oral liquid, 10 ml', [1, 1, 1], 'After meals', '30 days']],
      advice: ['Finish dinner 3 hours before bed.', 'Raise the head end of the bed by 6 inches.', 'Cut down on spicy food, tea and coffee.', 'Sip water instead of clearing your throat.'],
      fu: 'Video review in 8 weeks to check symptoms.', fuWhen: 'Due · mid Sep 2026', fuLink: ['Book a video consult', 'dashboard-book.html'], review: 'mid September 2026' }
  ];
  var cur = RX[0];

  function doseHtml(m) { return '<span class="dose" aria-label="' + ['Morning', 'Afternoon', 'Night'].filter(function (x, i) { return m[i]; }).join(', ') + '">' + ['M', 'A', 'N'].map(function (k, i) { return '<i class="' + (m[i] ? 'on' : '') + '" aria-hidden="true">' + k + '</i>'; }).join('') + '</span>'; }
  function renderList() {
    listEl.innerHTML = RX.map(function (r) {
      return '<a href="dashboard-prescriptions.html?rx=' + r.id + '" data-id="' + r.id + '"' + (r === cur ? ' class="on" aria-current="true"' : '') + '><span class="mono muted">' + r.id + '</span><b>' + esc(r.label) + '</b><small>' + esc(r.date + ' · ' + r.doc) + '</small></a>';
    }).join('');
    var c = $('[data-rx-count]'); if (c) c.textContent = RX.length;
  }
  function setT(k, v) { var el = $('[data-rx="' + k + '"]'); if (el) el.textContent = v; }
  function renderDetail(anim) {
    var r = cur;
    setT('meta', r.id + ' · ' + r.date); setT('title', r.title); setT('doc', r.doc + ' · ' + r.quals + ' · Reg. ' + r.reg);
    $('[data-rx="meds"]').innerHTML = r.meds.map(function (m) {
      return '<tr><td><b>' + esc(m[0]) + '</b><small>' + esc(m[1]) + '</small></td><td data-label="Schedule">' + doseHtml(m[2]) + '</td><td data-label="Instructions">' + esc(m[3]) + '</td><td class="tnum" data-label="Duration">' + esc(m[4]) + '</td></tr>';
    }).join('');
    $('[data-rx="advice"]').innerHTML = r.advice.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('');
    setT('fu', r.fu); setT('fu-when', r.fuWhen);
    var l = $('[data-rx="fu-link"]'); l.firstChild.nodeValue = r.fuLink[0]; l.setAttribute('href', r.fuLink[1]);
    var main = $('#rxDetail');
    if (anim && T.motion) { main.classList.remove('swap'); void main.offsetWidth; main.classList.add('swap'); }
  }
  function select(id, anim) {
    var r = RX.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    cur = r; renderList(); renderDetail(anim);
  }
  listEl.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-id]'); if (!a) return;
    e.preventDefault();
    select(a.getAttribute('data-id'), true);
    try { history.replaceState(null, '', '?rx=' + cur.id); } catch (err) { /* file:// */ }
    if (window.innerWidth <= 900) $('#rxDetail').scrollIntoView({ behavior: T.motion ? 'smooth' : 'auto', block: 'start' });
  });

  /* ---------- letter (preview, print, download) ---------- */
  function letterHtml(r) {
    return '<div class="lh"><div class="lh-logo"><span class="mark">' + MARK + '</span><div><div class="lh-name">Tridya ENT Clinic</div><div class="lh-sub">42 Race Course Road, Coimbatore 641018 · +91 422 245 6780</div></div></div>' +
      '<div class="lh-ref">' + r.id + '<br>' + r.date + '</div></div>' +
      '<div class="pt"><div><span>Patient</span><br><b>' + PATIENT.name + '</b></div><div><span>UHID</span><br><b>' + PATIENT.uhid + '</b></div><div><span>Age / Sex</span><br><b>' + PATIENT.age + '</b></div><div><span>Diagnosis</span><br><b>' + esc(r.diag) + '</b></div></div>' +
      '<div class="rx" aria-hidden="true">℞</div>' +
      '<table><thead><tr><th>Medicine</th><th>Dose (M-A-N)</th><th>Instructions</th><th>Duration</th></tr></thead><tbody>' +
      r.meds.map(function (m) { return '<tr><td><b>' + esc(m[0]) + '</b><br>' + esc(m[1]) + '</td><td data-label="Dose">' + m[2].join(' - ') + '</td><td data-label="How">' + esc(m[3]) + '</td><td data-label="For">' + esc(m[4]) + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      '<div class="sign"><div class="review">Review: ' + esc(r.review) + '</div><div class="sig"><div class="line"></div><b>' + esc(r.doc) + '</b><br><span>' + esc(r.quals) + ' · ' + esc(r.reg) + '</span></div></div>';
  }
  var dlg = $('#dlg-rx');
  function openPreview(opener) {
    $('[data-rxp="title"]', dlg).textContent = 'Prescription · ' + cur.id;
    $('[data-rxp="sub"]', dlg).textContent = cur.doc + ' · ' + cur.date;
    $('#rxLetter').innerHTML = letterHtml(cur);
    T.openDialog(dlg, opener);
  }
  d.addEventListener('click', function (e) {
    if (e.target.closest('[data-rx-preview]')) openPreview(e.target.closest('[data-rx-preview]'));
    if (e.target.closest('[data-rx-share]')) share();
    if (e.target.closest('[data-rx-print]')) printRx();
    if (e.target.closest('[data-rx-download]')) downloadRx();
  });

  function plain(r) {
    return 'Tridya ENT Clinic · Prescription ' + r.id + ' · ' + r.date + '\n' + r.title + '\n' + r.doc + ' (' + r.quals + ')\n\n' +
      r.meds.map(function (m) { return '- ' + m[0] + ' (' + m[1] + '): ' + m[2].join('-') + ', ' + m[3] + ', ' + m[4]; }).join('\n') + '\n\nFollow-up: ' + r.fu;
  }
  function share() {
    var text = plain(cur);
    if (navigator.share && !navigator.webdriver) {
      navigator.share({ title: 'Prescription ' + cur.id, text: text }).then(function () { toast({ title: 'Prescription shared', type: 'ok' }); }).catch(function () { /* user closed the sheet */ });
      return;
    }
    var done = function () { toast({ title: 'Prescription copied', text: cur.id + ' is on your clipboard. Paste it into WhatsApp or email.', type: 'ok' }); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
  }
  function printRx() {
    var box = $('#rxPrint');
    box.innerHTML = '<div class="letter">' + letterHtml(cur) + '</div>';
    if (dlg.open) T.closeDialog(dlg);
    toast({ title: 'Opening print', text: 'Choose your printer, or "Save as PDF".', type: 'info' });
    setTimeout(function () { window.print(); }, 250);
  }
  function downloadRx() {
    var css = 'body{font:14px/1.5 system-ui,sans-serif;color:#14302F;max-width:760px;margin:32px auto;padding:0 24px}.lh{display:flex;justify-content:space-between;border-bottom:2px solid #0A6B66;padding-bottom:14px;margin-bottom:18px}.lh-logo{display:flex;gap:12px;align-items:center}.mark svg{width:40px;height:40px}.lh-name{font-weight:600;font-size:18px}.lh-sub,.lh-ref,.pt span,.sig span{color:#5A6F6D;font-size:12px}.lh-ref{text-align:right}.pt{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font-size:13px}.rx{font-size:30px;color:#0A6B66;margin:12px 0}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:11px;color:#5A6F6D;border-bottom:1px solid #DDE7E5;padding:8px 6px}td{padding:9px 6px;border-bottom:1px solid #EEF4F3}.sign{display:flex;justify-content:space-between;align-items:flex-end;padding-top:28px}.line{width:180px;border-bottom:1px solid #9FB3B0;height:36px}.sig{text-align:center;font-size:12.5px}';
    var html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Prescription ' + cur.id + ' · Tridya ENT Clinic</title><style>' + css + '</style></head><body>' + letterHtml(cur) + '</body></html>';
    var url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    var a = d.createElement('a'); a.href = url; a.download = 'Tridya-' + cur.id + '.html'; d.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast({ title: 'Prescription downloaded', text: 'Tridya-' + cur.id + '.html is in your downloads. Open it to print or save as PDF.', type: 'ok' });
  }

  var start = ((location.search.match(/[?&]rx=([A-Z0-9-]+)/) || [])[1]) || (location.hash || '').slice(1);
  if (RX.some(function (r) { return r.id === start; })) cur = RX.filter(function (r) { return r.id === start; })[0];
  /* buttons handled here give their own feedback: keep app.js's fallback toast out of the way */
  function mark() { $$('main button').forEach(function (b) { b.setAttribute('data-no-feedback', ''); }); }
  renderList(); renderDetail(false); mark();
  if (/[?&]preview=1/.test(location.search)) openPreview();
})();
