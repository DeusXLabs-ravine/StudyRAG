import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, AlertCircle, CheckCircle, Clock, X, Brain, Sparkles } from 'lucide-react';
import useDocumentStore from '../store/documentStore';
import Spinner from '../components/common/Spinner';
import ProgressBar from '../components/common/ProgressBar';
import { FileUpload } from '@/components/ui/file-upload';
import { TextLoop } from '@/components/ui/text-loop';

const statusConfig = {
  processing: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'Processing' },
  ready: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Ready' },
  failed: { icon: AlertCircle, color: 'text-red-600 bg-red-50', label: 'Failed' },
};

const uploadingMessages = [
  "Uploading your document to the cloud...",
  "Securely transferring your file...",
  "Almost there, hang tight...",
  "Great choice of study material!",
  "Sending bytes at the speed of learning...",
  "Your file is on its way...",
];

const processingMessages = [
  "AI is reading through your document...",
  "Extracting key concepts and ideas...",
  "Breaking content into smart learning modules...",
  "Generating comprehension questions...",
  "Identifying the most important topics...",
  "Building your personalized study path...",
  "Creating flashcard-ready key terms...",
  "Analyzing document structure and headings...",
  "Connecting related concepts together...",
  "Preparing your learning experience...",
  "This is going to be a great study session!",
  "Finding real-world examples and context...",
  "Almost done — polishing your modules...",
];

export default function Documents() {
  const navigate = useNavigate();
  const {
    documents, loading, error, uploads,
    fetchDocuments, uploadDocument, deleteDocument, refreshDocument, clearUploadError,
  } = useDocumentStore();

  // Track which doc IDs were processing so we can detect the transition to ready
  const processingIdsRef = useRef(new Set());

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll processing documents and auto-redirect when one becomes ready
  useEffect(() => {
    const currentProcessing = documents.filter(d => d.status === 'processing');
    const currentProcessingIds = new Set(currentProcessing.map(d => d.id));

    // Check if any previously-processing doc is now ready
    for (const id of processingIdsRef.current) {
      if (!currentProcessingIds.has(id)) {
        const doc = documents.find(d => d.id === id);
        if (doc && doc.status === 'ready') {
          // This doc just finished — redirect to Learn
          navigate(`/learn/${doc.id}`);
          processingIdsRef.current.clear();
          return;
        }
      }
    }

    // Update tracking set
    processingIdsRef.current = currentProcessingIds;

    if (currentProcessing.length === 0) return;

    const interval = setInterval(() => {
      currentProcessing.forEach(doc => refreshDocument(doc.id));
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, refreshDocument, navigate]);

  const handleFilesSelected = useCallback((newFiles) => {
    newFiles.forEach(file => uploadDocument(file).catch(() => { }));
  }, [uploadDocument]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id);
    }
  };

  const activeUploads = Object.entries(uploads);
  const hasUploading = activeUploads.some(([, u]) => u.status === 'uploading');
  const hasRegistering = activeUploads.some(([, u]) => u.status === 'registering');
  const processingDocs = documents.filter(d => d.status === 'processing');
  const showProcessingBanner = processingDocs.length > 0 || hasRegistering;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Document Library</h1>
        <p className="text-gray-500 mt-2 font-medium">Manage and upload study materials for AI processing.</p>
      </div>

      {/* Upload area */}
      <div className="sleek-card p-2 mb-8 border-dashed border-2 hover:border-primary/50 transition-all overflow-hidden">
        <FileUpload onChange={handleFilesSelected} />
      </div>

      {/* Progress banners grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Active upload progress */}
        {activeUploads.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest ml-1">Current Uploads</h3>
            {activeUploads.map(([fileName, upload]) => (
              <div key={fileName} className="sleek-card p-4 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary opacity-50 flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-700 truncate">{fileName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {upload.status === 'error' ? (
                      <button
                        onClick={() => clearUploadError(fileName)}
                        className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase">
                        {upload.status}
                      </span>
                    )}
                  </div>
                </div>
                {upload.status === 'error' ? (
                  <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100 animate-in fade-in zoom-in-95 duration-200">
                    Error: {upload.error}
                  </p>
                ) : (
                  <ProgressBar value={upload.progress} max={100} className="h-1.5 rounded-full" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {/* Uploading text loop */}
          {hasUploading && (
            <div className="flex flex-col gap-3 p-6 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-200 animate-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Upload className="h-5 w-5 animate-bounce" />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-black text-blue-200 uppercase tracking-widest mb-1">Transferring</span>
                  <div className="h-5 overflow-hidden">
                    <TextLoop interval={3} className="text-sm font-bold">
                      {uploadingMessages.map((msg) => (
                        <span key={msg}>{msg}</span>
                      ))}
                    </TextLoop>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing / AI analyzing text loop */}
          {showProcessingBanner && !hasUploading && (
            <div className="flex flex-col gap-3 p-6 bg-emerald-600 text-white rounded-3xl shadow-xl shadow-emerald-200 animate-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Brain className="h-5 w-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-black text-emerald-200 uppercase tracking-widest mb-1">AI Processing</span>
                  <div className="h-5 overflow-hidden">
                    <TextLoop interval={4} className="text-sm font-bold">
                      {processingMessages.map((msg) => (
                        <span key={msg}>{msg}</span>
                      ))}
                    </TextLoop>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-100 text-red-700 p-6 rounded-2xl mb-10 flex items-center gap-4 animate-in shake-in-from-bottom-2 duration-500">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-red-900">System Error</h4>
            <p className="text-sm font-medium opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Stored Documents</h2>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{documents.length} Files</span>
        </div>

        {loading && documents.length === 0 ? (
          <div className="sleek-card p-20 flex flex-col items-center justify-center gap-4 text-center">
            <Spinner size="lg" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Synchronizing Library</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="sleek-card p-24 text-center group">
            <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-8 transition-transform group-hover:scale-110 duration-500">
              <FileText className="h-10 w-10 opacity-30" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Your library is empty</h3>
            <p className="text-gray-500 max-w-xs mx-auto font-medium">Drop some files in the box above to start building your knowledge base.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {documents.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).map((doc, idx) => {
              const status = statusConfig[doc.status] || statusConfig.processing;
              const StatusIcon = status.icon;
              return (
                <div
                  key={doc.id}
                  className="sleek-card group p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:translate-x-1 animate-in fade-in slide-in-from-left-4 duration-500"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-5 min-w-0 flex-1">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/5 transition-colors">
                      <FileText className="h-7 w-7 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-black text-gray-900 truncate mb-1">
                        {doc.originalName}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs font-bold text-gray-400">
                          {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ''}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-200" />
                        <span className="text-xs font-bold text-gray-400">
                          {doc.uploadDate && new Date(doc.uploadDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-50">
                    <div className="flex flex-col items-end">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      {doc.status === 'processing' && (
                        <div className="mt-1 h-3 overflow-hidden">
                          <TextLoop interval={3} className="text-[10px] font-bold text-amber-500">
                            {[
                              "Synthesizing...",
                              "Reading...",
                              "Mapping...",
                              "Generating...",
                              "Finalizing...",
                            ].map((msg) => (
                              <span key={msg}>{msg}</span>
                            ))}
                          </TextLoop>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete Permanently"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
