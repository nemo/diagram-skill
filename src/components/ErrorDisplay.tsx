interface ErrorDisplayProps {
  error: string;
  mermaidSource: string | null;
}

export function ErrorDisplay({ error, mermaidSource }: ErrorDisplayProps) {
  return (
    <div className="error-container">
      <h2>Diagram Parse Error</h2>
      <pre className="error-message">{error}</pre>
      {mermaidSource && (
        <>
          <h3>Raw Mermaid Source</h3>
          <pre className="mermaid-source">{mermaidSource}</pre>
        </>
      )}
    </div>
  );
}
