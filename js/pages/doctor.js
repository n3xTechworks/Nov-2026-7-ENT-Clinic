/* Doctor profile: slot pickers (inline "Book a slot" card + "Choose a time" sheet) -> book.html?doctor=&date=&slot= */
(function () {
  'use strict';
  var T = window.Tridya, head = document.querySelector('[data-doc-page]');
  if (!T || !head || !T.opdDays) return;
  var doc = T.doctor(head.getAttribute('data-doc-page'));
  if (!doc) return;
  var DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function open(date) {
    var now = new Date(), today = T.iso(date) === T.iso(now), mins = now.getHours() * 60 + now.getMinutes();
    return T.slotsFor(doc, date).map(function (s) {
      var hm = s.time.split(':'), past = today && (+hm[0] * 60 + +hm[1]) <= mins;
      return { time: s.time, full: s.full || past };
    });
  }
  function Picker(el) {
    var n = +el.getAttribute('data-days') || 4;
    var days = T.opdDays(doc, n + 2).filter(function (d) { return open(d).some(function (s) { return !s.full; }); }).slice(0, n), st = { i: 0, time: '' };
    var dEl = el.querySelector('[data-pk-days]'), sEl = el.querySelector('[data-pk-slots]'), sel = el.querySelector('[data-pk-sel]'), go = el.querySelector('[data-pk-go]');
    /* start on the first day with an open slot */
    for (var k = 0; k < days.length; k++) { if (open(days[k]).some(function (s) { return !s.full; })) { st.i = k; break; } }
    function firstOpen() { var f = open(days[st.i]).filter(function (s) { return !s.full; })[0]; return f ? f.time : ''; }
    st.time = firstOpen();
    function render() {
      dEl.innerHTML = days.map(function (d, i) {
        var c = open(d).filter(function (s) { return !s.full; }).length;
        return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === st.i) + '" aria-label="' + T.fmtDate(d) + ', ' + c + ' slots"><small>' + DAYS[d.getDay()] + '</small><b>' + pad(d.getDate()) + '</b><small>' + c + ' slots</small></button>';
      }).join('');
      sEl.innerHTML = open(days[st.i]).map(function (s) {
        return '<button type="button" class="slot' + (s.full ? ' full' : '') + '" data-t="' + s.time + '"' + (s.full ? ' disabled aria-label="' + s.time + ' (unavailable)"' : '') + ' aria-pressed="' + (s.time === st.time) + '">' + s.time + '</button>';
      }).join('');
      var d = days[st.i];
      if (st.time) {
        sel.textContent = 'Selected · ' + T.fmtDate(d) + ' · ' + st.time;
        go.href = 'book.html?' + new URLSearchParams({ doctor: doc.slug, date: T.iso(d), slot: st.time }).toString();
        go.removeAttribute('aria-disabled');
      } else {
        sel.textContent = 'No open slots on ' + T.fmtDate(d);
        go.href = 'book.html?doctor=' + doc.slug;
      }
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]');
      if (b) { st.i = +b.getAttribute('data-i'); st.time = firstOpen(); render(); return; }
      var s = e.target.closest('[data-t]');
      if (s && !s.disabled) { st.time = s.getAttribute('data-t'); render(); }
    });
    if (days.length) render();
  }
  document.querySelectorAll('[data-picker]').forEach(Picker);
})();
