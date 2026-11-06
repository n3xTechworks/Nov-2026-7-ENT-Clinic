/* Auth pages: login (wrong-password state, OTP mode), signup (account-created state), forgot-password (request -> OTP + new password -> updated). */
(function () {
  'use strict';
  var d = document, V = window.TridyaValidation, T = window.Tridya || {};
  var toast = window.toast || function () {};
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var fast = !T.motion; /* webdriver / reduced motion: no artificial delays */
  function later(fn, ms) { if (fast) fn(); else setTimeout(fn, ms); }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* inline error, same markup as js/validation.js (<p class="msg err" id="<id>-error">) */
  function setErr(field, msg) {
    var id = (field.id || field.name) + '-error', el = d.getElementById(id);
    if (!el) {
      el = d.createElement('p'); el.className = 'msg err'; el.id = id;
      (field.closest('.field') || field.parentElement).appendChild(el);
      field.setAttribute('aria-describedby', ((field.getAttribute('aria-describedby') || '') + ' ' + id).trim());
    }
    el.textContent = msg || '';
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    field.classList.toggle('is-valid', !msg && !!field.value.trim());
    return !msg;
  }

  /* "Mobile number or email": email when it has an @, otherwise an Indian mobile */
  function loginError(field) {
    var v = field.value.trim();
    if (!v) return 'Enter your mobile number or email.';
    if (v.indexOf('@') > -1) { field.value = V.normalizeEmail(v); return V.validateEmail(field.value); }
    if (/[a-z]/i.test(v)) return 'Enter a 10-digit mobile number or a valid email.';
    return V.validatePhone(v);
  }
  function checkLogin(field) { return setErr(field, loginError(field)); }
  /* run before validation.js (capture) and re-apply after it, because it rewrites the same error element */
  function guardLogin(form, field) {
    var st = { ok: true };
    form.addEventListener('submit', function () {
      var msg = loginError(field); st.ok = !msg;
      setTimeout(function () { if (msg) setErr(field, msg); }, 0);
    }, true);
    return st;
  }
  function wireLoginField(field) {
    if (!field) return;
    field.addEventListener('input', function () {
      if (field.value.indexOf('@') > -1 && field.value !== field.value.toLowerCase()) field.value = field.value.toLowerCase();
      if (field.getAttribute('aria-invalid') === 'true') checkLogin(field);
    });
    field.addEventListener('blur', function () { if (field.value.trim()) checkLogin(field); });
  }
  function maskDest(v) {
    v = v.trim();
    if (v.indexOf('@') > -1) { var p = v.split('@'); return p[0].charAt(0) + '•••@' + p[1]; }
    var n = V.digitsOnly(v).slice(-10);
    return '+91 ' + n.slice(0, 5) + ' •••' + n.slice(-2);
  }

  /* swap the photo side (account created / password updated states) */
  function swapSide(slot, alt, h, p) {
    var img = $('.auth-side .ph img');
    if (img) {
      img.style.opacity = '0';
      later(function () {
        img.src = 'images/' + slot + '-800.webp';
        img.srcset = 'images/' + slot + '-800.webp 800w, images/' + slot + '-1600.webp 1600w';
        img.alt = alt;
        img.style.opacity = '';
      }, 200);
    }
    if (h) $('.auth-side h2').textContent = h;
    if (p) $('.auth-side p').textContent = p;
  }
  function showView(name) {
    $$('.auth-view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== name; });
    var cur = $('.auth-view[data-view="' + name + '"]');
    var h = cur && $('.auth-title', cur);
    if (h) h.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: fast ? 'auto' : 'smooth' });
  }

  /* ---------- shared: show/hide password, social buttons ---------- */
  d.addEventListener('click', function (e) {
    var eye = e.target.closest('[data-pw-eye]');
    if (eye) {
      var inp = eye.parentElement.querySelector('input');
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      eye.setAttribute('aria-pressed', show ? 'true' : 'false');
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    }
    var soc = e.target.closest('[data-social]');
    if (soc) {
      var who = soc.getAttribute('data-social');
      toast({ title: 'Continuing with ' + who, text: 'Demo sign-in: opening your patient portal.', type: 'info' });
      store('tridya.session', JSON.stringify({ via: who, at: Date.now() }));
      setTimeout(function () { location.href = 'dashboard.html'; }, 1100);
    }
  });

  /* ---------- login ---------- */
  var lf = $('#loginForm');
  if (lf && V) {
    var lid = $('#l-id', lf), lpw = $('#l-pw', lf), err = $('#loginErr'), attempts = 3, otpMode = false;
    var submit = $('[data-submit]', lf), otpBtn = $('[data-otp-toggle]', lf);
    wireLoginField(lid);
    lpw.addEventListener('input', function () { if (!err.hidden && lpw.getAttribute('aria-invalid') === 'true') lpw.setAttribute('aria-invalid', 'false'); });

    otpBtn.addEventListener('click', function () {
      if (!otpMode) {
        var v = lid.value.trim();
        if (!v || v.indexOf('@') > -1 || !checkLogin(lid)) {
          setErr(lid, 'Enter your 10-digit mobile number to get a one-time code.');
          lid.focus(); return;
        }
      }
      otpMode = !otpMode;
      $('[data-pw-field]', lf).hidden = otpMode;
      $('[data-otp-field]', lf).hidden = !otpMode;
      submit.textContent = otpMode ? 'Verify and log in' : 'Log in';
      $('span', otpBtn).textContent = otpMode ? 'Log in with password instead' : 'Log in with a one-time code (OTP)';
      err.hidden = true;
      if (otpMode) {
        toast({ title: 'Code sent', text: 'We sent a 6-digit code to ' + maskDest(lid.value) + '.', type: 'ok' });
        $('#l-otp', lf).focus();
      } else lpw.focus();
    });
    var resend = $('[data-otp-resend]', lf);
    if (resend) resend.addEventListener('click', function () { toast({ title: 'New code sent', text: 'Check your SMS for the latest code.', type: 'ok' }); });

    /* capture phase: check the id field together with validation.js field errors */
    var idSt = guardLogin(lf, lid);
    lf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!idSt.ok) { lid.focus(); return; }
      if (attempts <= 0 && !otpMode) return;
      if (!otpMode && lpw.value === 'wrongpass1') {
        attempts--;
        err.hidden = false;
        err.style.animation = 'none'; void err.offsetWidth; err.style.animation = '';
        $('[data-err-title]', err).textContent = attempts > 0 ? 'That password is incorrect' : 'Login paused for 15 minutes';
        $('[data-err-text]', err).textContent = attempts > 0
          ? attempts + (attempts === 1 ? ' attempt' : ' attempts') + ' left before login is paused for 15 minutes.'
          : 'Too many wrong attempts. Reset your password or log in with a one-time code.';
        lpw.setAttribute('aria-invalid', 'true');
        if (attempts <= 0) submit.disabled = true;
        lpw.select();
        return;
      }
      err.hidden = true;
      submit.classList.add('is-loading');
      store('tridya.session', JSON.stringify({ user: lid.value.trim(), at: Date.now(), remember: !!lf.remember.checked }));
      toast({ title: 'Logged in', text: 'Opening your patient portal.', type: 'ok' });
      later(function () { location.href = 'dashboard.html'; }, 700);
    });
  }

  /* ---------- signup ---------- */
  var sf = $('#signupForm');
  if (sf && V) {
    var spw = $('#s-pw', sf), meter = $('[data-pw-meter]', sf), hint = $('[data-pw-hint]', sf);
    var dob = $('#s-dob', sf);
    if (dob && T.iso) dob.max = T.iso(new Date());
    var HINTS = ['Use 8 or more characters with a letter and a number.', 'Weak. Add more characters and a number.', 'Fair. Mix letters and numbers to make it stronger.', 'Strong enough. Add a symbol to make it stronger.', 'Very strong password.'];
    spw.addEventListener('input', function () {
      var lvl = spw.value ? V.passwordStrength(spw.value) : 0;
      $$('i', meter).forEach(function (i, n) { i.classList.toggle('on', n < lvl); });
      meter.setAttribute('data-level', lvl);
      hint.textContent = HINTS[lvl];
    });
    sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('[data-submit]', sf);
      btn.classList.add('is-loading');
      var first = $('#s-name', sf).value.trim().split(/\s+/)[0];
      first = first.charAt(0).toUpperCase() + first.slice(1);
      later(function () {
        btn.classList.remove('is-loading');
        $('[data-first]').textContent = first;
        $('[data-pid]').textContent = 'TRD-0' + (4400 + Math.floor(Math.random() * 500));
        store('tridya.session', JSON.stringify({ user: $('#s-email', sf).value, name: first, at: Date.now() }));
        swapSide('auth-created', 'Smiling patient holding a phone showing an appointment reminder in the clinic lobby', 'Your ENT records, in one place', 'Book visits, read prescriptions and download reports any time.');
        showView('done');
        toast({ title: 'Account created', text: 'Welcome to Tridya, ' + first + '.', type: 'ok' });
      }, 600);
    });
  }

  /* ---------- forgot password ---------- */
  var fr = $('#fpRequest'), fs = $('#fpReset');
  if (fr && fs && V) {
    var fid = $('#f-id', fr), otp = $('[data-otp]', fs), boxes = $$('input', otp), timer = null;
    wireLoginField(fid);
    var startCount = function () {
      var left = 59, cnt = $('[data-count]', fs), txt = $('[data-resend-txt]', fs), rb = $('[data-resend]', fs);
      clearInterval(timer); txt.hidden = false; rb.hidden = true;
      var tick = function () {
        cnt.textContent = '0:' + (left < 10 ? '0' : '') + left;
        if (left-- <= 0) { clearInterval(timer); txt.hidden = true; rb.hidden = false; }
      };
      tick(); timer = setInterval(tick, 1000);
    };
    var fidSt = guardLogin(fr, fid);
    fr.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!fidSt.ok) { fid.focus(); return; }
      var btn = $('[data-submit]', fr);
      btn.classList.add('is-loading');
      later(function () {
        btn.classList.remove('is-loading');
        $('[data-dest]').textContent = maskDest(fid.value);
        showView('reset');
        startCount();
        boxes[0].focus({ preventScroll: true });
        toast({ title: 'Code sent', text: 'Enter the 6-digit code we sent to ' + maskDest(fid.value) + '.', type: 'ok' });
      }, 500);
    });
    $('[data-resend]', fs).addEventListener('click', function () { startCount(); boxes.forEach(function (b) { b.value = ''; }); boxes[0].focus(); toast({ title: 'New code sent', text: 'The previous code no longer works.', type: 'ok' }); });
    $('[data-back-request]').addEventListener('click', function () { clearInterval(timer); showView('request'); fid.focus(); });

    var code = function () { return boxes.map(function (b) { return b.value; }).join(''); };
    var otpErr = $('#otp-error', fs);
    var checkOtp = function () {
      var msg = code() ? V.validateOtp(code()) : 'Enter the 6-digit code we sent you.';
      otpErr.textContent = msg; otp.classList.toggle('err', !!msg);
      boxes.forEach(function (b) { b.setAttribute('aria-invalid', msg ? 'true' : 'false'); });
      return !msg;
    };
    boxes.forEach(function (b, i) {
      b.addEventListener('input', function () {
        var v = V.digitsOnly(b.value);
        if (v.length > 1) { /* pasted or autofilled */
          v.split('').slice(0, 6 - i).forEach(function (ch, k) { boxes[i + k].value = ch; });
          boxes[Math.min(5, i + v.length - 1)].focus();
        } else { b.value = v; if (v && i < 5) boxes[i + 1].focus(); }
        if (otp.classList.contains('err')) checkOtp();
      });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !b.value && i > 0) { boxes[i - 1].focus(); boxes[i - 1].value = ''; e.preventDefault(); }
        if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
        if (e.key === 'ArrowRight' && i < 5) boxes[i + 1].focus();
      });
      b.addEventListener('paste', function (e) {
        var t = V.digitsOnly((e.clipboardData || window.clipboardData).getData('text')).slice(0, 6);
        if (!t) return;
        e.preventDefault();
        t.split('').forEach(function (ch, k) { if (boxes[k]) boxes[k].value = ch; });
        boxes[Math.min(5, t.length - 1)].focus();
      });
    });
    /* capture phase: runs before validation.js so the OTP error shows together with field errors */
    var otpOk = false;
    fs.addEventListener('submit', function () { otpOk = checkOtp(); }, true);
    fs.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!otpOk) { boxes[Math.min(code().length, 5)].focus(); return; }
      var btn = $('[data-submit]', fs);
      btn.classList.add('is-loading');
      later(function () {
        btn.classList.remove('is-loading');
        clearInterval(timer);
        swapSide('auth-updated', 'Close-up of hands typing on a phone at a clinic reception counter', 'Your ENT records, in one place', 'Book visits, read prescriptions and download reports any time.');
        showView('updated');
        toast({ title: 'Password updated', text: 'Log in with your new password.', type: 'ok' });
      }, 600);
    });
  }
})();
