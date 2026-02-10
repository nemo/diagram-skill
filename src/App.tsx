import { useDiagram, type RendererType } from "./hooks/useDiagram";
import { DiagramViewer } from "./components/DiagramViewer";
import { FlowViewer } from "./components/FlowViewer";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { LoadingDisplay } from "./components/LoadingDisplay";

function getRenderer(): RendererType {
  const params = new URLSearchParams(window.location.search);
  const r = params.get("renderer");
  return r === "excalidraw" ? "excalidraw" : "flow";
}

export default function App() {
  const renderer = getRenderer();
  const { data, error, loading, diagramSource } = useDiagram(renderer);

  if (loading) {
    return <LoadingDisplay hasDiagram={false} />;
  }

  if (error) {
    return <ErrorDisplay error={error} diagramSource={diagramSource} />;
  }

  if (!data) {
    return <LoadingDisplay hasDiagram={false} />;
  }

  if (data.renderer === "flow") {
    return <FlowViewer nodes={data.nodes} edges={data.edges} />;
  }

  return <DiagramViewer elements={data.elements} files={data.files} />;
}
