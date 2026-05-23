"use client";

import { useTabStore } from "@/stores/tab-store";
import { useRouter } from "next/navigation";

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabStore();
  const router = useRouter();

  if (tabs.length === 0) return null;

  return (
    <div className="h-10 flex items-center gap-1 px-2 border-b border-border bg-surface overflow-x-auto flex-shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex-shrink-0 max-w-[160px] ${
              isActive
                ? "text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
            style={isActive ? { background: "var(--color-primary)" } : {}}
            onClick={() => {
              setActiveTab(tab.id);
              router.push(tab.url);
            }}
          >
            {tab.icon && <i className={`pi ${tab.icon} text-[11px]`} />}
            <span className="truncate">{tab.title}</span>
            {!tab.isPinned && (
              <button
                className={`ml-1 rounded hover:bg-white/20 p-0.5 ${isActive ? "text-white/70 hover:text-white" : "text-slate-400 hover:text-slate-600"}`}
                onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
              >
                <i className="pi pi-times text-[9px]" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
