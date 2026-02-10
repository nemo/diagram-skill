import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

export type ConvertedElements = ReturnType<typeof convertToExcalidrawElements>;

// Pastel background colors for subgraph containers
const SUBGRAPH_COLORS = [
  "#dbeafe", // blue
  "#dcfce7", // green
  "#ede9fe", // purple
  "#ffedd5", // orange
  "#fce7f3", // pink
  "#cffafe", // cyan
  "#fef9c3", // yellow
  "#fee2e2", // red
];

// How much to widen containers to compensate for Excalidraw's hand-drawn font
// being wider than mermaid's font metrics (known issue excalidraw#8430)
const WIDTH_SCALE = 1.5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function postProcess(elements: readonly any[]): any[] {
  // Build a mutable copy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const els: any[] = elements.map((el) => ({ ...el }));

  // --- Identify subgraph containers ---
  // Subgraph container text has verticalAlign: "top"
  const subgraphIds = new Set<string>();
  for (const el of els) {
    if (el.type === "text" && el.verticalAlign === "top" && el.containerId) {
      subgraphIds.add(el.containerId);
    }
  }

  // --- Assign colors to subgraph containers ---
  let colorIdx = 0;
  for (const el of els) {
    if (el.type === "rectangle" && subgraphIds.has(el.id)) {
      el.backgroundColor = SUBGRAPH_COLORS[colorIdx % SUBGRAPH_COLORS.length];
      el.fillStyle = "solid";
      el.opacity = 60;
      colorIdx++;
    }
  }

  // --- Make arrows sharp (not curvy) ---
  for (const el of els) {
    if (el.type === "arrow") {
      el.roundness = null;
    }
  }

  // --- Build lookup for container widening ---
  const byId = new Map(els.map((el) => [el.id, el]));

  // --- Widen rectangles and their bound text to fix text cutoff ---
  for (const el of els) {
    if (el.type === "rectangle") {
      const oldWidth = el.width;
      const newWidth = oldWidth * WIDTH_SCALE;
      const delta = newWidth - oldWidth;
      el.width = newWidth;
      // Shift left by half the delta to keep center position
      el.x -= delta / 2;

      // Also widen any bound text elements so they fill the wider container
      if (el.boundElements) {
        for (const ref of el.boundElements) {
          if (ref.type === "text") {
            const textEl = byId.get(ref.id);
            if (textEl) {
              textEl.width = textEl.width * WIDTH_SCALE;
              textEl.x -= (textEl.width - textEl.width / WIDTH_SCALE) / 2;
            }
          }
        }
      }
    }
  }

  return els;
}

// Serialize calls to parseMermaidToExcalidraw — mermaid's global state
// breaks if multiple parses run concurrently ("Diagram already registered")
let pending: Promise<unknown> = Promise.resolve();

export async function convertMermaid(source: string) {
  // Warn (but don't block) if source isn't a flowchart — only flowcharts
  // produce interactive Excalidraw elements; other types render as static images
  const trimmed = source.trim();
  if (trimmed && !trimmed.startsWith("flowchart")) {
    console.warn(
      "[diagram] Warning: Only 'flowchart TD' or 'flowchart LR' diagrams produce interactive elements. " +
        "Other diagram types will render as a static image."
    );
  }

  const run = async () => {
    const { elements: skeletonElements, files } =
      await parseMermaidToExcalidraw(source);

    const elements = convertToExcalidrawElements(skeletonElements);
    const processed = postProcess(elements);

    return { elements: processed, files: files ?? {} };
  };

  // Chain onto previous call so they never overlap
  const result = pending.then(run, run);
  pending = result.catch(() => {});
  return result;
}
