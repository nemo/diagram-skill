import { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import type { IncomingMessage } from "node:http";

const DIAGRAM_FILE = "diagram.json";
const DEBOUNCE_MS = 150;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "");
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function diagramPlugin(): Plugin {
  const diagramPath = path.resolve(process.cwd(), DIAGRAM_FILE);
  const historyDir = path.resolve(path.dirname(diagramPath), "history");

  // Ensure history directory exists
  fs.mkdirSync(historyDir, { recursive: true });

  return {
    name: "vite-plugin-diagram",

    configureServer(server) {
      // Serve diagram.json at /api/diagram
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/api/diagram") return next();

        if (!fs.existsSync(diagramPath)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No diagram.json file found" }));
          return;
        }

        const content = fs.readFileSync(diagramPath, "utf-8");

        // Treat empty files the same as missing
        if (!content.trim()) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "diagram.json is empty" }));
          return;
        }

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.end(content);
      });

      // GET /api/history — list saved diagrams
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== "/api/history" || req.method !== "GET") return next();

        try {
          const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".json"));
          const items = files
            .map((f) => {
              try {
                const content = fs.readFileSync(path.join(historyDir, f), "utf-8");
                const parsed = JSON.parse(content);
                return {
                  id: f.replace(/\.json$/, ""),
                  name: parsed.name as string,
                  savedAt: parsed.savedAt as string,
                  relativeTime: relativeTime(parsed.savedAt),
                };
              } catch {
                return null;
              }
            })
            .filter(Boolean)
            .sort((a, b) => new Date(b!.savedAt).getTime() - new Date(a!.savedAt).getTime());

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(items));
        } catch {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Failed to list history" }));
        }
      });

      // POST /api/history — save current diagram
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== "/api/history" || req.method !== "POST") return next();

        try {
          const body = JSON.parse(await readBody(req));
          const name = body.name?.trim();
          if (!name) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Name is required" }));
            return;
          }

          if (!fs.existsSync(diagramPath)) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "No diagram.json to save" }));
            return;
          }

          const diagramContent = fs.readFileSync(diagramPath, "utf-8");
          const diagram = JSON.parse(diagramContent);
          const savedAt = new Date().toISOString();
          const timestamp = formatTimestamp(new Date());
          const slug = slugify(name);
          const filename = `${timestamp}-${slug}.json`;

          const entry = { name, savedAt, diagram };
          fs.writeFileSync(path.join(historyDir, filename), JSON.stringify(entry, null, 2));

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              id: filename.replace(/\.json$/, ""),
              name,
              savedAt,
              relativeTime: relativeTime(savedAt),
            }),
          );
        } catch {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Failed to save diagram" }));
        }
      });

      // DELETE /api/history/:id — delete a saved diagram
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(/^\/api\/history\/([^/]+)$/);
        if (!match || req.method !== "DELETE") return next();

        const id = decodeURIComponent(match[1]);
        const filePath = path.join(historyDir, `${id}.json`);

        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }

        fs.unlinkSync(filePath);
        res.statusCode = 204;
        res.end();
      });

      // GET /api/history/:id/download — download a saved diagram
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(/^\/api\/history\/([^/]+)\/download$/);
        if (!match || req.method !== "GET") return next();

        const id = decodeURIComponent(match[1]);
        const filePath = path.join(historyDir, `${id}.json`);

        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }

        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const parsed = JSON.parse(content);
          const downloadName = `${slugify(parsed.name)}.json`;

          res.setHeader("Content-Type", "application/json");
          res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
          res.end(JSON.stringify(parsed.diagram, null, 2));
        } catch {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Failed to read file" }));
        }
      });

      // POST /api/history/open-folder — open history dir in Finder
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== "/api/history/open-folder" || req.method !== "POST") return next();

        exec(`open "${historyDir}"`);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      });

      // Watch diagram.json for changes with debounce
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const watcher = fs.watch(
        path.dirname(diagramPath),
        { persistent: false },
        (_eventType, filename) => {
          if (filename === DIAGRAM_FILE || filename === null) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              server.ws.send({ type: "custom", event: "diagram:update" });
            }, DEBOUNCE_MS);
          }
        },
      );

      server.httpServer?.on("close", () => {
        watcher.close();
        if (debounceTimer) clearTimeout(debounceTimer);
      });
    },
  };
}
