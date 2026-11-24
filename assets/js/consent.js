/* Cookie consent, matching the Privacy Policy's "Cookie categories and choices" section
   Analytics (Google Analytics 4 through Google Tag Manager, and Microsoft Clarity) is off until the visitor
   accepts: Google consent mode starts denied, and Clarity only loads after Accept. HubSpot tracking is always
   on and the banner does not change it. A Global Privacy Control signal counts as declining. Any other script
   that should wait for consent can be written as
   <script type="text/plain" data-consent="analytics" data-src="..."> and only runs once the visitor accepts.
   The choice is saved in localStorage for 12 months; "Cookie settings" in the footer reopens the banner, and
   withdrawing consent reloads the page. HubSpot's own banner is turned off so visitors only see this one. */
(function () {
  var KEY = 'wbr-consent';
  var VERSION = 2; // bump to ask everyone again after the policy changes
  var MAX_AGE = 365 * 24 * 60 * 60 * 1000; // ask again after 12 months
  window.disableHubSpotCookieBanner = true;
  window._hsp = window._hsp || [];
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  // same queue as Clarity's own snippet, so consent calls made before it loads are kept
  window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };

  function googleConsent(analytics) {
    var v = analytics ? 'granted' : 'denied';
    return { analytics_storage: v, ad_storage: v, ad_user_data: v, ad_personalization: v };
  }

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      return v && v.v === VERSION && Date.now() - new Date(v.at).getTime() < MAX_AGE ? v : null;
    } catch (e) { return null; }
  }
  function save(analytics) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics: analytics, at: new Date().toISOString() })); } catch (e) {}
  }

  function clarityConsent(analytics) {
    var v = analytics ? 'granted' : 'denied';
    window.clarity('consentv2', { ad_Storage: v, analytics_Storage: v });
  }

  function expire(name) {
    var host = location.hostname.split('.').slice(-2).join('.');
    ['', '; domain=' + location.hostname, '; domain=.' + host].forEach(function (d) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
    });
  }

  function enableAnalytics() {
    window.gtag('consent', 'update', googleConsent(true));
    clarityConsent(true);
    // loads Clarity and anything else waiting for consent
    [].slice.call(document.querySelectorAll('script[type="text/plain"][data-consent="analytics"]')).forEach(function (old) {
      var s = document.createElement('script');
      for (var i = 0; i < old.attributes.length; i++) {
        var a = old.attributes[i];
        if (a.name === 'type' || a.name === 'data-src' || a.name === 'data-consent') continue;
        s.setAttribute(a.name, a.value);
      }
      s.src = old.getAttribute('data-src');
      old.parentNode.replaceChild(s, old);
    });
  }
  function disableAnalytics() {
    window.gtag('consent', 'update', googleConsent(false));
    // consent mode stops new Google Analytics cookies but leaves existing ones, so remove them and Clarity's
    document.cookie.split('; ').forEach(function (c) {
      var name = c.split('=')[0];
      if (/^_ga(_|$)|^_cl(ck|sk)$/.test(name)) expire(name);
    });
  }

  // Google's default must be set before Tag Manager loads, so it runs straight away rather than in start()
  var initial = read();
  window.gtag('consent', 'default', googleConsent(!!(initial && initial.analytics)));

  // HubSpot is always on: clear the opt-out marker an earlier version of this banner set for visitors who declined
  expire('__hs_do_not_track');
  window._hsp.push(['setHubSpotConsent', { analytics: true, advertisement: true, functionality: true }]);

  var banner;
  function close() {
    if (!banner) return;
    banner.classList.remove('is-in');
    setTimeout(function () { if (banner) { banner.remove(); banner = null; } }, 400);
  }
  function choose(analytics) {
    var prev = read();
    save(analytics);
    if (analytics) enableAnalytics();
    else {
      disableAnalytics();
      // withdrawing consent stops Clarity (it only loads after Accept) and reloads the page so scripts
      // that already loaded stop running
      if (prev && prev.analytics) {
        clarityConsent(false);
        window.clarity('consent', false); // also erases Clarity's cookies
        location.reload();
        return;
      }
    }
    close();
  }

  function open(withSettings) {
    if (banner) return;
    var cur = read();
    banner = document.createElement('section');
    banner.className = 'cookie';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-labelledby', 'cookie-h');
    banner.innerHTML =
      '<h2 class="cookie__h" id="cookie-h">Cookies</h2>' +
      '<p class="cookie__p">We use cookies to see how visitors use this site and to follow up on quote requests. ' +
      'Analytics cookies stay off unless you accept them. <a href="/privacy-policy#cookie-categories-and-choices" class="cookie__link">Cookie Policy</a></p>' +
      '<div class="cookie__prefs"' + (withSettings ? '' : ' hidden') + '>' +
        '<label class="cookie__opt"><input type="checkbox" checked disabled> <span><b>Essential</b> Needed for the site and the quote form to work.</span></label>' +
        '<label class="cookie__opt"><input type="checkbox" id="cookie-analytics"' + (cur && cur.analytics ? ' checked' : '') + '> <span><b>Analytics</b> Google Analytics and Microsoft Clarity, which show us which pages help.</span></label>' +
        '<label class="cookie__opt"><input type="checkbox" checked disabled> <span><b>HubSpot</b> Always on. Connects site visits with quote requests.</span></label>' +
      '</div>' +
      '<div class="cookie__actions">' +
        '<button type="button" class="btn btn--sm" data-c="accept">Accept all</button>' +
        '<button type="button" class="btn btn--sm btn--line" data-c="decline">Decline</button>' +
        '<button type="button" class="cookie__more" data-c="' + (withSettings ? 'save' : 'settings') + '">' + (withSettings ? 'Save choices' : 'Settings') + '</button>' +
      '</div>';
    document.body.appendChild(banner);
    void banner.offsetWidth; // apply the start position so the slide-in transition runs
    banner.classList.add('is-in');

    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      var c = b.getAttribute('data-c');
      if (c === 'accept') choose(true);
      else if (c === 'decline') choose(false);
      else if (c === 'save') choose(banner.querySelector('#cookie-analytics').checked);
      else if (c === 'settings') {
        banner.querySelector('.cookie__prefs').hidden = false;
        b.setAttribute('data-c', 'save');
        b.textContent = 'Save choices';
        banner.querySelector('#cookie-analytics').focus();
      }
    });
  }

  function start() {
    var cur = read();
    // A Global Privacy Control signal counts as declining, so no banner is needed
    if (!cur && navigator.globalPrivacyControl) { save(false); cur = read(); }
    if (cur && cur.analytics) enableAnalytics();
    else disableAnalytics();
    if (!cur) open(false);
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-cookie-settings]')) { e.preventDefault(); open(true); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
