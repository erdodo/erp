"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ClipboardState {
  history: string[];
  addToHistory: (text: string) => void;
  clearHistory: () => void;
}

export const useClipboardStore = create<ClipboardState>()(
  persist(
    (set) => ({
      history: [],
      addToHistory: (text) =>
        set((s) => ({
          history: [text, ...s.history.filter((h) => h !== text)].slice(0, 20),
        })),
      clearHistory: () => set({ history: [] }),
    }),
    { name: "erp-clipboard" }
  )
);
