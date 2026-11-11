/* Cookie consent
   HubSpot tracking and Google Tag Manager load for every visitor; declining (or a Global Privacy
   Control signal) tells HubSpot not to track and removes its cookies, and sets Google consent mode to
   denied so Google Analytics stops setting cookies. Any other script that should wait for consent can be
   written as <script type="text/plain" data-consent="analytics" data-src="..."> and only runs once
   the visitor accepts. The choice is saved in localStorage; "Cookie settings" in the footer reopens
   the banner. HubSpot's own banner is turned off so visitors only see this one. */
(function () {
  var KEY = 'wbr-consent';
  var VERSION = 1; // bump to ask everyone again after the policy changes
  window.disableHubSpotCookieBanner = true;
  window._hsp = window._hsp || [];
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function googleConsent(analytics) {
    var v = analytics ? 'granted' : 'denied';
    return { analytics_storage: v, ad_storage: v, ad_user_data: v, ad_personalization: v };
  }

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      return v && v.v === VERSION ? v : null;
    } catch (e) { return null; }
  }
  function save(analytics) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics: analytics, at: new Date().toISOString() })); } catch (e) {}
  }

  function enableAnalytics() {
    window.gtag('consent', 'update', googleConsent(true));
    // clear HubSpot's opt-out marker in case the visitor declined earlier
    var host = location.hostname.split('.').slice(-2).join('.');
    ['', '; domain=' + location.hostname, '; domain=.' + host].forEach(function (d) {
      document.cookie = '__hs_do_not_track=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
    });
    window._hsp.push(['setHubSpotConsent', { analytics: true, advertisement: true, functionality: true }]);
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
    // stops HubSpot tracking this visitor and removes its cookies; Google stops setting cookies
    window.gtag('consent', 'update', googleConsent(false));
    window._hsp.push(['revokeCookieConsent']);
    window._hsq = window._hsq || [];
    window._hsq.push(['doNotTrack']);
  }

  // Google's default must be set before Tag Manager loads, so it runs straight away rather than in start()
  var initial = read();
  window.gtag('consent', 'default', googleConsent(initial ? initial.analytics : !navigator.globalPrivacyControl));

  var banner;
  function close() {
    if (!banner) return;
    banner.classList.remove('is-in');
    setTimeout(function () { if (banner) { banner.remove(); banner = null; } }, 400);
  }
  function choose(analytics) {
    save(analytics);
    if (analytics) enableAnalytics();
    else disableAnalytics();
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
      'You can decline analytics cookies at any time. <a href="#" data-placeholder class="cookie__link">Cookie Policy</a></p>' +
      '<div class="cookie__prefs"' + (withSettings ? '' : ' hidden') + '>' +
        '<label class="cookie__opt"><input type="checkbox" checked disabled> <span><b>Essential</b> Needed for the site and the quote form to work.</span></label>' +
        '<label class="cookie__opt"><input type="checkbox" id="cookie-analytics"' + (cur && !cur.analytics ? '' : ' checked') + '> <span><b>Analytics &amp; marketing</b> HubSpot tracking that shows us which pages help.</span></label>' +
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
      if (e.target.closest('[data-placeholder]')) e.preventDefault();
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
    else if (cur) disableAnalytics();
    if (!cur) open(false);
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-cookie-settings]')) { e.preventDefault(); open(true); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
