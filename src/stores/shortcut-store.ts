"use client";

import { create } from "zustand";

export interface Shortcut {
  key: string;
  label: string;
  description: string;
  callback: () => void;
  scope?: string;
}

interface ShortcutState {
  shortcuts: Map<string, Shortcut>;
  altPressed: boolean;
  registerShortcut: (shortcut: Shortcut) => () => void;
  setAltPressed: (pressed: boolean) => void;
  triggerShortcut: (key: string) => boolean;
}

export const useShortcutStore = create<ShortcutState>((set, get) => ({
  shortcuts: new Map(),
  altPressed: false,

  registerShortcut: (shortcut) => {
    set((s) => {
      const next = new Map(s.shortcuts);
      next.set(shortcut.key.toLowerCase(), shortcut);
      return { shortcuts: next };
    });
    return () => {
      set((s) => {
        const next = new Map(s.shortcuts);
        next.delete(shortcut.key.toLowerCase());
        return { shortcuts: next };
      });
    };
  },

  setAltPressed: (pressed) => {
    set({ altPressed: pressed });
    if (typeof document !== "undefined") {
      document.body.classList.toggle("alt-pressed", pressed);
    }
  },

  triggerShortcut: (key) => {
    const shortcut = get().shortcuts.get(key.toLowerCase());
    if (shortcut) {
      shortcut.callback();
      return true;
    }
    return false;
  },
}));
