interface LoadingDisplayProps {
  hasDiagram: boolean;
}

export function LoadingDisplay({ hasDiagram }: LoadingDisplayProps) {
  return (
    <div className="loading-container">
      <p>{hasDiagram ? "Loading diagram..." : "Waiting for diagram.json..."}</p>
    </div>
  );
}
