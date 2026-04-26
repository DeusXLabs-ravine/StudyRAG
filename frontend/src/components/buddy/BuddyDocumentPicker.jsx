import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, X } from 'lucide-react';
import { listDocuments } from '../../services/documentService';
import useBuddyStore from '../../store/buddyStore';

/**
 * BuddyDocumentPicker
 *
 * Pre-session pickable: the user chooses ONE document for Buddy to hold in
 * mind during the session. The selection flows into `sessionContext` and the
 * backend composes it into the system prompt / kickstart. If nothing is
 * picked, Buddy just opens freeform.
 *
 * This is intentionally small and flat — no modal, no Radix. A button flips
 * an inline panel with a searchable list. Matches the warm amber baseline.
 */
export default function BuddyDocumentPicker() {
  const documentId    = useBuddyStore(s => s.sessionContext.documentId);
  const documentTitle = useBuddyStore(s => s.sessionContext.documentTitle);
  const setSessionContext = useBuddyStore(s => s.setSessionContext);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const rootRef = useRef(null);

  // Fetch on first open so we don't hit the API on every /buddy mount.
  useEffect(() => {
    if (!open || docs.length) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await listDocuments();
        if (!cancelled) setDocs(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load your documents.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, docs.length]);

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // vectorStore.formatDoc() returns { originalName, filename, ... } — no `title`.
  // Strip the extension from originalName for a cleaner display title.
  const titleOf = (doc) => {
    const raw = doc?.originalName || doc?.filename || '';
    if (!raw) return 'Untitled document';
    return raw.replace(/\.[a-z0-9]{1,6}$/i, '') || raw;
  };

  // Normalise the file type so BuddyShell can decide whether to mount the PDF
  // viewer. We check `fileType` (e.g. '.pdf' or 'pdf') but also fall back to
  // the originalName extension. Always strip any leading dot so comparisons
  // like ft === 'pdf' work regardless of how the backend stored the extension.
  const fileTypeOf = (doc) => {
    if (!doc) return null;
    const ft = (doc.fileType || '').toLowerCase().replace(/^\./, '').trim();
    if (ft) return ft;
    const raw = doc.originalName || doc.filename || '';
    const m = raw.match(/\.([a-z0-9]{1,6})$/i);
    return m ? m[1].toLowerCase() : null;
  };

  const pick = (doc) => {
    const ft = fileTypeOf(doc);
    setSessionContext({
      documentId: doc.id,
      documentTitle: titleOf(doc),
      documentFileType: ft,
      documentIsPdf: ft === 'pdf',
    });
    setOpen(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    setSessionContext({
      documentId: null,
      documentTitle: null,
      documentFileType: null,
      documentIsPdf: false,
    });
  };

  const filtered = query.trim()
    ? docs.filter(d => titleOf(d).toLowerCase().includes(query.trim().toLowerCase()))
    : docs;

  return (
    <div ref={rootRef} className="relative w-full max-w-md mx-auto">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium',
          'bg-white border transition-colors cursor-pointer',
          documentId
            ? 'border-stone-300 text-stone-800 hover:bg-stone-50'
            : 'border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <BookOpen className="w-4 h-4 shrink-0" />
        <span className="truncate flex-1 text-left">
          {documentTitle
            ? <>Studying <span className="font-semibold">{documentTitle}</span></>
            : 'Pick a document to study (optional)'}
        </span>
        {documentId ? (
          <span
            role="button"
            tabIndex={0}
            onClick={clear}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clear(e); } }}
            className="p-1 rounded-md hover:bg-stone-100 text-stone-600 cursor-pointer"
            aria-label="Clear selected document"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : (
          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div
          className="absolute z-40 mt-1.5 w-full bg-white rounded-xl shadow-lg border border-stone-200 py-2 max-h-72 overflow-hidden flex flex-col"
          role="listbox"
        >
          <div className="px-3 pb-2 border-b border-stone-100">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your library…"
              className="w-full px-2.5 py-1.5 text-[13px] rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:border-stone-400 focus:bg-white"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {loading && (
              <div className="px-3 py-4 text-[12px] text-stone-500">Loading your library…</div>
            )}
            {!loading && error && (
              <div className="px-3 py-3 text-[12px] text-red-600">{error}</div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="px-3 py-4 text-[12px] text-stone-500">
                {docs.length === 0 ? 'No documents in your library yet.' : 'No matches.'}
              </div>
            )}
            {!loading && !error && filtered.map(doc => {
              const selected = doc.id === documentId;
              const title = titleOf(doc);
              const sub = doc.sourceType === 'url' ? doc.sourceUrl
                : doc.sourceType === 'note' ? 'Note'
                : doc.sourceType === 'topic' ? 'Topic'
                : doc.fileType || null;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => pick(doc)}
                  className={[
                    'w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer',
                    selected ? 'bg-stone-100 text-stone-900' : 'hover:bg-stone-50 text-stone-800',
                  ].join(' ')}
                  role="option"
                  aria-selected={selected}
                >
                  <BookOpen className={`w-4 h-4 mt-0.5 shrink-0 ${selected ? 'text-stone-700' : 'text-stone-400'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate">{title}</div>
                    {sub && (
                      <div className="text-[11px] text-stone-500 truncate">{sub}</div>
                    )}
                  </div>
                  {selected && <Check className="w-4 h-4 text-stone-700 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
