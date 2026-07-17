import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Boxes, Home, LogOut, PanelLeft } from "lucide-react";
import { LoginScreen } from "@/components/LoginScreen";
import { HomeTab } from "@/components/HomeTab";
import { InventoryTab } from "@/components/InventoryTab";
import { ReportTab } from "@/components/ReportTab";
import logo from "@/assets/logo.png";
import { SidebarLayoutProvider, useSidebarLayout } from "../hooks/useSidebarLayout";
import { AuthProvider, useAuthContext } from "../contexts/AuthContext";

export const Route = createFileRoute("/")({
  component: App,
});

type Tab = "tab-home" | "tab-inventory" | "tab-report";

function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}

function AppGate() {
  const { authUser, isInitializing } = useAuthContext();
  const [tab, setTab] = useState<Tab>("tab-home");

  // Resetar aba ao fazer logout
  useEffect(() => {
    if (!authUser) setTab("tab-home");
  }, [authUser]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt="Stockube" className="h-12 w-12 object-contain animate-pulse" />
        </div>
      </div>
    );
  }

  if (!authUser) return <LoginScreen />;

  return (
    <SidebarLayoutProvider>
      <AppContent tab={tab} setTab={setTab} />
    </SidebarLayoutProvider>
  );
}

function AppContent({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
}) {
  const { authUser, signOut } = useAuthContext();
  const { isExpanded, toggleSidebar } = useSidebarLayout();

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-background landscape:grid landscape:grid-cols-[auto_1fr] landscape:grid-rows-[auto_1fr] landscape:max-w-4xl overflow-hidden">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-cyan-brand px-5 py-3.5 text-white shadow-sm landscape:relative landscape:col-start-2 landscape:row-start-1 w-full min-w-0 overflow-hidden shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleSidebar}
            className="hidden landscape:flex items-center justify-center rounded-lg bg-white/15 p-2 text-white transition hover:bg-white/25 mr-1 shrink-0 cursor-pointer"
            aria-label="Toggle Menu"
          >
            <PanelLeft className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "" : "rotate-180"}`} />
          </button>
          <img src={logo} alt="" className="h-7 w-7 object-contain" />
          <div>
            <h1 className="text-base font-bold leading-tight">Stockube</h1>
            <p className="text-[10px] uppercase tracking-wider text-white/80">Lab Maker</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
              {authUser?.nome}
            </span>
            <span
              className={`mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                authUser?.cargo === "admin"
                  ? "bg-cyan-300/30 text-cyan-100"
                  : "bg-white/15 text-white/70"
              }`}
            >
              {authUser?.cargo}
            </span>
          </div>
          <button
            onClick={signOut}
            className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto min-h-0 landscape:col-start-2 landscape:row-start-2 landscape:h-full landscape:overflow-y-auto landscape:min-h-0 w-full min-w-0">
        {tab === "tab-home" && <HomeTab />}
        {tab === "tab-inventory" && <InventoryTab />}
        {tab === "tab-report" && <ReportTab />}
      </main>

      <nav className={`shrink-0 z-30 border-t border-border bg-card/95 backdrop-blur landscape:col-start-1 landscape:row-start-1 landscape:row-span-2 landscape:border-t-0 landscape:border-r landscape:h-full landscape:min-h-0 transition-all duration-300 ease-in-out ${isExpanded ? "landscape:w-[180px]" : "landscape:w-[72px]"}`}>
        <div className="mx-auto grid max-w-md grid-cols-3 landscape:grid-cols-1 landscape:w-full">
          <TabBtn
            active={tab === "tab-home"}
            onClick="tab-home"
            icon={<Home className="h-5 w-5" />}
            label="Início"
            isExpanded={isExpanded}
            onSelect={() => setTab("tab-home")}
          />
          <TabBtn
            active={tab === "tab-inventory"}
            onClick="tab-inventory"
            icon={<Boxes className="h-5 w-5" />}
            label="Inventário"
            isExpanded={isExpanded}
            onSelect={() => setTab("tab-inventory")}
          />
          <TabBtn
            active={tab === "tab-report"}
            onClick="tab-report"
            icon={<BarChart3 className="h-5 w-5" />}
            label="Relatório"
            isExpanded={isExpanded}
            onSelect={() => setTab("tab-report")}
          />
        </div>
      </nav>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  isExpanded,
  onSelect,
}: {
  active: boolean;
  onClick: string;
  icon: React.ReactNode;
  label: string;
  isExpanded: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      id={onClick}
      onClick={onSelect}
      className={`flex flex-col items-center gap-1 px-3 py-3 text-[11px] font-semibold transition landscape:flex-row landscape:gap-3 landscape:px-5 landscape:py-4 landscape:text-xs ${
        active ? "text-cyan-brand" : "text-navy-brand/50"
      } ${!isExpanded ? "landscape:justify-center landscape:px-0" : ""}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
          active ? "bg-cyan-soft" : "bg-transparent"
        }`}
      >
        {icon}
      </span>
      <span className={`transition-all duration-300 ease-in-out ${!isExpanded ? "landscape:max-w-0 landscape:opacity-0 landscape:overflow-hidden landscape:ml-0" : "landscape:max-w-[100px] landscape:opacity-100"}`}>
        {label}
      </span>
    </button>
  );
}
