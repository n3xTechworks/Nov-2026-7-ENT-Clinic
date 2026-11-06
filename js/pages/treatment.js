/* Treatment detail: live "next available" from the lead doctor's OPD days; print checklist. */
(function () {
  'use strict';
  var T = window.Tridya, body = document.querySelector('.tx-body');
  if (!body || !T) return;
  var doc = T.doctor && T.doctor(body.getAttribute('data-lead'));
  var out = body.querySelector('[data-tx-next]');
  if (doc && out && T.opdDays && T.slotsFor) {
    var now = new Date(), days = T.opdDays(doc, 6);
    for (var i = 0; i < days.length; i++) {
      var d = days[i], isToday = T.iso(d) === T.iso(now);
      var open = T.slotsFor(doc, d).filter(function (s) {
        if (s.full) return false;
        if (!isToday) return true;
        var p = s.time.split(':');
        return (+p[0] * 60 + +p[1]) > now.getHours() * 60 + now.getMinutes();
      })[0];
      if (open) { out.textContent = (isToday ? 'Today' : T.fmtDate(d)) + ', ' + open.time; break; }
    }
  }
  var pr = document.querySelector('#dlg-prep [data-print]');
  if (pr) pr.addEventListener('click', function () { window.print(); });
})();
