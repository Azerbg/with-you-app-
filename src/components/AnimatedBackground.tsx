"use client";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[#FAF8F0]" />

      {/* Blob 1 — large yellow, top-left */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, #F5C400 0%, #FFDE59 40%, transparent 70%)",
          animation: "float1 18s ease-in-out infinite",
        }}
      />

      {/* Blob 2 — medium golden, top-right */}
      <div
        className="absolute -top-16 -right-24 w-[380px] h-[380px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, #C49200 0%, #F5C400 50%, transparent 70%)",
          animation: "float2 22s ease-in-out infinite",
        }}
      />

      {/* Blob 3 — small yellow, bottom-left */}
      <div
        className="absolute bottom-0 -left-16 w-[280px] h-[280px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, #FFDE59 0%, #FFF3B0 50%, transparent 70%)",
          animation: "float3 16s ease-in-out infinite",
        }}
      />

      {/* Blob 4 — medium brown-warm, bottom-right */}
      <div
        className="absolute -bottom-24 -right-16 w-[420px] h-[420px] rounded-full opacity-15"
        style={{
          background: "radial-gradient(circle, #C49200 0%, #F5C400 40%, transparent 70%)",
          animation: "float4 25s ease-in-out infinite",
        }}
      />

      {/* Blob 5 — tiny accent, center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, #F5C400 0%, transparent 70%)",
          animation: "float5 20s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes float1 {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(40px, 30px) scale(1.05); }
          66%  { transform: translate(-20px, 50px) scale(0.97); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float2 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-50px, 40px) scale(1.08); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float3 {
          0%   { transform: translate(0, 0) scale(1); }
          40%  { transform: translate(30px, -40px) scale(1.1); }
          80%  { transform: translate(10px, -20px) scale(0.95); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float4 {
          0%   { transform: translate(0, 0) scale(1); }
          30%  { transform: translate(-30px, -20px) scale(1.06); }
          70%  { transform: translate(20px, -40px) scale(0.98); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float5 {
          0%   { transform: translate(-50%, -50%) scale(1); }
          50%  { transform: translate(calc(-50% + 60px), calc(-50% - 40px)) scale(1.3); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
