"use client";

import { useState, useRef, useCallback } from "react";

interface SplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultRatio?: number;
}

export function SplitView({ left, right, defaultRatio = 50 }: SplitViewProps) {
  const [ratio, setRatio] = useState(defaultRatio);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(() => { dragging.current = true; }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setRatio(Math.max(20, Math.min(80, pct)));
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full select-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className="overflow-auto" style={{ width: `${ratio}%` }}>
        {left}
      </div>
      <div
        className="w-1 bg-border hover:bg-primary cursor-col-resize flex-shrink-0 transition-colors"
        style={{ background: "var(--border)" }}
        onMouseDown={onMouseDown}
      />
      <div className="overflow-auto flex-1">
        {right}
      </div>
    </div>
  );
}
