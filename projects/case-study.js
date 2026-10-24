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

/* The long Lida's Lens page provides a shortcut back to the top. */
const backToTop = document.querySelector('.back-to-top');

if (backToTop) {
  const chapterList = document.querySelector('.chapter-list');
  const chapters = Array.from(chapterList.querySelectorAll('.chapter'));
  const main = chapterList.closest('main');
  let backToTopFrame = null;

  function updateBackToTop() {
    if (window.scrollY <= 400) {
      backToTop.hidden = true;
      return;
    }

    const lastChapter = chapters.filter((chapter) => chapter.open).pop() || chapters[chapters.length - 1];
    const chapterBounds = lastChapter.getBoundingClientRect();
    const listBounds = chapterList.getBoundingClientRect();
    const contentRight = Math.min(window.innerWidth, main.getBoundingClientRect().right);

    backToTop.hidden = false;

    const { width, height } = backToTop.getBoundingClientRect();
    const top = Math.min(window.innerHeight - height - 24, chapterBounds.bottom - height - 16);
    const left = Math.max(16, Math.min(listBounds.right + 20, contentRight - width - 32));

    backToTop.style.top = `${top}px`;
    backToTop.style.left = `${left}px`;
    backToTop.hidden = top < 90;
  }

  function scheduleBackToTop() {
    if (backToTopFrame !== null) return;

    backToTopFrame = window.requestAnimationFrame(() => {
      backToTopFrame = null;
      updateBackToTop();
    });
  }

  window.addEventListener('scroll', scheduleBackToTop, { passive: true });
  window.addEventListener('resize', scheduleBackToTop);
  window.addEventListener('load', scheduleBackToTop, { once: true });
  chapters.forEach((chapter) => chapter.addEventListener('toggle', scheduleBackToTop));

  const chapterResize = new ResizeObserver(scheduleBackToTop);
  chapterResize.observe(chapterList);
  updateBackToTop();

  backToTop.addEventListener('click', () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    history.replaceState(history.state, '', window.location.pathname + window.location.search);
    document.querySelector('.nav-logo').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
  });
}

/* Pages with section links open shared chapters and update the address bar. */
(() => {
  if (!document.body.hasAttribute('data-section-links')) return;

  document.querySelectorAll('details.chapter[id]').forEach((chapter) => {
    const summary = chapter.querySelector('summary');
    const link = summary.querySelector('.chapter-link');
    if (!link) return;

    link.addEventListener('click', (event) => {
      if (
        event.defaultPrevented || event.button > 0 || event.ctrlKey ||
        event.metaKey || event.shiftKey || event.altKey
      ) {
        return;
      }

      // Clicking the current fragment does not fire another hashchange.
      if (window.location.hash === link.hash) openLinkedChapter();
    });

    summary.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.target.closest('a') || chapter.open) {
        return;
      }

      history.replaceState(history.state, '', `#${encodeURIComponent(chapter.id)}`);
    });
  });

  function openLinkedChapter() {
    let id;

    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }

    if (!id) return;

    const chapter = document.getElementById(id);

    if (!chapter || !chapter.matches('details.chapter')) return;

    chapter.open = true;
    chapter.querySelector('summary').focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      chapter.scrollIntoView({ block: 'start' });
    });
  }

  window.addEventListener('hashchange', openLinkedChapter);
  openLinkedChapter();
})();

/* Loaded screenshots can be enlarged without leaving the case study. */
(() => {
  const images = document.querySelectorAll('.evidence-slot > div > img');
  if (!images.length) return;

  const viewer = createScreenshotViewer();

  images.forEach((image) => {
    const slot = image.closest('.evidence-slot');
    const captionElement = slot.querySelector('figcaption');
    const caption = (
      captionElement?.textContent || image.alt || 'Screenshot'
    ).trim().replace(/\s+/g, ' ');
    if (captionElement) {
      const captionText = document.createElement('span');
      captionText.className = 'evidence-caption-text';
      captionText.textContent = caption;
      captionElement.replaceChildren(captionText);
    }
    let link = null;
    if (slot.dataset.enlarge !== 'false') {
      link = document.createElement('a');
      const label = document.createElement('span');

      link.className = 'evidence-enlarge';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Enlarge screenshot: ${caption}`);
      label.textContent = 'Click to enlarge';
      label.setAttribute('aria-hidden', 'true');
      link.append(label);
      (captionElement || slot).append(link);

      if (viewer) {
        link.setAttribute('aria-haspopup', 'dialog');
        link.setAttribute('aria-controls', viewer.id);
        link.addEventListener('click', (event) => {
          if (
            event.defaultPrevented || event.button > 0 || event.ctrlKey ||
            event.metaKey || event.shiftKey || event.altKey
          ) {
            return;
          }

          event.preventDefault();
          viewer.open(image.currentSrc || image.src, caption, link);
        });
      }
    }

    function updateScreenshot() {
      const loaded = image.complete && image.naturalWidth > 0;
      slot.classList.toggle('has-image', loaded);
      image.setAttribute('aria-hidden', String(!loaded));
      if (link) {
        link.hidden = !loaded;
        link.href = image.currentSrc || image.src;
      }
    }

    image.addEventListener('load', updateScreenshot);
    image.addEventListener('error', updateScreenshot);
    updateScreenshot();
  });

  function createScreenshotViewer() {
    const dialog = document.createElement('dialog');
    if (typeof dialog.showModal !== 'function') return null;

    dialog.className = 'screenshot-viewer';
    dialog.id = 'screenshot-viewer';
    dialog.setAttribute('aria-labelledby', 'screenshot-viewer-title');
    dialog.innerHTML = `
      <header class="screenshot-viewer-header">
        <h2 id="screenshot-viewer-title"></h2>
        <button type="button" class="screenshot-viewer-close" autofocus>Close ×</button>
      </header>
      <div class="screenshot-viewer-tools">
        <button type="button" class="screenshot-viewer-size">View actual size</button>
        <a class="screenshot-viewer-original" target="_blank" rel="noopener noreferrer">Open original image ↗</a>
      </div>
      <div class="screenshot-viewer-stage">
        <img class="screenshot-viewer-image" alt="">
      </div>
    `;
    document.body.append(dialog);

    const title = dialog.querySelector('#screenshot-viewer-title');
    const stage = dialog.querySelector('.screenshot-viewer-stage');
    const largeImage = dialog.querySelector('.screenshot-viewer-image');
    const originalLink = dialog.querySelector('.screenshot-viewer-original');
    const sizeButton = dialog.querySelector('.screenshot-viewer-size');
    let opener = null;

    dialog.querySelector('.screenshot-viewer-close').addEventListener('click', () => dialog.close());

    sizeButton.addEventListener('click', () => {
      const actualSize = stage.classList.toggle('is-actual-size');
      sizeButton.textContent = actualSize ? 'Fit to width' : 'View actual size';
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
    });

    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      dialog.close();
    });

    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom
      ) {
        dialog.close();
      }
    });

    dialog.addEventListener('close', () => {
      document.body.classList.remove('screenshot-viewer-open');
      largeImage.removeAttribute('src');
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });

    return {
      id: dialog.id,
      open(source, caption, trigger) {
        opener = trigger;
        title.textContent = caption;
        largeImage.alt = caption;
        largeImage.src = source;
        originalLink.href = source;
        stage.classList.remove('is-actual-size');
        sizeButton.textContent = 'View actual size';
        document.body.classList.add('screenshot-viewer-open');
        if (!dialog.open) dialog.showModal();
        stage.scrollTop = 0;
        stage.scrollLeft = 0;
      },
    };
  }
})();

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
