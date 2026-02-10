import { Excalidraw } from "@excalidraw/excalidraw";
import { useCallback } from "react";
import type { ConvertedElements } from "../lib/mermaid-converter";

interface DiagramViewerProps {
  elements: ConvertedElements;
  files: Record<string, unknown>;
  updateKey: number;
}

export function DiagramViewer({
  elements,
  files,
  updateKey,
}: DiagramViewerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMount = useCallback((api: any) => {
    // After Excalidraw mounts, zoom to fit all content with some padding
    setTimeout(() => {
      api.scrollToContent(api.getSceneElements(), {
        fitToViewport: true,
        viewportZoomFactor: 0.9,
      });
    }, 100);
  }, []);

  return (
    <div className="diagram-container">
      <Excalidraw
        key={updateKey}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialData={{ elements: [...elements], files: files as any }}
        excalidrawAPI={handleMount}
        viewModeEnabled={false}
        UIOptions={{
          canvasActions: {
            export: { saveFileToDisk: true },
          },
        }}
      />
    </div>
  );
}
