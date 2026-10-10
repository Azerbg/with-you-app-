// Static CSS import ensures @excalidraw/excalidraw styles are bundled
// by webpack for all classroom routes (whiteboard, canvas viewer, sandbox).
// Must live here — not inside a dynamic() callback — so the bundler can
// analyse the import statically.
import "@excalidraw/excalidraw/index.css";

export default function ClassroomLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
