/* Portfolio consent. This script runs before any optional tracking loads. */
(() => {
  'use strict';

  const STORAGE_KEY = 'portfolio.consent.v1';
  const VERSION = 1;
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const CONTAINER_ID = 'GTM-NGJ5Q7GR';
  const MEASUREMENT_ID = 'G-N6EYH2KSBC';
  // Audited container: the Cookiebot template and its two Custom HTML workarounds.
  const BLOCKED_TAG_TYPES = ['cvt_57SF4', 'html'];

  function createConsentController({ storage = null, now = Date.now } = {}) {
    const listeners = new Set();
    const empty = () => ({ necessary: true, analytics: false, marketing: false, hasChoice: false });
    let state = read();

    function read() {
      try {
        const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
        if (
          saved?.version === VERSION &&
          typeof saved.analytics === 'boolean' && typeof saved.marketing === 'boolean' &&
          Number.isFinite(saved.updatedAt) && Number.isFinite(saved.expiresAt) &&
          saved.updatedAt <= now() && saved.expiresAt > now() &&
          saved.expiresAt - saved.updatedAt <= MAX_AGE
        ) {
          return { necessary: true, analytics: saved.analytics, marketing: saved.marketing, hasChoice: true };
        }
      } catch {
        // Unavailable or malformed storage never grants optional consent.
      }
      return empty();
    }

    function notify(previous) {
      listeners.forEach(listener => listener({ ...state }, previous));
    }

    return {
      getConsent: () => ({ ...state }),
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      choose(choice) {
        const previous = { ...state };
        state = { necessary: true, analytics: choice.analytics === true, marketing: choice.marketing === true, hasChoice: true };
        const updatedAt = now();
        try {
          storage?.setItem(STORAGE_KEY, JSON.stringify({
            version: VERSION, analytics: state.analytics, marketing: state.marketing,
            updatedAt, expiresAt: updatedAt + MAX_AGE,
          }));
        } catch {
          // The choice still applies to this visit when storage is unavailable.
        }
        notify(previous);
        return { ...state };
      },
      refresh() {
        const previous = { ...state };
        state = read();
        if (JSON.stringify(state) !== JSON.stringify(previous)) notify(previous);
        return { ...state };
      },
    };
  }

  function allowTemplateScript(consent, url) {
    if (!consent.analytics) return false;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return false;
      return (
        parsed.hostname === 'scripts.simpleanalyticscdn.com' &&
        ['/latest.js', '/auto-events.js'].includes(parsed.pathname)
      ) || (
        parsed.hostname === 'www.googletagmanager.com' &&
        parsed.pathname === '/gtag/js' && parsed.searchParams.get('id') === MEASUREMENT_ID
      );
    } catch {
      return false;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createConsentController, allowTemplateScript, STORAGE_KEY, VERSION, MAX_AGE, BLOCKED_TAG_TYPES };
    return;
  }

  let storage = null;
  try { storage = window.localStorage; } catch { /* Optional tracking stays off by default. */ }
  const controller = createConsentController({ storage });
  const consentScript = document.currentScript;
  const rootUrl = new URL('.', consentScript.src);
  const startSectionId = consentScript.dataset?.consentStart;
  let reachedContent = !startSectionId;
  let trackingLoaded = false;
  let openPanel = () => {};
  let showInitialPanel = () => {};

  window.PortfolioConsent = {
    getConsent: controller.getConsent,
    openPreferences: () => openPanel(),
    subscribe: controller.subscribe,
  };
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.dataLayer.push({ 'gtm.blocklist': BLOCKED_TAG_TYPES.slice() });
  window.gtag('policy', 'inject_script', (containerId, permissionId, data) => (
    reachedContent && containerId === CONTAINER_ID && allowTemplateScript(controller.getConsent(), data?.url)
  ));
  window.gtag('consent', 'default', googleConsent({ analytics: false, marketing: false }));

  function googleConsent(consent) {
    return {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
      functionality_storage: 'granted',
      personalization_storage: 'denied',
      security_storage: 'granted',
    };
  }

  function clearOptionalCookies(consent) {
    const analytics = /^(?:_ga(?:_|$)|_gid$|_gat(?:_|$)|_clck$|_clsk$|_hj)/;
    const marketing = /^(?:_fbp$|_fbc$|_gcl_|hubspotutk$|__hstc$|__hssc$|__hssrc$)/;
    const names = document.cookie.split(';').map(cookie => cookie.trim().split('=')[0]);
    const paths = new Set(['/', rootUrl.pathname, rootUrl.pathname.replace(/\/$/, '')]);
    const segments = window.location.pathname.split('/').filter(Boolean);
    for (let index = 1; index < segments.length; index++) paths.add('/' + segments.slice(0, index).join('/') + '/');
    const hosts = ['', window.location.hostname, '.' + window.location.hostname];
    names.forEach(name => {
      if (!name || !(name === 'CookieConsent' || (!consent.analytics && analytics.test(name)) || (!consent.marketing && marketing.test(name)))) return;
      paths.forEach(path => hosts.forEach(host => {
        document.cookie = `${name}=; Max-Age=0; Path=${path || '/'}${host ? '; Domain=' + host : ''}; SameSite=Lax`;
      }));
    });
  }

  function loadTracking(consent) {
    // The audited container contains GA4 and Simple Analytics, with no marketing tags.
    if (!reachedContent || !consent.analytics || trackingLoaded) return;
    trackingLoaded = true;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.id = 'portfolio-tag-manager';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${CONTAINER_ID}`;
    document.head.append(script);
  }

  function applyConsent(consent, previous) {
    clearOptionalCookies(consent);
    window.gtag('consent', 'update', googleConsent(consent));
    window.dataLayer.push({ event: 'portfolio_consent_update', portfolio_consent: { ...consent } });
    if (trackingLoaded && previous && (
      previous.analytics !== consent.analytics || previous.marketing !== consent.marketing
    )) {
      window[`ga-disable-${MEASUREMENT_ID}`] = !consent.analytics;
      window.location.reload();
      return;
    }
    loadTracking(consent);
  }

  applyConsent(controller.getConsent());
  controller.subscribe(applyConsent);
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) controller.refresh();
  });

  function initializeTrackingGate() {
    if (reachedContent) return;
    const section = document.getElementById(startSectionId);
    if (!section) return;
    let observer;

    function checkContentPosition() {
      // Wait until the hero has left view, including on anchor navigation or scroll restoration.
      if (section.getBoundingClientRect().top > 0) return;
      reachedContent = true;
      observer?.disconnect();
      window.removeEventListener('scroll', checkContentPosition);
      window.removeEventListener('resize', checkContentPosition);
      window.removeEventListener('load', checkContentPosition);
      loadTracking(controller.getConsent());
      showInitialPanel();
    }

    if (window.IntersectionObserver) {
      observer = new window.IntersectionObserver(checkContentPosition);
      observer.observe(section);
    }
    window.addEventListener('scroll', checkContentPosition, { passive: true });
    window.addEventListener('resize', checkContentPosition);
    window.addEventListener('load', checkContentPosition, { once: true });
    checkContentPosition();
  }

  function initializePanel() {
    const panel = document.createElement('section');
    panel.className = 'cookie-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 'cookie-panel-title');
    panel.hidden = !reachedContent || controller.getConsent().hasChoice;
    panel.innerHTML = `
      <div class="cookie-panel-heading">
        <h2 id="cookie-panel-title" tabindex="-1">Your privacy choices</h2>
        <button class="cookie-panel-close" type="button" aria-label="Close cookie settings" hidden>Close ×</button>
      </div>
      <p>Optional analytics help me understand visits to this portfolio. You can accept optional tracking, customize your preferences, or reject it.</p>
      <div class="cookie-options" hidden>
        <label><input type="checkbox" checked disabled><span>Necessary<small>Remembers your privacy choice and your chosen display theme. Always on.</small></span></label>
        <label><input id="cookie-analytics" type="checkbox"><span>Analytics<small>Google Analytics and Simple Analytics help me understand visits and interactions.</small></span></label>
        <label><input id="cookie-marketing" type="checkbox"><span>Marketing<small>Optional advertising measurement. No marketing tools currently run on this portfolio.</small></span></label>
      </div>
      <div class="cookie-actions">
        <button type="button" data-cookie-action="accept">Accept</button>
        <button type="button" data-cookie-action="customize">Customize</button>
        <button type="button" data-cookie-action="reject" hidden>Reject optional</button>
        <button type="button" data-cookie-action="save" hidden>Save preferences</button>
      </div>
      <a class="cookie-policy-link">Privacy &amp; cookies</a>
    `;
    panel.querySelector('.cookie-policy-link').href = new URL('privacy-policy.html', rootUrl).href;
    document.body.append(panel);
    const options = panel.querySelector('.cookie-options');
    const analytics = panel.querySelector('#cookie-analytics');
    const marketing = panel.querySelector('#cookie-marketing');
    const customize = panel.querySelector('[data-cookie-action="customize"]');
    const accept = panel.querySelector('[data-cookie-action="accept"]');
    const reject = panel.querySelector('[data-cookie-action="reject"]');
    const save = panel.querySelector('[data-cookie-action="save"]');
    const close = panel.querySelector('.cookie-panel-close');
    let opener = null;

    function syncInputs() {
      const consent = controller.getConsent();
      analytics.checked = consent.analytics;
      marketing.checked = consent.marketing;
      close.hidden = !consent.hasChoice;
    }
    function showOptions() {
      syncInputs();
      options.hidden = false;
      customize.hidden = true;
      accept.hidden = true;
      reject.hidden = false;
      save.hidden = false;
    }
    function hidePanel() {
      panel.hidden = true;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }
    openPanel = () => {
      opener = document.activeElement;
      panel.hidden = false;
      showOptions();
      panel.querySelector('#cookie-panel-title').focus({ preventScroll: true });
    };
    showInitialPanel = () => {
      if (!controller.getConsent().hasChoice) panel.hidden = false;
    };
    panel.addEventListener('click', event => {
      const action = event.target.closest('[data-cookie-action]')?.dataset.cookieAction;
      if (action === 'customize') { showOptions(); analytics.focus(); return; }
      if (action === 'reject') controller.choose({ analytics: false, marketing: false });
      else if (action === 'accept') controller.choose({ analytics: true, marketing: true });
      else if (action === 'save') controller.choose({ analytics: analytics.checked, marketing: marketing.checked });
      else return;
      hidePanel();
    });
    close.addEventListener('click', hidePanel);
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); hidePanel(); }
    });
    document.querySelectorAll('[data-cookie-settings]').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', openPanel);
    });
    controller.subscribe(() => { syncInputs(); hidePanel(); });
    syncInputs();
  }

  function initialize() {
    initializePanel();
    initializeTrackingGate();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
