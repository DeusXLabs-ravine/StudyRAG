function Bone({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />
  );
}

export function Skeleton({ className = '' }) {
  return <Bone className={className} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
      <Bone className="h-4 w-3/5" />
      <Bone className="h-3 w-4/5" />
      <Bone className="h-3 w-2/5" />
      <div className="flex gap-2 pt-1">
        <Bone className="h-6 w-16 rounded-full" />
        <Bone className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4">
          <Bone className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3.5 w-2/5" />
            <Bone className="h-3 w-3/5" />
          </div>
          <Bone className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDocumentDetail() {
  return (
    <div className="flex gap-6 p-6">
      <div className="flex-1 space-y-4">
        <Bone className="h-7 w-2/5" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-4/5" />
        <Bone className="h-4 w-3/5" />
        <div className="space-y-3 pt-4">
          {[1, 2, 3].map(i => (
            <Bone key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="w-72 space-y-4 flex-shrink-0">
        <Bone className="h-12 w-full rounded-xl" />
        <Bone className="h-48 w-full rounded-2xl" />
        <Bone className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default Skeleton;
