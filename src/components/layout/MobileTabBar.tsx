import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Wrench, CalendarDays, User, Hammer, Sparkles, PaintBucket, Home,
  GanttChartIcon, ClipboardList, CheckCircle, MoreHorizontal, LogOut,
  Package, FileText, Users, ShieldIcon, CarIcon, Flag, BarChart3, Clock,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export type MobileTab = { url: string; label: string; icon: any; exact?: boolean };

/** Bepaalt of de ingelogde rol de mobiele app-shell (onderbalk) krijgt. */
export const useMobileTabs = (): { tabs: MobileTab[]; more: MobileTab[] } | null => {
  const {
    isMonteur, isSchadeherstel, isUitdeukerExtern, isPoetser, isWerkplaatsChef, isOperationeelDirecteur,
  } = useRoleAccess();

  if (isMonteur()) {
    return {
      tabs: [
        { url: "/werkplaats/mijn-werk", label: "Mijn werk", icon: Wrench },
        { url: "/werkplaats/agenda", label: "Agenda", icon: CalendarDays },
      ],
      more: [],
    };
  }
  if (isSchadeherstel()) {
    return { tabs: [{ url: "/werkplaats/schadeherstel", label: "Schade", icon: PaintBucket }], more: [] };
  }
  if (isUitdeukerExtern()) {
    return { tabs: [{ url: "/werkplaats/uitdeuken", label: "Uitdeuken", icon: Hammer }], more: [] };
  }
  if (isPoetser()) {
    return { tabs: [{ url: "/werkplaats/poetsen", label: "Poetsen", icon: Sparkles }], more: [] };
  }
  if (isOperationeelDirecteur()) {
    return {
      tabs: [
        { url: "/directie", label: "Cockpit", icon: Home, exact: true },
        { url: "/werkplaats/planning", label: "Planning", icon: GanttChartIcon },
        { url: "/werkplaats/agenda", label: "Agenda", icon: CalendarDays },
        { url: "/rapportages/omzet", label: "Omzet", icon: BarChart3 },
      ],
      // Zelfde categorisering/volgorde als de sidebar
      more: [
        { url: "/werkplaats/inname", label: "Inname", icon: ClipboardList },
        { url: "/werkplaats/poetsen", label: "Poetsen", icon: Sparkles },
        { url: "/werkplaats/uitdeuken", label: "Uitdeuken", icon: Hammer },
        { url: "/werkplaats/onderdelen", label: "Onderdelen", icon: Package },
        { url: "/inventory", label: "Voorraad", icon: CarIcon, exact: true },
        { url: "/inventory/consumer", label: "Verkocht B2C", icon: Flag },
        { url: "/inventory/delivered", label: "Afgeleverd", icon: Flag },
        { url: "/warranty", label: "Garantieclaims", icon: ShieldIcon },
        { url: "/rapportages/performance", label: "Performance", icon: Users },
        { url: "/rapportages/kpi", label: "KPI-dashboard", icon: GanttChartIcon },
        { url: "/rapportages/doorlooptijden", label: "Doorlooptijden", icon: Clock },
        { url: "/werkplaats/facturen", label: "Facturen", icon: FileText },
      ],
    };
  }
  if (isWerkplaatsChef()) {
    return {
      tabs: [
        { url: "/werkplaats", label: "Cockpit", icon: Home, exact: true },
        { url: "/werkplaats/planning", label: "Planning", icon: GanttChartIcon },
        { url: "/werkplaats/inname", label: "Inname", icon: ClipboardList },
        { url: "/werkplaats/goedkeuren", label: "Keuren", icon: CheckCircle },
      ],
      more: [
        { url: "/werkplaats/autos", label: "Auto's", icon: CarIcon },
        { url: "/werkplaats/onderdelen", label: "Onderdelen", icon: Package },
        { url: "/werkplaats/agenda", label: "Werkplaats agenda", icon: CalendarDays },
        { url: "/werkplaats/facturen", label: "Werkplaats facturen", icon: FileText },
        { url: "/warranty", label: "Garantieclaims", icon: ShieldIcon },
        { url: "/customers", label: "Alle klanten", icon: Users, exact: true },
        { url: "/inventory/consumer", label: "Verkocht B2C", icon: Flag },
        { url: "/loan-cars", label: "Leenauto beheer", icon: CarIcon },
      ],
    };
  }
  return null;
};

const TabButton: React.FC<{ item: MobileTab; active: boolean }> = ({ item, active }) => (
  <Link
    to={item.url}
    className={cn(
      "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] touch-manipulation",
      active ? "text-blue-600" : "text-slate-500",
    )}
  >
    <item.icon className="h-[22px] w-[22px]" />
    <span className="text-[11px] font-semibold leading-none truncate max-w-full px-1">{item.label}</span>
  </Link>
);

export const MobileTabBar: React.FC = () => {
  const cfg = useMobileTabs();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, userRole } = useAuth();
  const [moreOpen, setMoreOpen] = React.useState(false);

  if (!cfg) return null;

  const isActive = (t: MobileTab) =>
    t.exact ? location.pathname === t.url : location.pathname.startsWith(t.url);

  const handleLogout = async () => {
    setMoreOpen(false);
    await signOut();
    navigate("/auth");
  };

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(15,23,42,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch">
          {cfg.tabs.map((t) => (
            <TabButton key={t.url} item={t} active={isActive(t)} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-slate-500 touch-manipulation"
          >
            {cfg.more.length > 0 ? <MoreHorizontal className="h-[22px] w-[22px]" /> : <User className="h-[22px] w-[22px]" />}
            <span className="text-[11px] font-semibold leading-none">{cfg.more.length > 0 ? "Meer" : "Profiel"}</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <SheetHeader className="text-left">
            <SheetTitle className="text-[15px]">{cfg.more.length > 0 ? "Meer" : "Profiel"}</SheetTitle>
          </SheetHeader>

          <div className="mt-2 mb-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <div className="text-[13px] font-semibold text-slate-900 truncate">{user?.email}</div>
            <div className="text-[12px] text-slate-500">{userRole || "medewerker"}</div>
          </div>

          {cfg.more.length > 0 && (
            <div className="space-y-1">
              {cfg.more.map((m) => (
                <Link
                  key={m.url}
                  to={m.url}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 rounded-xl min-h-[48px] text-[14px] font-medium text-slate-800 active:bg-slate-100"
                >
                  <m.icon className="h-[18px] w-[18px] text-slate-500" />
                  {m.label}
                </Link>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-slate-900 text-white text-[14px] font-semibold"
          >
            <LogOut className="h-4 w-4" /> Uitloggen
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileTabBar;