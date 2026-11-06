/* Portal: video waiting room. Mic/camera toggles, device re-test, doctor-ready countdown (?ready=1 skips it), join -> live call state. */
(function () {
  'use strict';
  var d = document, T = window.Tridya || {};
  var toast = window.toast || function () {};
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var stage = $('#vcStage');
  if (!stage) return;

  /* these controls give their own feedback (skip the app.js demo fallback) */
  d.querySelectorAll('main button:not([data-toast])').forEach(function (b) { b.setAttribute('data-no-feedback', ''); });
  d.querySelectorAll('[data-logout]').forEach(function (a) { a.setAttribute('href', 'index.html'); });

  var mic = $('[data-mic]'), cam = $('[data-cam]'), off = $('[data-cam-off]');
  var pill = function (k, cls, text) { var p = $('[data-chk="' + k + '"]'); if (!p) return; p.className = 'pill ' + cls; $('span:last-child', p).textContent = text; };
  var micOn = true, camOn = true;
  function syncPills() {
    pill('cam', camOn ? 'ok' : 'warn', camOn ? 'Camera ready' : 'Camera off');
    pill('mic', micOn ? 'ok' : 'warn', micOn ? 'Microphone ready' : 'Microphone muted');
  }
  mic.addEventListener('click', function () {
    micOn = !micOn;
    mic.setAttribute('aria-pressed', micOn ? 'true' : 'false');
    mic.setAttribute('aria-label', micOn ? 'Turn microphone off' : 'Turn microphone on');
    syncPills();
    toast({ title: micOn ? 'Microphone on' : 'Microphone muted', type: micOn ? 'ok' : 'warn', timeout: 2500 });
  });
  cam.addEventListener('click', function () {
    camOn = !camOn;
    cam.setAttribute('aria-pressed', camOn ? 'true' : 'false');
    cam.setAttribute('aria-label', camOn ? 'Turn camera off' : 'Turn camera on');
    off.hidden = camOn;
    syncPills();
    toast({ title: camOn ? 'Camera on' : 'Camera off', type: camOn ? 'ok' : 'warn', timeout: 2500 });
  });

  /* device re-test */
  var test = $('[data-test]');
  test.addEventListener('click', function () {
    test.classList.add('is-loading');
    pill('cam', 'info', 'Checking camera…'); pill('mic', 'info', 'Checking microphone…'); pill('net', 'info', 'Testing connection…');
    setTimeout(function () {
      test.classList.remove('is-loading');
      syncPills();
      var mbps = 18 + Math.floor(Math.random() * 12);
      pill('net', 'info', 'Connection good · ' + mbps + ' Mbps');
      toast({ title: 'Device check complete', text: (camOn && micOn ? 'Camera, microphone and connection are ready.' : 'Connection is good. Turn your ' + (!camOn ? 'camera' : 'microphone') + ' back on before the doctor joins.'), type: camOn && micOn ? 'ok' : 'warn' });
    }, T.motion ? 1200 : 300);
  });

  /* waiting -> doctor ready -> joined */
  var join = $('[data-join]'), wait = $('[data-wait]'), joined = false, waitTimer = null;
  function ready() {
    clearInterval(waitTimer);
    wait.className = 'alert ok-alert';
    $('[data-wait-t]').textContent = 'Dr. Kavitha is ready';
    $('[data-wait-p]').textContent = 'Join now. Your consultation is booked for 15 minutes.';
    join.disabled = false;
    join.textContent = 'Join consultation';
    toast({ title: 'The doctor is ready', text: 'Dr. Kavitha Sundaram has opened your consultation.', type: 'ok' });
  }
  join.addEventListener('click', function () {
    if (joined) { T.openDialog && T.openDialog('dlg-leave'); return; }
    joined = true;
    $('[data-doc-tile]').hidden = false;
    var live = $('[data-live]'); live.hidden = false;
    var s = 0, el = $('[data-elapsed]');
    setInterval(function () { s++; el.textContent = ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }, 1000);
    wait.className = 'alert info';
    $('[data-wait-t]').textContent = 'You are in the consultation';
    $('[data-wait-p]').textContent = 'Speak normally. The doctor may ask you to hold your phone closer for a throat check.';
    join.textContent = 'End consultation';
    join.classList.remove('btn-cta'); join.classList.add('btn-danger');
    toast({ title: 'You are connected', text: 'Dr. Kavitha Sundaram joined the call.', type: 'ok' });
  });

  if (/[?&]ready=1/.test(location.search)) ready();
  else if (T.motion) {
    var left = 3;
    waitTimer = setInterval(function () {
      left--;
      if (left > 0) $('[data-wait-p]').textContent = 'The doctor will join in about ' + left + (left === 1 ? ' minute.' : ' minutes.');
    }, 4000);
    setTimeout(ready, 12000);
  }

  var leave = $('[data-leave]');
  if (leave) leave.addEventListener('click', function () { toast({ title: 'You left the waiting room', type: 'info' }); });
})();
