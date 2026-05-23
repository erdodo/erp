"use client";

import { useState, useCallback, useEffect } from "react";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext, useSortable, rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { WidgetRenderer } from "@/components/dashboard/WidgetRenderer";
import { WidgetWizard } from "@/components/dashboard/WidgetWizard";

interface DBWidget {
  id: string;
  title: string;
  type: string;
  dataSource: string;
  config: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Layout {
  id: string;
  name: string;
  isDefault: boolean;
  widgets: DBWidget[];
}

interface SortableWidgetProps {
  widget: DBWidget;
  onDelete: (id: string) => void;
}

function SortableWidget({ widget, onDelete }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });

  const colSpan = Math.min(widget.w, 12);
  const colClass =
    colSpan <= 3  ? "col-span-1" :
    colSpan <= 6  ? "col-span-1 md:col-span-2" :
    colSpan <= 9  ? "col-span-1 md:col-span-3" :
                    "col-span-1 md:col-span-4";

  const minH =
    widget.h <= 2 ? "min-h-36" :
    widget.h <= 3 ? "min-h-52" :
    widget.h <= 4 ? "min-h-72" : "min-h-96";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${colClass} ${minH} ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      <div className="h-full flex flex-col">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center h-5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 transition"
        >
          <i className="pi pi-ellipsis-h text-xs" />
        </div>
        <div className="flex-1 min-h-0">
          <WidgetRenderer widget={widget} onDelete={onDelete} />
        </div>
      </div>
    </div>
  );
}

interface DashboardGridProps {
  initialLayouts: Layout[];
}

export function DashboardGrid({ initialLayouts }: DashboardGridProps) {
  const [layouts, setLayouts]           = useState<Layout[]>(initialLayouts);
  const [activeLayoutId, setActiveLayoutId] = useState<string>(
    initialLayouts.find((l) => l.isDefault)?.id ?? initialLayouts[0]?.id ?? ""
  );
  const [showWizard, setShowWizard]     = useState(false);
  const [showNewLayout, setShowNewLayout] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const activeLayout = layouts.find((l) => l.id === activeLayoutId);
  const widgets      = activeLayout?.widgets ?? [];

  // Reload a single layout's widgets from API
  const reloadLayout = useCallback(async (id: string) => {
    const r = await fetch(`/api/dashboard/layouts/${id}`);
    const data = await r.json() as Layout;
    setLayouts((prev) => prev.map((l) => l.id === id ? { ...l, widgets: data.widgets } : l));
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeLayout) return;

    const oldIndex = widgets.findIndex((w) => w.id === active.id);
    const newIndex = widgets.findIndex((w) => w.id === over.id);
    const reordered = arrayMove(widgets, oldIndex, newIndex);

    // Optimistic update
    setLayouts((prev) => prev.map((l) =>
      l.id === activeLayoutId ? { ...l, widgets: reordered } : l
    ));

    // Persist new positions
    await fetch(`/api/dashboard/layouts/${activeLayoutId}/widgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgets: reordered.map((w, i) => ({ id: w.id, x: i % 4, y: Math.floor(i / 4) })) }),
    });
  }

  async function deleteWidget(widgetId: string) {
    if (!activeLayoutId) return;
    await fetch(`/api/dashboard/layouts/${activeLayoutId}/widgets/${widgetId}`, { method: "DELETE" });
    setLayouts((prev) => prev.map((l) =>
      l.id === activeLayoutId ? { ...l, widgets: l.widgets.filter((w) => w.id !== widgetId) } : l
    ));
  }

  async function createLayout() {
    if (!newLayoutName) return;
    const r = await fetch("/api/dashboard/layouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLayoutName }),
    });
    const data = await r.json() as Layout;
    setLayouts((prev) => [...prev, { ...data, widgets: [] }]);
    setActiveLayoutId(data.id);
    setNewLayoutName("");
    setShowNewLayout(false);
  }

  async function deleteLayout(id: string) {
    if (!confirm("Bu dashboard silinecek. Emin misiniz?")) return;
    await fetch(`/api/dashboard/layouts/${id}`, { method: "DELETE" });
    const remaining = layouts.filter((l) => l.id !== id);
    setLayouts(remaining);
    setActiveLayoutId(remaining[0]?.id ?? "");
  }

  // Auto-create default layout if none
  useEffect(() => {
    if (layouts.length === 0) {
      void fetch("/api/dashboard/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ana Dashboard", isDefault: true }),
      }).then((r) => r.json()).then((data: unknown) => {
        const layout = data as Layout;
        setLayouts([{ ...layout, widgets: [] }]);
        setActiveLayoutId(layout.id);
      });
    }
  }, [layouts.length]);

  if (!activeLayout && layouts.length === 0) {
    return <div className="py-8 text-center text-slate-400"><i className="pi pi-spin pi-spinner" /></div>;
  }

  return (
    <div>
      {/* Dashboard tabs + actions */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {layouts.map((l) => (
            <div key={l.id} className="flex items-center">
              <button onClick={() => setActiveLayoutId(l.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${l.id === activeLayoutId ? "text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                style={l.id === activeLayoutId ? { background: "var(--color-primary)" } : {}}>
                {l.name}
              </button>
              {layouts.length > 1 && l.id === activeLayoutId && (
                <button onClick={() => deleteLayout(l.id)}
                  className="-ml-1 w-5 h-5 flex items-center justify-center rounded-md opacity-70 hover:opacity-100 text-white"
                  style={{ background: "var(--color-primary)" }}>
                  <i className="pi pi-times text-xs" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setShowNewLayout(true)} className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm">
            <i className="pi pi-plus" />
          </button>
        </div>
        <button onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shrink-0"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus-circle" /> Widget Ekle
        </button>
      </div>

      {/* New layout input */}
      {showNewLayout && (
        <div className="flex items-center gap-2 mb-4">
          <input value={newLayoutName} onChange={(e) => setNewLayoutName(e.target.value)} placeholder="Dashboard adı" autoFocus
            onKeyDown={(e) => e.key === "Enter" && createLayout()}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
          <button onClick={createLayout} className="px-3 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>Oluştur</button>
          <button onClick={() => setShowNewLayout(false)} className="px-3 py-2 rounded-lg border border-border text-slate-500 text-sm">İptal</button>
        </div>
      )}

      {/* Widget Grid */}
      {widgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-slate-50 dark:bg-slate-900/50 py-16 text-center">
          <i className="pi pi-th-large text-4xl text-slate-300 block mb-3" />
          <p className="text-sm text-slate-400 mb-3">Henüz widget yok</p>

          <button onClick={() => setShowWizard(true)}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-plus-circle mr-2" /> İlk widget&apos;ı ekle
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {widgets.map((widget) => (
                <SortableWidget key={widget.id} widget={widget} onDelete={deleteWidget} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showWizard && activeLayoutId && (
        <WidgetWizard
          layoutId={activeLayoutId}
          onClose={() => setShowWizard(false)}
          onCreated={() => { setShowWizard(false); void reloadLayout(activeLayoutId); }}
        />
      )}
    </div>
  );
}
