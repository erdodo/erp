"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { TRIGGER_MODULES, TRIGGER_EVENTS, ACTION_LABELS, WORKFLOW_TEMPLATES } from "@/lib/workflow-templates";

interface WorkflowStep {
  id: string;
  sortOrder: number;
  action: string;
  config: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerModule: string;
  triggerEvent: string;
  isActive: boolean;
  createdAt: string;
  steps: WorkflowStep[];
  _count: { executions: number };
}

interface Execution {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  triggerData: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  running:   "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed:    "bg-red-100 text-red-700",
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [tab, setTab] = useState<"steps" | "executions">("steps");

  const [form, setForm] = useState({
    name: "", description: "", triggerModule: "crm", triggerEvent: "created", isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/workflows");
    setWorkflows(await r.json() as Workflow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function loadExecutions(wfId: string) {
    const r = await fetch(`/api/admin/workflows/${wfId}`);
    const data = await r.json() as Workflow & { executions: Execution[] };
    setExecutions(data.executions ?? []);
  }

  function selectWorkflow(wf: Workflow) {
    setSelected(wf);
    setTab("steps");
    void loadExecutions(wf.id);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setForm({ name: "", description: "", triggerModule: "crm", triggerEvent: "created", isActive: true });
    void load();
  }

  async function handleCreateFromTemplate(idx: number) {
    const tpl = WORKFLOW_TEMPLATES[idx];
    const r = await fetch("/api/admin/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:          tpl.name,
        description:   tpl.description,
        triggerModule: tpl.triggerModule,
        triggerEvent:  tpl.triggerEvent,
        conditions:    tpl.conditions ? JSON.stringify(tpl.conditions) : undefined,
        isActive:      true,
      }),
    });
    const wf = await r.json() as Workflow;

    // Create steps
    for (const step of tpl.steps) {
      await fetch(`/api/admin/workflows/${wf.id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: step.sortOrder, action: step.action, config: step.config }),
      });
    }

    setShowTemplates(false);
    void load();
  }

  async function toggleActive(wf: Workflow) {
    await fetch(`/api/admin/workflows/${wf.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !wf.isActive }),
    });
    void load();
    if (selected?.id === wf.id) setSelected({ ...selected, isActive: !wf.isActive });
  }

  async function deleteWorkflow(id: string) {
    if (!confirm("Bu workflow silinecek. Emin misiniz?")) return;
    await fetch(`/api/admin/workflows/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    void load();
  }

  async function deleteStep(stepId: string) {
    if (!selected) return;
    await fetch(`/api/admin/workflows/${selected.id}/steps/${stepId}`, { method: "DELETE" });
    const r = await fetch(`/api/admin/workflows/${selected.id}`);
    const data = await r.json() as Workflow;
    setSelected(data);
    void load();
  }

  const moduleLabel = (v: string) => TRIGGER_MODULES.find((m) => m.value === v)?.label ?? v;
  const eventLabel  = (v: string) => TRIGGER_EVENTS.find((e) => e.value === v)?.label ?? v;

  return (
    <div className="max-w-full mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-4">
          <i className="pi pi-sitemap" style={{ color: "var(--color-primary)" }} /> Workflow Motoru
          <span className="text-sm font-normal text-slate-400 ml-1">iş akışları</span>
        </h1>
        <div className="flex items-center justify-between gap-3">
          <AdminNav />
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowTemplates(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <i className="pi pi-copy" /> Şablonlar
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
              <i className="pi pi-plus" /> Yeni Workflow
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* Workflow List */}
        <div className="space-y-2">
          {loading ? (
            <div className="py-10 text-center text-slate-400"><i className="pi pi-spin pi-spinner text-xl" /></div>
          ) : workflows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 rounded-xl border border-border bg-white dark:bg-slate-900">
              <i className="pi pi-sitemap text-3xl block mb-2" />
              <p className="text-sm">Henüz workflow yok</p>
              <p className="text-xs mt-1">Şablonlardan başlayabilirsiniz</p>
            </div>
          ) : workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => selectWorkflow(wf)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition ${selected?.id === wf.id ? "border-primary bg-blue-50/40 dark:bg-blue-900/10" : "border-border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{wf.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{moduleLabel(wf.triggerModule)} → {eventLabel(wf.triggerEvent)}</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${wf.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {wf.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span><i className="pi pi-list mr-1" />{wf.steps.length} adım</span>
                <span><i className="pi pi-play mr-1" />{wf._count.executions} çalışma</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground">{selected.name}</h2>
                {selected.description && <p className="text-xs text-slate-400 mt-0.5">{selected.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(selected)} className={`text-xs px-2.5 py-1 rounded-lg border transition ${selected.isActive ? "border-green-200 text-green-700 hover:bg-green-50" : "border-border text-slate-500 hover:bg-slate-50"}`}>
                  {selected.isActive ? "Pasif Yap" : "Aktif Et"}
                </button>
                <button onClick={() => deleteWorkflow(selected.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                  Sil
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(["steps", "executions"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-2.5 text-sm font-medium transition border-b-2 ${tab === t ? "border-primary text-foreground" : "border-transparent text-slate-400 hover:text-foreground"}`}
                  style={tab === t ? { borderColor: "var(--color-primary)" } : {}}>
                  {t === "steps" ? "Adımlar" : "Çalışma Geçmişi"}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === "steps" && (
                <div className="space-y-2">
                  {selected.steps.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Henüz adım yok</p>
                  ) : selected.steps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{ACTION_LABELS[step.action] ?? step.action}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{step.config}</p>
                      </div>
                      <button onClick={() => deleteStep(step.id)} className="text-slate-300 hover:text-red-500 transition shrink-0">
                        <i className="pi pi-times text-sm" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 mt-3">API üzerinden yeni adım eklemek için <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">POST /api/admin/workflows/{"{id}"}/steps</code></p>
                </div>
              )}

              {tab === "executions" && (
                <div className="space-y-2">
                  {executions.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Henüz çalışma geçmişi yok</p>
                  ) : executions.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[ex.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {ex.status}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500">{new Date(ex.startedAt).toLocaleString("tr-TR")}</p>
                        {ex.error && <p className="text-xs text-red-500 mt-0.5 truncate">{ex.error}</p>}
                      </div>
                      {ex.completedAt && (
                        <span className="text-xs text-slate-400 shrink-0">
                          {Math.round((new Date(ex.completedAt).getTime() - new Date(ex.startedAt).getTime()) / 1000)}s
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border border-dashed bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-slate-400">
            <div className="text-center py-16">
              <i className="pi pi-sitemap text-4xl block mb-3" />
              <p className="text-sm">Bir workflow seçin</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Yeni Workflow</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Ad</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Açıklama</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Modül</label>
                  <select value={form.triggerModule} onChange={(e) => setForm({ ...form, triggerModule: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none">
                    {TRIGGER_MODULES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Olay</label>
                  <select value={form.triggerEvent} onChange={(e) => setForm({ ...form, triggerEvent: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none">
                    {TRIGGER_EVENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                Aktif olarak oluştur
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
                <button type="submit" className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Hazır Şablonlar</h3>
              <button onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {WORKFLOW_TEMPLATES.map((tpl, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-4 rounded-xl border border-border hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{tpl.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{tpl.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">{moduleLabel(tpl.triggerModule)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">{tpl.steps.length} adım</span>
                    </div>
                  </div>
                  <button onClick={() => handleCreateFromTemplate(i)} className="shrink-0 px-3 py-1.5 rounded-lg text-white text-xs font-medium" style={{ background: "var(--color-primary)" }}>
                    Kullan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
