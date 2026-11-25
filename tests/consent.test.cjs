const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createConsentController, allowTemplateScript, STORAGE_KEY, VERSION, MAX_AGE, BLOCKED_TAG_TYPES } = require('../consent.js');

function memoryStorage(initial = null) {
  const values = new Map(initial === null ? [] : [[STORAGE_KEY, initial]]);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}
function record(analytics, marketing, now = Date.now()) {
  return JSON.stringify({ version: VERSION, analytics, marketing, updatedAt: now - 100, expiresAt: now + MAX_AGE - 100 });
}
function browser(storage = memoryStorage(), { homepage = false, sectionTop = 900, observe = true } = {}) {
  const scripts = [];
  const handlers = {};
  const documentHandlers = {};
  const panels = [];
  let reloads = 0;
  let observerDisconnected = false;

  // Minimal DOM fixture: controls and their initial attributes come from the real markup.
  function element(tag, attributes = '') {
    const listeners = {};
    const children = new Map();
    const attrs = Object.fromEntries(Array.from(attributes.matchAll(/([\w-]+)(?:="([^"]*)")?/g), match => [match[1], match[2] ?? '']));
    const node = {
      tag, hidden: Object.hasOwn(attrs, 'hidden'), checked: Object.hasOwn(attrs, 'checked'),
      dataset: {}, innerHTML: '', isConnected: true,
      setAttribute: (name, value) => { attrs[name] = value; },
      addEventListener: (name, callback) => { listeners[name] = callback; },
      focus: () => { document.activeElement = node; },
      matches: selector => selector.startsWith('#') ? attrs.id === selector.slice(1)
        : selector.startsWith('.') ? (attrs.class || '').split(' ').includes(selector.slice(1))
        : selector.startsWith('[') ? (() => {
          const [, key, value] = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
          return Object.hasOwn(attrs, key) && (value === undefined || attrs[key] === value);
        })() : tag === selector,
      closest: selector => node.matches(selector) ? node : null,
      querySelector(selector) {
        if (children.has(selector)) return children.get(selector);
        for (const match of node.innerHTML.matchAll(/<([a-z][\w-]*)(\s[^>]*?)?>/g)) {
          const child = element(match[1], match[2] || '');
          if (child.matches(selector)) { children.set(selector, child); return child; }
        }
        return null;
      },
      click: target => listeners.click?.({ target: target || node }),
    };
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('data-')) node.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
    return node;
  }

  const settings = element('button', 'data-cookie-settings hidden');
  const document = {
    currentScript: { src: 'https://example.test/Portfolio/consent.js', dataset: homepage ? { consentStart: 'main' } : {} },
    cookie: '', readyState: 'loading',
    createElement: element,
    head: { append: script => scripts.push(script) },
    body: { append: panel => panels.push(panel) },
    addEventListener: (event, callback) => { documentHandlers[event] = callback; },
    getElementById: id => id === 'main' ? { getBoundingClientRect: () => ({ top: sectionTop }) } : null,
    querySelectorAll: selector => selector === '[data-cookie-settings]' ? [settings] : [],
  };
  const window = {
    localStorage: storage,
    innerHeight: 900,
    location: { pathname: '/Portfolio/projects/content-analytics.html', hostname: 'example.test', reload: () => reloads++ },
    addEventListener: (event, callback) => { handlers[event] = callback; },
    removeEventListener: event => { delete handlers[event]; },
  };
  if (observe) window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; }
    observe() { handlers.intersection = this.callback; }
    disconnect() { observerDisconnected = true; }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../consent.js'), 'utf8'), { window, document, URL });
  return {
    window, document, scripts, handlers, storage, settings, reloads: () => reloads,
    initialize: () => documentHandlers.DOMContentLoaded(),
    panel: () => panels[0],
    scrollPartway: () => { sectionTop = 300; handlers.scroll?.(); },
    reachContent: () => { sectionTop = 0; (handlers.scroll || handlers.intersection)?.(); },
    observerDisconnected: () => observerDisconnected,
    clickAction: action => panels[0].click(panels[0].querySelector(`[data-cookie-action="${action}"]`)),
  };
}

test('new visitors have no optional consent', () => {
  const controller = createConsentController();
  assert.deepEqual(controller.getConsent(), { necessary: true, analytics: false, marketing: false, hasChoice: false });
});
test('granular choices persist with a bounded lifetime', () => {
  const storage = memoryStorage();
  const controller = createConsentController({ storage, now: () => 1000 });
  controller.choose({ analytics: true, marketing: false });
  const saved = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(saved.expiresAt, 1000 + MAX_AGE);
  assert.equal(saved.version, VERSION);
  const restored = createConsentController({ storage, now: () => 1001 }).getConsent();
  assert.equal(restored.analytics, true);
  assert.equal(restored.marketing, false);
  assert.equal(restored.necessary, true);
});
test('rejecting optional categories replaces a previous grant', () => {
  const storage = memoryStorage(record(true, true));
  const controller = createConsentController({ storage });
  controller.choose({ analytics: false, marketing: false, necessary: false });
  assert.equal(controller.getConsent().analytics, false);
  assert.equal(controller.getConsent().marketing, false);
  assert.equal(controller.getConsent().necessary, true);
  assert.equal(createConsentController({ storage }).getConsent().analytics, false);
});
test('malformed, expired, wrong-version or non-boolean records cannot grant consent', () => {
  for (const saved of [
    '{broken', 'null', '{}',
    JSON.stringify({ version: VERSION, analytics: 'true', marketing: false, updatedAt: 1, expiresAt: 2 }),
    JSON.stringify({ version: VERSION, analytics: true, marketing: true, updatedAt: 0, expiresAt: 1 }),
    JSON.stringify({ version: VERSION + 1, analytics: true, marketing: true, updatedAt: 0, expiresAt: MAX_AGE }),
  ]) assert.equal(createConsentController({ storage: memoryStorage(saved) }).getConsent().hasChoice, false);
});
test('unavailable storage does not break privacy choices or grant consent on a new visit', () => {
  const storage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  const controller = createConsentController({ storage });
  assert.equal(controller.getConsent().analytics, false);
  assert.doesNotThrow(() => controller.choose({ analytics: true, marketing: false }));
  assert.equal(controller.getConsent().analytics, true);
  assert.equal(createConsentController({ storage }).getConsent().analytics, false);
});
test('consent snapshots cannot mutate internal state', () => {
  const controller = createConsentController();
  const snapshot = controller.getConsent();
  snapshot.analytics = true;
  assert.equal(controller.getConsent().analytics, false);
});
test('refresh notices consent changes from another tab', () => {
  const storage = memoryStorage(record(true, false));
  const controller = createConsentController({ storage });
  let previous;
  controller.subscribe((choice, old) => { previous = old; });
  storage.setItem(STORAGE_KEY, record(false, false));
  controller.refresh();
  assert.equal(previous.analytics, true);
  assert.equal(controller.getConsent().analytics, false);
});
test('template policy permits the portfolio Google tag while limiting optional scripts', () => {
  const on = { analytics: true };
  const off = { analytics: false };
  assert.equal(allowTemplateScript(on, 'https://scripts.simpleanalyticscdn.com/latest.js'), false);
  assert.equal(allowTemplateScript(on, 'https://scripts.simpleanalyticscdn.com/auto-events.js'), true);
  assert.equal(allowTemplateScript(off, 'https://scripts.simpleanalyticscdn.com/auto-events.js'), false);
  assert.equal(allowTemplateScript(on, 'https://www.googletagmanager.com/gtag/js?id=G-N6EYH2KSBC'), true);
  assert.equal(allowTemplateScript(off, 'https://www.googletagmanager.com/gtag/js?id=G-N6EYH2KSBC'), true);
  for (const url of [
    'https://consent.cookiebot.com/uc.js',
    'https://scripts.simpleanalyticscdn.com.evil.test/latest.js',
    'http://scripts.simpleanalyticscdn.com/latest.js',
    'https://scripts.simpleanalyticscdn.com/not-audited.js',
    'https://www.googletagmanager.com/gtag/js?id=AW-1234',
    'invalid',
  ]) assert.equal(allowTemplateScript(on, url), false);
  assert.equal(allowTemplateScript(off, 'https://scripts.simpleanalyticscdn.com/latest.js'), false);
});
function googleState(page) {
  return page.window.dataLayer.filter(message => message[0] === 'consent').at(-1)[2];
}

test('first visit sets all four Google consent defaults before loading GTM', () => {
  const page = browser(memoryStorage(), { homepage: true });
  const layer = page.window.dataLayer;
  assert.equal(layer.at(-2)[1], 'default');
  assert.equal(layer.at(-1).event, 'gtm.js');
  assert.equal(page.scripts.length, 1);
  for (const key of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
    assert.equal(googleState(page)[key], 'denied');
  }
});

test('saved rejection and marketing-only choices keep analytics storage denied', () => {
  for (const marketing of [false, true]) {
    const page = browser(memoryStorage(record(false, marketing)));
    assert.equal(page.scripts.length, 1);
    assert.equal(googleState(page).analytics_storage, 'denied');
    assert.equal(googleState(page).ad_storage, marketing ? 'granted' : 'denied');
  }
});

test('stored analytics consent loads the existing container once after defaults and policies', () => {
  const page = browser(memoryStorage(record(true, false)));
  assert.equal(page.scripts.length, 1);
  assert.match(page.scripts[0].src, /GTM-NGJ5Q7GR$/);
  const layer = page.window.dataLayer;
  assert.deepEqual(Array.from(layer[0]['gtm.blocklist']), BLOCKED_TAG_TYPES);
  assert.equal(layer[1][0], 'policy');
  assert.equal(layer[1][1], 'inject_script');
  assert.equal(layer[2][1], 'default');
  assert.equal(layer[2][2].analytics_storage, 'denied');
  assert.equal(layer[3][1], 'update');
  assert.equal(layer[3][2].analytics_storage, 'granted');
  assert.equal(layer[3][2].ad_storage, 'denied');
  assert.equal(layer.at(-1).event, 'gtm.js');
});
test('withdrawal in another tab returns GA4 to denied without reloading the page', () => {
  const storage = memoryStorage(record(true, true));
  const page = browser(storage);
  storage.setItem(STORAGE_KEY, record(false, false));
  page.handlers.storage({ key: STORAGE_KEY });
  assert.equal(page.window.PortfolioConsent.getConsent().analytics, false);
  assert.equal(googleState(page).analytics_storage, 'denied');
  assert.equal(page.reloads(), 0);
  assert.equal(page.scripts.length, 1);
});
test('a grant from another tab can start tracking, without creating duplicate loaders', () => {
  const storage = memoryStorage();
  const page = browser(storage);
  storage.setItem(STORAGE_KEY, record(true, false));
  page.handlers.storage({ key: STORAGE_KEY });
  page.handlers.storage({ key: STORAGE_KEY });
  assert.equal(page.scripts.length, 1);
});

test('the homepage starts GTM and keeps its banner off the hero, with two initial actions', () => {
  const page = browser(memoryStorage(), { homepage: true });
  page.initialize();
  const panel = page.panel();
  assert.equal(panel.hidden, true);
  assert.equal(page.scripts.length, 1);
  assert.equal(googleState(page).analytics_storage, 'denied');
  page.scrollPartway();
  assert.equal(panel.hidden, true);
  assert.equal(page.scripts.length, 1);
  page.reachContent();
  assert.equal(panel.hidden, false);
  assert.equal(panel.querySelector('.cookie-options').hidden, true);
  for (const action of ['accept', 'customize']) assert.equal(panel.querySelector(`[data-cookie-action="${action}"]`).hidden, false);
  for (const action of ['reject', 'save']) assert.equal(panel.querySelector(`[data-cookie-action="${action}"]`).hidden, true);
  assert.equal(page.scripts.length, 1);
  assert.equal(page.observerDisconnected(), true);
});

test('Customize reveals Reject and Save without granting consent, and Reject preserves denied Google storage', () => {
  const page = browser();
  page.initialize();
  page.clickAction('customize');
  const panel = page.panel();
  assert.equal(panel.querySelector('.cookie-options').hidden, false);
  for (const action of ['reject', 'save']) assert.equal(panel.querySelector(`[data-cookie-action="${action}"]`).hidden, false);
  for (const action of ['accept', 'customize']) assert.equal(panel.querySelector(`[data-cookie-action="${action}"]`).hidden, true);
  assert.equal(page.window.PortfolioConsent.getConsent().hasChoice, false);
  assert.equal(page.scripts.length, 1);
  page.clickAction('reject');
  assert.equal(panel.hidden, true);
  assert.equal(JSON.parse(page.storage.getItem(STORAGE_KEY)).analytics, false);
  assert.equal(page.scripts.length, 1);
});

test('accepting after the hero updates consent in place and settings can reopen the saved choice', () => {
  const page = browser(memoryStorage(), { homepage: true });
  page.initialize();
  page.reachContent();
  page.clickAction('accept');
  assert.equal(googleState(page).analytics_storage, 'granted');
  assert.equal(page.scripts.length, 1);
  assert.equal(page.panel().hidden, true);
  assert.equal(JSON.parse(page.storage.getItem(STORAGE_KEY)).analytics, true);
  page.settings.click();
  assert.equal(page.panel().hidden, false);
  assert.equal(page.panel().querySelector('.cookie-options').hidden, false);
  assert.equal(page.panel().querySelector('[data-cookie-action="reject"]').hidden, false);
  page.clickAction('reject');
  assert.equal(page.reloads(), 0);
  assert.equal(googleState(page).analytics_storage, 'denied');
});

test('remembered analytics consent takes effect on the homepage hero', () => {
  const page = browser(memoryStorage(record(true, false)), { homepage: true });
  assert.equal(page.scripts.length, 1);
  page.initialize();
  assert.equal(page.scripts.length, 1);
  assert.equal(page.panel().hidden, true);
  page.reachContent();
  page.reachContent();
  assert.equal(page.scripts.length, 1);
  assert.equal(page.panel().hidden, true);
});

test('a cross-tab grant on the hero updates consent before scrolling', () => {
  const storage = memoryStorage();
  const page = browser(storage, { homepage: true });
  page.initialize();
  storage.setItem(STORAGE_KEY, record(true, false));
  page.handlers.storage({ key: STORAGE_KEY });
  assert.equal(page.scripts.length, 1);
  page.reachContent();
  assert.equal(page.scripts.length, 1);
  assert.equal(page.panel().hidden, true);
});

test('a rejection before leaving the hero is respected when the content gate opens', () => {
  const storage = memoryStorage(record(true, false));
  const page = browser(storage, { homepage: true });
  page.initialize();
  storage.setItem(STORAGE_KEY, record(false, false));
  page.handlers.storage({ key: STORAGE_KEY });
  page.reachContent();
  assert.equal(page.scripts.length, 1);
  assert.equal(page.panel().hidden, true);
});

test('anchor navigation past the hero unlocks the gate, with a scroll fallback for older browsers', () => {
  const anchored = browser(memoryStorage(record(true, false)), { homepage: true, sectionTop: -100 });
  anchored.initialize();
  assert.equal(anchored.scripts.length, 1);
  const fallback = browser(memoryStorage(), { homepage: true, observe: false });
  fallback.initialize();
  assert.equal(fallback.panel().hidden, true);
  fallback.reachContent();
  assert.equal(fallback.panel().hidden, false);
  assert.equal(fallback.scripts.length, 1);
});

test('saving customized categories applies the checkbox choices without enabling analytics implicitly', () => {
  const page = browser();
  page.initialize();
  page.clickAction('customize');
  page.panel().querySelector('#cookie-marketing').checked = true;
  page.clickAction('save');
  assert.equal(page.window.PortfolioConsent.getConsent().analytics, false);
  assert.equal(page.window.PortfolioConsent.getConsent().marketing, true);
  assert.equal(page.scripts.length, 1);
});

test('a saved choice and a subsequent rejection are queued before their corresponding events', () => {
  const page = browser(memoryStorage(record(true, false)));
  page.initialize();
  page.settings.click();
  page.clickAction('reject');
  const layer = page.window.dataLayer;
  const updates = layer.filter(entry => entry.event === 'portfolio_consent_update');
  assert.equal(updates.length, 2);
  for (const event of updates) {
    const command = layer[layer.indexOf(event) - 1];
    assert.equal(command[1], 'update');
    assert.equal(command[2].analytics_storage, event.portfolio_consent.analytics ? 'granted' : 'denied');
  }
  assert.equal(page.reloads(), 0);
});

test('only request a reload on withdrawal if optional event listeners were allowed to load', () => {
  const page = browser(memoryStorage(record(true, false)));
  page.initialize();
  const policy = page.window.dataLayer[1][2];
  assert.equal(policy('GTM-NGJ5Q7GR', 'inject_script', { url: 'https://scripts.simpleanalyticscdn.com/auto-events.js' }), true);
  page.settings.click();
  page.clickAction('reject');
  assert.equal(page.reloads(), 1);
  assert.equal(googleState(page).analytics_storage, 'denied');
  assert.equal(policy('GTM-NGJ5Q7GR', 'inject_script', { url: 'https://scripts.simpleanalyticscdn.com/auto-events.js' }), false);
});
