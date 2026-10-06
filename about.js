/* Local logo paths are used first. Display-only trimming removes padding
   around local logos; the original image files are never rewritten. */
(() => {
  const completed = new WeakSet();
  const sourceCache = new Map();
  const logoSelector = '.education-logo img, .issuer-logo img, .skill-logo img, .training-logo img';

  function trimOuterSpace(image) {
    const scale = Math.min(1, 960 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    let left = width, top = height, right = -1, bottom = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const empty = pixels[index + 3] <= 8 || (
          pixels[index] >= 245 && pixels[index + 1] >= 245 && pixels[index + 2] >= 245
        );
        if (!empty) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }

    if (right < left || bottom < top) return null;
    const edge = Math.max(2, Math.round(Math.max(right - left, bottom - top) * 0.015));
    left = Math.max(0, left - edge);
    top = Math.max(0, top - edge);
    right = Math.min(width - 1, right + edge);
    bottom = Math.min(height - 1, bottom + edge);
    const cropWidth = right - left + 1;
    const cropHeight = bottom - top + 1;
    if (cropWidth >= width * 0.97 && cropHeight >= height * 0.97) return null;

    const crop = document.createElement('canvas');
    crop.width = cropWidth;
    crop.height = cropHeight;
    const cropContext = crop.getContext('2d');
    if (!cropContext) return null;
    cropContext.drawImage(canvas, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return crop.toDataURL('image/png');
  }

  function presentLogo(image) {
    if (!image.naturalWidth || completed.has(image)) return;
    const source = image.currentSrc || image.src;
    const local = !source.startsWith('data:') &&
      new URL(source, location.href).origin === location.origin;
    if (!local || image.hasAttribute('data-no-trim')) return;

    try {
      if (!sourceCache.has(source)) sourceCache.set(source, trimOuterSpace(image));
      const trimmed = sourceCache.get(source);
      completed.add(image);
      if (trimmed) {
        image.dataset.originalLogoSrc = image.getAttribute('src');
        image.src = trimmed;
      }
    } catch {
      // A logo that cannot be inspected still fits the shared CSS box.
      completed.add(image);
    }
  }

  function handleImageError(image) {
    const remote = image.dataset.remoteSrc;
    if (remote && !image.dataset.remoteTried) {
      image.dataset.remoteTried = 'true';
      image.src = remote;
    } else {
      image.hidden = true;
    }
  }

  document.querySelectorAll(logoSelector).forEach(image => {
    image.addEventListener('error', () => handleImageError(image));
    image.addEventListener('load', () => presentLogo(image));
    if (image.complete) {
      if (image.naturalWidth) presentLogo(image);
      else handleImageError(image);
    }
  });

  const portrait = document.querySelector('.about-portrait img');
  if (portrait) {
    const hideMissingPortrait = () => {
      portrait.parentElement.hidden = true;
      portrait.closest('.about-grid').classList.add('no-portrait');
    };
    portrait.addEventListener('error', hideMissingPortrait);
    if (portrait.complete && !portrait.naturalWidth) hideMissingPortrait();
  }
})();
