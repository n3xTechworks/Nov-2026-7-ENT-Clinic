/* blog.html: filter count + "show all"; blog-N.html: share button + table-of-contents highlight */
(function () {
  'use strict';
  var T = window.Tridya || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* list page: count + empty-state reset (filtering itself is site.js data-filter-group) */
  var grid = $('[data-filter-target="posts"]'), count = $('#bl-count');
  if (grid && count) {
    grid.addEventListener('filtered', function (e) {
      var n = e.detail.shown; count.textContent = n + (n === 1 ? ' article' : ' articles');
      if (T.reveal) $$('.bl-card:not([hidden])', grid).forEach(function (c) { c.classList.add('in'); });
    });
    var all = $('[data-bl-all]');
    if (all) all.addEventListener('click', function () { var c = $('[data-filter="all"]'); if (c) c.click(); });
    /* deep link: blog.html?topic=ear */
    var topic = new URLSearchParams(location.search).get('topic');
    var chip = topic && $('[data-filter-group="posts"] [data-filter="' + topic.replace(/[^a-z]/g, '') + '"]');
    if (chip) chip.click();
  }

  /* article: share */
  var share = $('[data-share]');
  if (share) share.addEventListener('click', function () {
    var data = { title: document.title, url: location.href };
    if (navigator.share && !navigator.webdriver) { navigator.share(data).catch(function () {}); return; }
    var done = function () { if (T.toast) T.toast({ title: 'Link copied', text: 'Paste it into WhatsApp, email or SMS.', type: 'ok' }); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, done); else done();
  });

  /* article: highlight current section in "In this article" */
  var links = $$('.ar-toc a');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { links.forEach(function (a) { a.classList.remove('on'); }); var a = map[en.target.id]; if (a) a.classList.add('on'); }
      });
    }, { rootMargin: '-90px 0px -65% 0px' });
    $$('.ar-prose h2[id]').forEach(function (h) { io.observe(h); });
  }
})();
