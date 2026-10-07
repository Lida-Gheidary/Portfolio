/* Shared behaviour for every project page: mobile navigation
   and the light/dark theme toggle. */

const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = document.querySelector('.theme-icon');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  });

  document.querySelectorAll('.nav-menu a').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function updateThemeButton() {
  if (!themeToggle || !themeIcon) return;
  const isDark = document.documentElement.dataset.theme === 'dark';
  themeIcon.textContent = isDark ? '☀' : '☾';
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    updateThemeButton();
  });
}

updateThemeButton();

/* Open a project's live links in a shared preview popup. */
(() => {
  if (!document.body.classList.contains('case-page')) return;

  const sourceLink = document.querySelector(
    '.project-header .browser-capture[href]'
  );

  if (!sourceLink || document.getElementById('live-project-preview')) {
    return;
  }

  const liveURL = new URL(sourceLink.href, document.baseURI);

  if (!['http:', 'https:'].includes(liveURL.protocol)) return;

  liveURL.hash = '';

  const dialog = document.createElement('dialog');

  if (typeof dialog.showModal !== 'function') return;

  dialog.className = 'live-preview';
  dialog.id = 'live-project-preview';
  dialog.setAttribute('aria-labelledby', 'live-preview-title');
  dialog.setAttribute('closedby', 'closerequest');

  dialog.innerHTML = `
    <header class="live-preview-header">
      <div>
        <span class="live-preview-label">Live preview</span>
        <h2 id="live-preview-title"></h2>
      </div>

      <button
        type="button"
        class="live-preview-close"
        autofocus
      >
        Close ×
      </button>
    </header>

    <div class="live-preview-tools">
      <a
        class="live-preview-new-tab"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in new tab ↗
      </a>

      <button type="button" class="live-preview-reload">
        Reload
      </button>
    </div>

    <div class="live-preview-body">
      <p class="live-preview-status" role="status" hidden></p>
    </div>

    <p class="live-preview-help">
      If the preview stays blank, use Open in new tab.
    </p>
  `;

  document.body.append(dialog);

  const frameArea = dialog.querySelector('.live-preview-body');
  const status = dialog.querySelector('.live-preview-status');
  const newTabLink = dialog.querySelector('.live-preview-new-tab');
  const desktop = window.matchMedia('(min-width: 1100px)');
  const title = document.title.split('|')[0].trim();

  dialog.querySelector('#live-preview-title').textContent = title;

  let opener = null;
  let frame = null;
  let loadingTimer = null;

  function showDialog() {
    if (desktop.matches) {
      dialog.show();
    } else {
      dialog.showModal();
    }
  }

  function closeOnEscape(event) {
    if (event.key !== 'Escape' || !dialog.open) return;

    event.preventDefault();
    dialog.close();
  }

  function loadSite(url) {
    window.clearTimeout(loadingTimer);

    if (frame) frame.remove();

    status.textContent = 'Loading live site...';
    status.hidden = false;

    const nextFrame = document.createElement('iframe');

    nextFrame.title = `${title}: live site`;
    nextFrame.referrerPolicy = 'strict-origin-when-cross-origin';

    nextFrame.setAttribute('allow', 'fullscreen');

    nextFrame.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-downloads ' +
      'allow-popups allow-popups-to-escape-sandbox allow-modals'
    );

    nextFrame.addEventListener('load', () => {
      if (!dialog.open || frame !== nextFrame) return;

      window.clearTimeout(loadingTimer);
      status.hidden = true;

      try {
        nextFrame.contentWindow.document.addEventListener(
          'keydown',
          closeOnEscape
        );
      } catch {
        // External sites cannot share keyboard events with this page.
      }
    });

    nextFrame.src = url;
    frame = nextFrame;
    frameArea.append(nextFrame);

    loadingTimer = window.setTimeout(() => {
      if (dialog.open && frame === nextFrame) {
        status.textContent =
          'Still loading. You can also open the site in a new tab.';
      }
    }, 20000);
  }

  document.querySelectorAll(
    '.project-header a[href], .project-footer-cta a[href]'
  ).forEach((link) => {
    const url = new URL(link.href, document.baseURI);

    url.hash = '';

    if (url.href !== liveURL.href) return;

    link.setAttribute('aria-controls', dialog.id);
    link.setAttribute('aria-haspopup', 'dialog');

    link.addEventListener('click', (event) => {
      if (
        event.defaultPrevented ||
        event.button > 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();

      opener = link;
      newTabLink.href = link.href;

      document.body.classList.add('live-preview-open');

      if (!dialog.open) showDialog();

      loadSite(link.href);
    });
  });

  dialog.querySelector('.live-preview-close').addEventListener(
    'click',
    () => dialog.close()
  );

  dialog.querySelector('.live-preview-reload').addEventListener(
    'click',
    () => loadSite(newTabLink.href)
  );

  document.addEventListener('keydown', closeOnEscape);

  dialog.addEventListener('close', () => {
    if (dialog.open) return;

    window.clearTimeout(loadingTimer);

    if (frame) frame.remove();

    frame = null;
    status.hidden = true;

    document.body.classList.remove('live-preview-open');

    if (opener) opener.focus({ preventScroll: true });
  });

  desktop.addEventListener('change', () => {
    if (!dialog.open) return;

    dialog.close();
    showDialog();
  });
})();
