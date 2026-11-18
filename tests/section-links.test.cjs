const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function page(script, id, hash = '#' + id) {
  const events = {};
  let focused = false;
  let scrolled = false;
  let replacedHash;
  const summary = {
    addEventListener: (name, callback) => { events['summary:' + name] = callback; },
    focus: () => { focused = true; },
  };
  const chapter = {
    id, open: false,
    matches: selector => selector === 'details.chapter',
    querySelector: selector => selector === 'summary' ? summary : null,
    scrollIntoView: () => { scrolled = true; },
  };
  const document = {
    body: {
      hasAttribute: name => name === 'data-section-links',
      classList: { contains: name => name === 'case-page' },
    },
    documentElement: { dataset: { theme: 'light' } },
    querySelector: () => null,
    querySelectorAll: selector => selector === 'details.chapter[id]' ? [chapter] : [],
    getElementById: target => target === id ? chapter : null,
  };
  const window = {
    location: { hash },
    addEventListener: (name, callback) => { events[name] = callback; },
    requestAnimationFrame: callback => callback(),
  };
  const history = { replaceState: (_, __, value) => { replacedHash = value; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', script), 'utf8'), { document, window, history });
  return { chapter, events, focused: () => focused, scrolled: () => scrolled, replacedHash: () => replacedHash };
}

for (const [script, id] of [['about.js', 'certificates'], ['projects/case-study.js', 'privacy-consent']]) {
  test(`${script}: direct section links open, focus and scroll without permalink icons`, () => {
    const linked = page(script, id);
    assert.equal(linked.chapter.open, true);
    assert.equal(linked.focused(), true);
    assert.equal(linked.scrolled(), true);
  });

  test(`${script}: opening a section keeps a copyable URL without extra link controls`, () => {
    const unlinked = page(script, id, '');
    assert.equal(unlinked.chapter.open, false);
    unlinked.events['summary:click']({ target: { closest: () => null }, defaultPrevented: false });
    assert.equal(unlinked.replacedHash(), '#' + id);
  });
}
