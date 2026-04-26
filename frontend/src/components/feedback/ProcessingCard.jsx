import { useEffect, useState, useRef } from 'react';
import { CheckCircle, Upload, Cpu, BookOpen, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { getDocument } from '../../services/documentService';

const phases = [
  { key: 'uploading',    icon: Upload,    label: 'Uploading',          hint: 'Sending your document to the cloud.' },
  { key: 'registering',  icon: Cpu,       label: 'Extracting text',    hint: 'Reading and parsing your document.' },
  { key: 'indexing',     icon: BookOpen,  label: 'Building index',     hint: 'Organizing pages for quick access.' },
  { key: 'generating_modules', icon: Sparkles, label: 'Building modules', hint: 'AI is generating study content.' },
  { key: 'ready',        icon: CheckCircle, label: 'Ready to study',   hint: 'All features are unlocked!' },
];

function phaseIndex(status, step) {
  if (status === 'ready') return phases.findIndex(p => p.key === 'ready');
  if (status === 'uploading' || status === 'registering') return phases.findIndex(p => p.key === status);
  if (step === 'indexing') return phases.findIndex(p => p.key === 'indexing');
  if (step === 'generating_modules' || step === 'generating_remaining' || step === 'researching' || step === 'enriching') return phases.findIndex(p => p.key === 'generating_modules');
  // Fallback if processing but no step
  if (status === 'processing') return phases.findIndex(p => p.key === 'indexing'); 
  return 0;
}

export default function ProcessingCard({ documentId, status: initialStatus, metadata: initialMetadata, onReady }) {
  const [status, setStatus] = useState(initialStatus || 'uploading');
  const [step, setStep] = useState(initialMetadata?.processingStep || null);
  const [isDelayed, setIsDelayed] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    // Only scroll if it's a very fresh mount or optimistic upload
    const timer = setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const delayTimer = setTimeout(() => setIsDelayed(true), 15000); // Show delay warning after 15s
    return () => clearTimeout(delayTimer);
  }, []);

  useEffect(() => {
    // If it's a temporary optimistic ID, don't poll the backend yet.
    if ((documentId || '').startsWith('temp_') || status === 'ready' || status === 'failed') return;
    
    const interval = setInterval(async () => {
      try {
        const doc = await getDocument(documentId);
        setStatus(doc.status);
        if (doc.extractedMetadata?.processingStep) {
          setStep(doc.extractedMetadata.processingStep);
        }
        if (doc.status === 'ready') {
          clearInterval(interval);
          onReady?.();
        }
      } catch {
        // silently retry
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [documentId, status, onReady]);

  const currentIdx = phaseIndex(status, step);

  return (
    <div ref={cardRef} className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4 h-full flex flex-col justify-between shadow-[0_4px_20px_rgba(15,23,42,0.07)]">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Preparing your document&hellip;</p>
          {isDelayed && status !== 'ready' && status !== 'failed' && (
            <div className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3" /> Taking longer than usual
            </div>
          )}
        </div>
        <div className="space-y-3 mt-4">
          {phases.map((phase, i) => {
            const Icon = phase.icon;
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={phase.key} className={`flex items-start gap-3 transition-opacity duration-300 ${active ? 'opacity-100' : done ? 'opacity-60' : 'opacity-30'}`}>
                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${done ? 'bg-emerald-100' : active ? 'bg-sky-100' : 'bg-gray-100'}`}>
                  <Icon className={`h-3.5 w-3.5 ${done ? 'text-emerald-600' : active ? 'text-sky-600 animate-pulse' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{phase.label}</p>
                  {active && <p className="text-[11px] text-gray-500 mt-0.5 animate-pulse">{phase.hint}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {status === 'failed' ? (
        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium">
          <AlertCircle className="h-4 w-4" /> Processing failed. Please try again.
        </div>
      ) : status !== 'ready' ? (
        <p className="text-[11px] text-gray-400 mt-4 border-t border-gray-100 pt-3">
          You can leave this page. We'll notify you when it's done.
        </p>
      ) : null}
    </div>
  );
}
