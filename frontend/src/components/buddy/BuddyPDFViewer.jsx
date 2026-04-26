import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getDocumentViewUrl } from '../../services/documentService';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function BuddyPDFViewer({
  documentId,
  documentTitle,
  onPageChange,
  onClose,
}) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const pdfRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [signedUrl, setSignedUrl] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPageNumber(1);

    (async () => {
      try {
        const { signedUrl: url, totalPages: total } = await getDocumentViewUrl(documentId);
        if (cancelled) return;
        setSignedUrl(url);
        setTotalPages(total || 0);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Could not load the document');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    if (!signedUrl) return;
    let cancelled = false;

    (async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url: signedUrl });
        const pdf = await loadingTask.promise;
        if (cancelled) { pdf.destroy(); return; }
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError('Could not open PDF');
          setLoading(false);
          console.warn('[BuddyPDFViewer] pdf load failed', err);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* noop */ }
      }
      if (pdfRef.current) {
        try { pdfRef.current.destroy(); } catch { /* noop */ }
        pdfRef.current = null;
      }
    };
  }, [signedUrl]);

  const renderPage = useCallback(async (n) => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!pdf || !canvas || !wrapper) return;

    try {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* noop */ }
      }
      const page = await pdf.getPage(n);
      const unscaled = page.getViewport({ scale: 1 });
      const containerWidth = Math.max(240, wrapper.clientWidth - 24);
      const scale = Math.min(2.4, containerWidth / unscaled.width);
      const viewport = page.getViewport({ scale });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('[BuddyPDFViewer] render failed', err);
      }
    }
  }, []);

  useEffect(() => {
    if (loading || error) return;
    renderPage(pageNumber);
    onPageChange?.(pageNumber);
  }, [pageNumber, loading, error, renderPage, onPageChange]);

  useEffect(() => {
    if (loading || error) return;
    const onResize = () => renderPage(pageNumber);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pageNumber, loading, error, renderPage]);

  const goPrev = () => setPageNumber(n => Math.max(1, n - 1));
  const goNext = () => setPageNumber(n => Math.min(totalPages || n, n + 1));

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
  };

  return (
    <div
      className="flex flex-col h-full rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-stone-100 bg-white/70">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500 font-medium">Reading together</p>
          <p className="text-sm font-medium text-stone-900 truncate" title={documentTitle}>
            {documentTitle || 'Document'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PDF"
            className="h-8 w-8 grid place-items-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        ref={wrapperRef}
        className="flex-1 min-h-0 overflow-auto p-3 flex items-start justify-center bg-gradient-to-b from-stone-50/50 to-white"
      >
        {loading && (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading PDF…
          </div>
        )}
        {error && !loading && (
          <div className="h-full flex items-center justify-center text-red-600 text-sm px-6 text-center">
            {error}
          </div>
        )}
        {!loading && !error && (
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-md bg-white"
            aria-label={`Page ${pageNumber} of ${totalPages}`}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-stone-100 bg-white/70">
        <button
          type="button"
          onClick={goPrev}
          disabled={pageNumber <= 1 || loading || !!error}
          aria-label="Previous page"
          className="h-9 w-9 grid place-items-center rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-[13px] text-stone-700 tabular-nums">
          Page
          <input
            type="number"
            min={1}
            max={totalPages || 1}
            value={pageNumber}
            onChange={(e) => {
              const v = Math.floor(Number(e.target.value) || 1);
              if (v >= 1 && v <= (totalPages || v)) setPageNumber(v);
            }}
            className="mx-2 w-14 px-2 py-0.5 text-center rounded-md border border-stone-200 bg-white focus:border-stone-400 focus:ring-2 focus:ring-stone-100 outline-none"
            aria-label="Go to page"
          />
          of <span className="font-medium">{totalPages || '—'}</span>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={!totalPages || pageNumber >= totalPages || loading || !!error}
          aria-label="Next page"
          className="h-9 w-9 grid place-items-center rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
