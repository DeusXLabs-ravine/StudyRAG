import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle, Lock, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';
import useModuleStore from '../store/moduleStore';
import useDocumentStore from '../store/documentStore';
import Spinner from '../components/common/Spinner';
import ProgressBar from '../components/common/ProgressBar';
import LessonViewer from '../components/learn/LessonViewer';
import QuizSection from '../components/learn/QuizSection';

export default function Learn() {
  const { modules, currentModule, loading, fetchModules, fetchModule, setCurrentModule } = useModuleStore();
  const { documents, fetchDocuments } = useDocumentStore();
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchModules(selectedDocId);
  }, [selectedDocId, fetchModules]);

  const readyDocs = documents.filter(d => d.status === 'ready');
  const completedCount = modules.filter(m => m.progress?.completed).length;
  const totalModules = modules.length;

  const handleModuleSelect = async (mod) => {
    setShowQuiz(false);
    await fetchModule(mod.id);
  };

  const handleNext = () => {
    if (!currentModule) return;
    const idx = modules.findIndex(m => m.id === currentModule.id);
    if (idx < modules.length - 1) {
      handleModuleSelect(modules[idx + 1]);
    }
  };

  const handlePrev = () => {
    if (!currentModule) return;
    const idx = modules.findIndex(m => m.id === currentModule.id);
    if (idx > 0) {
      handleModuleSelect(modules[idx - 1]);
    }
  };

  const isModuleAccessible = (mod, index) => {
    if (index === 0) return true;
    const prevModule = modules[index - 1];
    return prevModule?.progress?.completed;
  };

  if (loading && modules.length === 0) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Learning Journey</h1>
          <p className="text-gray-500 mt-1">Master your documents through AI-generated modules.</p>
        </div>
        {readyDocs.length > 0 && (
          <div className="relative group">
            <select
              value={selectedDocId || ''}
              onChange={e => setSelectedDocId(e.target.value || null)}
              className="appearance-none w-full md:w-64 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm group-hover:shadow-md"
            >
              <option value="">All Documents</option>
              {readyDocs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.originalName}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ChevronRight className="h-4 w-4 rotate-90" />
            </div>
          </div>
        )}
      </div>

      {modules.length === 0 ? (
        <div className="sleek-card p-20 text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No learning modules yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto">Upload documents in the Documents section to automatically generate your personalized learning modules.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="sleek-card p-6 sticky top-8">
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Overall Progress</span>
                  <span className="text-sm font-bold text-gray-900">{Math.round((completedCount / totalModules) * 100)}%</span>
                </div>
                <ProgressBar
                  value={completedCount}
                  max={totalModules}
                  className="h-2 rounded-full"
                />
              </div>

              <div className="space-y-1.5">
                {modules.map((mod, index) => {
                  const accessible = isModuleAccessible(mod, index);
                  const isActive = currentModule?.id === mod.id;
                  const isCompleted = mod.progress?.completed;

                  return (
                    <button
                      key={mod.id}
                      onClick={() => accessible && handleModuleSelect(mod)}
                      disabled={!accessible}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm transition-all ${isActive
                          ? 'bg-primary text-white font-semibold shadow-lg shadow-primary/20 scale-[1.02]'
                          : accessible
                            ? 'text-gray-700 hover:bg-gray-50 hover:translate-x-1'
                            : 'text-gray-400 cursor-not-allowed grayscale'
                        }`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20' : isCompleted ? 'bg-green-100' : accessible ? 'bg-gray-100' : 'bg-gray-50'
                        }`}>
                        {isCompleted ? (
                          <CheckCircle className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-green-600'}`} />
                        ) : !accessible ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>{index + 1}</span>
                        )}
                      </div>
                      <span className="truncate flex-1">{mod.title}</span>
                      {isActive && <ChevronRight className="h-4 w-4 text-white/70" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {currentModule ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {showQuiz ? (
                  <QuizSection
                    module={currentModule}
                    onBack={() => setShowQuiz(false)}
                    onComplete={handleNext}
                  />
                ) : (
                  <>
                    <LessonViewer module={currentModule} />
                    <div className="sleek-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <button
                        onClick={handlePrev}
                        disabled={modules.findIndex(m => m.id === currentModule.id) === 0}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowLeft className="h-4 w-4" /> Previous Module
                      </button>

                      <button
                        onClick={() => setShowQuiz(true)}
                        className="w-full sm:w-auto px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 active:scale-95"
                      >
                        Start Comprehension Check
                      </button>

                      <button
                        onClick={handleNext}
                        disabled={modules.findIndex(m => m.id === currentModule.id) === modules.length - 1}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next Module <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="sleek-card p-20 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ChevronRight className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to start?</h3>
                <p className="text-gray-500 max-w-sm mx-auto">Select a learning module from the progress sidebar to begin your study session.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
