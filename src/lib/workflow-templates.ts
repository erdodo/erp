import type { StepConfig, ActionType, ConditionGroup } from "@/lib/workflow-engine";

export interface WorkflowTemplate {
  name: string;
  description: string;
  triggerModule: string;
  triggerEvent: string;
  conditions?: ConditionGroup;
  steps: Array<{ sortOrder: number; action: ActionType; config: StepConfig }>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "Sipariş → Üretim Emri",
    description: "Yeni sipariş oluşturulduğunda otomatik üretim emri bildirimi gönderir.",
    triggerModule: "crm",
    triggerEvent: "order.created",
    steps: [
      {
        sortOrder: 1,
        action: "notify",
        config: {
          notifyUserId: "$triggerUserId",
          notifyTitle: "Yeni Sipariş: {{customerName}}",
          notifyBody: "{{quantity}} adet sipariş üretim onayı bekliyor.",
          notifyType: "info",
          notifyModule: "production",
        },
      },
      {
        sortOrder: 2,
        action: "updateStatus",
        config: {
          model: "productionOrder",
          recordIdField: "productionOrderId",
          status: "pending",
        },
      },
    ],
  },
  {
    name: "Stok Düşük → Satın Alma Bildirimi",
    description: "Stok miktarı eşiğin altına düştüğünde satın alma departmanına bildirim gönderir.",
    triggerModule: "stock",
    triggerEvent: "stock.low",
    conditions: {
      logic: "and",
      conditions: [
        { field: "quantity", operator: "lt", value: 10 },
      ],
    },
    steps: [
      {
        sortOrder: 1,
        action: "notify",
        config: {
          notifyUserId: "$triggerUserId",
          notifyTitle: "Stok Uyarısı: {{itemName}}",
          notifyBody: "{{itemName}} stoğu kritik seviyede ({{quantity}} adet). Satın alma talebi oluşturulması önerilir.",
          notifyType: "warning",
          notifyModule: "stock",
        },
      },
      {
        sortOrder: 2,
        action: "createTask",
        config: {
          taskTitle: "Satın Alma: {{itemName}} ({{quantity}} adet kaldı)",
          taskDueInDays: 2,
          taskRelatedModule: "stock",
        },
      },
    ],
  },
  {
    name: "Görev Tamamlandı → Proje Güncelle",
    description: "Bir görev tamamlandığında proje durumunu kontrol eder ve bildirim gönderir.",
    triggerModule: "tasks",
    triggerEvent: "task.completed",
    steps: [
      {
        sortOrder: 1,
        action: "notify",
        config: {
          notifyUserId: "$triggerUserId",
          notifyTitle: "Görev Tamamlandı",
          notifyBody: "{{taskTitle}} görevi tamamlandı.",
          notifyType: "success",
          notifyModule: "tasks",
        },
      },
    ],
  },
  {
    name: "Kalite Kontrolü Başarısız → Üretim Durdur",
    description: "Kalite kontrolü başarısız olduğunda ilgili üretim emrini bekletmeye alır.",
    triggerModule: "quality",
    triggerEvent: "quality.failed",
    conditions: {
      logic: "and",
      conditions: [
        { field: "severity", operator: "in", value: ["critical", "high"] },
      ],
    },
    steps: [
      {
        sortOrder: 1,
        action: "updateStatus",
        config: {
          model: "productionOrder",
          recordIdField: "productionOrderId",
          status: "on_hold",
        },
      },
      {
        sortOrder: 2,
        action: "notify",
        config: {
          notifyUserId: "$triggerUserId",
          notifyTitle: "Kalite Kontrolü Başarısız",
          notifyBody: "{{productName}} için kalite kontrolü başarısız. Üretim emri beklemeye alındı.",
          notifyType: "error",
          notifyModule: "quality",
        },
      },
      {
        sortOrder: 3,
        action: "createTask",
        config: {
          taskTitle: "Kalite Sorunu İnceleme: {{productName}}",
          taskDueInDays: 1,
        },
      },
    ],
  },
  {
    name: "Proje Bitiş Tarihi Yaklaşıyor",
    description: "Proje bitiş tarihine 3 gün kaldığında proje yöneticisine bildirim gönderir.",
    triggerModule: "projects",
    triggerEvent: "project.deadline_approaching",
    steps: [
      {
        sortOrder: 1,
        action: "notify",
        config: {
          notifyUserId: "$triggerUserId",
          notifyTitle: "Proje Bitiş Tarihi Yaklaşıyor",
          notifyBody: "{{projectName}} projesinin bitiş tarihine 3 gün kaldı.",
          notifyType: "warning",
          notifyModule: "projects",
        },
      },
    ],
  },
];

export const TRIGGER_MODULES = [
  { value: "crm",        label: "CRM" },
  { value: "stock",      label: "Stok" },
  { value: "production", label: "Üretim" },
  { value: "quality",    label: "Kalite" },
  { value: "tasks",      label: "Görevler" },
  { value: "projects",   label: "Projeler" },
  { value: "hr",         label: "İnsan Kaynakları" },
  { value: "finance",    label: "Finans" },
];

export const TRIGGER_EVENTS = [
  { value: "created",              label: "Oluşturuldu" },
  { value: "updated",              label: "Güncellendi" },
  { value: "deleted",              label: "Silindi" },
  { value: "status_changed",       label: "Durum Değişti" },
  { value: "completed",            label: "Tamamlandı" },
  { value: "order.created",        label: "Sipariş Oluşturuldu" },
  { value: "stock.low",            label: "Stok Düşük" },
  { value: "task.completed",       label: "Görev Tamamlandı" },
  { value: "quality.failed",       label: "Kalite Başarısız" },
  { value: "project.deadline_approaching", label: "Bitiş Tarihi Yaklaşıyor" },
];

export const ACTION_LABELS: Record<string, string> = {
  notify:       "Bildirim Gönder",
  createTask:   "Görev Oluştur",
  updateStatus: "Durum Güncelle",
  updateField:  "Alan Güncelle",
  assignUser:   "Kullanıcı Ata",
  sendToModule: "Modüle İlet",
  wait:         "Bekle",
};
