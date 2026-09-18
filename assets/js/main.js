/* Mobile navigation toggle */
(function () {
  var toggle = document.querySelector('.nav__toggle');
  var nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      toggle.focus();
    }
  });

  // Reset when resizing back to desktop
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }
  });
})();

/* Glass header: transparent over the hero, frosted once scrolled */
(function () {
  var header = document.querySelector('.site-header');
  if (!header || !header.classList.contains('site-header--overlay')) return;

  var trigger = 40;
  var ticking = false;

  function update() {
    header.classList.toggle('is-stuck', window.scrollY > trigger);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
})();

/* Scroll-spy: highlight the nav link for the section in view (single-page sites) */
(function () {
  var links = [].slice.call(document.querySelectorAll('.nav__list a[href*="#"]'));
  var pairs = links.map(function (a) {
    var hash = a.getAttribute('href').split('#')[1];
    var el = hash && document.getElementById(hash);
    return el ? { a: a, el: el } : null;
  }).filter(Boolean);
  if (!pairs.length) return;

  var all = [].slice.call(document.querySelectorAll('.nav__list a'));
  var homeLink = all.filter(function (a) { return a.getAttribute('href').indexOf('#') === -1; })[0] || null;
  var current = null;

  function setActive(a) {
    if (a === current) return;
    all.forEach(function (l) { l.removeAttribute('aria-current'); });
    if (a) a.setAttribute('aria-current', 'page');
    current = a;
  }

  function update() {
    var headerH = (document.querySelector('.site-header') || {}).offsetHeight || 76;
    var line = headerH + Math.min(window.innerHeight * 0.35, 260);
    var best = null;
    pairs.forEach(function (p) {
      var top = p.el.getBoundingClientRect().top;
      if (top <= line && (!best || top > best.top)) best = { p: p, top: top };
    });
    if (best) setActive(best.p.a);
    else setActive(homeLink);
  }

  var pending = false;
  window.addEventListener('scroll', function () {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; update(); }, 60);
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
