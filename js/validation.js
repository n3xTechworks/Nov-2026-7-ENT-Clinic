/* Tridya ENT Clinic: form validation (pure functions + DOM wiring).
   Node:    const v = require('./js/validation.js'); v.validateName('Mary') -> '' (valid) or an error message.
   Browser: window.TridyaValidation. js/site.js wires every <form data-validate novalidate> automatically.

   Rule per field: data-rule="name|email|phone|password|otp|required|match" (space separated), otherwise inferred:
     name="name" / *name -> name · type=email or name=email -> email · type=tel or name=phone/mobile -> phone
     type=password or name=password -> password (data-rule="required" on a login password to skip the strength rule)
     name=otp -> otp. The `required` attribute makes empty fields an error; optional empty fields are valid.
   data-match="#otherField" -> must equal that field (confirm password).
   Messages follow the tokens board (d2_04). */
(function (global) {
  'use strict';

  var MSG = {
    required: 'Please fill in this field.',
    requiredCheck: 'Please tick this box to continue.',
    requiredSelect: 'Please choose an option.',
    name: 'Enter at least 2 letters. Numbers are not allowed.',
    nameChars: "Use letters, spaces, full stops ( . ) and apostrophes ( ' ) only.",
    email: 'Enter a valid email, for example name@example.com',
    phoneChars: 'Use digits only, 10 numbers.',
    phoneLength: 'Use digits only, 10 numbers.',
    phoneStart: 'Indian mobile numbers start with 6, 7, 8 or 9.',
    password: 'Use at least 8 characters with a letter and a number.',
    otp: 'Enter the 6-digit code.',
    match: 'These two fields do not match.'
  };

  function str(v) { return v == null ? '' : String(v).trim(); }

  function validateRequired(value) { return str(value) ? '' : MSG.required; }

  /* 2+ letters; letters, spaces, . and ' (and hyphen) only; no digits */
  function validateName(value) {
    var v = str(value);
    if (!v) return MSG.required;
    if (/\d/.test(v)) return MSG.name;
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(v)) return MSG.nameChars;
    var letters = v.match(/\p{L}/gu) || [];
    if (letters.length < 2) return MSG.name;
    if (v.length > 60) return MSG.nameChars;
    return '';
  }

  /* local part, @, domain and TLD. Upper case is accepted (it is normalised to lower case, never rejected). */
  var EMAIL_RE = /^(?!\.)(?!.*\.\.)[A-Za-z0-9._%+'-]+(?<!\.)@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
  function normalizeEmail(value) { return str(value).toLowerCase(); }
  function validateEmail(value) {
    var v = str(value);
    if (!v) return MSG.required;
    if (v.length > 254 || !EMAIL_RE.test(v)) return MSG.email;
    return '';
  }

  /* Indian mobile: digits only (spaces allowed while typing), exactly 10 digits, first digit 6-9.
     A leading +91 / 91 / 0 is not accepted here because the UI shows a fixed +91 prefix. */
  function digitsOnly(value) { return String(value == null ? '' : value).replace(/\D/g, ''); }
  function validatePhone(value) {
    var v = str(value);
    if (!v) return MSG.required;
    if (!/^[\d ]+$/.test(v)) return MSG.phoneChars;
    var d = v.replace(/\s/g, '');
    if (d.length !== 10) return MSG.phoneLength;
    if (!/^[6-9]/.test(d)) return MSG.phoneStart;
    return '';
  }

  function validatePassword(value) {
    var v = String(value == null ? '' : value);
    if (!v) return MSG.required;
    if (v.length < 8 || !/[A-Za-z]/.test(v) || !/\d/.test(v)) return MSG.password;
    return '';
  }

  /* 0-4 strength score for the 4-step meter */
  function passwordStrength(value) {
    var v = String(value == null ? '' : value), s = 0;
    if (v.length >= 8) s++;
    if (/[A-Za-z]/.test(v) && /\d/.test(v)) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++;
    return v ? s : 0;
  }

  function validateOtp(value) {
    var v = str(value).replace(/\s/g, '');
    if (!v) return MSG.required;
    return /^\d{6}$/.test(v) ? '' : MSG.otp;
  }

  var RULES = { required: validateRequired, name: validateName, email: validateEmail, phone: validatePhone, password: validatePassword, otp: validateOtp };

  function rulesFor(field) {
    var explicit = field.getAttribute && field.getAttribute('data-rule');
    if (explicit) return explicit.split(/\s+/).filter(Boolean);
    var name = String(field.name || '').toLowerCase();
    var type = String(field.type || '').toLowerCase();
    if (type === 'email' || name === 'email') return ['email'];
    if (type === 'tel' || name === 'phone' || name === 'mobile') return ['phone'];
    if (name === 'otp' || name === 'code') return ['otp'];
    if (type === 'password' || /password$/.test(name)) return ['password'];
    if (name === 'name' || /(^|[-_])(first|last|full|patient|member)?-?name$/.test(name)) return ['name'];
    return [];
  }

  function validateField(field) {
    var type = String(field.type || '').toLowerCase();
    var required = !!field.required;
    if (type === 'checkbox') return required && !field.checked ? MSG.requiredCheck : '';
    if (type === 'radio') {
      if (!required || !field.form) return '';
      var group = field.form.querySelectorAll('input[type="radio"][name="' + field.name + '"]');
      for (var g = 0; g < group.length; g++) if (group[g].checked) return '';
      return MSG.requiredSelect;
    }
    var value = str(field.value);
    if (!value) return required ? (field.tagName === 'SELECT' ? MSG.requiredSelect : MSG.required) : '';
    var rules = rulesFor(field);
    for (var i = 0; i < rules.length; i++) {
      var fn = RULES[rules[i]];
      if (!fn) continue;
      var msg = fn(value);
      if (msg) return msg;
    }
    var matchSel = field.getAttribute && field.getAttribute('data-match');
    if (matchSel && field.form) {
      var other = field.form.querySelector(matchSel);
      if (other && other.value !== field.value) return MSG.match;
    }
    return '';
  }

  /* ---------------- DOM wiring ---------------- */
  function errorEl(field) {
    var id = (field.id || field.name) + '-error';
    var el = document.getElementById(id);
    if (!el) {
      var host = field.closest('.field') || field.parentElement;
      el = document.createElement('p');
      el.className = 'msg err';
      el.id = id;
      host.appendChild(el);
    }
    var by = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (by.indexOf(id) < 0) { by.push(id); field.setAttribute('aria-describedby', by.join(' ')); }
    return el;
  }

  function show(field, msg) {
    var el = errorEl(field);
    el.className = 'msg err';
    el.textContent = msg;
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    field.classList.toggle('is-valid', !msg && !!str(field.value));
    return !msg;
  }

  function check(field) { return show(field, validateField(field)); }

  function fieldsOf(form) {
    return Array.prototype.filter.call(form.elements, function (f) {
      return f.name && !f.disabled && f.type !== 'submit' && f.type !== 'button' && f.type !== 'hidden' && f.type !== 'fieldset' && !f.closest('[hidden]');
    });
  }

  function validateForm(form) {
    var first = null;
    fieldsOf(form).forEach(function (f) { if (!check(f) && !first) first = f; });
    if (first) first.focus();
    return !first;
  }

  function wire(form) {
    if (form.__tv) return;
    form.__tv = true;
    form.addEventListener('input', function (e) {
      var f = e.target;
      if (!f.name) return;
      var rules = rulesFor(f);
      if (rules.indexOf('phone') > -1 || rules.indexOf('otp') > -1) {
        var d = digitsOnly(f.value);
        if (f.maxLength > 0) d = d.slice(0, f.maxLength);
        if (f.value !== d) f.value = d;
      }
      if (rules.indexOf('email') > -1 && f.value !== f.value.toLowerCase()) {
        var pos = f.selectionStart;
        f.value = f.value.toLowerCase();
        try { f.setSelectionRange(pos, pos); } catch (err) { /* type=email has no selection API */ }
      }
      if (f.getAttribute('aria-invalid') === 'true') check(f);
    });
    form.addEventListener('blur', function (e) {
      var f = e.target;
      if (!f.name || !f.form) return;
      if (rulesFor(f).indexOf('email') > -1) f.value = normalizeEmail(f.value);
      if (str(f.value) || f.getAttribute('aria-invalid') === 'true') check(f);
    }, true);
    form.addEventListener('change', function (e) { if (e.target.type === 'checkbox' || e.target.type === 'radio' || e.target.tagName === 'SELECT') check(e.target); });
    form.addEventListener('submit', function (e) {
      fieldsOf(form).forEach(function (f) { if (rulesFor(f).indexOf('email') > -1) f.value = normalizeEmail(f.value); });
      if (!validateForm(form)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (form.hasAttribute('data-validate-only')) return; /* page JS handles the valid submit itself */
      if (form.getAttribute('action')) return; /* real navigation, e.g. GET to book.html */
      e.preventDefault();
      /* page JS can listen for 'valid-submit' and call preventDefault() to take over the success UI */
      var ev = new CustomEvent('valid-submit', { cancelable: true, detail: { form: form } });
      if (!form.dispatchEvent(ev)) return;
      var ok = form.querySelector('[data-form-success]') || (form.getAttribute('data-success') && document.querySelector(form.getAttribute('data-success')));
      if (ok) { ok.hidden = false; ok.classList.add('show'); }
      if (global.toast && form.getAttribute('data-toast')) global.toast({ title: form.getAttribute('data-toast'), type: 'ok' });
      if (!form.hasAttribute('data-no-reset')) {
        form.reset();
        fieldsOf(form).forEach(function (f) { f.removeAttribute('aria-invalid'); f.classList.remove('is-valid'); var el = document.getElementById((f.id || f.name) + '-error'); if (el) el.textContent = ''; });
      }
    });
  }

  function wireAll(root) { (root || document).querySelectorAll('form[data-validate]').forEach(wire); }

  var api = {
    MSG: MSG, validateRequired: validateRequired, validateName: validateName, validateEmail: validateEmail, normalizeEmail: normalizeEmail,
    validatePhone: validatePhone, digitsOnly: digitsOnly, validatePassword: validatePassword, passwordStrength: passwordStrength, validateOtp: validateOtp,
    rulesFor: rulesFor, validateField: validateField, validateForm: validateForm, check: check, wire: wire, wireAll: wireAll
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TridyaValidation = api;
})(typeof window !== 'undefined' ? window : globalThis);
