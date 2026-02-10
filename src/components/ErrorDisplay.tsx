interface ErrorDisplayProps {
  error: string;
  diagramSource: string | null;
}

export function ErrorDisplay({ error, diagramSource }: ErrorDisplayProps) {
  return (
    <div className="error-container">
      <h2>Diagram Error</h2>
      <pre className="error-message">{error}</pre>
      {diagramSource && (
        <>
          <h3>Raw Diagram Source</h3>
          <pre className="diagram-source">{diagramSource}</pre>
        </>
      )}
    </div>
  );
}
