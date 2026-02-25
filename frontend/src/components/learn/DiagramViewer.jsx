import { useState } from 'react';
import { Image, RefreshCw, Eye, EyeOff, Tag } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';
import { MorphingSquare } from '../ui/morphing-square';
import { getDiagramImageUrl, regenerateDiagramLevel } from '../../services/diagramService';

const LEVELS = [
  { key: 'dummy', label: 'Simple' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Standard' },
  { key: 'advanced', label: 'Advanced' },
];

export default function DiagramViewer({ diagram, teachingLevel = 'intermediate' }) {
  const [selectedLevel, setSelectedLevel] = useState(teachingLevel);
  const [showOriginal, setShowOriginal] = useState(false);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [localMermaid, setLocalMermaid] = useState(diagram.mermaidCode || {});
  const [localDescriptions, setLocalDescriptions] = useState(diagram.simplifiedDescriptions || {});

  const currentMermaid = localMermaid[selectedLevel];
  const currentDescription = localDescriptions[selectedLevel] || diagram.description;

  const handleShowOriginal = async () => {
    if (showOriginal) {
      setShowOriginal(false);
      return;
    }
    if (originalUrl) {
      setShowOriginal(true);
      return;
    }
    setLoadingImage(true);
    try {
      const url = await getDiagramImageUrl(diagram.id);
      setOriginalUrl(url);
      setShowOriginal(true);
    } catch {
      // Fail silently
    } finally {
      setLoadingImage(false);
    }
  };

  const handleLevelChange = async (level) => {
    setSelectedLevel(level);
    // If this level doesn't have mermaid code yet, regenerate on demand
    if (!localMermaid[level] && !regenerating) {
      setRegenerating(true);
      try {
        const result = await regenerateDiagramLevel(diagram.id, level);
        setLocalMermaid(result.mermaidCode || {});
        setLocalDescriptions(result.simplifiedDescriptions || {});
      } catch {
        // Fail silently — the description will still show
      } finally {
        setRegenerating(false);
      }
    }
  };

  const typeBadgeColor = {
    flowchart: 'bg-blue-100 text-blue-700',
    hierarchy: 'bg-purple-100 text-purple-700',
    sequence: 'bg-green-100 text-green-700',
    mindmap: 'bg-yellow-100 text-yellow-700',
    cycle: 'bg-orange-100 text-orange-700',
    comparison: 'bg-pink-100 text-pink-700',
    graph: 'bg-indigo-100 text-indigo-700',
    chart: 'bg-teal-100 text-teal-700',
  }[diagram.diagramType] || 'bg-gray-100 text-gray-700';

  return (
    <div className="sleek-card p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeBadgeColor}`}>
              {diagram.diagramType}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">Page {diagram.pageNumber}</span>
          </div>
          <h4 className="text-base font-bold text-gray-900 truncate">{diagram.title || 'Untitled Diagram'}</h4>
        </div>

        <button
          onClick={handleShowOriginal}
          disabled={loadingImage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all"
        >
          {loadingImage ? <MorphingSquare size="xs" /> : showOriginal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showOriginal ? 'Hide Original' : 'Show Original'}
        </button>
      </div>

      {/* Level Selector */}
      <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
        {LEVELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleLevelChange(key)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedLevel === key
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Original Image */}
      {showOriginal && originalUrl && (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          <img src={originalUrl} alt={diagram.title || 'Original diagram'} className="w-full h-auto" />
        </div>
      )}

      {/* Mermaid Diagram */}
      {regenerating ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <MorphingSquare size="sm" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generating {selectedLevel} view...</span>
        </div>
      ) : currentMermaid ? (
        <MermaidDiagram code={currentMermaid} id={`${diagram.id}-${selectedLevel}`} />
      ) : (
        <div className="flex items-center justify-center py-6 text-xs text-gray-400 bg-gray-50 rounded-xl">
          <Image className="h-4 w-4 mr-2" />
          No Mermaid diagram available for this level
        </div>
      )}

      {/* Description */}
      {currentDescription && (
        <p className="text-sm text-gray-600 leading-relaxed">{currentDescription}</p>
      )}

      {/* Labels */}
      {diagram.labels && diagram.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {diagram.labels.map((label, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 text-[10px] font-semibold rounded-full border border-gray-100">
              <Tag className="h-2.5 w-2.5" />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
