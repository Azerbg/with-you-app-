export default function BillingLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-6 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-white/60 mb-6" />
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="h-32 rounded-2xl bg-white/60" />
        <div className="h-32 rounded-2xl bg-white/60" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-white/60" />
        ))}
      </div>
    </div>
  );
}
