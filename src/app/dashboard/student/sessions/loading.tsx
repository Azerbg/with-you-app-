export default function SessionsLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-6 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-white/60 mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/60" />
        ))}
      </div>
    </div>
  );
}
