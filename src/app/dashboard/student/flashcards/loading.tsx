export default function FlashcardsLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-6 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-white/60 mb-6" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-white/60" />
        ))}
      </div>
    </div>
  );
}
