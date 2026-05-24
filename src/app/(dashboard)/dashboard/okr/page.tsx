"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  getOkrLevelConfig, 
  OKR_LEVELS 
} from "@/lib/okr-types";
import type { 
  OkrPeriod, 
  OkrTeam, 
  OkrObjective, 
  OkrKeyResult, 
  OkrPeriodComment, 
  OkrPeriodVote, 
  OkrObjectiveComment 
} from "@/lib/okr-types";

// PrimeReact UI Components or custom styles
import { PrimeIcons } from "primereact/api";

const EMPTY_PERIOD = { name: "", type: "quarterly", startDate: "", endDate: "" };
const EMPTY_TEAM = { name: "", description: "", leaderId: "", userIds: [] as string[] };
const EMPTY_OBJECTIVE = { title: "", description: "", level: "company", departmentId: "", teamId: "", userId: "", ownerId: "" };
const EMPTY_KR = { title: "", description: "", initialValue: 0, currentValue: 0, targetValue: 100, unit: "%", ownerId: "" };

export default function OkrPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin || session?.user?.isSuperAdmin;

  // Periods & Candidates Lists
  const [periods, setPeriods] = useState<OkrPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<OkrTeam[]>([]);
  
  // OKR Core State
  const [objectives, setObjectives] = useState<OkrObjective[]>([]);
  const [periodDetail, setPeriodDetail] = useState<OkrPeriod | null>(null);
  
  // Loading & View States
  const [activeTab, setActiveTab] = useState<"overview" | "voting" | "teams" | "admin" | "help">("overview");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [objectiveFilterLevel, setObjectiveFilterLevel] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Period / Vote forms
  const [voteScore, setVoteScore] = useState<number>(5);
  const [voteComment, setVoteComment] = useState("");
  const [periodCommentText, setPeriodCommentText] = useState("");
  const [savingVote, setSavingVote] = useState(false);
  const [savingPeriodComment, setSavingPeriodComment] = useState(false);

  // New Objective modal/drawer
  const [objectiveDrawer, setObjectiveDrawer] = useState<"new" | OkrObjective | null>(null);
  const [objectiveForm, setObjectiveForm] = useState(EMPTY_OBJECTIVE);
  const [krsForm, setKrsForm] = useState<Array<typeof EMPTY_KR>>([ { ...EMPTY_KR } ]);
  const [savingObjective, setSavingObjective] = useState(false);
  const [objectiveError, setObjectiveError] = useState<string>("");

  // Objective details modal / comments
  const [selectedObjective, setSelectedObjective] = useState<OkrObjective | null>(null);
  const [objComments, setObjComments] = useState<OkrObjectiveComment[]>([]);
  const [objCommentText, setObjCommentText] = useState("");
  const [savingObjComment, setSavingObjComment] = useState(false);

  // Quick Key Result progress update modal
  const [selectedKR, setSelectedKR] = useState<OkrKeyResult | null>(null);
  const [krUpdateValue, setKrUpdateValue] = useState<number>(0);
  const [savingKRUpdate, setSavingKRUpdate] = useState(false);

  // Teams drawer
  const [teamDrawer, setTeamDrawer] = useState<"new" | OkrTeam | null>(null);
  const [teamForm, setTeamForm] = useState(EMPTY_TEAM);
  const [savingTeam, setSavingTeam] = useState(false);

  // Admin Period drawer
  const [periodDrawer, setPeriodDrawer] = useState<"new" | OkrPeriod | null>(null);
  const [periodForm, setPeriodForm] = useState(EMPTY_PERIOD);
  const [savingPeriod, setSavingPeriod] = useState(false);

  // References to search and filters for focus
  const searchInputRef = useRef<HTMLInputElement>(null);
  const periodSelectRef = useRef<HTMLSelectElement>(null);

  // Load periods & candidates
  const loadPeriodData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/modules/okr/periods");
      if (r.ok) {
        const data = await r.json();
        setPeriods(data.periods || []);
        setUsers(data.users || []);
        setDepartments(data.departments || []);
        
        // If there's an active or latest period, auto-select it
        if (data.periods && data.periods.length > 0) {
          const active = data.periods.find((p: any) => p.isActive) || data.periods[0];
          setSelectedPeriodId(active.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load OKR teams list
  const loadTeams = useCallback(async () => {
    try {
      const r = await fetch("/api/modules/okr/teams");
      if (r.ok) {
        const data = await r.json();
        setTeams(data.teams || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load Objectives for selected period & filters
  const loadObjectives = useCallback(async () => {
    if (!selectedPeriodId) return;
    setListLoading(true);
    try {
      const r = await fetch(`/api/modules/okr/objectives?periodId=${selectedPeriodId}&level=${objectiveFilterLevel}&search=${searchQuery}`);
      if (r.ok) {
        const data = await r.json();
        setObjectives(data.objectives || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setListLoading(false);
    }
  }, [selectedPeriodId, objectiveFilterLevel, searchQuery]);

  // Load selected period's votes & comments detail
  const loadPeriodDetail = useCallback(async () => {
    if (!selectedPeriodId) return;
    try {
      const r = await fetch(`/api/modules/okr/periods/${selectedPeriodId}`);
      if (r.ok) {
        const data = await r.json();
        setPeriodDetail(data.period || null);
        
        // Pre-fill user's vote if exists
        if (data.period?.votes && session?.user) {
          const myVote = data.period.votes.find((v: any) => v.userId === session.user.id);
          if (myVote) {
            setVoteScore(myVote.score);
            setVoteComment(myVote.comment || "");
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedPeriodId, session?.user]);

  // Bootstrapping
  useEffect(() => {
    loadPeriodData();
    loadTeams();
  }, [loadPeriodData, loadTeams]);

  // Reload lists when period or filters change
  useEffect(() => {
    loadObjectives();
    loadPeriodDetail();
  }, [selectedPeriodId, loadObjectives, loadPeriodDetail]);

  // Load objective comments
  const loadObjectiveComments = useCallback(async (objId: string) => {
    try {
      const r = await fetch(`/api/modules/okr/objectives/${objId}/comments`);
      if (r.ok) {
        const data = await r.json();
        setObjComments(data.comments || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Keyboard Shortcuts Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut hint: Alt + Keys
      if (e.altKey) {
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          setObjectiveForm({ ...EMPTY_OBJECTIVE, ownerId: session?.user?.id || "" });
          setKrsForm([{ ...EMPTY_KR, ownerId: session?.user?.id || "" }]);
          setObjectiveDrawer("new");
        } else if (e.key === "q" || e.key === "Q") {
          e.preventDefault();
          periodSelectRef.current?.focus();
        } else if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          setActiveTab("voting");
          const el = document.getElementById("period-voting-section");
          el?.scrollIntoView({ behavior: "smooth" });
        } else if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          searchInputRef.current?.focus();
        } else if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          setActiveTab((t) => (t === "help" ? "overview" : "help"));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session?.user]);

  // Submit new period
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodForm.name || !periodForm.startDate || !periodForm.endDate) return;
    setSavingPeriod(true);

    try {
      const method = periodDrawer === "new" ? "POST" : "PATCH";
      const url = periodDrawer === "new" ? "/api/modules/okr/periods" : `/api/modules/okr/periods/${(periodDrawer as OkrPeriod).id}`;
      const payload = periodDrawer === "new" ? periodForm : { id: (periodDrawer as OkrPeriod).id, ...periodForm };
      
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (r.ok) {
        setPeriodDrawer(null);
        setPeriodForm(EMPTY_PERIOD);
        loadPeriodData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPeriod(false);
    }
  };

  // Submit Confidence Vote
  const handleSaveVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId) return;
    setSavingVote(true);

    try {
      const r = await fetch(`/api/modules/okr/periods/${selectedPeriodId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: voteScore, comment: voteComment })
      });

      if (r.ok) {
        loadPeriodDetail();
        alert("Güven oylamanız başarıyla kaydedildi.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingVote(false);
    }
  };

  // Submit Period Comment
  const handleSavePeriodComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId || !periodCommentText.trim()) return;
    setSavingPeriodComment(true);

    try {
      const r = await fetch(`/api/modules/okr/periods/${selectedPeriodId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: periodCommentText })
      });

      if (r.ok) {
        setPeriodCommentText("");
        loadPeriodDetail();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPeriodComment(false);
    }
  };

  // Submit new/edit OKR Team
  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name) return;
    setSavingTeam(true);

    try {
      const payload = teamDrawer === "new" ? teamForm : { id: (teamDrawer as OkrTeam).id, ...teamForm };
      const r = await fetch("/api/modules/okr/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (r.ok) {
        setTeamDrawer(null);
        setTeamForm(EMPTY_TEAM);
        loadTeams();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTeam(false);
    }
  };

  // Add Key Result Row in Form
  const addKRRow = () => {
    setKrsForm((k) => [...k, { ...EMPTY_KR, ownerId: session?.user?.id || "" }]);
  };

  // Remove Key Result Row in Form
  const removeKRRow = (index: number) => {
    if (krsForm.length <= 1) return;
    setKrsForm((k) => k.filter((_, i) => i !== index));
  };

  // Save new / edit Objective
  const handleSaveObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectiveForm.title) return;
    if (!selectedPeriodId) {
      setObjectiveError("Lütfen önce bir OKR dönemi seçin. Dönem yoksa \"OKR Dönem & Ayarlar\" sekmesinden yeni dönem oluşturun.");
      return;
    }
    setObjectiveError("");
    setSavingObjective(true);

    try {
      const method = objectiveDrawer === "new" ? "POST" : "PATCH";
      const url = "/api/modules/okr/objectives";
      const payload = objectiveDrawer === "new" 
        ? { periodId: selectedPeriodId, ...objectiveForm, keyResults: krsForm }
        : { id: (objectiveDrawer as OkrObjective).id, ...objectiveForm };

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (r.ok) {
        setObjectiveDrawer(null);
        setObjectiveForm(EMPTY_OBJECTIVE);
        setKrsForm([{ ...EMPTY_KR }]);
        setObjectiveError("");
        loadObjectives();
      } else {
        const errData = await r.json().catch(() => ({}));
        setObjectiveError((errData as any).error || "Hedef kaydedilemedi. Lütfen tekrar deneyin.");
      }
    } catch (err) {
      console.error(err);
      setObjectiveError("Ağ hatası oluştu. İnternet bağlantınızı kontrol edin.");
    } finally {
      setSavingObjective(false);
    }
  };

  // Update Key Result progress
  const handleUpdateKRProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKR) return;
    setSavingKRUpdate(true);

    try {
      const r = await fetch("/api/modules/okr/keyresults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedKR.id, currentValue: krUpdateValue })
      });

      if (r.ok) {
        setSelectedKR(null);
        loadObjectives();
        if (selectedObjective) {
          // reload detail
          const updatedObj = objectives.find((o) => o.id === selectedObjective.id);
          if (updatedObj) setSelectedObjective(updatedObj);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKRUpdate(false);
    }
  };

  // Add Comment on Objective
  const handleSaveObjComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObjective || !objCommentText.trim()) return;
    setSavingObjComment(true);

    try {
      const r = await fetch(`/api/modules/okr/objectives/${selectedObjective.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: objCommentText })
      });

      if (r.ok) {
        setObjCommentText("");
        loadObjectiveComments(selectedObjective.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingObjComment(false);
    }
  };

  // Delete Objective
  const handleDeleteObjective = async (id: string) => {
    if (!confirm("Bu hedefi ve altındaki tüm ana sonuçları silmek istediğinize emin misiniz?")) return;
    try {
      const r = await fetch("/api/modules/okr/objectives", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deleted: true })
      });
      if (r.ok) {
        loadObjectives();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Period
  const handleDeletePeriod = async (id: string) => {
    if (!confirm("Bu OKR dönemini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    try {
      const r = await fetch(`/api/modules/okr/periods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: true })
      });
      if (r.ok) {
        loadPeriodData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Progress Bar Color Helper
  const getProgressColor = (val: number) => {
    if (val < 30) return "bg-red-500";
    if (val < 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  // Calculate overall optimism confidence averages
  const periodVotes = periodDetail?.votes || [];
  const avgConfidence = periodVotes.length === 0 
    ? 0 
    : Math.round((periodVotes.reduce((sum, v) => sum + v.score, 0) / periodVotes.length) * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Immersive Header */}
      <div className="bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-10 -translate-y-10">
          <i className="pi pi-compass text-[200px]" />
        </div>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <i className="pi pi-compass text-lg text-white" />
            </div>
            <span className="text-xs font-black tracking-widest uppercase bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">Modül</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">OKR Hedef Yönetimi</h1>
          <p className="text-teal-50 text-sm max-w-xl font-medium">
            Şirket hedefleri, departman projeleri, takım gayretleri ve bireysel başarıları ölçülebilir ana sonuçlarla (Key Results) hizalayın.
          </p>
        </div>

        <div className="flex flex-col xs:flex-row gap-3 w-full sm:w-auto relative z-10 shrink-0">
          {/* Period Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase text-teal-100 mb-1">OKR Dönemi Seçimi</label>
            <select
              ref={periodSelectRef}
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-white/25 bg-white/10 backdrop-blur-md text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer min-w-[200px]"
            >
              {periods.length === 0 ? (
                <option value="" className="text-slate-800">Dönem Bulunmamaktadır</option>
              ) : (
                periods.map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-800 font-semibold">
                    {p.name} {p.isActive ? "(Aktif)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => {
              if (periods.length === 0) {
                if (isAdmin) {
                  setActiveTab("admin");
                  alert("Henüz OKR dönemi tanımlanmamıştır. Lütfen önce 'OKR Dönem & Ayarlar' sekmesinden bir dönem oluşturun.");
                } else {
                  alert("Henüz OKR dönemi tanımlanmamıştır. Lütfen yöneticinizden bir OKR dönemi oluşturmasını isteyin.");
                }
                return;
              }
              setObjectiveForm({ ...EMPTY_OBJECTIVE, ownerId: session?.user?.id || "" });
              setKrsForm([{ ...EMPTY_KR, ownerId: session?.user?.id || "" }]);
              setObjectiveError("");
              setObjectiveDrawer("new");
            }}
            className="self-end px-5 py-2.5 bg-white text-teal-800 hover:bg-teal-50 rounded-xl font-black text-sm shadow-md transition flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            <i className="pi pi-plus text-xs" /> Yeni OKR Tanımla
          </button>
        </div>
      </div>

      {/* Main Tabbed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-border/80 p-4 shadow-sm space-y-1.5 shrink-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition ${
              activeTab === "overview"
                ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="pi pi-sitemap text-sm" /> OKR Haritası & hedefler
            </span>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-border/40 font-mono">{objectives.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("voting")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition ${
              activeTab === "voting"
                ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="pi pi-star-fill text-sm text-amber-500" /> Güven Oylaması & İnceleme
            </span>
            {periodVotes.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold font-mono">
                ⭐ {avgConfidence}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("teams")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition ${
              activeTab === "teams"
                ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <i className="pi pi-users text-sm" /> Takımlar & Üyeler
            </span>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-border/40 font-mono">{teams.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("help")}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-bold transition ${
              activeTab === "help"
                ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            <i className="pi pi-info-circle text-sm" /> Kullanım Kılavuzu & Kısayollar
          </button>

          {isAdmin && (
            <>
              <div className="border-t border-border/80 my-3 pt-3" />
              <p className="px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Yönetici Paneli</p>
              <button
                onClick={() => setActiveTab("admin")}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-bold transition ${
                  activeTab === "admin"
                    ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <i className="pi pi-cog text-sm" /> OKR Dönem & Ayarlar
              </button>
            </>
          )}
        </div>

        {/* Dynamic Display Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === "overview" && (
            <>
              {/* Filter controls */}
              <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div className="flex flex-wrap gap-2.5 shrink-0">
                  <button
                    onClick={() => setObjectiveFilterLevel("")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      objectiveFilterLevel === ""
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Tüm Hedefler
                  </button>
                  {OKR_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setObjectiveFilterLevel(lvl.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        objectiveFilterLevel === lvl.id
                          ? "bg-teal-600 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      <i className={`pi ${lvl.icon} text-[10px]`} /> {lvl.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64">
                  <i className="pi pi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Hedef ara... (Alt+S)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              {/* Objectives Tree / List */}
              {listLoading ? (
                <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-16 text-center shadow-sm">
                  <i className="pi pi-spin pi-spinner text-4xl text-teal-600 mb-4" />
                  <p className="text-slate-400 text-sm font-medium">Hedefler yükleniyor...</p>
                </div>
              ) : objectives.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-16 text-center shadow-sm">
                  <i className="pi pi-compass text-6xl text-slate-300 dark:text-slate-800 mb-4 block" />
                  <h3 className="text-lg font-black text-foreground">Hedef Kaydı Bulunmuyor</h3>
                  <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto font-medium">
                    Seçili filtrelerde tanımlanmış bir hedef bulunmamaktadır. "Yeni OKR Tanımla" butonuyla yeni bir tane ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {objectives.map((obj) => {
                    const cfg = getOkrLevelConfig(obj.level);
                    return (
                      <div 
                        key={obj.id} 
                        className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition space-y-4 relative overflow-hidden"
                      >
                        {/* Level vertical bar indicator */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1.5"
                          style={{ backgroundColor: cfg.color }}
                        />
                        
                        <div className="flex justify-between items-start gap-4 pl-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${cfg.bg}`}>
                                <i className={`pi ${cfg.icon} mr-1 text-[8px]`} /> {cfg.label}
                              </span>
                              {obj.department && (
                                <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                  🏢 {obj.department.name}
                                </span>
                              )}
                              {obj.team && (
                                <span className="bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                  👥 {obj.team.name}
                                </span>
                              )}
                              {obj.user && (
                                <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                  👤 {obj.user.name}
                                </span>
                              )}
                            </div>
                            <h3 className="font-extrabold text-lg text-foreground tracking-tight hover:underline cursor-pointer" onClick={() => {
                              setSelectedObjective(obj);
                              loadObjectiveComments(obj.id);
                            }}>
                              🎯 {obj.title}
                            </h3>
                            {obj.description && (
                              <p className="text-slate-400 text-xs font-medium max-w-2xl">{obj.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Circular progress or percentage badge */}
                            <div className="text-right shrink-0">
                              <p className="text-[10px] font-black uppercase text-slate-400">Genel İlerleme</p>
                              <p className="text-2xl font-black tracking-tight" style={{ color: cfg.color }}>{obj.progress}%</p>
                            </div>
                            
                            {/* Actions dropdown or quick keys */}
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => {
                                  setSelectedObjective(obj);
                                  loadObjectiveComments(obj.id);
                                }}
                                className="w-8 h-8 rounded-lg border border-border/80 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition"
                                title="Hedef Detayları & Yorumlar"
                              >
                                <i className="pi pi-comments text-xs" />
                              </button>
                              
                              {isAdmin && (
                                <button 
                                  onClick={() => handleDeleteObjective(obj.id)}
                                  className="w-8 h-8 rounded-lg border border-red-100 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20 flex items-center justify-center text-red-500 transition"
                                  title="Hedefi Sil"
                                >
                                  <i className="pi pi-trash text-xs" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Rollup Progress bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full pl-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${getProgressColor(obj.progress)}`}
                            style={{ width: `${obj.progress}%` }}
                          />
                        </div>

                        {/* Objective Key Results (KRs) */}
                        <div className="border-t border-border/60 pt-4 pl-2 space-y-3.5">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ölçülebilir Ana Sonuçlar (Key Results)</p>
                          {(!obj.keyResults || obj.keyResults.length === 0) ? (
                            <p className="text-slate-400 text-xs font-medium italic">Bu hedef altına tanımlanmış bir ana sonuç bulunmamaktadır.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {obj.keyResults.map((kr) => (
                                <div 
                                  key={kr.id} 
                                  className="bg-slate-50/70 dark:bg-slate-900/40 border border-border/60 rounded-2xl p-3.5 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="space-y-0.5">
                                      <h4 className="font-extrabold text-xs text-foreground">{kr.title}</h4>
                                      {kr.description && (
                                        <p className="text-[10px] text-slate-400 font-medium">{kr.description}</p>
                                      )}
                                      {kr.owner && (
                                        <span className="text-[9px] font-bold text-slate-400">👤 Sorumlu: {kr.owner.name}</span>
                                      )}
                                    </div>
                                    
                                    <button 
                                      onClick={() => {
                                        setSelectedKR(kr);
                                        setKrUpdateValue(kr.currentValue);
                                      }}
                                      className="px-2 py-1 border border-border hover:bg-white dark:hover:bg-slate-800 rounded-lg text-[10px] font-black text-teal-600 transition shrink-0"
                                    >
                                      Güncelle
                                    </button>
                                  </div>

                                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                    <span>İlerleme: {kr.progress}%</span>
                                    <span>{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-teal-600 h-full transition-all duration-300"
                                      style={{ width: `${kr.progress}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "voting" && (
            <div className="space-y-6">
              {/* Confidence index indicator */}
              <div 
                id="period-voting-section"
                className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6"
              >
                <div className="space-y-2 text-center md:text-left">
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Dönem Başarı Güven Endeksi</h2>
                  <p className="text-slate-400 text-sm max-w-md font-medium">
                    Çalışanların hedeflere ulaşma inancı ve iyimserlik analizi. Dönemin hedeflerine ne kadar güven duyulduğunu gösterir.
                  </p>
                </div>

                <div className="flex items-center gap-5 bg-teal-50 dark:bg-teal-950/20 px-6 py-4 rounded-3xl shrink-0">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-teal-600">Toplam Oylama</p>
                    <p className="text-4xl font-black tracking-tight text-teal-800 dark:text-teal-400">{periodVotes.length}</p>
                  </div>
                  <div className="w-px h-12 bg-teal-200/50" />
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-amber-600">Başarı İnancı</p>
                    <p className="text-4xl font-black tracking-tight text-amber-500">⭐ {avgConfidence}</p>
                  </div>
                </div>
              </div>

              {/* Voting block */}
              {periodDetail?.votingActive ? (
                <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-base text-foreground">Güven Puanınızı Verin</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Bu dönemin OKR'lerinin başarıya ulaşacağına ne kadar inanıyorsunuz? (1: Düşük inanç / 5: Tam inanç)
                  </p>

                  <form onSubmit={handleSaveVote} className="space-y-4">
                    <div className="flex gap-4 items-center">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setVoteScore(score)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition"
                            style={{
                              backgroundColor: score <= voteScore ? "var(--color-amber-100, #fef3c7)" : "var(--color-slate-100, #f1f5f9)",
                              color: score <= voteScore ? "var(--color-amber-600, #d97706)" : "var(--color-slate-400, #94a3b8)"
                            }}
                          >
                            <i className="pi pi-star-fill text-lg" />
                          </button>
                        ))}
                      </div>
                      <span className="text-sm font-black text-slate-500">
                        {voteScore === 1 && "⚠️ Hiç iyimser değilim"}
                        {voteScore === 2 && "⚡ Hedefler zor görünüyor"}
                        {voteScore === 3 && "📊 Kararsızım / Makul"}
                        {voteScore === 4 && "🚀 Güçlü bir inancım var"}
                        {voteScore === 5 && "🔥 Hedeflere kesinlikle ulaşacağız"}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Gerekçe / Yorumunuz (Opsiyonel)</label>
                      <textarea
                        value={voteComment}
                        onChange={(e) => setVoteComment(e.target.value)}
                        placeholder="Hedeflerin zorlukları, fırsatları veya inancınızın gerekçeleri hakkında çalışan yorumlarınızı girin..."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingVote}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-black text-sm rounded-xl transition flex items-center gap-2"
                    >
                      {savingVote ? <i className="pi pi-spin pi-spinner" /> : <i className="pi pi-check" />} Oylamayı Kaydet
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900 border border-border/80 rounded-3xl p-5 text-center text-slate-400">
                  <i className="pi pi-lock text-3xl mb-2" />
                  <p className="text-sm font-semibold">Bu OKR dönemi için oylama süresi sona ermiştir.</p>
                </div>
              )}

              {/* Comments and Reviews list */}
              <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-base text-foreground">Çalışan Yorumları & Değerlendirmeler</h3>
                
                {/* General cycle comment form */}
                <form onSubmit={handleSavePeriodComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Dönem hedefleri hakkında genel yorum yazın..."
                    value={periodCommentText}
                    onChange={(e) => setPeriodCommentText(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <button
                    type="submit"
                    disabled={savingPeriodComment || !periodCommentText.trim()}
                    className="px-4 py-2.5 bg-slate-800 text-white hover:bg-slate-900 disabled:bg-slate-300 font-bold text-sm rounded-xl transition flex items-center justify-center shrink-0"
                  >
                    {savingPeriodComment ? <i className="pi pi-spin pi-spinner" /> : "Gönder"}
                  </button>
                </form>

                {/* Display reviews & votes stream */}
                <div className="divide-y divide-border/60 mt-4 space-y-4">
                  {/* Show oylama yorumları */}
                  {periodDetail?.votes?.filter((v) => v.comment).length === 0 && periodDetail?.comments?.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-xs font-semibold italic">İlk değerlendirme yorumunu siz yapın!</p>
                  ) : (
                    <>
                      {/* Period votes comments */}
                      {periodDetail?.votes?.filter((v) => v.comment).map((v) => (
                        <div key={v.id} className="pt-4 first:pt-0 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                                {v.user?.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-extrabold text-xs text-foreground">{v.user?.name}</p>
                                <p className="text-[10px] text-slate-400">İnanç Oylaması Yaptı</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-amber-500">⭐ {v.score} / 5</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium pl-10 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-border/40">
                            {v.comment}
                          </p>
                        </div>
                      ))}

                      {/* Period general comments */}
                      {periodDetail?.comments?.map((c) => (
                        <div key={c.id} className="pt-4 first:pt-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                              {c.user?.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-extrabold text-xs text-foreground">{c.user?.name}</p>
                              <p className="text-[10px] text-slate-400">Genel İnceleme Yorumu</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium pl-10">
                            {c.body}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "teams" && (
            <div className="space-y-6">
              {/* Teams title card */}
              <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm flex justify-between items-center">
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-foreground tracking-tight">OKR Takımları ve Hizalama</h2>
                  <p className="text-slate-400 text-xs font-medium">Hedeflerin ortak gayretle başarılması için özelleştirilmiş OKR takımları.</p>
                </div>
                <button
                  onClick={() => {
                    setTeamForm(EMPTY_TEAM);
                    setTeamDrawer("new");
                  }}
                  className="px-4 py-2.5 bg-slate-800 text-white hover:bg-slate-950 font-bold text-xs rounded-xl transition"
                >
                  Yeni Takım Oluştur
                </button>
              </div>

              {/* Teams Grid */}
              {teams.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-16 text-center shadow-sm">
                  <i className="pi pi-users text-4xl text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm font-semibold">Henüz OKR Takımı Tanımlanmamıştır</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((t) => (
                    <div 
                      key={t.id} 
                      className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-base text-foreground">👥 {t.name}</h3>
                          {t.description && (
                            <p className="text-xs text-slate-400 font-medium">{t.description}</p>
                          )}
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              setTeamForm({
                                name: t.name,
                                description: t.description || "",
                                leaderId: t.leaderId || "",
                                userIds: t.members?.map((m) => m.userId) || []
                              });
                              setTeamDrawer(t);
                            }}
                            className="w-8 h-8 rounded-lg border border-border/80 flex items-center justify-center hover:bg-slate-50 text-slate-500 transition"
                            title="Takımı Düzenle"
                          >
                            <i className="pi pi-pencil text-xs" />
                          </button>
                          
                          <button
                            onClick={async () => {
                              if (!confirm("Bu takımı silmek istediğinize emin misiniz?")) return;
                              const r = await fetch("/api/modules/okr/teams", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: t.id, deleted: true })
                              });
                              if (r.ok) loadTeams();
                            }}
                            className="w-8 h-8 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 flex items-center justify-center transition"
                            title="Takımı Sil"
                          >
                            <i className="pi pi-trash text-xs" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-400">Takım Lideri</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-700">
                            👑
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {t.leader?.name || "Lider Atanmamış"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-slate-400">Takım Üyeleri ({t.members?.length || 0})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(!t.members || t.members.length === 0) ? (
                            <span className="text-slate-400 text-xs font-semibold italic">Üye Bulunmuyor</span>
                          ) : (
                            t.members.map((m) => (
                              <span 
                                key={m.id}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-lg"
                              >
                                👤 {m.user?.name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "help" && (
            <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-foreground tracking-tight">OKR Kullanım Kılavuzu & Klavye Kısayolları</h2>
                <p className="text-slate-400 text-sm font-medium">Hedef Yönetim Sistemi modülü üzerinden verimliliğinizi artıracak ipuçları.</p>
              </div>

              {/* Guide section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60">
                <div className="space-y-3">
                  <h3 className="font-extrabold text-base text-foreground">🎯 OKR Nedir?</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium">
                    <strong>OKR (Objectives and Key Results)</strong>, şirket vizyonunun ölçülebilir adımlara bölünerek tüm organizasyonda hizalanmasını sağlayan modern bir hedef yönetim metodudur.
                  </p>
                  <ul className="space-y-2 pl-4 list-disc text-xs text-slate-500 font-medium">
                    <li><strong>Objective (Hedef):</strong> "Nereye gitmek istiyoruz?" sorusuna yanıt verir. İlham verici, somut ve yön gösterici olmalıdır.</li>
                    <li><strong>Key Result (Ana Sonuç):</strong> "Oraya ulaştığımızı nasıl ölçeceğiz?" sorusunun cevabıdır. Sayısal, zamana bağlı ve iddialı olmalıdır.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="font-extrabold text-base text-foreground">💡 Başarılı OKR Yazma İpuçları</h3>
                  <ul className="space-y-2 pl-4 list-disc text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <li>Bir çeyrekte en fazla 3-5 Hedef belirleyin.</li>
                    <li>Her hedefin altına en fazla 3-4 Key Result ekleyin.</li>
                    <li>İlerleme oranlarının (Progress) otomatik hesaplanabilmesi için Key Result'larınızı ölçülebilir sayısal hedefler haline getirin (örn: satışları %20 artır, 5 yeni personel işe al).</li>
                  </ul>
                </div>
              </div>

              {/* Shortcuts panel */}
              <div className="space-y-4 pt-6 border-t border-border/60">
                <h3 className="font-extrabold text-base text-foreground">⌨️ Klavye Kısayolları (Keyboard Shortcuts)</h3>
                <p className="text-slate-400 text-xs font-medium">
                  Sayfanın herhangi bir yerindeyken aşağıdaki klavye tuşlarına basarak hızlı aksiyon alabilirsiniz:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-border/80 rounded-2xl">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Yeni OKR Formunu Aç</span>
                    <kbd className="px-2.5 py-1 bg-white border border-border rounded-lg text-xs font-black shadow-sm">Alt + N</kbd>
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-border/80 rounded-2xl">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">OKR Dönemini Odakla</span>
                    <kbd className="px-2.5 py-1 bg-white border border-border rounded-lg text-xs font-black shadow-sm">Alt + Q</kbd>
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-border/80 rounded-2xl">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Güven Oylama Alanına Git</span>
                    <kbd className="px-2.5 py-1 bg-white border border-border rounded-lg text-xs font-black shadow-sm">Alt + V</kbd>
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-border/80 rounded-2xl">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Hedef Arama Çubuğunu Odakla</span>
                    <kbd className="px-2.5 py-1 bg-white border border-border rounded-lg text-xs font-black shadow-sm">Alt + S</kbd>
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-border/80 rounded-2xl sm:col-span-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Kılavuz Panelini Aç/Kapat</span>
                    <kbd className="px-2.5 py-1 bg-white border border-border rounded-lg text-xs font-black shadow-sm">Alt + D</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "admin" && isAdmin && (
            <div className="space-y-6">
              {/* Periods List */}
              <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-black text-foreground">OKR Dönemleri Yönetimi</h2>
                    <p className="text-slate-400 text-xs font-medium">Hedeflerin planlanacağı çeyreklik veya yıllık döngüleri yönetin.</p>
                  </div>
                  <button
                    onClick={() => {
                      setPeriodForm(EMPTY_PERIOD);
                      setPeriodDrawer("new");
                    }}
                    className="px-4 py-2.5 bg-teal-600 text-white hover:bg-teal-700 font-black text-xs rounded-xl shadow-sm transition"
                  >
                    Yeni Dönem Ekle
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-border/60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border/60 text-slate-500 font-black uppercase tracking-wider">
                        <th className="py-3 px-4">Dönem Adı</th>
                        <th className="py-3 px-4">Tür</th>
                        <th className="py-3 px-4">Başlangıç</th>
                        <th className="py-3 px-4">Bitiş</th>
                        <th className="py-3 px-4">Durum</th>
                        <th className="py-3 px-4">Oylama</th>
                        <th className="py-3 px-4 text-right pr-4">Aksiyonlar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-semibold">
                      {periods.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 italic">Dönem Bulunmamaktadır.</td>
                        </tr>
                      ) : (
                        periods.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-bold text-foreground">{p.name}</td>
                            <td className="py-3.5 px-4 capitalize">{p.type === "quarterly" ? "Çeyreklik" : "Yıllık"}</td>
                            <td className="py-3.5 px-4 text-slate-400">{new Date(p.startDate).toLocaleDateString("tr-TR")}</td>
                            <td className="py-3.5 px-4 text-slate-400">{new Date(p.endDate).toLocaleDateString("tr-TR")}</td>
                            <td className="py-3.5 px-4">
                              <button
                                onClick={async () => {
                                  const r = await fetch(`/api/modules/okr/periods/${p.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ isActive: !p.isActive })
                                  });
                                  if (r.ok) loadPeriodData();
                                }}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  p.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {p.isActive ? "Aktif" : "Pasif"}
                              </button>
                            </td>
                            <td className="py-3.5 px-4">
                              <button
                                onClick={async () => {
                                  const r = await fetch(`/api/modules/okr/periods/${p.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ votingActive: !p.votingActive })
                                  });
                                  if (r.ok) loadPeriodData();
                                }}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  p.votingActive ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {p.votingActive ? "Oylamaya Açık" : "Kilitli"}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right pr-4">
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => {
                                    setPeriodForm({
                                      name: p.name,
                                      type: p.type,
                                      startDate: new Date(p.startDate).toISOString().split("T")[0],
                                      endDate: new Date(p.endDate).toISOString().split("T")[0]
                                    });
                                    setPeriodDrawer(p);
                                  }}
                                  className="w-6 h-6 rounded border border-border flex items-center justify-center text-slate-500 hover:bg-slate-50"
                                  title="Düzenle"
                                >
                                  <i className="pi pi-pencil text-[10px]" />
                                </button>
                                <button
                                  onClick={() => handleDeletePeriod(p.id)}
                                  className="w-6 h-6 rounded border border-red-100 text-red-500 flex items-center justify-center hover:bg-red-50"
                                  title="Sil"
                                >
                                  <i className="pi pi-trash text-[10px]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DRAWERS / MODALS */}

      {/* 1. New/Edit Objective Drawer */}
      {objectiveDrawer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in">
            <div className="p-6 border-b border-border/80 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <i className="pi pi-compass text-teal-600" /> 
                {objectiveDrawer === "new" ? "Yeni OKR Hedefi Tanımla" : "Hedefi Düzenle"}
              </h2>
              <button onClick={() => setObjectiveDrawer(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition">
                <i className="pi pi-times" />
              </button>
            </div>

            <form onSubmit={handleSaveObjective} className="p-6 space-y-6 flex-1">
              {/* Error Banner */}
              {objectiveError && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                  <i className="pi pi-exclamation-triangle text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">Hata</p>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">{objectiveError}</p>
                    {periods.length === 0 && isAdmin && (
                      <button
                        type="button"
                        onClick={() => { setObjectiveDrawer(null); setActiveTab("admin"); }}
                        className="mt-2 text-xs font-bold text-red-700 underline hover:no-underline"
                      >
                        → OKR Dönem Yönetimine Git
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Period selector in drawer — shown when adding new and multiple periods exist */}
              {objectiveDrawer === "new" && periods.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">OKR Dönemi *</label>
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => { setSelectedPeriodId(e.target.value); setObjectiveError(""); }}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                  >
                    <option value="">Dönem Seçin...</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.isActive ? " (Aktif)" : ""}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Hedef (Objective) Detayları</h3>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Hedef Başlığı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 2026 İlk Çeyrek Müşteri Memnuniyetini Artırmak"
                    value={objectiveForm.title}
                    onChange={(e) => setObjectiveForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Açıklama / Detay</label>
                  <textarea
                    placeholder="Hedefin amacı ve hizalamaları hakkında detaylı açıklamalar..."
                    value={objectiveForm.description}
                    onChange={(e) => setObjectiveForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">OKR Seviyesi *</label>
                    <select
                      value={objectiveForm.level}
                      onChange={(e) => setObjectiveForm((f) => ({ ...f, level: e.target.value as any }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                    >
                      <option value="company">Şirket OKR</option>
                      <option value="department">Departman OKR</option>
                      <option value="team">Takım OKR</option>
                      <option value="personal">Kişisel OKR</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Sorumlu Kişi *</label>
                    <select
                      value={objectiveForm.ownerId}
                      onChange={(e) => setObjectiveForm((f) => ({ ...f, ownerId: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conditional assignment selections based on level */}
                {objectiveForm.level === "department" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">İlgili Departman Seçin *</label>
                    <select
                      value={objectiveForm.departmentId}
                      onChange={(e) => setObjectiveForm((f) => ({ ...f, departmentId: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                      required
                    >
                      <option value="">Seçiniz...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {objectiveForm.level === "team" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">İlgili Takım Seçin *</label>
                    <select
                      value={objectiveForm.teamId}
                      onChange={(e) => setObjectiveForm((f) => ({ ...f, teamId: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                      required
                    >
                      <option value="">Seçiniz...</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {objectiveForm.level === "personal" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Çalışan Seçin *</label>
                    <select
                      value={objectiveForm.userId}
                      onChange={(e) => setObjectiveForm((f) => ({ ...f, userId: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                      required
                    >
                      <option value="">Seçiniz...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Key Results Creation Row List */}
              {objectiveDrawer === "new" && (
                <div className="space-y-4 border-t border-border/60 pt-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Key Results (Ana Sonuçlar)</h3>
                    <button
                      type="button"
                      onClick={addKRRow}
                      className="px-2.5 py-1 text-[10px] font-black text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
                    >
                      + KR Ekle
                    </button>
                  </div>

                  <div className="space-y-4">
                    {krsForm.map((kr, index) => (
                      <div key={index} className="bg-slate-50 dark:bg-slate-900/40 p-4 border border-border/80 rounded-2xl space-y-3 relative">
                        {krsForm.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeKRRow(index)}
                            className="absolute right-3 top-3 w-6 h-6 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 transition"
                            title="KR Satırını Sil"
                          >
                            <i className="pi pi-times text-[10px]" />
                          </button>
                        )}

                        <div className="space-y-1.5 pr-6">
                          <label className="text-[10px] font-bold text-slate-400">KR #{index + 1} Başlığı *</label>
                          <input
                            type="text"
                            required
                            placeholder="Örn: Müşteri memnuniyet puanını 8.5'ten 9.2'ye çıkar"
                            value={kr.title}
                            onChange={(e) => {
                              const copy = [...krsForm];
                              copy[index].title = e.target.value;
                              setKrsForm(copy);
                            }}
                            className="w-full px-3.5 py-2 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/10 bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400">Başlangıç Değeri</label>
                            <input
                              type="number"
                              required
                              value={kr.initialValue}
                              onChange={(e) => {
                                const copy = [...krsForm];
                                copy[index].initialValue = Number(e.target.value);
                                setKrsForm(copy);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-border text-xs focus:outline-none bg-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400">Hedef Değeri</label>
                            <input
                              type="number"
                              required
                              value={kr.targetValue}
                              onChange={(e) => {
                                const copy = [...krsForm];
                                copy[index].targetValue = Number(e.target.value);
                                setKrsForm(copy);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-border text-xs focus:outline-none bg-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400">Birim (Örn: %, adet)</label>
                            <input
                              type="text"
                              required
                              value={kr.unit}
                              onChange={(e) => {
                                const copy = [...krsForm];
                                copy[index].unit = e.target.value;
                                setKrsForm(copy);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-border text-xs focus:outline-none bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border bg-slate-50 dark:bg-slate-900/40 p-6 flex gap-3 shrink-0">
                <button
                  type="submit"
                  disabled={savingObjective}
                  className="flex-1 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-black text-sm rounded-xl transition flex items-center justify-center gap-2"
                >
                  {savingObjective ? <i className="pi pi-spin pi-spinner" /> : <i className="pi pi-check" />}
                  {objectiveDrawer === "new" ? "Hedefi Tanımla ve Başlat" : "Değişiklikleri Kaydet"}
                </button>
                <button
                  type="button"
                  onClick={() => setObjectiveDrawer(null)}
                  className="px-5 py-2.5 border border-border hover:bg-slate-50 text-slate-600 font-bold text-sm rounded-xl transition"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Key Result Quick Update Modal */}
      {selectedKR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-border/80 animate-zoom-in">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-foreground">🚀 Key Result İlerleme Değeri Güncelle</h3>
              <button onClick={() => setSelectedKR(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
                <i className="pi pi-times" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateKRProgress} className="p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400">Ana Sonuç (Key Result)</p>
                <h4 className="font-bold text-xs text-foreground">{selectedKR.title}</h4>
                <p className="text-[10px] text-slate-400">
                  Ölçü Birimi: {selectedKR.unit} | Hedeflenen Değer: {selectedKR.targetValue}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Mevcut Ulaşılan Değer ({selectedKR.unit})</label>
                <input
                  type="number"
                  required
                  value={krUpdateValue}
                  onChange={(e) => setKrUpdateValue(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                />
              </div>

              {/* Progress visual slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Başlangıç: {selectedKR.initialValue}</span>
                  <span>Hedef: {selectedKR.targetValue}</span>
                </div>
                <input
                  type="range"
                  min={selectedKR.initialValue}
                  max={selectedKR.targetValue}
                  value={krUpdateValue}
                  onChange={(e) => setKrUpdateValue(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingKRUpdate}
                  className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {savingKRUpdate && <i className="pi pi-spin pi-spinner" />} Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKR(null)}
                  className="px-4 py-2 border border-border hover:bg-slate-50 text-slate-500 font-semibold text-xs rounded-xl transition"
                >
                  Kapat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Objective Detail Modal & Discussion */}
      {selectedObjective && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[90vh] max-h-[700px] rounded-3xl overflow-hidden shadow-2xl border border-border/80 flex flex-col animate-zoom-in">
            <div className="p-5 border-b border-border flex justify-between items-center shrink-0">
              <h3 className="font-extrabold text-base text-foreground">🎯 OKR Hedefi ve Tartışma Akışı</h3>
              <button onClick={() => setSelectedObjective(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
                <i className="pi pi-times" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                    {selectedObjective.level === "company" && "🏢 Şirket"}
                    {selectedObjective.level === "department" && `🏢 ${selectedObjective.department?.name}`}
                    {selectedObjective.level === "team" && `👥 ${selectedObjective.team?.name}`}
                    {selectedObjective.level === "personal" && `👤 ${selectedObjective.user?.name}`}
                  </span>
                  <span className="bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">
                    İlerleme: {selectedObjective.progress}%
                  </span>
                </div>
                <h4 className="font-black text-xl text-foreground tracking-tight">🎯 {selectedObjective.title}</h4>
                {selectedObjective.description && (
                  <p className="text-slate-400 text-xs font-medium bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-border/40">
                    {selectedObjective.description}
                  </p>
                )}
              </div>

              {/* Discussion segment */}
              <div className="space-y-4 border-t border-border/60 pt-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Hedef Tartışma Paneli</h4>
                
                <form onSubmit={handleSaveObjComment} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Bu hedefe yorum yazın veya geri bildirim verin..."
                    value={objCommentText}
                    onChange={(e) => setObjCommentText(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <button
                    type="submit"
                    disabled={savingObjComment || !objCommentText.trim()}
                    className="px-4 py-2.5 bg-slate-800 text-white hover:bg-slate-900 disabled:bg-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center shrink-0"
                  >
                    {savingObjComment ? <i className="pi pi-spin pi-spinner" /> : "Yorum Ekle"}
                  </button>
                </form>

                <div className="divide-y divide-border/60 mt-4 space-y-4">
                  {objComments.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-xs font-semibold italic">İlk yorumu siz bırakın!</p>
                  ) : (
                    objComments.map((comment) => (
                      <div key={comment.id} className="pt-4 first:pt-0 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                              {comment.user?.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-extrabold text-xs text-foreground">{comment.user?.name}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {new Date(comment.createdAt).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium pl-8">{comment.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900/40 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedObjective(null)}
                className="px-4 py-2 border border-border hover:bg-slate-50 text-slate-500 font-semibold text-xs rounded-xl transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. OKR Team Drawer */}
      {teamDrawer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in">
            <div className="p-6 border-b border-border/80 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                👥 {teamDrawer === "new" ? "Yeni OKR Takımı Oluştur" : "Takım Yapısını Güncelle"}
              </h2>
              <button onClick={() => setTeamDrawer(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition">
                <i className="pi pi-times" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="p-6 space-y-5 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Takım Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Pazarlama OKR Takımı"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Takım Rolü / Detayı</label>
                <textarea
                  placeholder="Takımın bu OKR dönemi hedeflerine yönelik ana katkısı..."
                  value={teamForm.description}
                  onChange={(e) => setTeamForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Takım Lideri *</label>
                <select
                  value={teamForm.leaderId}
                  onChange={(e) => setTeamForm((f) => ({ ...f, leaderId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                >
                  <option value="">Seçiniz...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Members Multiselect layout */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">Takım Üyelerini Seçin</label>
                <div className="border border-border/80 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2.5">
                  {users.map((u) => {
                    const isChecked = teamForm.userIds.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setTeamForm((f) => {
                              const isCheckedNow = f.userIds.includes(u.id);
                              const copy = isCheckedNow 
                                ? f.userIds.filter((id) => id !== u.id)
                                : [...f.userIds, u.id];
                              return { ...f, userIds: copy };
                            });
                          }}
                          className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 border-slate-300"
                        />
                        <span>👤 {u.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border bg-slate-50 dark:bg-slate-900/40 p-4 flex gap-3 shrink-0">
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="flex-1 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-black text-sm rounded-xl transition flex items-center justify-center gap-2"
                >
                  {savingTeam ? <i className="pi pi-spin pi-spinner" /> : <i className="pi pi-check" />} Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setTeamDrawer(null)}
                  className="px-5 py-2.5 border border-border hover:bg-slate-50 text-slate-500 font-bold text-sm rounded-xl transition"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. OKR Period Drawer */}
      {periodDrawer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in">
            <div className="p-6 border-b border-border/80 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                📆 {periodDrawer === "new" ? "Yeni OKR Dönemi Tanımla" : "Dönemi Düzenle"}
              </h2>
              <button onClick={() => setPeriodDrawer(null)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition">
                <i className="pi pi-times" />
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="p-6 space-y-5 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Dönem Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 2026-Q2 (İkinci Çeyrek)"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Dönem Türü *</label>
                <select
                  value={periodForm.type}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, type: e.target.value as any }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
                >
                  <option value="quarterly">Çeyreklik (Quarterly)</option>
                  <option value="yearly">Yıllık (Yearly)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Başlangıç Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.startDate}
                    onChange={(e) => setPeriodForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Bitiş Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.endDate}
                    onChange={(e) => setPeriodForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-border bg-slate-50 dark:bg-slate-900/40 p-4 flex gap-3 shrink-0">
                <button
                  type="submit"
                  disabled={savingPeriod}
                  className="flex-1 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-black text-sm rounded-xl transition flex items-center justify-center gap-2"
                >
                  {savingPeriod ? <i className="pi pi-spin pi-spinner" /> : <i className="pi pi-check" />} Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodDrawer(null)}
                  className="px-5 py-2.5 border border-border hover:bg-slate-50 text-slate-500 font-bold text-sm rounded-xl transition"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
