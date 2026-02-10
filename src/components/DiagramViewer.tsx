import { Excalidraw } from "@excalidraw/excalidraw";
import { useRef, useEffect, useCallback } from "react";
import type { ConvertedElements } from "../lib/elk-converter";

interface DiagramViewerProps {
  elements: ConvertedElements;
  files: Record<string, unknown>;
}

export function DiagramViewer({ elements, files }: DiagramViewerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const initializedRef = useRef(false);

  const zoomToFit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api: any, factor = 0.85) => {
      const els = api.getSceneElements();
      if (els.length > 0) {
        api.scrollToContent(els, {
          fitToViewport: true,
          viewportZoomFactor: factor,
        });
      }
    },
    [],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMount = useCallback((api: any) => {
    apiRef.current = api;
    // Initial zoom-to-fit after Excalidraw finishes its first render
    setTimeout(() => zoomToFit(api), 500);
  }, [zoomToFit]);

  // Update elements in-place when they change, preserving user edits and viewport
  useEffect(() => {
    if (!apiRef.current) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      return; // handleMount already handles initial zoom
    }

    // Subsequent updates: update scene in-place (preserves viewport & user annotations)
    apiRef.current.updateScene({
      elements: [...elements],
    });
    // Re-fit after updating
    setTimeout(() => {
      const api = apiRef.current;
      if (!api) return;
      zoomToFit(api, 0.9);
    }, 200);
  }, [elements, zoomToFit]);

  return (
    <div className="diagram-container">
      <Excalidraw
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
