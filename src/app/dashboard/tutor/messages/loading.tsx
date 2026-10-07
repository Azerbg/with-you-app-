export default function MessagesLoading() {
  return (
    <div className="flex-1 flex overflow-hidden animate-pulse">
      {/* Thread list */}
      <div className="w-72 border-r border-black/5 bg-white flex-shrink-0 p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded bg-gray-200 w-3/4" />
              <div className="h-2 rounded bg-gray-100 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      {/* Message area */}
      <div className="flex-1 p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
            <div className="h-10 rounded-2xl bg-gray-200 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}
