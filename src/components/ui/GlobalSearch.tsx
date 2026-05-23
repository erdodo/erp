"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ALL_MODULES } from "@/lib/modules-data";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  module: string;
  href: string;
  icon: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("erp-search-recent");
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch { return []; }
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.altKey && (e.key === "/" || e.code === "Slash")) { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const search = useCallback((q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    const lower = q.toLowerCase();
    const moduleResults: SearchResult[] = ALL_MODULES
      .filter((m) => m.name.toLowerCase().includes(lower) || m.nameEn.toLowerCase().includes(lower) || m.slug.includes(lower))
      .slice(0, 5)
      .map((m) => ({
        id: `mod-${m.slug}`,
        title: m.name,
        subtitle: m.group,
        module: m.slug,
        href: m.route,
        icon: m.icon,
      }));
    setResults(moduleResults);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  function navigate(href: string, title: string) {
    router.push(href);
    setOpen(false);
    setQuery("");
    const next = [title, ...recent.filter((r) => r !== title)].slice(0, 8);
    setRecent(next);
    localStorage.setItem("erp-search-recent", JSON.stringify(next));
  }

  function handleKey(e: React.KeyboardEvent) {
    const list = results.length > 0 ? results : [];
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, list.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && list[activeIndex]) { navigate(list[activeIndex].href, list[activeIndex].title); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-border">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <i className="pi pi-search text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Modül, kayıt veya işlem ara..."
            className="flex-1 bg-transparent text-foreground placeholder-slate-400 focus:outline-none text-base"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 transition">
              <i className="pi pi-times text-sm" />
            </button>
          )}
          <kbd className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 && (
            <div className="p-4">
              {recent.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Son Aramalar</p>
                  {recent.map((r, i) => (
                    <button key={i} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-sm text-foreground">
                      <i className="pi pi-history text-slate-400 text-xs" /> {r}
                    </button>
                  ))}
                </>
              )}
              <p className="text-xs text-slate-400 mt-3">En az 2 karakter yazın</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">Modüller</p>
              {results.map((r, i) => (
                <button
                  key={r.id}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition ${i === activeIndex ? "bg-primary/10" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                  style={i === activeIndex ? { background: "var(--color-primary-light)" } : {}}
                  onClick={() => navigate(r.href, r.title)}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: "var(--color-primary)" }}>
                    <i className={`pi ${r.icon} text-sm`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-slate-400">{r.subtitle}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center">
              <i className="pi pi-search text-3xl text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">&quot;{query}&quot; için sonuç bulunamadı</p>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-slate-400">
          <span><kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded">↑↓</kbd> Seç</span>
          <span><kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Enter</kbd> Aç</span>
          <span><kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded">ESC</kbd> Kapat</span>
        </div>
      </div>
    </div>
  );
}
