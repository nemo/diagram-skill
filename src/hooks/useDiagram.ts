import { useState, useEffect, useCallback, useRef } from "react";
import { convertGraph, type ConvertedElements } from "../lib/elk-converter";
import { convertGraphToFlow, type FlowResult } from "../lib/reactflow-converter";

export type RendererType = "excalidraw" | "flow";

interface ExcalidrawData {
  renderer: "excalidraw";
  elements: ConvertedElements;
  files: Record<string, unknown>;
}

interface FlowData {
  renderer: "flow";
  nodes: FlowResult["nodes"];
  edges: FlowResult["edges"];
}

type DiagramData = ExcalidrawData | FlowData;

interface DiagramState {
  data: DiagramData | null;
  error: string | null;
  loading: boolean;
  diagramSource: string | null;
  revision: number;
}

export function useDiagram(renderer: RendererType) {
  const revisionRef = useRef(0);
  const fetchIdRef = useRef(0);
  const [state, setState] = useState<DiagramState>({
    data: null,
    error: null,
    loading: true,
    diagramSource: null,
    revision: 0,
  });

  const fetchAndConvert = useCallback(async () => {
    const thisId = ++fetchIdRef.current;

    try {
      const res = await fetch("/api/diagram");

      if (thisId !== fetchIdRef.current) return;

      if (res.status === 404) {
        setState((prev) => ({
          ...prev,
          data: null,
          error: null,
          loading: false,
          diagramSource: null,
        }));
        return;
      }

      const source = await res.text();
      if (thisId !== fetchIdRef.current) return;

      try {
        let data: DiagramData;
        if (renderer === "flow") {
          const { nodes, edges } = await convertGraphToFlow(source);
          data = { renderer: "flow", nodes, edges };
        } else {
          const { elements, files } = await convertGraph(source);
          data = { renderer: "excalidraw", elements, files };
        }

        if (thisId !== fetchIdRef.current) return;

        revisionRef.current += 1;
        setState({
          data,
          error: null,
          loading: false,
          diagramSource: source,
          revision: revisionRef.current,
        });
      } catch (parseError) {
        if (thisId !== fetchIdRef.current) return;
        setState((prev) => ({
          ...prev,
          data: null,
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          loading: false,
          diagramSource: source,
        }));
      }
    } catch (fetchError) {
      if (thisId !== fetchIdRef.current) return;
      setState((prev) => ({
        ...prev,
        data: null,
        error:
          fetchError instanceof Error
            ? fetchError.message
            : String(fetchError),
        loading: false,
        diagramSource: null,
      }));
    }
  }, [renderer]);

  useEffect(() => {
    fetchAndConvert();
  }, [fetchAndConvert]);

  // Listen for HMR updates from Vite plugin
  useEffect(() => {
    if (import.meta.hot) {
      const handler = () => {
        fetchAndConvert();
      };
      import.meta.hot.on("diagram:update", handler);
      return () => {
        import.meta.hot!.off("diagram:update", handler);
      };
    }
  }, [fetchAndConvert]);

  return state;
}
