import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

export type ConvertedElements = ReturnType<typeof convertToExcalidrawElements>;

// Serialize calls to parseMermaidToExcalidraw — mermaid's global state
// breaks if multiple parses run concurrently ("Diagram already registered")
let pending: Promise<unknown> = Promise.resolve();

export async function convertMermaid(source: string) {
  const run = async () => {
    const { elements: skeletonElements, files } =
      await parseMermaidToExcalidraw(source);

    const elements = convertToExcalidrawElements(skeletonElements);

    return { elements, files: files ?? {} };
  };

  // Chain onto previous call so they never overlap
  const result = pending.then(run, run);
  pending = result.catch(() => {});
  return result;
}
