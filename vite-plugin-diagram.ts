import { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

const DIAGRAM_FILE = "diagram.mermaid";

export default function diagramPlugin(): Plugin {
  const diagramPath = path.resolve(process.cwd(), DIAGRAM_FILE);

  return {
    name: "vite-plugin-diagram",

    configureServer(server) {
      // Serve diagram.mermaid at /api/diagram
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/api/diagram") return next();

        if (!fs.existsSync(diagramPath)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No diagram.mermaid file found" }));
          return;
        }

        const content = fs.readFileSync(diagramPath, "utf-8");
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.end(content);
      });

      // Watch diagram.mermaid for changes and send HMR event
      const watcher = fs.watch(
        path.dirname(diagramPath),
        { persistent: false },
        (_eventType, filename) => {
          if (filename === DIAGRAM_FILE) {
            server.ws.send({ type: "custom", event: "diagram:update" });
          }
        }
      );

      server.httpServer?.on("close", () => watcher.close());
    },
  };
}
