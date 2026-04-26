import { motion } from 'framer-motion';

export default function EmptyState({
  icon: Icon,
  title,
  body,
  primaryAction,
  secondaryAction,
  illustration,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : Icon ? (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <Icon className="h-7 w-7 text-gray-400" />
        </div>
      ) : null}

      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      {body && <p className="max-w-sm text-sm text-gray-500 leading-relaxed mb-6">{body}</p>}

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors cursor-pointer"
            >
              {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
