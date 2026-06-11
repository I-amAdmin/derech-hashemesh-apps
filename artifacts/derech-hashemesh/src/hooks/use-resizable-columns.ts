import { useState, useCallback } from "react";

export function useResizableColumns(
  initialWidths: Record<string, number>,
  storageKey: string
) {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, number>;
        return { ...initialWidths, ...parsed };
      }
    } catch {}
    return { ...initialWidths };
  });

  const startResize = useCallback(
    (col: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = widths[col] ?? initialWidths[col] ?? 100;

      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        const newWidth = Math.max(40, startWidth + delta);
        setWidths((prev) => {
          const next = { ...prev, [col]: newWidth };
          try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
          return next;
        });
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [widths, storageKey, initialWidths]
  );

  return { widths, startResize };
}
