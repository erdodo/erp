"use client";

import { useEffect, useRef, useState } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
  onClick?: () => void;
}

interface UseContextMenuOptions {
  items: ContextMenuItem[];
}

export function useContextMenu({ items }: UseContextMenuOptions) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      const x = Math.min(e.clientX, window.innerWidth - 220);
      const y = Math.min(e.clientY, window.innerHeight - (items.length * 36 + 16));
      setPosition({ x, y });
      setVisible(true);
    }

    el.addEventListener("contextmenu", onContextMenu);
    return () => el.removeEventListener("contextmenu", onContextMenu);
  }, [items.length]);

  useEffect(() => {
    if (!visible) return;
    function close() { setVisible(false); }
    window.addEventListener("click", close, { once: true });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); }, { once: true });
    return () => window.removeEventListener("click", close);
  }, [visible]);

  return { ref, visible, position, setVisible, items };
}
