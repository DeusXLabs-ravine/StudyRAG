import { CheckCircle, Clock, AlertCircle, Loader2, FileQuestion } from 'lucide-react';

const configs = {
  ready: {
    icon: CheckCircle,
    label: 'Ready',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    spin: true,
  },
  uploading: {
    icon: Loader2,
    label: 'Uploading',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    spin: true,
  },
  registering: {
    icon: Clock,
    label: 'Registering',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  'no-content': {
    icon: FileQuestion,
    label: 'No content yet',
    className: 'bg-gray-50 text-gray-500 border-gray-200',
  },
};

export default function StatusPill({ status, label, className = '' }) {
  const cfg = configs[status] || configs['no-content'];
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className} ${className}`}
    >
      <Icon className={`h-3 w-3 ${cfg.spin ? 'animate-spin' : ''}`} />
      {label || cfg.label}
    </span>
  );
}
