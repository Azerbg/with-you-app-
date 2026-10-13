export default function MessagesLoading() {
  return (
    <div className="flex-1 overflow-hidden flex animate-pulse">
      {/* Thread list */}
      <div className="w-72 border-r border-black/5 p-3 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-white/60" />
        ))}
      </div>
      {/* Message area */}
      <div className="flex-1 p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-2xl bg-white/60" style={{ width: `${50 + i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}
