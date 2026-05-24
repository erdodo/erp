"use client";

import { useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { TabBar } from "@/components/layout/TabBar";
import { useThemeStore, initTheme } from "@/stores/theme-store";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useHotkey } from "@/hooks/useHotkey";
import { useSession } from "next-auth/react";
import { useBranding } from "@/hooks/useBranding";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const AiChat = dynamic(() => import("@/components/ai/AiChat").then((m) => m.AiChat), { ssr: false });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { theme, sidebarMobileOpen, setSidebarMobileOpen } = useThemeStore();
  const { data: session, status } = useSession();
  const router = useRouter();

  useKeyboardShortcuts();
  useHotkey("h", "Anasayfa", "Dashboard ana sayfasına git", () => router.push("/dashboard"));
  useBranding({
    primary: (session?.user as unknown as { primaryColor?: string })?.primaryColor,
    secondary: (session?.user as unknown as { secondaryColor?: string })?.secondaryColor,
  });

  useEffect(() => {
    initTheme(theme);
  }, [theme]);

  useEffect(() => {
    window.dispatchEvent(new Event("erp-app-ready"));
  }, []);

  const onboardingChecked = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.tenantId) return;
    if (onboardingChecked.current) return;
    onboardingChecked.current = true;
    const path = window.location.pathname;
    if (path.startsWith("/dashboard/onboarding")) return;
    void fetch("/api/tenant/onboarding").then((r) => {
      if (!r.ok) return; // Don't redirect on error
      return r.json();
    }).then((d: { done: boolean } | undefined) => {
      if (d && !d.done) router.replace("/dashboard/onboarding");
    }).catch(() => {
      // Ignore fetch errors - don't redirect
    });
  }, [status, session?.user?.tenantId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Sidebar - mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200 ${
          sidebarMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <TabBar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* AI Chat */}
      <AiChat />
      <GlobalSearch />
    </div>
  );
}
