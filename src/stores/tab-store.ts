"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Tab {
  id: string;
  title: string;
  url: string;
  icon?: string;
  isPinned: boolean;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Omit<Tab, "id" | "isPinned">) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  pinTab: (id: string, pinned: boolean) => void;
  closeOtherTabs: (id: string) => void;
  updateTab: (id: string, partial: Partial<Tab>) => void;
  getActiveTab: () => Tab | null;
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (tab) => {
        const existing = get().tabs.find((t) => t.url === tab.url);
        if (existing) {
          set({ activeTabId: existing.id });
          return;
        }
        const id = crypto.randomUUID();
        set((s) => ({
          tabs: [...s.tabs, { ...tab, id, isPinned: false }],
          activeTabId: id,
        }));
      },

      removeTab: (id) => {
        const { tabs, activeTabId } = get();
        const idx = tabs.findIndex((t) => t.id === id);
        const newTabs = tabs.filter((t) => t.id !== id);
        let newActive = activeTabId;
        if (activeTabId === id) {
          newActive = newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? null;
        }
        set({ tabs: newTabs, activeTabId: newActive });
      },

      setActiveTab: (id) => set({ activeTabId: id }),

      reorderTabs: (fromIndex, toIndex) => {
        const tabs = [...get().tabs];
        const [moved] = tabs.splice(fromIndex, 1);
        if (moved) tabs.splice(toIndex, 0, moved);
        set({ tabs });
      },

      pinTab: (id, pinned) =>
        set((s) => ({ tabs: s.tabs.map((t) => t.id === id ? { ...t, isPinned: pinned } : t) })),

      closeOtherTabs: (id) => {
        const pinned = get().tabs.filter((t) => t.isPinned);
        const target = get().tabs.find((t) => t.id === id);
        const keep = [...pinned];
        if (target && !target.isPinned) keep.push(target);
        set({ tabs: keep, activeTabId: id });
      },

      updateTab: (id, partial) =>
        set((s) => ({ tabs: s.tabs.map((t) => t.id === id ? { ...t, ...partial } : t) })),

      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find((t) => t.id === activeTabId) ?? null;
      },
    }),
    { name: "erp-tabs" }
  )
);
