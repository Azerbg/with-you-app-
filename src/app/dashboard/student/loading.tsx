export default function StudentDashboardLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-6 animate-pulse">
      {/* Hero banner skeleton */}
      <div className="h-28 rounded-3xl bg-white/60 mb-6" />
      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/60" />
        ))}
      </div>
      {/* Content rows */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/60" />
        ))}
      </div>
    </div>
  );
}
