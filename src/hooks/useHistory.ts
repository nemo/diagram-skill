import { useState, useEffect, useCallback } from "react";

export interface SavedDiagram {
  id: string;
  name: string;
  savedAt: string;
  relativeTime: string;
}

export function useHistory() {
  const [items, setItems] = useState<SavedDiagram[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        setItems(await res.json());
      }
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (name: string) => {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await fetch(`/api/history/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await refresh();
    },
    [refresh],
  );

  return { items, loading, save, remove, refresh };
}
