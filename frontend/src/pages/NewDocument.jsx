import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Link2, StickyNote, Search, ArrowLeft } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import useDocumentStore from '../store/documentStore';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/paywall/UpgradeModal';

const TABS = [
  { id: 'file',  label: 'Upload',  icon: Upload },
  { id: 'url',   label: 'Link',    icon: Link2 },
  { id: 'note',  label: 'Paste',   icon: StickyNote },
  { id: 'topic', label: 'Topic',   icon: Search },
];

export default function NewDocument() {
  const navigate = useNavigate();
  const { uploadDocument, addUrl, addNote, addTopic } = useDocumentStore();
  const { isAtDocLimit } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [tab, setTab] = useState('file');

  // URL tab
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  // Note tab
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  // Topic tab
  const [topicInput, setTopicInput] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicLoading, setTopicLoading] = useState(false);

  const checkLimit = () => {
    if (isAtDocLimit) { setShowUpgradeModal(true); return false; }
    return true;
  };

  const handleFiles = useCallback((files) => {
    if (!checkLimit()) return;
    files.forEach(file => uploadDocument(file).catch(() => {}));
    navigate('/library');
  }, [uploadDocument, navigate]);

  const handleUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim() || !checkLimit()) return;
    setUrlLoading(true);
    try {
      await addUrl(urlInput.trim());
      navigate('/library');
    } catch { /* error in store */ }
    finally { setUrlLoading(false); }
  };

  const handleNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim() || !checkLimit()) return;
    setNoteLoading(true);
    try {
      await addNote(noteTitle.trim(), noteContent.trim());
      navigate('/library');
    } catch { /* error in store */ }
    finally { setNoteLoading(false); }
  };

  const handleTopic = async (e) => {
    e.preventDefault();
    if (!topicInput.trim() || !checkLimit()) return;
    setTopicLoading(true);
    try {
      await addTopic(topicInput.trim(), topicDesc.trim());
      navigate('/library');
    } catch { /* error in store */ }
    finally { setTopicLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {showUpgradeModal && (
        <UpgradeModal feature="documents" onClose={() => setShowUpgradeModal(false)} />
      )}

      {/* Back */}
      <button
        onClick={() => navigate('/library')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Library
      </button>

      <h1 className="text-2xl font-black text-gray-900 mb-1">Add document</h1>
      <p className="text-sm text-gray-500 mb-6">Upload a file, paste a URL, add notes, or generate from a topic.</p>

      {/* Segmented tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              tab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {tab === 'file' && (
          <div className="p-2">
            <div className="border-2 border-dashed border-gray-200 hover:border-sky-300 rounded-xl overflow-hidden transition-colors">
              <FileUpload onChange={handleFiles} />
            </div>
          </div>
        )}

        {tab === 'url' && (
          <form onSubmit={handleUrl} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Web URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400"
              />
              <p className="text-xs text-gray-400 mt-1.5">Articles, Wikipedia pages, blog posts, documentation.</p>
            </div>
            <button
              type="submit"
              disabled={urlLoading || !urlInput.trim()}
              className="w-full py-3 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {urlLoading ? 'Adding…' : 'Add URL'}
            </button>
          </form>
        )}

        {tab === 'note' && (
          <form onSubmit={handleNote} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Title (optional)
              </label>
              <input
                type="text"
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                placeholder="My notes on…"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Content
              </label>
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Paste or type your notes here…"
                rows={8}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={noteLoading || !noteContent.trim()}
              className="w-full py-3 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {noteLoading ? 'Saving…' : 'Save notes'}
            </button>
          </form>
        )}

        {tab === 'topic' && (
          <form onSubmit={handleTopic} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Topic
              </label>
              <input
                type="text"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                placeholder="e.g. Photosynthesis, World War II, React hooks"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Additional context (optional)
              </label>
              <textarea
                value={topicDesc}
                onChange={e => setTopicDesc(e.target.value)}
                placeholder="Any specific angle, level (beginner/advanced), or focus area…"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 resize-none"
              />
            </div>
            <p className="text-xs text-gray-400">AI will research this topic and generate a document with study modules.</p>
            <button
              type="submit"
              disabled={topicLoading || !topicInput.trim()}
              className="w-full py-3 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {topicLoading ? 'Generating…' : 'Generate from topic'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
