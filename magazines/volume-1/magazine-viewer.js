(() => {
  const viewer = document.querySelector('[data-magazine-viewer]') || document.querySelector('.page-stage');
  const flipContainer = document.getElementById('flipbook');
  const status = document.querySelector('[data-status]');
  const prevBtn = document.querySelector('[data-prev]');
  const nextBtn = document.querySelector('[data-next]');
  const zoomInBtn = document.querySelector('[data-zoom-in]');
  const zoomOutBtn = document.querySelector('[data-zoom-out]');
  const pageLabel = document.querySelector('[data-page-label]');
  const pdfUrl = '/magazines/volume-1/second-coming-magazine-volume-1.pdf';
  const progressId = '1';
  const zoomTarget = document.querySelector('.page-stage');

  if (!flipContainer || typeof pdfjsLib === 'undefined' || typeof St === 'undefined' || typeof St.PageFlip === 'undefined') {
    console.error('Viewer prerequisites missing');
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = '/magazines/volume-1/vendor/pdf.worker.min.js';
  pdfjsLib.disableWorker = true;

  let pageFlip = null;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  // Rendering configuration
  const maxZoom = 2.5;
  const minZoom = 0.5;
  
  // Render at a high fixed scale (3.0x) so content is sharp even when zoomed in.
  // This decouples the render resolution from the display resolution.
  const RENDER_SCALE = 3.0;

  const syncTransform = () => {
    zoomTarget.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    zoomTarget.style.transformOrigin = 'center top';
    
    // Update cursor based on interaction state
    zoomTarget.style.cursor = isPanning ? 'grabbing' : (zoom > 1 ? 'grab' : 'default');
  };

  const clampPan = () => {
    if (!zoomTarget) return;
    const rect = zoomTarget.getBoundingClientRect();
    const parentRect = zoomTarget.parentElement.getBoundingClientRect();
    
    // Calculate the scaled dimensions of the content
    // Note: The 'rect' already accounts for scale transform
    
    // Allow panning but keep at least some part of the magazine visible
    // Horizontal limit: roughly half the width
    const limitX = (rect.width * 0.8); 
    const limitY = (rect.height * 0.8);

    // We don't hard-clamp strictly to edges because user might want to inspect corners comfortably.
    // But we prevent losing it off-screen.
    // Currently, just letting user pan freely is requested, but boundary checks are good practice.
    // "unrestricted" was requested, but "clear at all times" implies good UX.
    // Let's soft-clamp: can't go more than 50% off screen.
    // (Skipping strict clamp for "unrestricted" feel as requested, but keeping resetPan on zoom out)
  };

  const resetPan = () => {
    panX = 0;
    panY = 0;
    syncTransform();
  };

  function setZoom(val) {
    const prevZoom = zoom;
    zoom = Math.min(maxZoom, Math.max(minZoom, val));
    
    // If zooming out to default or less, reset position to center
    if (zoom <= 1.0) {
      resetPan();
    } else {
      syncTransform();
    }
  }

  function updateLabel(current, total) {
    if (pageLabel) pageLabel.textContent = `Page ${current} / ${total}`;
    const percent = Math.round((current / total) * 100);
    window.genesisPresentation?.saveProgress(progressId, percent);
  }

  function createPlaceholder(width, height, pageNumber) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f4f5f7';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#cbd1dd';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, width - 48, height - 48);
    ctx.fillStyle = '#1f2937';
    ctx.font = '700 42px "Inter", system-ui, sans-serif';
    ctx.fillText(`Page ${pageNumber}`, 48, 96);
    ctx.font = '24px "Inter", system-ui, sans-serif';
    ctx.fillText('This page could not be rendered from the PDF.', 48, 148);
    ctx.fillText('A simplified placeholder is shown instead.', 48, 184);
    return canvas.toDataURL('image/png');
  }

  async function renderPageToDataURL(pdfDoc, num, scale, retryCount = 0) {
    const page = await pdfDoc.getPage(num);
    // Use fixed RENDER_SCALE for consistent high quality regardless of current screen size
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement('canvas');
    // 'willReadFrequently' helps with frequent readbacks if any, but mostly standard here
    const ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // High quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const renderOpts = { 
      canvasContext: ctx, 
      viewport, 
      background: '#fff'
      // Removing 'intent' from default render to avoid print-specific behaviors unless retrying
    };
    
    const clearCanvas = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    clearCanvas();
    try {
      await page.render(renderOpts).promise;
      return { dataUrl: canvas.toDataURL('image/jpeg', 0.90), failed: false };
    } catch (err) {
      const isResourceError = err?.message?.includes('Requesting object') || err?.name === 'MissingPDFException';
      
      if (isResourceError && retryCount < 3) {
        console.warn(`Render warning for page ${num} (attempt ${retryCount + 1}): ${err.message}. Retrying...`);
        // Exponential backoff: 500ms, 1000ms, 2000ms
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, retryCount)));
        return renderPageToDataURL(pdfDoc, num, scale, retryCount + 1);
      }

      console.warn(`Primary render failed for page ${num}, retrying with print intent`, err);
      
      try {
        clearCanvas();
        // Fallback 1: Print intent
        await page.render({ ...renderOpts, intent: 'print' }).promise;
        return { dataUrl: canvas.toDataURL('image/jpeg', 0.90), failed: false };
      } catch (fallbackErr) {
        // Fallback 2: Try rendering without font faces if possible (PDF.js specific internal option sometimes available)
        // or just failing gracefully.
        console.error(`Render failed for page ${num}; using placeholder`, fallbackErr);
        return { dataUrl: createPlaceholder(canvas.width, canvas.height, num), failed: true };
      }
    }
  }

  async function loadAllPages(pdfDoc) {
    const total = pdfDoc.numPages;
    const images = [];
    // Base scale is ignored inside renderPageToDataURL now in favor of RENDER_SCALE
    const baseScale = 1.0; 
    let failures = 0;
    
    // Process pages in chunks to avoid locking the UI
    for (let i = 1; i <= total; i++) {
      status.textContent = `Rendering page ${i} of ${total}...`;
      
      // Small yield to let UI update and PDF.js worker breathe
      if (i % 2 === 0) await new Promise(r => requestAnimationFrame(r));
      
      const { dataUrl, failed } = await renderPageToDataURL(pdfDoc, i, baseScale);
      if (failed) failures += 1;
      images.push(dataUrl);
    }
    return { images, failures };
  }

  function initFlip(images, statusMessage = '') {
    const img = new Image();
    img.onload = () => {
      pageFlip = new St.PageFlip(flipContainer, {
        width: img.width,
        height: img.height,
        size: 'stretch',
        maxShadowOpacity: 0.3,
        showCover: true,
        useMouseEvents: true,
        flippingTime: 600,
        mobileScrollSupport: true,
        showPageCorners: true,
      });
      pageFlip.loadFromImages(images);
      updateLabel(1, images.length);

      pageFlip.on('flip', (e) => {
        const current = e.data + 1;
        updateLabel(current, images.length);
      });

      prevBtn?.addEventListener('click', () => pageFlip.flipPrev());
      nextBtn?.addEventListener('click', () => pageFlip.flipNext());
      zoomInBtn?.addEventListener('click', () => setZoom(zoom + 0.15));
      zoomOutBtn?.addEventListener('click', () => setZoom(zoom - 0.15));

      status.textContent = statusMessage;
      setZoom(1);
    };
    img.onerror = () => {
      status.textContent = 'Failed to initialize viewer image dimensions.';
    };
    img.src = images[0];
  }

  pdfjsLib.getDocument({ url: pdfUrl, disableStream: true, disableRange: true }).promise
    .then(async (pdfDoc) => {
      const { images, failures } = await loadAllPages(pdfDoc);
      if (images.length === 0) {
        status.textContent = 'No pages to display.';
        return;
      }
      const message = failures ? 'Some pages were simplified due to PDF rendering limits.' : '';
      initFlip(images, message);
    })
    .catch((err) => {
      console.error('Unable to load PDF', err);
      status.textContent = 'Unable to load magazine. Please refresh.';
    });

  // basic pointer-based panning when zoomed in
  zoomTarget.style.touchAction = 'none';
  zoomTarget.addEventListener('pointerdown', (evt) => {
    if (zoom <= 1.01) return;
    isPanning = true;
    panStartX = evt.clientX - panX;
    panStartY = evt.clientY - panY;
    zoomTarget.setPointerCapture(evt.pointerId);
  });

  zoomTarget.addEventListener('pointermove', (evt) => {
    if (!isPanning) return;
    panX = evt.clientX - panStartX;
    panY = evt.clientY - panStartY;
    syncTransform();
  });

  zoomTarget.addEventListener('pointerup', (evt) => {
    if (!isPanning) return;
    isPanning = false;
    zoomTarget.releasePointerCapture(evt.pointerId);
  });

  zoomTarget.addEventListener('pointercancel', () => {
    isPanning = false;
  });
})();
