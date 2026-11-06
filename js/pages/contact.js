/* contact.html: character counter, error summary, "Message sent" dialog (board d3_32) */
(function () {
  'use strict';
  var T = window.Tridya, form = document.getElementById('ct-form');
  if (!T || !form) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var msg = form.elements.message, count = $('#c-count'), summary = $('#ct-summary');

  function updateCount() {
    var n = msg.value.length; count.textContent = n;
    count.parentNode.classList.toggle('near', n > 900);
  }
  msg.addEventListener('input', updateCount); updateCount();

  function updateSummary() {
    var bad = form.querySelectorAll('[aria-invalid="true"]').length;
    summary.hidden = !bad;
    if (bad) summary.querySelector('span').textContent = 'Fix ' + bad + (bad === 1 ? ' field' : ' fields') + ' to send your message.';
  }
  /* runs before validation.js handles submit, then counts errors once it has marked the fields */
  document.addEventListener('submit', function (e) { if (e.target === form) setTimeout(updateSummary, 0); }, true);
  form.addEventListener('input', function () { if (!summary.hidden) setTimeout(updateSummary, 0); });
  form.addEventListener('change', function () { if (!summary.hidden) setTimeout(updateSummary, 0); });

  form.addEventListener('valid-submit', function (e) {
    e.preventDefault();
    summary.hidden = true;
    var btn = $('#ct-send'); btn.classList.add('is-loading'); btn.disabled = true;
    setTimeout(function () {
      var f = form.elements, first = f.name.value.trim().split(/\s+/)[0], email = f.email.value.trim().toLowerCase();
      var d = new Date(), ref = 'ENQ-' + String(d.getFullYear()).slice(2) + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + (100 + Math.floor(Math.random() * 900));
      var p = $('#ct-sent-text');
      p.textContent = '';
      p.appendChild(document.createTextNode('Thanks, ' + first + '. Your message about "' + f.topic.value.toLowerCase() + '" has reached our front desk. We\'ll reply to '));
      var b = document.createElement('b'); b.textContent = email; p.appendChild(b);
      p.appendChild(document.createTextNode(' within one working day.'));
      $('#ct-ref').textContent = ref; $('#ct-topic').textContent = f.topic.value;
      try { var all = JSON.parse(localStorage.getItem('tridya.enquiries') || '[]'); all.unshift({ ref: ref, topic: f.topic.value, doctor: f.doctor.value, at: d.toISOString() }); localStorage.setItem('tridya.enquiries', JSON.stringify(all.slice(0, 20))); } catch (err) { /* storage off */ }
      btn.classList.remove('is-loading'); btn.disabled = false;
      form.reset(); updateCount();
      Array.prototype.forEach.call(form.querySelectorAll('.is-valid'), function (x) { x.classList.remove('is-valid'); });
      T.openDialog('dlg-sent');
    }, T.motion ? 600 : 0);
  });

  var again = $('[data-ct-again]');
  if (again) again.addEventListener('click', function () { setTimeout(function () { form.elements.name.focus(); }, 60); });
})();
