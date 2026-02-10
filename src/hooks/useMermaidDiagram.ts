import { useState, useEffect, useCallback, useRef } from "react";
import { convertMermaid, type ConvertedElements } from "../lib/mermaid-converter";

interface DiagramState {
  elements: ConvertedElements | null;
  files: Record<string, unknown> | null;
  error: string | null;
  loading: boolean;
  mermaidSource: string | null;
  revision: number;
}

export function useMermaidDiagram() {
  const revisionRef = useRef(0);
  const [state, setState] = useState<DiagramState>({
    elements: null,
    files: null,
    error: null,
    loading: true,
    mermaidSource: null,
    revision: 0,
  });

  const fetchAndConvert = useCallback(async () => {
    try {
      const res = await fetch("/api/diagram");

      if (res.status === 404) {
        setState((prev) => ({
          ...prev,
          elements: null,
          files: null,
          error: null,
          loading: false,
          mermaidSource: null,
        }));
        return;
      }

      const source = await res.text();

      try {
        const { elements, files } = await convertMermaid(source);
        revisionRef.current += 1;
        setState({
          elements,
          files,
          error: null,
          loading: false,
          mermaidSource: source,
          revision: revisionRef.current,
        });
      } catch (parseError) {
        setState((prev) => ({
          ...prev,
          elements: null,
          files: null,
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          loading: false,
          mermaidSource: source,
        }));
      }
    } catch (fetchError) {
      setState((prev) => ({
        ...prev,
        elements: null,
        files: null,
        error:
          fetchError instanceof Error
            ? fetchError.message
            : String(fetchError),
        loading: false,
        mermaidSource: null,
      }));
    }
  }, []);

  useEffect(() => {
    fetchAndConvert();
  }, [fetchAndConvert]);

  // Listen for HMR updates from Vite plugin
  useEffect(() => {
    if (import.meta.hot) {
      import.meta.hot.on("diagram:update", () => {
        fetchAndConvert();
      });
    }
  }, [fetchAndConvert]);

  return state;
}
