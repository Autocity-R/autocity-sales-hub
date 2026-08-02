
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
    hasRapportagesAccess, hasLeadsAccess, hasCustomersAccess, hasGarantieInboxAccess,
    hasWerkplaatsAccess, isRestrictedWorkshopUser, getHomeRoute,
    isSchadeherstel, isMonteur, isUitdeukerExtern, isWerkplaatsChef, isOperationeelDirecteur, isPoetser,
    isAftersalesManager,
  } = useRoleAccess();

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

  // Operationeel directeur: read-only directie-cockpit met inzicht-menu
  if (isOperationeelDirecteur()) {
    const directieItems: { to: string; label: string; icon: any }[] = [
      { to: "/directie", label: "Directie", icon: HomeIcon },
      { to: "/rapportages/omzet", label: "Rapportages", icon: BarChart3 },
      { to: "/inventory", label: "Voorraad", icon: CarIcon },
      { to: "/inventory/consumer", label: "Verkocht B2C", icon: UsersIcon },
      { to: "/werkplaats/planning", label: "Planning", icon: Wrench },
      { to: "/werkplaats/agenda", label: "Agenda", icon: CalendarIcon },
      { to: "/werkplaats/facturen", label: "Facturen", icon: FileText },
      { to: "/warranty", label: "Garantieclaims", icon: ShieldIcon },
      { to: "/werkplaats/inname", label: "Inname", icon: ClipboardList },
      { to: "/werkplaats/poetsen", label: "Poetsen", icon: Sparkles },
      { to: "/werkplaats/uitdeuken", label: "Uitdeuken", icon: Hammer },
      { to: "/werkplaats/onderdelen", label: "Onderdelen", icon: Package },
      { to: "/customers", label: "Klanten", icon: UsersIcon },
    ];
    return (
      <div className={cn("flex h-full w-64 flex-col bg-black text-white border-r border-gray-800", className)}>
        <ScrollArea className="flex-1 px-2 py-3">
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Directie · alleen-lezen
          </div>
          <div className="space-y-1">
            {directieItems.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                <Button
                  variant={isActive(to) ? "default" : "ghost"}
                  className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                  size="sm"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
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

  // ============ Standaard-sidebar (owner/admin/manager/verkoper/operationeel) ============
  // Rechten en routes blijven exact gelijk; alleen presentatie/ordening is opgeschoond.
  return (
    <StandardSidebar
      className={className}
      isActive={isActive}
      getSubActive={getSubActive}
      location={location}
      access={{
        hasReportsAccess: hasReportsAccess(),
        hasAIAgentsAccess: hasAIAgentsAccess(),
        hasSettingsAccess: hasSettingsAccess(),
        hasRapportagesAccess: hasRapportagesAccess(),
        hasLeadsAccess: hasLeadsAccess(),
        hasCustomersAccess: hasCustomersAccess(),
        hasGarantieInboxAccess: hasGarantieInboxAccess(),
        hasWerkplaatsAccess: hasWerkplaatsAccess(),
      }}
    />
  );
};

/* ============ Standaard-sidebar (presentatie) ============ */

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

const StandardSidebar: React.FC<{
  className?: string;
  isActive: (p: string) => boolean;
  getSubActive: (paths: string[]) => boolean;
  location: ReturnType<typeof useLocation>;
  access: {
    hasReportsAccess: boolean;
    hasAIAgentsAccess: boolean;
    hasSettingsAccess: boolean;
    hasRapportagesAccess: boolean;
    hasLeadsAccess: boolean;
    hasCustomersAccess: boolean;
    hasGarantieInboxAccess: boolean;
    hasWerkplaatsAccess: boolean;
  };
}> = ({ className, isActive, getSubActive, location, access }) => {
  const garantieUnread = useGarantieUnread();

  const inventorySubPaths = ["/inventory/online", "/inventory/b2b", "/inventory/consumer", "/inventory/delivered"];
  const customerSubPaths = ["/customers/b2b", "/customers/b2c", "/suppliers"];

  const sections: StdSection[] = [
    {
      label: null,
      entries: [{ url: "/", label: "Dashboard", icon: HomeIcon, exact: true }],
    },
    {
      label: "VERKOOP",
      entries: [
        ...(access.hasLeadsAccess ? [{ url: "/leads", label: "Werkbak / Leads", icon: BookIcon }] : []),
        { url: "/calendar", label: "Agenda", icon: CalendarIcon },
        ...(access.hasCustomersAccess
          ? [{
              url: "/customers", label: "Klanten", icon: UsersIcon, key: "customers",
              sub: [
                { url: "/customers/b2b", label: "Zakelijk", icon: BoxIcon },
                { url: "/customers/b2c", label: "Particulier", icon: UsersIcon },
                { url: "/suppliers", label: "Leveranciers", icon: TruckIcon },
              ],
            } as StdGroup]
          : []),
        {
          url: "/inventory", label: "Voorraad", icon: CarIcon, key: "inventory",
          sub: [
            { url: "/inventory/online", label: "Online", icon: ShoppingBagIcon },
            { url: "/inventory/b2b", label: "Verkocht B2B", icon: BoxIcon },
            { url: "/inventory/consumer", label: "Verkocht B2C", icon: UsersIcon },
            { url: "/inventory/delivered", label: "Afgeleverd", icon: Flag },
          ],
        } as StdGroup,
        { url: "/transport", label: "Transport", icon: TruckIcon },
        { url: "/tasks", label: "Taken schema", icon: ClipboardList },
        { url: "/taxatie", label: "Taxatie", icon: Calculator },
        { url: "/foto-studio", label: "Foto Studio", icon: Camera },
      ],
    },
    {
      label: "OPERATIONEEL",
      entries: access.hasWerkplaatsAccess
        ? [
            { url: "/werkplaats", label: "Werkplaats dashboard", icon: Wrench, exact: true },
            { url: "/werkplaats/planning", label: "Planning", icon: GanttChartIcon },
            { url: "/werkplaats/inname", label: "Inname", icon: ClipboardList },
            { url: "/werkplaats/agenda", label: "Werkplaats agenda", icon: CalendarIcon },
            { url: "/werkplaats/goedkeuren", label: "Goedkeuren", icon: CheckCircle },
            { url: "/werkplaats/onderdelen", label: "Onderdelen", icon: Package },
            { url: "/werkplaats/poetsen", label: "Poetsen", icon: Sparkles },
            { url: "/werkplaats/uitdeuken", label: "Uitdeuken (extern)", icon: Hammer },
            { url: "/werkplaats/autos", label: "Auto's", icon: CarIcon },
            { url: "/werkplaats/facturen", label: "Facturen (werkplaats)", icon: FileText },
          ]
        : [],
    },
    {
      label: "GARANTIE",
      entries: [
        ...(access.hasGarantieInboxAccess
          ? [{ url: "/garantie/inbox", label: "Garantie-inbox", icon: InboxIcon, badge: garantieUnread }]
          : []),
        { url: "/warranty", label: "Garantieclaims", icon: ShieldIcon },
        { url: "/loan-cars", label: "Leenauto's", icon: CarIcon },
      ],
    },
    {
      label: "RAPPORTAGES",
      entries: access.hasRapportagesAccess
        ? [
            { url: "/rapportages/omzet", label: "Omzet", icon: BarChart3 },
            { url: "/rapportages/performance", label: "Performance", icon: UsersIcon },
            { url: "/rapportages/kpi", label: "KPI-dashboard", icon: GanttChartIcon },
            { url: "/rapportages/doorlooptijden", label: "Doorlooptijden", icon: Clock },
          ]
        : [],
    },
    {
      label: "BEHEER",
      entries: [
        ...(access.hasAIAgentsAccess ? [{ url: "/ai-agents", label: "AI Team", icon: Bot }] : []),
        ...(access.hasReportsAccess ? [{ url: "/reports", label: "Prestaties verkoop", icon: BarChart3 }] : []),
        ...(access.hasSettingsAccess ? [{ url: "/settings", label: "Instellingen", icon: SettingsIcon }] : []),
      ],
    },
  ];

  const inventoryOpenByRoute = getSubActive(inventorySubPaths);
  const customersOpenByRoute = getSubActive(customerSubPaths);

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    inventory: inventoryOpenByRoute,
    customers: customersOpenByRoute,
  });

  // Automatisch openklappen wanneer een subroute actief wordt
  React.useEffect(() => {
    setOpenGroups((prev) => ({
      ...prev,
      inventory: prev.inventory || inventoryOpenByRoute,
      customers: prev.customers || customersOpenByRoute,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryOpenByRoute, customersOpenByRoute]);

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
              setOpenGroups((prev) => ({ ...prev, [g.key]: !prev[g.key] }));
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

/* ============ Aftersales-only sidebar ============ */
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
