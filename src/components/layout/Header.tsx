"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useThemeStore } from "@/stores/theme-store";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  module: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  info: "pi-info-circle text-blue-500",
  success: "pi-check-circle text-green-500",
  warning: "pi-exclamation-triangle text-yellow-500",
  error: "pi-times-circle text-red-500",
};

export function Header() {
  const { data: session } = useSession();
  const { theme, toggleTheme, setSidebarMobileOpen } = useThemeStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
      if (!notifRef.current?.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // SSE: real-time unread count
  useEffect(() => {
    if (!session?.user?.id) return;
    const es = new EventSource("/api/notifications/stream");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as { unread: number };
      setUnread(data.unread);
    };
    return () => es.close();
  }, [session?.user?.id]);

  async function openNotifications() {
    setNotifOpen((v) => !v);
    if (!notifOpen) {
      const r = await fetch("/api/notifications");
      const data = await r.json() as { items: NotificationItem[]; unread: number };
      setNotifications(data.items);
      setUnread(data.unread);
    }
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnread((v) => Math.max(0, v - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-white dark:bg-slate-900 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        className="lg:hidden text-slate-500 hover:text-slate-700 transition"
        onClick={() => setSidebarMobileOpen(true)}
      >
        <i className="pi pi-bars text-lg" />
      </button>

      {/* Global Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ara... (Alt+/)"
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border bg-surface text-sm text-foreground focus:outline-none focus:ring-2 focus:border-transparent transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Açık tema" : "Koyu tema"}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <i className={`pi ${theme === "dark" ? "pi-sun" : "pi-moon"} text-sm`} />
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={openNotifications}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
          >
            <i className="pi pi-bell text-sm" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-xl z-50 flex flex-col max-h-[420px]">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
                <span className="text-sm font-semibold text-foreground">Bildirimler</span>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-slate-400 hover:text-foreground transition">Tümünü oku</button>
                  )}
                  <button onClick={() => { setNotifOpen(false); router.push("/dashboard/notifications"); }} className="text-xs" style={{ color: "var(--color-primary)" }}>Tümü</button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    <i className="pi pi-bell-slash text-2xl block mb-2" />
                    Bildirim yok
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border-b border-border/50 last:border-0 ${!n.isRead ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}`}
                    >
                      <i className={`pi ${TYPE_ICON[n.type] ?? TYPE_ICON.info} text-base mt-0.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-foreground" : "text-foreground"}`}>{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-slate-300 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: tr })}
                        </p>
                      </div>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "var(--color-primary)" }}
            >
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-foreground leading-tight truncate max-w-[120px]">
                {session?.user?.name ?? "Kullanıcı"}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {session?.user?.isAdmin ? "Yönetici" : "Kullanıcı"}
              </p>
            </div>
            <i className="pi pi-chevron-down text-[10px] text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-xl py-1 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-foreground truncate">{session?.user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
              </div>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                onClick={() => { router.push("/dashboard/profile"); setUserMenuOpen(false); }}
              >
                <i className="pi pi-user text-slate-500 w-4" /> Profil
              </button>
              {session?.user?.isAdmin && (
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                  onClick={() => { router.push("/dashboard/admin/settings"); setUserMenuOpen(false); }}
                >
                  <i className="pi pi-cog text-slate-500 w-4" /> Ayarlar
                </button>
              )}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <i className="pi pi-sign-out text-red-500 w-4" /> Çıkış Yap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
