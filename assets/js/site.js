/* Header: frosted once scrolled; mobile menu */
(function () {
  var top = document.querySelector('.top');
  var menu = document.querySelector('.menu');
  var nav = document.getElementById('nav');

  function onScroll() { top.classList.toggle('is-stuck', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setOpen(open) {
    top.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menu.addEventListener('click', function () { setOpen(menu.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && top.classList.contains('is-open')) { setOpen(false); menu.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 900) setOpen(false); });
})();

/* Scroll-spy for the nav */
(function () {
  var links = [].slice.call(document.querySelectorAll('.nav a'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      links.forEach(function (a, i) { a.classList.toggle('is-active', sections[i] === en.target); });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(function (s) { if (s) io.observe(s); });
})();

/* Materials tabs (all panels stay visible without JS) */
(function () {
  var root = document.querySelector('[data-tabs]');
  if (!root) return;
  var tabs = [].slice.call(root.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });

  function select(i, focus) {
    tabs.forEach(function (t, j) {
      var on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    if (focus) tabs[i].focus();
    // keep the active tab visible in the horizontally scrolling strip (mobile) without moving the page
    var strip = tabs[i].parentNode, t = tabs[i];
    if (t.offsetLeft < strip.scrollLeft || t.offsetLeft + t.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = t.offsetLeft - 16;
    }
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      select(i);
      history.replaceState(null, '', '#' + panels[i].id);
    });
    t.addEventListener('keydown', function (e) {
      var n = tabs.length, k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
        e.preventDefault();
        var next = k === 'Home' ? 0 : k === 'End' ? n - 1 : (i + (k === 'ArrowRight' ? 1 : -1) + n) % n;
        select(next, true);
      }
    });
  });

  // Deep links (e.g. old /paper URL redirects to /#paper)
  function fromHash() {
    var i = panels.findIndex(function (p) { return '#' + p.id === location.hash; });
    if (i < 0) return false;
    select(i);
    document.getElementById('materials').scrollIntoView();
    return true;
  }
  root.classList.add('is-ready');
  if (!fromHash()) select(0);
  window.addEventListener('hashchange', fromHash);
})();

document.getElementById('year').textContent = new Date().getFullYear();
