"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
    useDroppable, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PIPELINE_STAGES, getStage } from "@/lib/crm-types";

interface PipelineCustomer {
  id: string; name: string; type: string; email: string | null;
  phone: string | null; city: string | null; pipelineStage: string;
  tags: string | null; _count: { interactions: number };
}

function DraggableCard({ customer }: { customer: PipelineCustomer }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: customer.id });
  const router = useRouter();
  const stage  = getStage(customer.pipelineStage);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border border-border bg-white dark:bg-slate-900 p-3 cursor-grab active:cursor-grabbing select-none transition hover:shadow-md hover:border-slate-300 ${isDragging ? "opacity-50 shadow-xl" : ""}`}
    >
      {/* Drag handle row */}
      <div className="flex items-start justify-between gap-2" {...attributes} {...listeners}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: stage.color }}>
            {customer.name[0]?.toUpperCase()}
          </div>
          <p className="font-medium text-foreground text-sm truncate">{customer.name}</p>
        </div>
        <i className="pi pi-ellipsis-h text-slate-300 text-xs shrink-0 mt-1" />
      </div>

      {/* Info */}
      <div className="mt-2 space-y-1 pl-9">
        {customer.email && <p className="text-xs text-slate-400 truncate">{customer.email}</p>}
        {customer.city  && <p className="text-xs text-slate-400">{customer.city}</p>}
        {customer.tags  && (
          <div className="flex flex-wrap gap-1">
            {customer.tags.split(",").slice(0, 2).map((t, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 text-xs">{t.trim()}</span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2.5 pt-2.5 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-slate-400">{customer._count?.interactions ?? 0} etkileşim</span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => router.push(`/dashboard/crm/customers/${customer.id}`)}
          className="text-xs px-2 py-0.5 rounded-lg border border-border text-slate-500 hover:bg-slate-50 transition"
        >
          Detay
        </button>
      </div>
    </div>
  );
}

function DroppableColumn({ stageId, customers }: { stageId: string; customers: PipelineCustomer[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  const stage = getStage(stageId);

  return (
    <div className={`flex flex-col rounded-2xl border-2 transition ${isOver ? "border-primary/50 bg-blue-50/30 dark:bg-blue-950/10" : "border-transparent bg-slate-100 dark:bg-slate-800/50"}`}
      style={isOver ? { borderColor: "var(--color-primary)80" } : {}}>
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${stage.bg}`}>
            <i className={`pi ${stage.icon} text-xs`} />{stage.label}
          </span>
        </div>
        <span className="text-xs font-bold text-slate-400">{customers.length}</span>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 px-3 pb-3 space-y-2 min-h-32">
        <SortableContext items={customers.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {customers.length === 0 ? (
            <div className="h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
              <p className="text-xs text-slate-400">Sürükle bırak</p>
            </div>
          ) : (
            customers.map((c) => <DraggableCard key={c.id} customer={c} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [grouped, setGrouped] = useState<Record<string, PipelineCustomer[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    const r    = await fetch("/api/modules/crm/pipeline");
    const data = await r.json() as { grouped: Record<string, PipelineCustomer[]> };
    setGrouped(data.grouped);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const overId    = String(over.id);
    const newStage  = PIPELINE_STAGES.find((s) => s.id === overId)?.id;
    const customerId = String(active.id);

    // Find current customer
    let currentStage = "";
    for (const [stage, customers] of Object.entries(grouped)) {
      if (customers.find((c) => c.id === customerId)) { currentStage = stage; break; }
    }
    if (!newStage || currentStage === newStage) return;

    // Optimistic update
    setGrouped((prev) => {
      const next = { ...prev };
      const customer = next[currentStage]?.find((c) => c.id === customerId);
      if (!customer) return prev;
      next[currentStage] = next[currentStage].filter((c) => c.id !== customerId);
      next[newStage]     = [...(next[newStage] ?? []), { ...customer, pipelineStage: newStage }];
      return next;
    });

    // Persist
    await fetch(`/api/modules/crm/customers/${customerId}/stage`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: newStage }),
    });
  }

  const filterCustomers = (customers: PipelineCustomer[]) => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} />
    </div>
  );

  const totalActive = PIPELINE_STAGES
    .filter((s) => s.id !== "won" && s.id !== "lost")
    .reduce((s, st) => s + (grouped[st.id]?.length ?? 0), 0);

  return (
    <div className="pb-8 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pipeline'da ara…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-foreground">{totalActive}</span> aktif fırsat
        </div>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage) => (
            <DroppableColumn
              key={stage.id}
              stageId={stage.id}
              customers={filterCustomers(grouped[stage.id] ?? [])}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
