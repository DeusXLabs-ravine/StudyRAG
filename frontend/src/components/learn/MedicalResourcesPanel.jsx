import { useState } from 'react';
import { ExternalLink, BookOpen, FileText, Stethoscope, Hash, Library, Globe, ChevronDown, ChevronUp, Link } from 'lucide-react';

const SOURCE_CONFIG = {
  pubmed: {
    label: 'PubMed',
    icon: FileText,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
  icd10: {
    label: 'ICD-10',
    icon: Hash,
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  wikidoc: {
    label: 'WikiDoc',
    icon: BookOpen,
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-700',
  },
  msd_manual: {
    label: 'MSD Manual',
    icon: Stethoscope,
    bg: 'bg-red-50',
    border: 'border-red-100',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
  },
  open_textbook: {
    label: 'Open Textbook',
    icon: Library,
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  },
  web: {
    label: 'Web',
    icon: Globe,
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    text: 'text-sky-700',
    badge: 'bg-sky-100 text-sky-700',
  },
};

function getSourceConfig(sourceType) {
  return SOURCE_CONFIG[sourceType] || {
    label: sourceType,
    icon: Link,
    bg: 'bg-gray-50',
    border: 'border-gray-100',
    text: 'text-gray-700',
    badge: 'bg-gray-100 text-gray-700',
  };
}

// Detect if resources are primarily medical (for panel header styling)
function isMedicalSet(resources) {
  const medTypes = new Set(['pubmed', 'icd10', 'wikidoc', 'msd_manual']);
  return resources.some(r => medTypes.has(r.sourceType));
}

export default function MedicalResourcesPanel({ resources }) {
  const [expanded, setExpanded] = useState(false);

  if (!resources || resources.length === 0) return null;

  const isMedical = isMedicalSet(resources);

  // Group by source type
  const grouped = {};
  for (const r of resources) {
    const key = r.sourceType;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  const displayResources = expanded ? resources : resources.slice(0, 6);
  const hasMore = resources.length > 6;

  return (
    <div className={`sleek-card overflow-hidden ${isMedical ? 'border border-teal-100/50 bg-teal-50/10' : 'border border-sky-100/50 bg-sky-50/10'}`}>
      {/* Header */}
      <div className={`px-5 py-4 border-b ${isMedical ? 'border-teal-100/30' : 'border-sky-100/30'} flex items-center gap-3`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMedical ? 'bg-teal-100 text-teal-600' : 'bg-sky-100 text-sky-600'}`}>
          {isMedical ? <Stethoscope className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">References</h3>
          <p className="text-xs text-gray-500">
            {resources.length} source{resources.length !== 1 ? 's' : ''} ·{' '}
            {isMedical ? 'PubMed, ICD-10, WikiDoc & more' : 'Web resources for this topic'}
          </p>
        </div>
      </div>

      {/* Source type summary badges */}
      <div className={`px-5 py-3 border-b ${isMedical ? 'border-teal-50' : 'border-sky-50'} flex flex-wrap gap-2`}>
        {Object.entries(grouped).map(([sourceType, items]) => {
          const cfg = getSourceConfig(sourceType);
          return (
            <span key={sourceType} className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${cfg.badge} flex items-center gap-1`}>
              <cfg.icon className="h-3 w-3" />
              {cfg.label} ({items.length})
            </span>
          );
        })}
      </div>

      {/* Resources list */}
      <div className="divide-y divide-gray-50">
        {displayResources.map(resource => {
          const cfg = getSourceConfig(resource.sourceType);
          const Icon = cfg.icon;

          return (
            <div key={resource.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-7 h-7 ${cfg.bg} ${cfg.text} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.text}`}>
                      {cfg.label}
                    </span>
                    {resource.topic && (
                      <span className="text-[9px] font-bold text-gray-400">
                        · {resource.topic}
                      </span>
                    )}
                  </div>
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm font-bold text-gray-900 transition-colors inline-flex items-center gap-1.5 group ${isMedical ? 'hover:text-teal-700' : 'hover:text-sky-700'}`}
                    >
                      <span className="line-clamp-1">{resource.title}</span>
                      <ExternalLink className={`h-3 w-3 text-gray-400 flex-shrink-0 ${isMedical ? 'group-hover:text-teal-500' : 'group-hover:text-sky-500'}`} />
                    </a>
                  ) : (
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{resource.title}</p>
                  )}
                  {resource.snippet && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{resource.snippet}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more / less */}
      {hasMore && (
        <div className={`px-5 py-3 border-t ${isMedical ? 'border-teal-50' : 'border-sky-50'}`}>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-xs font-bold flex items-center gap-1 transition-colors ${isMedical ? 'text-teal-600 hover:text-teal-700' : 'text-sky-600 hover:text-sky-700'}`}
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> Show all {resources.length} sources</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
