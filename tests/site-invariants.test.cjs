const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const mainPages = ['index.html','about.html','privacy-policy.html','projects/content-analytics.html','projects/astronomy-picture.html','projects/customer-analytics.html','projects/marketing-attribution.html','projects/rocket-clicker.html'];

test('every main page loads local consent controls and offers persistent settings access', () => {
  for (const file of mainPages) {
    const html = read(file);
    assert.match(html, /<script src="(?:\.\.\/)?consent\.js\?v=[^"]+"[^>]*><\/script>/, file);
    assert.match(html, /consent\.css\?v=/, file);
    assert.match(html, /data-cookie-settings/, file);
    assert.doesNotMatch(html, /googletagmanager\.com\/(?:gtm\.js|ns\.html)|consent\.cookiebot\./, file);
  }
  assert.match(read('index.html'), /<script[^>]+src="consent\.js\?v=[^"]+"[^>]+data-consent-start="main"/);
});
test('stylesheet, script and font references resolve from every main page', () => {
  for (const file of mainPages) {
    const html = read(file);
    for (const match of html.matchAll(/(?:href|src)="([^"?#]+)(?:\?[^"#]*)?"/g)) {
      if (!/\.(?:css|js|woff2)$/.test(match[1]) || /^[a-z]+:/i.test(match[1])) continue;
      assert.equal(fs.existsSync(path.resolve(root, path.dirname(file), match[1])), true, file + ': ' + match[1]);
    }
  }
  assert.equal(fs.readFileSync(path.join(root, 'Font/fraunces-latin-opsz-wght-normal.woff2')).subarray(0,4).toString(), 'wOF2');
});
test('the restricted case study keeps noindex and nofollow and the removed redirect stays absent', () => {
  assert.match(read('projects/content-analytics.html'), /<meta name="robots" content="noindex, nofollow">/);
  assert.equal(fs.existsSync(path.join(root, 'projects/lidas-lens.html')), false);
});
test('the restricted case study stays out of discovery lists and retains card safeguards', () => {
  for (const file of ['sitemap.xml','llms.txt']) assert.doesNotMatch(read(file), /content-analytics|lidas-lens/i);
  const home = read('index.html');
  const card = home.match(/<article[^>]*data-nosnippet[^>]*>[\s\S]*?<\/article>/)?.[0];
  assert.ok(card);
  assert.match(card, /href="projects\/content-analytics\.html"[^>]*rel="nofollow"/);
  for (const match of home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    assert.doesNotMatch(match[1], /content-analytics|lidas-lens/i);
    assert.doesNotThrow(() => JSON.parse(match[1]));
  }
  assert.doesNotMatch(read('projects/content-analytics.html'), /application\/ld\+json|rel="canonical"|property="og:|name="twitter:/);
});
test('the active case study uses neutral labels and only one necessary live-domain reference', () => {
  const html = read('projects/content-analytics.html');
  const liveUrl = html.match(/id="live-project"[^>]*href="(https:\/\/[^"\s]+)"/)?.[1];
  assert.ok(liveUrl);
  assert.equal(html.split(new URL(liveUrl).hostname).length - 1, 1);
  assert.doesNotMatch(html, /lidaslens|lidas-lens/i);
  assert.match(html, /Content website case study/);
  assert.match(html, /data-live-project-link/);
  for (const image of ['content-analytics-homepage.png','content-analytics-stack.png','content-analytics-gtm-workspace.png']) {
    assert.equal(fs.existsSync(path.join(root, 'projects/img', image)), true);
  }
});
test('heading trial is consolidated and JetBrains is absent from active styles', () => {
  for (const file of ['style.css','about.css','projects/case-study.css']) {
    assert.doesNotMatch(read(file), /JetBrains|--cs-blue|#0057d9|#68a7ff/i);
    assert.doesNotMatch(read(file), /font-weight:\s*(?:6[1-9]\d|[7-9]\d\d)\s*;/);
  }
  assert.match(read('style.css'), /font-family: 'Fraunces'/);
  assert.match(read('style.css'), /--accent-color: #98230B/);
  assert.match(read('projects/case-study.css'), /\.hero-shell\s*\{\s*width: min\(980px, calc\(100% - 48px\)\)/);
});
