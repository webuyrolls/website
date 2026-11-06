(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header: frosted once scrolled; mobile menu */
  var top = document.querySelector('.top');
  var menu = document.querySelector('.menu');
  var nav = document.getElementById('nav');
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
  window.addEventListener('resize', function () { if (window.innerWidth > 860) setOpen(false); });

  /* Hero: rotating word, letters roll up out of a mask */
  var words = [].slice.call(document.querySelectorAll('.rot__w'));
  words.forEach(function (w) {
    var text = w.textContent;
    w.textContent = '';
    for (var i = 0; i < text.length; i++) {
      var c = document.createElement('span');
      c.className = 'ch';
      c.style.setProperty('--i', i);
      c.textContent = text[i];
      w.appendChild(c);
    }
  });
  var cur = 0;
  if (words.length) requestAnimationFrame(function () { requestAnimationFrame(function () { words[0].classList.add('is-on'); }); });
  if (!reduce && words.length > 1) {
    setInterval(function () {
      if (document.hidden) return;
      var prev = words[cur];
      cur = (cur + 1) % words.length;
      prev.classList.remove('is-on');
      prev.classList.add('is-out');
      setTimeout(function () { prev.classList.remove('is-out'); }, 900);
      words[cur].classList.add('is-on');
    }, 2400);
  }

  /* Headings that reveal word by word */
  [].slice.call(document.querySelectorAll('.split')).forEach(function (el) {
    var parts = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = parts.map(function (p, i) {
      return '<span class="w" aria-hidden="true"><span style="--i:' + i + '">' + p + '</span></span>';
    }).join(' ');
  });

  /* Scroll reveals; siblings in the same parent stagger */
  var revealEls = [].slice.call(document.querySelectorAll('.reveal, .split'));
  revealEls.forEach(function (el) {
    if (!el.classList.contains('reveal')) return;
    var sibs = [].slice.call(el.parentNode.children).filter(function (s) { return s.classList.contains('reveal'); });
    var idx = sibs.indexOf(el);
    if (idx > 0) el.style.setProperty('--delay', Math.min(idx * 0.08, 0.5) + 's');
  });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* Count-up stats */
  var counters = [].slice.call(document.querySelectorAll('[data-count]'));
  function countUp(el) {
    var end = +el.getAttribute('data-count'), t0 = null, dur = 1600;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(end * e).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: .6 });
    counters.forEach(function (c) { c.textContent = '0'; cio.observe(c); });
  }

  /* Scroll-driven: pitch sequence, hero rolls parallax, photo drift (homepage blocks are optional) */
  var pitch = document.querySelector('.pitch');
  var steps = pitch ? [].slice.call(pitch.querySelectorAll('[data-step]')) : [];
  var bar = pitch && pitch.querySelector('.pitch__bar');
  var hero = document.querySelector('.hero');
  var rolls = [].slice.call(document.querySelectorAll('.roll'));
  var bgs = [].slice.call(document.querySelectorAll('.bg img'));
  var links = [].slice.call(nav.querySelectorAll('a'));
  var targets = links.map(function (a) {
    var h = a.getAttribute('href');
    return h.charAt(0) === '#' ? document.querySelector(h) : null;
  });
  var ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    top.classList.toggle('is-stuck', window.scrollY > 24);

    if (reduce) { steps.forEach(function (s) { s.classList.add('on'); }); return; }

    // pitch: 0..1 progress through the tall section
    if (pitch) {
      var r = pitch.getBoundingClientRect();
      var p = Math.min(Math.max(-r.top / (r.height - vh), 0), 1);
      bar.style.setProperty('--p', p.toFixed(3));
      var active = r.top < vh * .35 ? Math.floor(p * 4.6) + 1 : 0;
      steps.forEach(function (s) { s.classList.toggle('on', +s.getAttribute('data-step') <= active); });
    }

    // hero rolls drift at different speeds
    if (hero) {
      var hy = Math.max(0, -hero.getBoundingClientRect().top);
      rolls.forEach(function (el, i) { el.style.setProperty('--py', (-hy * [0.35, 0.6, 0.85][i]).toFixed(1)); });
    }

    // background photos drift slightly slower than the page
    bgs.forEach(function (img) {
      var b = img.parentNode.getBoundingClientRect();
      if (b.bottom < 0 || b.top > vh) return;
      img.style.setProperty('--shift', (-(b.top + b.height / 2 - vh / 2) * 0.12 - b.height * 0.07).toFixed(1) + 'px');
    });

    // nav highlight
    var mid = vh * .4, best = -1;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top < mid) best = i; });
    links.forEach(function (a, i) { a.classList.toggle('is-active', i === best); });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();

  /* HubSpot form: loads only when portal and form IDs are set on #hubspot-form */
  var slot = document.getElementById('hubspot-form');
  var portal = slot && slot.getAttribute('data-portal-id'), formId = slot && slot.getAttribute('data-form-id');
  if (portal && formId) {
    document.getElementById('fallback-form').hidden = true;
    var s = document.createElement('script');
    s.src = 'https://js.hsforms.net/forms/embed/v2.js';
    s.onload = function () {
      window.hbspt.forms.create({ region: slot.getAttribute('data-region') || 'na1', portalId: portal, formId: formId, target: '#hubspot-form', css: '' });
    };
    document.body.appendChild(s);
  }

  /* Policy links are placeholders until their pages exist */
  [].slice.call(document.querySelectorAll('[data-placeholder]')).forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); });
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
