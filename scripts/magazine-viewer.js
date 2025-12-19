(() => {
  const viewer = document.querySelector('[data-magazine-viewer]');
  if (!viewer || typeof pdfjsLib === 'undefined') {
    return;
  }

  const pdfUrl = viewer.dataset.pdf;
  const progressId = viewer.dataset.presentation || '1';
  const canvas = viewer.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const status = viewer.querySelector('[data-status]');
  const prevBtn = viewer.querySelector('[data-prev]');
  const nextBtn = viewer.querySelector('[data-next]');
  const zoomInBtn = viewer.querySelector('[data-zoom-in]');
  const zoomOutBtn = viewer.querySelector('[data-zoom-out]');
  const pageLabel = viewer.querySelector('[data-page-label]');

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js';

  let pdfDoc = null;
  let pageNum = 1;
  let scale = window.matchMedia('(max-width: 768px)').matches ? 1.2 : 1.6;
  let isRendering = false;
  let pendingPage = null;

  const clampScale = val => Math.min(2.4, Math.max(0.8, val));

  function updateControls() {
    if (!pdfDoc) return;
    prevBtn.disabled = pageNum <= 1;
    nextBtn.disabled = pageNum >= pdfDoc.numPages;
    if (pageLabel) {
      pageLabel.textContent = `Page ${pageNum} / ${pdfDoc.numPages}`;
    }
    if (status) {
      status.textContent = `Viewing page ${pageNum} of ${pdfDoc.numPages}`;
    }
    const percent = Math.round((pageNum / pdfDoc.numPages) * 100);
    window.genesisPresentation?.saveProgress(progressId, percent);
  }

  function renderPage(num) {
    isRendering = true;
    pdfDoc.getPage(num).then(page => {
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const renderContext = { canvasContext: ctx, viewport };
      const renderTask = page.render(renderContext);
      return renderTask.promise;
    }).then(() => {
      isRendering = false;
      if (pendingPage !== null) {
        renderPage(pendingPage);
        pendingPage = null;
      }
      updateControls();
    }).catch(err => {
      console.error('Error rendering PDF page', err);
      status.textContent = 'Failed to load page. Please retry.';
    });
  }

  function queueRender(num) {
    if (isRendering) {
      pendingPage = num;
    } else {
      renderPage(num);
    }
  }

  function goToPage(delta) {
    if (!pdfDoc) return;
    const target = pageNum + delta;
    if (target < 1 || target > pdfDoc.numPages) return;
    pageNum = target;
    queueRender(pageNum);
  }

  prevBtn?.addEventListener('click', () => goToPage(-1));
  nextBtn?.addEventListener('click', () => goToPage(1));
  zoomInBtn?.addEventListener('click', () => {
    scale = clampScale(scale + 0.2);
    queueRender(pageNum);
  });
  zoomOutBtn?.addEventListener('click', () => {
    scale = clampScale(scale - 0.2);
    queueRender(pageNum);
  });

  document.addEventListener('keydown', evt => {
    if (evt.key === 'ArrowLeft') {
      goToPage(-1);
    } else if (evt.key === 'ArrowRight') {
      goToPage(1);
    }
  });

  pdfjsLib.getDocument(pdfUrl).promise.then(doc => {
    pdfDoc = doc;
    pageNum = 1;
    updateControls();
    renderPage(pageNum);
  }).catch(err => {
    console.error('Unable to load PDF', err);
    if (status) {
      status.textContent = 'Unable to load magazine. Please refresh.';
    }
  });
})();
