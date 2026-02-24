import { useState, useEffect } from 'react';
import { Shapes, Image as ImageIcon, Code, AlertCircle, Loader2 } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';
import { getGeneratedDiagramImageUrl } from '../../services/diagramService';

const TYPE_BADGES = {
  mermaid: { label: 'Mermaid', bg: 'bg-blue-100', text: 'text-blue-700', icon: Code },
  d2: { label: 'D2', bg: 'bg-purple-100', text: 'text-purple-700', icon: Code },
  image: { label: 'AI Image', bg: 'bg-amber-100', text: 'text-amber-700', icon: ImageIcon },
};

export default function GeneratedDiagramCard({ diagram }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  const badge = TYPE_BADGES[diagram.diagramType] || TYPE_BADGES.mermaid;
  const BadgeIcon = badge.icon;

  // Fetch signed URL for image-type diagrams
  useEffect(() => {
    if (diagram.diagramType === 'image' && diagram.imageStoragePath && !imageUrl) {
      setImageLoading(true);
      getGeneratedDiagramImageUrl(diagram.id)
        .then(url => setImageUrl(url))
        .catch(() => setImageUrl(null))
        .finally(() => setImageLoading(false));
    }
  }, [diagram.id, diagram.diagramType, diagram.imageStoragePath]);

  if (diagram.status === 'generating') {
    return (
      <div className="sleek-card p-6 border border-blue-100 bg-blue-50/30">
        <div className="flex items-center gap-3 text-blue-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-bold">Generating {diagram.topic} diagram...</span>
        </div>
      </div>
    );
  }

  if (diagram.status === 'failed') {
    return (
      <div className="sleek-card p-6 border border-red-100 bg-red-50/30">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <div>
            <span className="text-sm font-bold">Diagram generation failed</span>
            {diagram.errorMessage && (
              <p className="text-xs text-red-500 mt-1">{diagram.errorMessage}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sleek-card overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shapes className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-gray-900 truncate">{diagram.title || diagram.topic}</h4>
            {diagram.description && (
              <p className="text-xs text-gray-500 truncate">{diagram.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badge.bg} ${badge.text} flex items-center gap-1`}>
            <BadgeIcon className="h-3 w-3" />
            {badge.label}
          </span>
          {diagram.teachingLevel && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-600 capitalize">
              {diagram.teachingLevel}
            </span>
          )}
        </div>
      </div>

      {/* Diagram Content */}
      <div className="p-4">
        {diagram.diagramType === 'mermaid' && diagram.diagramCode && (
          <MermaidDiagram code={diagram.diagramCode} id={diagram.id} />
        )}

        {diagram.diagramType === 'd2' && diagram.renderedSvg && (
          <div
            className="d2-svg-container overflow-x-auto bg-white rounded-xl p-4 border border-gray-100"
            dangerouslySetInnerHTML={{ __html: diagram.renderedSvg }}
          />
        )}

        {diagram.diagramType === 'd2' && !diagram.renderedSvg && diagram.diagramCode && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-2">D2 Source (SVG not available)</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">{diagram.diagramCode}</pre>
          </div>
        )}

        {diagram.diagramType === 'image' && (
          imageLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={diagram.title || diagram.topic}
              className="w-full rounded-xl border border-gray-100"
            />
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
              Image not available
            </div>
          )
        )}
      </div>
    </div>
  );
}
