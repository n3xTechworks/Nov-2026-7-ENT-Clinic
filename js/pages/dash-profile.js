/* Portal: Profile & family. Personal details form (validated, saved to localStorage 'tridya.profile'),
   notification switches ('tridya.prefs'), family members ('tridya.family') with add (d3_40) / manage / remove,
   change password, download records, record access. */
(function () {
  'use strict';
  var d = document, T = window.Tridya;
  var famEl = d.getElementById('pfFamily');
  if (!T || !famEl) return;
  var toast = window.toast || T.toast, esc = T.esc;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function get(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayIso() { var x = new Date(); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
  function age(iso) {
    var p = String(iso).split('-'), now = new Date(), a = now.getFullYear() - +p[0];
    if (now.getMonth() + 1 < +p[1] || (now.getMonth() + 1 === +p[1] && now.getDate() < +p[2])) a--;
    return Math.max(0, a);
  }
  function fmtDob(iso) { var p = String(iso).split('-'); return pad(+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
  function initials(n) { return String(n).trim().split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase(); }
  function setErr(el, msg) {
    var id = (el.id || el.name) + '-error', m = d.getElementById(id);
    if (!m) { m = d.createElement('p'); m.className = 'msg err'; m.id = id; (el.closest('.field') || el.parentElement).appendChild(m); }
    m.textContent = msg; el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) { el.setAttribute('aria-describedby', id); el.focus(); }
    return !msg;
  }
  function checkDob(el) {
    var v = el.value;
    if (v && v > todayIso()) return setErr(el, 'Date of birth cannot be in the future.');
    if (v && v < '1900-01-01') return setErr(el, 'Please check the year.');
    return true;
  }
  /* buttons handled here give their own feedback: keep app.js's fallback toast out of the way */
  function mark() { $$('main button').forEach(function (b) { b.setAttribute('data-no-feedback', ''); }); }

  /* ---------- personal details ---------- */
  var pf = $('#pfForm'), saved = get('tridya.profile', null);
  function syncHeader(name) {
    var b = $('.me b'), av = $('.me .avatar');
    if (b) b.textContent = name; if (av) av.textContent = initials(name);
  }
  if (saved) {
    ['name', 'phone', 'email', 'dob', 'blood', 'allergies'].forEach(function (k) { if (saved[k] != null && pf.elements[k]) pf.elements[k].value = saved[k]; });
    syncHeader(saved.name);
  }
  var dobEl = $('#pf-d'); dobEl.max = todayIso();
  pf.addEventListener('valid-submit', function (e) {
    e.preventDefault();
    if (!checkDob(dobEl)) return;
    var v = {}; ['name', 'phone', 'email', 'dob', 'blood', 'allergies'].forEach(function (k) { v[k] = pf.elements[k].value.trim(); });
    if (!v.allergies) { v.allergies = 'None reported'; pf.elements.allergies.value = v.allergies; }
    put('tridya.profile', v);
    syncHeader(v.name);
    var s = $('[data-pf-saved]'); s.hidden = false;
    var t = new Date(); s.textContent = 'Saved at ' + pad(t.getHours()) + ':' + pad(t.getMinutes());
    toast({ title: 'Profile saved', text: 'Your details are updated for future visits.', type: 'ok' });
  });

  /* ---------- notification switches ---------- */
  var prefs = get('tridya.prefs', {});
  $$('[data-pref]').forEach(function (s) { var k = s.getAttribute('data-pref'); if (k in prefs) s.setAttribute('aria-checked', prefs[k] ? 'true' : 'false'); });
  var LABEL = { reminders: 'Appointment reminders', medicine: 'Medicine reminders', reports: 'New report alerts', newsletter: 'Health notes newsletter' };
  d.addEventListener('click', function (e) {
    var s = e.target.closest('[data-pref]');
    if (s) {
      var k = s.getAttribute('data-pref'), on = s.getAttribute('aria-checked') === 'true'; /* site.js has already toggled it */
      prefs[k] = on; put('tridya.prefs', prefs);
      toast({ title: LABEL[k] + (on ? ' on' : ' off'), text: on ? 'You will get these from now on.' : 'You can turn this back on at any time.', type: on ? 'ok' : 'info', timeout: 3000 });
    }
    var fam = e.target.closest('[data-fam-access]');
    if (fam) {
      var m = byId(fam.getAttribute('data-fam-access')); if (!m) return;
      m.access = fam.getAttribute('aria-checked') === 'true'; saveFam(); renderAccessSum();
      toast({ title: m.name + (m.access ? ' can now see your records' : ' can no longer see your records'), type: m.access ? 'ok' : 'info', timeout: 3000 });
    }
    if (e.target.closest('[data-locked]')) toast({ title: 'Always on', text: 'Your treating doctors need your records to care for you.', type: 'info', timeout: 3000 });
  });

  /* ---------- family ---------- */
  var DEFAULT = [
    { id: 'aarav', name: 'Aarav Prakash', relation: 'Son', dob: '2017-02-10', sex: 'Male', note: '2 visits · Paediatric ENT', access: true },
    { id: 'raghu', name: 'Raghu Prakash', relation: 'Father', dob: '1959-06-21', sex: 'Male', note: 'Hearing aid user · next check Jan 2027', access: true }
  ];
  var family = get('tridya.family', null) || DEFAULT.slice();
  function saveFam() { put('tridya.family', family); }
  function byId(id) { return family.filter(function (m) { return m.id === id; })[0]; }
  function sub(m) { return m.relation + ' · ' + age(m.dob) + (age(m.dob) === 1 ? ' year' : ' years') + (m.note ? ' · ' + m.note : ''); }
  function renderFamily(freshId) {
    famEl.innerHTML = family.length ? family.map(function (m) {
      return '<div class="li pf-member' + (m.id === freshId ? ' is-new' : '') + '"><span class="avatar" aria-hidden="true">' + esc(initials(m.name)) + '</span><div><b>' + esc(m.name) + '</b><small>' + esc(sub(m)) + '</small></div>' +
        '<button class="link" type="button" data-manage="' + esc(m.id) + '" aria-label="Manage ' + esc(m.name) + '">Manage</button></div>';
    }).join('') : '<div class="empty"><h3>No family members yet</h3><p>Add a parent, child or partner to book and manage their visits.</p></div>';
    renderAccessSum(); mark();
  }
  function renderAccessSum() {
    var n = family.filter(function (m) { return m.access; }).length;
    $('[data-access-sum]').textContent = 'Your doctors and ' + (n ? n + ' family member' + (n === 1 ? '' : 's') : 'no family members');
    $('[data-access-family]').innerHTML = family.map(function (m) {
      return '<div class="row-set"><div><b>' + esc(m.name) + '</b><p>' + esc(m.relation) + ' · can view reports and prescriptions</p></div><button class="switch" type="button" role="switch" aria-checked="' + (m.access ? 'true' : 'false') + '" aria-label="Let ' + esc(m.name) + ' see my records" data-fam-access="' + esc(m.id) + '"></button></div>';
    }).join('');
  }

  var mm = $('#dlg-member'), mmId = null;
  famEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-manage]'); if (!b) return;
    var m = byId(b.getAttribute('data-manage')); if (!m) return;
    mmId = m.id;
    $('[data-mm-av]', mm).textContent = initials(m.name);
    $('[data-mm-name]', mm).textContent = m.name;
    $('[data-mm-sub]', mm).textContent = m.relation + ' · ' + age(m.dob) + ' years';
    $('[data-mm-body]', mm).innerHTML = [['Date of birth', fmtDob(m.dob)], ['Sex', m.sex || '—'], ['Mobile', m.phone ? '+91 ' + m.phone : 'Uses your number'], ['Email', m.email || 'Uses your email'], ['Record access', m.access ? 'Can see your records' : 'No access']]
      .map(function (p) { return '<div><span>' + p[0] + '</span><b>' + esc(p[1]) + '</b></div>'; }).join('');
    var rm = $('[data-mm-remove]', mm); rm.removeAttribute('data-armed'); rm.lastChild.nodeValue = 'Remove';
    $('[data-mm-book]', mm).setAttribute('href', 'dashboard-book.html?for=' + encodeURIComponent(m.name));
    T.openDialog(mm, b);
  });
  $('[data-mm-remove]', mm).addEventListener('click', function () {
    if (!this.hasAttribute('data-armed')) { this.setAttribute('data-armed', ''); this.lastChild.nodeValue = 'Tap again to remove'; return; }
    var m = byId(mmId); family = family.filter(function (x) { return x.id !== mmId; }); saveFam();
    T.closeDialog(mm); renderFamily();
    toast({ title: (m ? m.name : 'Member') + ' removed', text: 'Their past visits stay in the clinic records.', type: 'info' });
  });

  var af = $('#afForm'), afDob = $('#af-d'); afDob.max = todayIso();
  af.addEventListener('valid-submit', function (e) {
    e.preventDefault();
    if (!afDob.value) { setErr(afDob, 'Please fill in this field.'); return; }
    if (!checkDob(afDob)) return;
    var f = af.elements, m = {
      id: 'm' + Date.now().toString(36), name: f.name.value.trim().replace(/\s+/g, ' '), relation: f.relation.value, dob: afDob.value,
      sex: (af.querySelector('input[name="sex"]:checked') || {}).value || '', phone: f.phone.value.trim(), email: f.email.value.trim().toLowerCase(), access: true, note: 'Added just now'
    };
    family.push(m); saveFam(); renderFamily(m.id);
    T.closeDialog($('#dlg-family'));
    toast({ title: 'Family member added', text: m.name + ' (' + m.relation.toLowerCase() + ') can now be booked from your account.', type: 'ok' });
  });
  $('#dlg-family').addEventListener('close', function () {
    af.reset();
    $$('[aria-invalid]', af).forEach(function (x) { x.removeAttribute('aria-invalid'); x.classList.remove('is-valid'); });
    $$('.msg.err', af).forEach(function (x) { x.textContent = ''; });
  });

  /* ---------- password ---------- */
  var pw = $('#pwForm');
  pw.addEventListener('valid-submit', function (e) {
    e.preventDefault();
    if ($('#pw-old').value === $('#pw-new').value) { setErr($('#pw-new'), 'Choose a password different from your current one.'); return; }
    T.closeDialog($('#dlg-password'));
    $('[data-pw-when]').textContent = 'Last changed just now';
    toast({ title: 'Password updated', text: 'Use your new password the next time you log in.', type: 'ok' });
  });
  $('#dlg-password').addEventListener('close', function () {
    pw.reset(); $$('[aria-invalid]', pw).forEach(function (x) { x.removeAttribute('aria-invalid'); x.classList.remove('is-valid'); });
    $$('.msg.err', pw).forEach(function (x) { x.textContent = ''; });
  });

  /* ---------- download records ---------- */
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-records]'); if (!b) return;
    b.disabled = true; var small = $('small', b), old = small.textContent; small.textContent = 'Preparing your file…';
    setTimeout(function () {
      var p = get('tridya.profile', null) || { name: 'Sangeetha Prakash', phone: '9894056721', email: 'sangeetha.p@gmail.com' };
      var text = 'Tridya ENT Clinic · Health records\nPatient: ' + p.name + ' (UHID TRD-04418)\nMobile: +91 ' + p.phone + ' · ' + p.email + '\n\n' +
        'PRESCRIPTIONS\n- RX-2610-118 · 26 Oct 2026 · Tinnitus with mild hearing loss · Dr. Meera Raghavan\n- RX-2609-064 · 12 Sep 2026 · Post-operative sinus care · Dr. Arjun Venkatesh\n- RX-2608-201 · 20 Aug 2026 · After FESS and septoplasty · Dr. Arjun Venkatesh\n- RX-2607-033 · 18 Jul 2026 · Laryngopharyngeal reflux · Dr. Kavitha Sundaram\n\n' +
        'REPORTS\n- Pure-tone audiogram · 26 Oct 2026\n- Tympanometry · 26 Oct 2026\n- Histopathology, nasal polyp · 27 Aug 2026\n- Nasal endoscopy · 03 Aug 2026\n- CT paranasal sinuses · 01 Aug 2026\n- Complete blood count · 01 Aug 2026\n- Allergy skin-prick panel · 18 Jul 2026 (pending review)\n';
      var url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      var a = d.createElement('a'); a.href = url; a.download = 'Tridya-records-TRD-04418.txt'; d.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      b.disabled = false; small.textContent = old;
      toast({ title: 'Records downloaded', text: 'Tridya-records-TRD-04418.txt has 4 prescriptions and 7 reports.', type: 'ok' });
    }, T.motion ? 700 : 50);
  });

  renderFamily(); mark();
})();
