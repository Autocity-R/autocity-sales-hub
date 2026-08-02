
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import {
  BookIcon,
  BoxIcon,
  CalendarIcon,
  Calculator,
  CarIcon,
  CreditCardIcon,
  FileTextIcon,
  HomeIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TruckIcon,
  UsersIcon,
  BarChart3,
  GanttChartIcon,
  ShieldIcon,
  CheckCircle,
  Flag,
  Bot,
  ClipboardList,
  Camera,
  Wrench,
  Hammer,
  PaintBucket,
  ClipboardCheck,
  Package,
  Sparkles,
  Clock,
  ChevronDown,
} from "lucide-react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();
  const {
    hasReportsAccess, hasAIAgentsAccess, hasSettingsAccess,
    hasRapportagesAccess,
    hasWerkplaatsAccess, isRestrictedWorkshopUser, getHomeRoute,
    isSchadeherstel, isMonteur, isUitdeukerExtern, isWerkplaatsChef, isOperationeelDirecteur, isPoetser,
    isAftersalesManager, isAdministratie,
    userRole,
  } = useRoleAccess();

  const isVerkoper = userRole === "verkoper";

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const getSubActive = (paths: string[]) => {
    return paths.some((path) => location.pathname === path);
  };

  // Monteur: mobiel-eerst, alleen "Mijn werk"
  if (isMonteur()) {
    return (
      <div className={cn("flex h-full w-64 flex-col bg-black text-white border-r border-gray-800", className)}>
        <ScrollArea className="flex-1 px-2 py-3">
          <div className="space-y-1">
            <Link to="/werkplaats/mijn-werk">
              <Button variant={isActive("/werkplaats/mijn-werk") ? "default" : "ghost"} className="w-full justify-start text-white hover:text-white hover:bg-gray-800" size="sm">
                <Wrench className="mr-2 h-4 w-4" />
                Mijn werk
              </Button>
            </Link>
            <Link to="/werkplaats/agenda">
              <Button variant={isActive("/werkplaats/agenda") ? "default" : "ghost"} className="w-full justify-start text-white hover:text-white hover:bg-gray-800" size="sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Werkplaats agenda
              </Button>
            </Link>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Operationeel directeur: read-only directie-cockpit (nieuwe indeling)
  if (isOperationeelDirecteur()) {
    return <DirectieSidebar className={className} isActive={isActive} getSubActive={getSubActive} location={location} />;
  }

  // Administratie: plat menu met uitsluitend inzicht-pagina's
  if (isAdministratie()) {
    return <AdministratieSidebar className={className} isActive={isActive} location={location} />;
  }

  // Gesloten werkplaats-omgeving: alleen eigen menu-item
  if (isRestrictedWorkshopUser()) {
    const home = getHomeRoute();
    const label = isSchadeherstel() ? "Schadeherstel"
      : isMonteur() ? "Jouw planning (Monteur)"
      : isUitdeukerExtern() ? "Uitdeuken"
      : isPoetser() ? "Poetsen"
      : isWerkplaatsChef() ? "Werkplaats overzicht"
      : isOperationeelDirecteur() ? "Operationeel"
      : "Werkplaats";
    const Icon = isUitdeukerExtern() ? Hammer : isSchadeherstel() ? PaintBucket : isPoetser() ? Sparkles : Wrench;
    return (
      <div className={cn("flex h-full w-64 flex-col bg-black text-white border-r border-gray-800", className)}>
        <ScrollArea className="flex-1 px-2 py-3">
          <div className="space-y-1">
            <Link to={home}>
              <Button variant={isActive(home) ? "default" : "ghost"} className="w-full justify-start text-white hover:text-white hover:bg-gray-800" size="sm">
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Button>
            </Link>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Aftersales manager: eigen strak menu — géén ruis van andere rollen
  if (isAftersalesManager() || isWerkplaatsChef()) {
    return (
      <AftersalesSidebar
        className={className}
        isActive={isActive}
        location={location}
        variant={isWerkplaatsChef() ? "chef" : "aftersales"}
      />
    );
  }

  return (
    <div className={cn("flex h-full w-64 flex-col bg-black text-white border-r border-gray-800", className)}>
      <ScrollArea className="flex-1 px-2 py-3">
        <div className="space-y-1">
          <Link to="/">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
              size="sm"
            >
              <HomeIcon className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          <h2 className="mb-2 px-2 text-xs font-semibold text-gray-400">
            VOERTUIGEN
          </h2>
          <div className="space-y-1">
            <Link to="/inventory">
              <Button
                variant={isActive("/inventory") && !getSubActive(["/inventory/b2b", "/inventory/online", "/inventory/consumer", "/inventory/delivered"]) ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <CarIcon className="mr-2 h-4 w-4" />
                Voorraad
              </Button>
            </Link>
            <Link to="/inventory/online">
              <Button
                variant={isActive("/inventory/online") ? "default" : "ghost"}
                className="w-full justify-start pl-2 text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <ShoppingBagIcon className="mr-2 h-4 w-4" />
                Online
              </Button>
            </Link>
            <Link to="/inventory/b2b">
              <Button
                variant={isActive("/inventory/b2b") ? "default" : "ghost"}
                className="w-full justify-start pl-2 text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <BoxIcon className="mr-2 h-4 w-4" />
                Verkocht B2B
              </Button>
            </Link>
            <Link to="/inventory/consumer">
              <Button
                variant={isActive("/inventory/consumer") ? "default" : "ghost"}
                className="w-full justify-start pl-2 text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <UsersIcon className="mr-2 h-4 w-4" />
                Verkocht B2C
              </Button>
            </Link>
            <Link to="/inventory/delivered">
              <Button
                variant={isActive("/inventory/delivered") ? "default" : "ghost"}
                className="w-full justify-start pl-2 text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <Flag className="mr-2 h-4 w-4" />
                Afgeleverd
              </Button>
            </Link>
            <Link to="/transport">
              <Button
                variant={isActive("/transport") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <TruckIcon className="mr-2 h-4 w-4" />
                Transport
              </Button>
            </Link>
            <Link to="/tasks">
              <Button
                variant={isActive("/tasks") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Taken Schema
              </Button>
            </Link>
            <Link to="/warranty">
              <Button
                variant={isActive("/warranty") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <ShieldIcon className="mr-2 h-4 w-4" />
                Garantie
              </Button>
            </Link>
            {/* TODO: Tijdelijk geen rol-check - later terugzetten */}
            <Link to="/taxatie">
              <Button
                variant={isActive("/taxatie") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <Calculator className="mr-2 h-4 w-4" />
                Taxatie
              </Button>
            </Link>
            <Link to="/foto-studio">
              <Button
                variant={isActive("/foto-studio") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <Camera className="mr-2 h-4 w-4" />
                Foto Studio
              </Button>
            </Link>
            {(isVerkoper || ((userRole === "owner" || userRole === "admin") && !hasWerkplaatsAccess())) && (
              <Link to="/werkplaats/inname">
                <Button
                  variant={isActive("/werkplaats/inname") ? "default" : "ghost"}
                  className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                  size="sm"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Inname
                </Button>
              </Link>
            )}
          </div>
        </div>

        {hasWerkplaatsAccess() && (
          <div className="mt-8">
            <h2 className="mb-2 px-2 text-xs font-semibold text-gray-400">
              OPERATIONEEL
            </h2>
            <div className="space-y-1">
              {[
                { url: "/werkplaats", label: "Dashboard", icon: Wrench, exact: true },
                { url: "/werkplaats/autos", label: "Auto's", icon: CarIcon },
                { url: "/werkplaats/planning", label: "Planning", icon: GanttChartIcon },
                { url: "/werkplaats/inname", label: "Inname", icon: ClipboardList },
                { url: "/werkplaats/uitdeuken", label: "Uitdeuken (extern)", icon: Hammer },
                { url: "/werkplaats/goedkeuren", label: "Goedkeuren", icon: CheckCircle },
                { url: "/werkplaats/poetsen", label: "Poetsen", icon: Sparkles },
              ].map((it) => (
                <Link key={it.url} to={it.url}>
                  <Button
                    variant={(it.exact ? location.pathname === it.url : isActive(it.url)) ? "default" : "ghost"}
                    className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                    size="sm"
                  >
                    <it.icon className="mr-2 h-4 w-4" />
                    {it.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {hasRapportagesAccess() && (
          <div className="mt-8">
            <h2 className="mb-2 px-2 text-xs font-semibold text-gray-400">
              RAPPORTAGES
            </h2>
            <div className="space-y-1">
              {[
                { url: "/rapportages/omzet", label: "Omzet", icon: BarChart3 },
                { url: "/rapportages/performance", label: "Performance", icon: UsersIcon },
                { url: "/rapportages/kpi", label: "KPI-dashboard", icon: GanttChartIcon },
                { url: "/rapportages/doorlooptijden", label: "Doorlooptijden", icon: Clock },
              ].map((it) => (
                <Link key={it.url} to={it.url}>
                  <Button
                    variant={isActive(it.url) ? "default" : "ghost"}
                    className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                    size="sm"
                  >
                    <it.icon className="mr-2 h-4 w-4" />
                    {it.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="mb-2 px-2 text-xs font-semibold text-gray-400">
            KLANTEN
          </h2>
          <div className="space-y-1">
            <Link to="/customers">
              <Button
                variant={isActive("/customers") && !getSubActive(["/customers/b2b", "/customers/b2c", "/suppliers"]) ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <UsersIcon className="mr-2 h-4 w-4" />
                Alle Klanten
              </Button>
            </Link>
            <Link to="/customers/b2b">
              <Button
                variant={isActive("/customers/b2b") ? "default" : "ghost"}
                className="w-full justify-start pl-2 text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <BoxIcon className="mr-2 h-4 w-4" />
                Zakelijk
              </Button>
            </Link>
            <Link to="/customers/b2c">
              <Button
                variant={isActive("/customers/b2c") ? "default" : "ghost"}
                className="w-full justify-start pl-2 text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <UsersIcon className="mr-2 h-4 w-4" />
                Particulier
              </Button>
            </Link>
            <Link to="/suppliers">
              <Button
                variant={isActive("/suppliers") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <TruckIcon className="mr-2 h-4 w-4" />
                Leveranciers
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-2 px-2 text-xs font-semibold text-gray-400">
            ADMINISTRATIE
          </h2>
          <div className="space-y-1">
            {hasReportsAccess() && (
              <Link to="/reports">
                <Button
                  variant={isActive("/reports") ? "default" : "ghost"}
                  className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                  size="sm"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics (verkoop)
                </Button>
              </Link>
            )}
            {hasAIAgentsAccess() && (
              <Link to="/ai-agents">
                <Button
                  variant={isActive("/ai-agents") ? "default" : "ghost"}
                  className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                  size="sm"
                >
                  <Bot className="mr-2 h-4 w-4" />
                  AI Team
                </Button>
              </Link>
            )}
            <Link to="/loan-cars">
              <Button
                variant={isActive("/loan-cars") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <CarIcon className="mr-2 h-4 w-4" />
                Leen auto beheer
              </Button>
            </Link>
            <Link to="/calendar">
              <Button
                variant={isActive("/calendar") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                Agenda
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 pb-4">
          <div className="space-y-1">
            {hasSettingsAccess() && (
              <Link to="/settings">
                <Button
                  variant={isActive("/settings") ? "default" : "ghost"}
                  className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                  size="sm"
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Instellingen
                </Button>
              </Link>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

/* ============ Types voor de directie-navigatie ============ */

type StdItem = { url: string; label: string; icon: any; exact?: boolean; badge?: number };
type StdGroup = {
  url: string;
  label: string;
  icon: any;
  key: string;
  sub: StdItem[];
};
type StdSection = { label: string | null; entries: (StdItem | StdGroup)[] };

const isGroup = (e: StdItem | StdGroup): e is StdGroup => (e as StdGroup).sub !== undefined;

/* ============ Gedeelde, gestileerde navigatie-renderer ============ */

const StyledNav: React.FC<{
  className?: string;
  sections: StdSection[];
  isActive: (p: string) => boolean;
  location: ReturnType<typeof useLocation>;
  openGroups: Record<string, boolean>;
  toggleGroup: (key: string) => void;
  note?: string;
}> = ({ className, sections, isActive, location, openGroups, toggleGroup, note }) => {
  const visibleSections = sections.filter((s) => s.entries.length > 0);

  const renderBadge = (n?: number) =>
    typeof n === "number" && n > 0 ? (
      <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center px-1.5 shadow-sm">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  const rowClass = (active: boolean, indent: boolean) =>
    cn(
      "group relative flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
      indent && "pl-9",
      active
        ? "bg-gradient-to-r from-blue-600/30 via-blue-600/10 to-transparent text-white before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:rounded-r before:bg-blue-400"
        : "text-gray-300 hover:text-white hover:bg-gray-800/60",
    );

  const iconClass = (active: boolean) =>
    cn("h-4 w-4 shrink-0", active ? "text-blue-300" : "text-gray-400 group-hover:text-gray-200");

  const renderItem = (it: StdItem, indent = false) => {
    const active = it.exact ? location.pathname === it.url : isActive(it.url);
    return (
      <Link key={it.url} to={it.url} className="block">
        <div className={rowClass(active, indent)}>
          <it.icon className={iconClass(active)} />
          <span className="truncate">{it.label}</span>
          {renderBadge(it.badge)}
        </div>
      </Link>
    );
  };

  const renderGroup = (g: StdGroup) => {
    const subActive = g.sub.some((s) => location.pathname === s.url || isActive(s.url));
    const rootActive = isActive(g.url) && !subActive;
    const parentActive = rootActive || subActive;
    const open = !!openGroups[g.key];
    return (
      <div key={g.url}>
        <div className={cn(rowClass(parentActive, false), "pr-1")}>
          <Link to={g.url} className="flex flex-1 items-center gap-2 min-w-0">
            <g.icon className={iconClass(parentActive)} />
            <span className="truncate">{g.label}</span>
          </Link>
          <button
            type="button"
            aria-label={open ? `${g.label} inklappen` : `${g.label} uitklappen`}
            aria-expanded={open}
            onClick={(e) => {
              e.preventDefault();
              toggleGroup(g.key);
            }}
            className="ml-auto shrink-0 rounded p-1 text-gray-400 hover:text-white hover:bg-gray-700/60"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />
          </button>
        </div>
        {open && <div className="mt-0.5 space-y-0.5">{g.sub.map((s) => renderItem(s, true))}</div>}
      </div>
    );
  };

  return (
    <div className={cn("flex h-full w-64 flex-col bg-black text-white border-r border-gray-800", className)}>
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="pb-6">
          {note && (
            <div className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              {note}
            </div>
          )}
          {visibleSections.map((sec, idx) => (
            <div
              key={sec.label ?? `top-${idx}`}
              className={cn(idx > 0 && "mt-5 pt-4 border-t border-gray-800/70")}
            >
              {sec.label && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  {sec.label}
                </div>
              )}
              <div className="space-y-0.5">
                {sec.entries.map((e) => (isGroup(e) ? renderGroup(e) : renderItem(e)))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

/* ============ Directie-sidebar (read-only, zelfde stijl) ============ */

const DirectieSidebar: React.FC<{
  className?: string;
  isActive: (p: string) => boolean;
  getSubActive: (paths: string[]) => boolean;
  location: ReturnType<typeof useLocation>;
}> = ({ className, isActive, getSubActive, location }) => {
  const inventorySubPaths = ["/inventory/online", "/inventory/b2b", "/inventory/consumer", "/inventory/delivered"];
  const inventoryOpenByRoute = getSubActive(inventorySubPaths);
  const rapportagesOpenByRoute = location.pathname.startsWith("/rapportages");
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    inventory: true,
    rapportages: rapportagesOpenByRoute,
  });

  React.useEffect(() => {
    setOpenGroups((prev) => ({
      ...prev,
      inventory: prev.inventory || inventoryOpenByRoute,
      rapportages: prev.rapportages || rapportagesOpenByRoute,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryOpenByRoute, rapportagesOpenByRoute]);

  const sections: StdSection[] = [
    { label: null, entries: [{ url: "/directie", label: "Cockpit", icon: HomeIcon }] },
    {
      label: "OPERATIONEEL",
      entries: [
        { url: "/werkplaats/planning", label: "Planning", icon: GanttChartIcon },
        { url: "/werkplaats/agenda", label: "Werkplaats agenda", icon: CalendarIcon },
        { url: "/werkplaats/inname", label: "Inname", icon: ClipboardList },
        { url: "/werkplaats/poetsen", label: "Poetsen", icon: Sparkles },
        { url: "/werkplaats/uitdeuken", label: "Uitdeuken", icon: Hammer },
        { url: "/werkplaats/onderdelen", label: "Onderdelen", icon: Package },
      ],
    },
    {
      label: "VERKOOP (INZICHT)",
      entries: [
        { url: "/inventory", label: "Voorraad", icon: CarIcon },
        { url: "/inventory/consumer", label: "Verkocht B2C", icon: UsersIcon },
        { url: "/inventory/delivered", label: "Afgeleverd", icon: Flag },
      ],
    },
    {
      label: "GARANTIE",
      entries: [{ url: "/warranty", label: "Garantieclaims", icon: ShieldIcon }],
    },
    {
      label: "FINANCIEEL",
      entries: [
        {
          url: "/rapportages", label: "Rapportages", icon: BarChart3, key: "rapportages",
          sub: [
            { url: "/rapportages/omzet", label: "Omzet", icon: BarChart3 },
            { url: "/rapportages/performance", label: "Performance", icon: UsersIcon },
            { url: "/rapportages/kpi", label: "KPI-dashboard", icon: GanttChartIcon },
            { url: "/rapportages/doorlooptijden", label: "Doorlooptijden", icon: Clock },
          ],
        } as StdGroup,
        { url: "/werkplaats/facturen", label: "Facturen", icon: FileText },
      ],
    },
  ];

  return (
    <StyledNav
      className={className}
      sections={sections}
      isActive={isActive}
      location={location}
      openGroups={openGroups}
      toggleGroup={(key) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))}
      note="Directie · alleen-lezen"
    />
  );
};

/* ============ Aftersales-only sidebar ============ */

/* ============ Administratie-sidebar (plat, alleen-lezen) ============ */

const AdministratieSidebar: React.FC<{
  className?: string;
  isActive: (p: string) => boolean;
  location: ReturnType<typeof useLocation>;
}> = ({ className, isActive, location }) => {
  const sections: StdSection[] = [
    {
      label: null,
      entries: [
        { url: "/inventory", label: "Voorraad", icon: CarIcon, exact: true },
        { url: "/inventory/consumer", label: "Verkocht B2C", icon: UsersIcon },
        { url: "/inventory/b2b", label: "Verkocht B2B", icon: BoxIcon },
        { url: "/inventory/delivered", label: "Afgeleverd", icon: Flag },
        { url: "/customers", label: "Klanten & Leveranciers", icon: UsersIcon, exact: true },
        { url: "/werkplaats/facturen", label: "Werkplaats Facturen", icon: FileText },
      ],
    },
  ];

  return (
    <StyledNav
      className={className}
      sections={sections}
      isActive={isActive}
      location={location}
      openGroups={{}}
      toggleGroup={() => {}}
      note="Administratie · alleen-lezen"
    />
  );
};

import { Inbox as InboxIcon } from "lucide-react";
import { useGarantieUnread } from "@/hooks/useGarantieUnread";

type AsNavItem = { url: string; label: string; icon: any; exact?: boolean; badge?: number; sub?: AsNavItem[] };
type AsNavSection = { label: string; items: AsNavItem[] };

const AftersalesSidebar: React.FC<{ className?: string; isActive: (p: string) => boolean; location: ReturnType<typeof useLocation>; variant?: "aftersales" | "chef" }> = ({ className, isActive, location, variant = "aftersales" }) => {
  const garantieUnread = useGarantieUnread();
  const isChef = variant === "chef";

  const allSections: AsNavSection[] = [
    {
      label: "OVERZICHT",
      items: [{ url: "/werkplaats", label: "Dashboard", icon: HomeIcon, exact: true }],
    },
    {
      label: "VOERTUIGEN",
      items: isChef
        ? [
            { url: "/werkplaats/autos", label: "Auto's", icon: CarIcon },
            { url: "/inventory/consumer", label: "Verkocht B2C", icon: UsersIcon },
          ]
        : [
            { url: "/inventory", label: "Voorraad", icon: CarIcon, exact: true },
            { url: "/inventory/consumer", label: "Verkocht B2C", icon: UsersIcon },
            { url: "/inventory/delivered", label: "Afgeleverd", icon: Flag },
          ],
    },
    {
      label: "OPERATIONEEL",
      items: ([
        { url: "/werkplaats/planning", label: "Planning", icon: GanttChartIcon },
        { url: "/werkplaats/inname", label: "Inname", icon: ClipboardList },
        ...(isChef ? [] : [{ url: "/werkplaats/uitdeuken", label: "Uitdeuken", icon: Hammer }]),
        { url: "/werkplaats/goedkeuren", label: "Goedkeuren", icon: ClipboardCheck },
        { url: "/werkplaats/onderdelen", label: "Onderdelen", icon: Package },
        ...(isChef ? [] : [{ url: "/werkplaats/poetsen", label: "Poetsen", icon: Sparkles }]),
      ] as AsNavItem[]),
    },
    {
      label: "SERVICE",
      items: [
        // Chef: alleen de claims (geen mailbox). Aftersales: claims + inbox.
        ...(isChef ? [
          { url: "/warranty", label: "Garantieclaims", icon: ShieldIcon },
          { url: "/customers", label: "Alle klanten", icon: UsersIcon, exact: true },
        ] : [
          {
            url: "/warranty", label: "Garantie", icon: ShieldIcon, badge: garantieUnread,
            sub: [{ url: "/garantie/inbox", label: "Inbox", icon: InboxIcon, badge: garantieUnread }],
          },
          { url: "/customers", label: "Alle klanten", icon: UsersIcon, exact: true },
        ]),
        { url: "/loan-cars", label: "Leenauto beheer", icon: CarIcon },
      ] as AsNavItem[],
    },
    {
      label: "OVERIG",
      items: [
        // Verkoop-onderdelen (rapportages buiten de werkplaats + verkoopagenda) niet voor de chef
        ...(isChef ? [] : [
          { url: "/reports", label: "Rapportages", icon: BarChart3 },
          { url: "/calendar", label: "Agenda", icon: CalendarIcon },
        ]),
        { url: "/werkplaats/facturen", label: "Werkplaats facturen", icon: FileText },
        { url: "/werkplaats/agenda", label: "Werkplaats agenda", icon: CalendarIcon },
      ] as AsNavItem[],
    },
  ];

  const sections = allSections.filter(sec => sec.items.length > 0);

  const renderBadge = (n?: number) =>
    typeof n === "number" && n > 0 ? (
      <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center px-1.5 shadow-sm">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  const renderItem = (it: AsNavItem, indent = false) => {
    const active = it.exact ? location.pathname === it.url : isActive(it.url);
    return (
      <React.Fragment key={it.url}>
        <Link to={it.url} className="block">
          <div
            className={cn(
              "group relative flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
              indent && "pl-9",
              active
                ? "bg-gradient-to-r from-blue-600/30 via-blue-600/10 to-transparent text-white before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:rounded-r before:bg-blue-400"
                : "text-gray-300 hover:text-white hover:bg-gray-800/60",
            )}
          >
            <it.icon className={cn("h-4 w-4 shrink-0", active ? "text-blue-300" : "text-gray-400 group-hover:text-gray-200")} />
            <span className="truncate">{it.label}</span>
            {renderBadge(it.badge)}
          </div>
        </Link>
        {it.sub?.map((s) => renderItem(s, true))}
      </React.Fragment>
    );
  };

  return (
    <div className={cn("flex h-full w-64 flex-col bg-black text-white border-r border-gray-800", className)}>
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {sections.map((sec) => (
            <div key={sec.label}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-gray-500">
                {sec.label}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((it) => renderItem(it))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
