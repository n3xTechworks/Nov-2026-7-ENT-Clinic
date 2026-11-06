/* Portal: Medical reports. Type chips filter the table, rows open a viewer (endoscopy gallery d3_38,
   audiogram = featured panel, others = details dialog), downloads generate a file, upload dialog (d3_39)
   validates type/size, simulates progress and adds rows (kept in localStorage 'tridya.uploads'). */
(function () {
  'use strict';
  var d = document, T = window.Tridya;
  var rowsEl = d.getElementById('rpRows');
  if (!T || !rowsEl) return;
  var toast = window.toast || T.toast, esc = T.esc;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var TYPES = { hearing: 'Hearing', endoscopy: 'Endoscopy', imaging: 'Imaging', lab: 'Lab' };
  var filter = 'all';
  var KEY = 'tridya.uploads';
  var INFO = {
    aud: { ref: 'REP-2610-077', note: 'Bilateral mild sensorineural hearing loss above 2 kHz, right slightly worse. Right PTA 27 dB, left 22 dB.' },
    tymp: { ref: 'REP-2610-078', note: 'Type A curves in both ears: normal middle-ear pressure and eardrum movement. Acoustic reflexes present.' },
    histo: { ref: 'REP-2608-114', note: 'Inflammatory nasal polyp with eosinophils. No dysplasia or malignancy seen.' },
    endo: { ref: 'REP-2608-031', note: 'Grade 2 polyp in the right middle meatus, septal spur to the left, mucopurulent discharge.' },
    ct: { ref: 'REP-2608-009', note: 'Mucosal thickening of both maxillary and anterior ethmoid sinuses, blocked right ostiomeatal unit. Septum deviated to the left.' },
    cbc: { ref: 'REP-2608-010', note: 'All values within normal range. Eosinophils 6% (upper limit). Fit for day-care surgery.' },
    allergy: { ref: 'REP-2607-052', note: 'Positive to house dust mite and Parthenium pollen. Awaiting review by Dr. Kavitha Sundaram.' }
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(iso) { var p = String(iso).split('-'); return pad(+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
  function rowData(tr) {
    var c = $$('td', tr);
    return { id: tr.getAttribute('data-rep'), name: c[0].textContent.trim(), type: c[1].textContent.trim(), date: c[2].textContent.trim(), by: c[3].textContent.trim(), status: c[4].textContent.trim() };
  }
  function download(name, text) {
    var url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    var a = d.createElement('a'); a.href = url; a.download = name; d.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  function downloadRep(id) {
    var tr = $('tr[data-rep="' + id + '"]', rowsEl); if (!tr) return;
    var r = rowData(tr), info = INFO[id] || { ref: 'UPL-' + id, note: 'Outside report uploaded by you. Waiting for your doctor to review it.' };
    var file = 'Tridya-' + info.ref + '-' + r.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/-+$/, '') + '.txt';
    download(file, 'Tridya ENT Clinic · ' + r.name + '\nRef: ' + info.ref + '\nPatient: Sangeetha Prakash (UHID TRD-04418)\nType: ' + r.type + '\nDate: ' + r.date + '\nBy: ' + r.by + '\nStatus: ' + r.status + '\n\n' + info.note + '\n\n42 Race Course Road, Coimbatore 641018 · +91 422 245 6780\n');
    toast({ title: 'Report downloaded', text: r.name + ' (' + info.ref + ') is in your downloads.', type: 'ok' });
  }

  /* ---------- filter + counts ---------- */
  function apply() {
    var shown = 0, n = { all: 0, hearing: 0, endoscopy: 0, imaging: 0, lab: 0 };
    $$('tr', rowsEl).forEach(function (tr) {
      var t = tr.getAttribute('data-type'); n.all++; if (n[t] != null) n[t]++;
      tr.hidden = !(filter === 'all' || filter === t);
      if (!tr.hidden) shown++;
    });
    Object.keys(n).forEach(function (k) { var el = $('[data-n="' + k + '"]'); if (el) el.textContent = n[k]; });
    $('#rpEmpty').hidden = shown > 0;
    $('#rpTable').hidden = shown === 0;
    $('[data-rp-shown]').textContent = shown + (shown === 1 ? ' report' : ' reports');
  }
  $('#rpChips').addEventListener('click', function (e) {
    var c = e.target.closest('[data-type]'); if (!c) return;
    filter = c.getAttribute('data-type');
    $$('[data-type]', this).forEach(function (x) { var on = x === c; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    apply();
  });

  /* ---------- open / download ---------- */
  var rd = $('#dlg-report');
  d.addEventListener('click', function (e) {
    var dl = e.target.closest('[data-dl-rep]');
    if (dl) { var id = dl.getAttribute('data-dl-rep') || (dl.closest('tr') && dl.closest('tr').getAttribute('data-rep')); if (id) downloadRep(id); return; }
    if (e.target.closest('[data-share-rep]')) {
      var txt = 'Nasal endoscopy report REP-2608-031 · Tridya ENT Clinic · Sangeetha Prakash';
      var ok = function () { toast({ title: 'Secure link copied', text: 'Send it to your doctor. The link stops working after 7 days.', type: 'ok' }); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, ok); else ok();
      return;
    }
    if (e.target.closest('[data-ev-video]')) {
      var m = $('[data-ev-video-msg]'); m.hidden = false;
      toast({ title: 'Video link sent', text: 'Check your email for a secure link to the 0:48 clip.', type: 'info' });
    }
  });
  rowsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open-rep]'); if (!b) return;
    var tr = b.closest('tr'), id = tr.getAttribute('data-rep');
    $$('tr.is-cur', rowsEl).forEach(function (x) { x.classList.remove('is-cur'); });
    tr.classList.add('is-cur');
    if (id === 'aud') {
      var f = $('#rpFeat');
      f.scrollIntoView({ behavior: T.motion ? 'smooth' : 'auto', block: 'start' });
      f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash');
      toast({ title: 'Pure-tone audiogram', text: 'Shown at the top of this page.', type: 'info', timeout: 2500 });
      return;
    }
    if (id === 'endo') { showImg(0); T.openDialog('dlg-endo', b); return; }
    var r = rowData(tr), info = INFO[id] || { ref: 'Uploaded by you', note: 'Outside report you uploaded. Your doctor will review it before your next visit.' };
    $('[data-rd-title]', rd).textContent = r.name;
    $('[data-rd-sub]', rd).textContent = r.date + ' · ' + r.by;
    $('[data-rd-body]', rd).innerHTML = [['Reference', info.ref], ['Type', r.type], ['Date', r.date], ['Status', r.status]].map(function (p) { return '<div><span>' + p[0] + '</span><b>' + esc(p[1]) + '</b></div>'; }).join('');
    $('[data-rd-note]', rd).textContent = info.note;
    $('[data-rd-dl]', rd).setAttribute('data-dl-rep', id);
    T.openDialog(rd, b);
  });

  /* ---------- endoscopy viewer ---------- */
  var ev = $('#dlg-endo'), thumbs = $$('.ev-thumb', ev), idx = 0;
  function showImg(i) {
    idx = (i + thumbs.length) % thumbs.length;
    var t = thumbs[idx], slot = t.getAttribute('data-slot');
    var stage = $('.ev-stage', ev), img = $('img', stage);
    var set = function () {
      img.src = 'images/' + slot + '-800.webp';
      img.srcset = 'images/' + slot + '-800.webp 800w, images/' + slot + '-1600.webp 1600w';
      img.alt = t.getAttribute('data-alt');
      stage.classList.remove('fading');
    };
    if (T.motion && img.getAttribute('src').indexOf(slot + '-') < 0) { stage.classList.add('fading'); setTimeout(set, 150); } else set();
    thumbs.forEach(function (x, j) { x.setAttribute('aria-pressed', j === idx ? 'true' : 'false'); });
    $('[data-ev-count]', ev).textContent = 'Image ' + (idx + 1) + ' of ' + thumbs.length;
    $('[data-ev-meta]', ev).textContent = t.getAttribute('data-meta');
  }
  ev.addEventListener('click', function (e) {
    var t = e.target.closest('.ev-thumb'); if (t) showImg(thumbs.indexOf(t));
    var s = e.target.closest('[data-ev-step]');
    if (s) { var step = +s.getAttribute('data-ev-step'); showImg(idx + step); }
  });
  ev.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.target.closest('input,select,textarea')) return;
    var rtl = d.documentElement.getAttribute('dir') === 'rtl';
    var fwd = (e.key === 'ArrowRight') !== rtl;
    e.preventDefault(); showImg(idx + (fwd ? 1 : -1));
  });

  /* ---------- upload ---------- */
  var up = $('#dlg-upload'), form = $('#upForm'), input = $('#upFile'), drop = $('#upDrop'), listEl = $('#upFiles'), err = $('#upErr'), submit = $('#upSubmit');
  var files = [], MAX = 20 * 1024 * 1024, OKEXT = /\.(pdf|jpe?g|png)$/i, OKTYPE = /^(application\/pdf|image\/jpeg|image\/png)$/;
  var IC_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>';
  var IC_IMG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';
  var IC_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/></svg>';
  var IC_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  function mb(n) { return (n / 1048576).toFixed(n < 104858 ? 2 : 1) + ' MB'; }
  function syncSubmit() {
    var done = files.filter(function (f) { return f.pct >= 100; }).length, busy = files.some(function (f) { return f.pct < 100; });
    submit.disabled = !done || busy;
    submit.textContent = busy ? 'Uploading…' : done ? 'Add ' + done + (done === 1 ? ' report' : ' reports') : 'Add reports';
  }
  function fileRow(f) {
    var isImg = /^image\//.test(f.type) || /\.(jpe?g|png)$/i.test(f.name);
    var el = d.createElement('div');
    el.className = 'file'; el.setAttribute('data-file', f.key);
    el.innerHTML = '<span class="badge-ic"><span class="ico" aria-hidden="true">' + (isImg ? IC_IMG : IC_FILE) + '</span></span>' +
      '<div class="stack-sm" style="gap:6px;min-width:0"><b>' + esc(f.name) + '</b><div class="prog" role="progressbar" aria-label="Upload progress for ' + esc(f.name) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i style="width:0%"></i></div><small data-st>' + mb(f.size) + ' · 0%</small></div>' +
      '<button class="icon-btn close" type="button" aria-label="Remove ' + esc(f.name) + '"><span class="ico" aria-hidden="true">' + IC_X + '</span></button>';
    $('button', el).addEventListener('click', function () {
      clearInterval(f.timer); files = files.filter(function (x) { return x !== f; }); el.remove(); syncSubmit();
      toast({ title: 'File removed', text: f.name, type: 'info', timeout: 2500 });
    });
    return el;
  }
  function progress(f, el) {
    var step = Math.max(4, Math.min(25, Math.round(2e7 / Math.max(f.size, 1e5))));
    f.timer = setInterval(function () {
      f.pct = Math.min(100, f.pct + step + Math.round(Math.random() * 6));
      $('.prog i', el).style.width = f.pct + '%';
      $('.prog', el).setAttribute('aria-valuenow', f.pct);
      $('[data-st]', el).textContent = mb(f.size) + ' · ' + (f.pct >= 100 ? 'uploaded' : f.pct + '%');
      if (f.pct >= 100) {
        clearInterval(f.timer); el.classList.add('done');
        $('.badge-ic', el).classList.add('ok');
        var x = $('button', el); x.outerHTML = '<span class="ico ok-ic" aria-label="Uploaded" role="img">' + IC_OK + '</span>';
        syncSubmit();
      }
    }, T.motion ? 180 : 20);
  }
  function addFiles(list) {
    var bad = [];
    Array.prototype.forEach.call(list, function (file) {
      if (!(OKEXT.test(file.name) && (!file.type || OKTYPE.test(file.type)))) { bad.push(file.name + ' is not a PDF, JPG or PNG'); return; }
      if (file.size > MAX) { bad.push(file.name + ' is ' + mb(file.size) + ' (max 20 MB)'); return; }
      if (files.some(function (f) { return f.name === file.name && f.size === file.size; })) { bad.push(file.name + ' is already added'); return; }
      var f = { name: file.name, size: file.size, type: file.type, pct: 0, key: 'f' + Date.now() + Math.random().toString(36).slice(2, 6) };
      files.push(f);
      var el = fileRow(f); listEl.appendChild(el); progress(f, el);
    });
    err.hidden = !bad.length; err.textContent = bad.length ? bad.join('. ') + '.' : '';
    if (bad.length) toast({ title: bad.length === 1 ? 'File not added' : bad.length + ' files not added', text: 'Use PDF, JPG or PNG files up to 20 MB each.', type: 'warn' });
    syncSubmit();
  }
  input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev2) { drop.addEventListener(ev2, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'dragend'].forEach(function (ev2) { drop.addEventListener(ev2, function () { drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
  /* stop files dropped next to the zone from opening in the tab */
  up.addEventListener('dragover', function (e) { e.preventDefault(); });
  up.addEventListener('drop', function (e) { e.preventDefault(); });

  function fieldErr(el, msg) {
    var m = $('#' + el.id + '-error'); m.textContent = msg; m.hidden = !msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) el.setAttribute('aria-describedby', el.id + '-error');
    return !msg;
  }
  var dateEl = $('#u-date'), typeEl = $('#u-type');
  function today() { var x = new Date(); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
  dateEl.max = today();
  function checkDate() { var v = dateEl.value; return fieldErr(dateEl, !v ? 'Please choose the report date.' : v > today() ? 'The report date cannot be in the future.' : ''); }
  function checkType() { return fieldErr(typeEl, typeEl.value ? '' : 'Please choose an option.'); }
  typeEl.addEventListener('change', checkType); dateEl.addEventListener('change', checkDate);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = checkType() & checkDate();
    var done = files.filter(function (f) { return f.pct >= 100; });
    if (!done.length) { err.hidden = false; err.textContent = 'Add at least one file.'; }
    if (!ok || !done.length) { (typeEl.getAttribute('aria-invalid') === 'true' ? typeEl : dateEl).focus(); return; }
    var saved = load();
    done.forEach(function (f) { saved.unshift({ id: 'u' + f.key, name: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), type: typeEl.value, date: dateEl.value }); });
    store(saved);
    render(done.length);
    T.closeDialog(up);
    toast({ title: done.length + (done.length === 1 ? ' report added' : ' reports added'), text: 'Your doctor will see them before your next visit.', type: 'ok' });
  });
  up.addEventListener('close', function () {
    files.forEach(function (f) { clearInterval(f.timer); });
    files = []; listEl.innerHTML = ''; err.hidden = true; form.reset();
    [typeEl, dateEl].forEach(function (el) { fieldErr(el, ''); el.removeAttribute('aria-invalid'); });
    syncSubmit();
  });

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function store(v) { try { localStorage.setItem(KEY, JSON.stringify(v.slice(0, 30))); } catch (e) { /* private mode */ } }
  function render(fresh) {
    $$('tr[data-upload]', rowsEl).forEach(function (tr) { tr.remove(); });
    var html = load().map(function (u, i) {
      return '<tr data-type="' + esc(u.type) + '" data-rep="' + esc(u.id) + '" data-upload' + (i < (fresh || 0) ? ' class="is-new"' : '') + '><td><button class="rp-name" type="button" data-open-rep><span class="ico" aria-hidden="true">' + IC_FILE + '</span><b>' + esc(u.name) + '</b></button></td>' +
        '<td data-label="Type"><span class="pill info">' + esc(TYPES[u.type] || 'Other') + '</span></td><td class="tnum" data-label="Date">' + esc(fmt(u.date)) + '</td><td class="muted" data-label="By">Uploaded by you</td>' +
        '<td data-label="Status"><span class="pill warn">Pending review</span></td><td class="act"><button class="icon-btn rp-dl" type="button" data-dl-rep aria-label="Download ' + esc(u.name) + '"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg></span></button></td></tr>';
    }).join('');
  /* buttons handled here give their own feedback: keep app.js's fallback toast out of the way */
  function mark() { $$('main button').forEach(function (b) { b.setAttribute('data-no-feedback', ''); }); }
    rowsEl.insertAdjacentHTML('afterbegin', html);
    apply(); mark();
  }
  render(0);
  if (/[?&]upload=1/.test(location.search)) T.openDialog(up);
  if (/[?&]viewer=1/.test(location.search)) { showImg(0); T.openDialog(ev); }
})();
