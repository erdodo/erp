"use client";

import { useEffect, useRef } from "react";
import type { ContextMenuItem } from "@/hooks/useContextMenu";
import { createPortal } from "react-dom";

interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ visible, position, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [visible, onClose]);

  if (!visible || typeof window === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] bg-white dark:bg-slate-800 border border-border rounded-xl shadow-2xl py-1 min-w-[200px] text-sm"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="border-t border-border my-1" />;
        }
        if (item.submenu) {
          return (
            <div key={i} className="relative group">
              <button
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                disabled={item.disabled}
              >
                {item.icon && <i className={`pi ${item.icon} text-slate-500 w-4 text-center`} />}
                <span className="flex-1">{item.label}</span>
                <i className="pi pi-chevron-right text-slate-400 text-xs" />
              </button>
              <div className="absolute left-full top-0 hidden group-hover:block bg-white dark:bg-slate-800 border border-border rounded-xl shadow-2xl py-1 min-w-[180px]">
                {item.submenu.map((sub, j) => (
                  <button
                    key={j}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                    onClick={() => { sub.onClick?.(); onClose(); }}
                  >
                    {sub.icon && <i className={`pi ${sub.icon} text-slate-500 w-4 text-center`} />}
                    <span className="flex-1">{sub.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        }
        return (
          <button
            key={i}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left disabled:opacity-40 disabled:cursor-not-allowed ${item.danger ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
            disabled={item.disabled}
            onClick={() => { item.onClick?.(); onClose(); }}
          >
            {item.icon && <i className={`pi ${item.icon} w-4 text-center ${item.danger ? "text-red-500" : "text-slate-500"}`} />}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-xs text-slate-400">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
