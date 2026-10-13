export default function TutorDashboardLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-6 animate-pulse">
      <div className="h-28 rounded-3xl bg-white/60 mb-6" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/60" />
        ))}
      </div>
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 h-64 rounded-2xl bg-white/60" />
        <div className="h-64 rounded-2xl bg-white/60" />
      </div>
    </div>
  );
}
