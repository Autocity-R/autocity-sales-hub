
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  User, 
  Mail, 
  Bell, 
  Shield, 
  Globe, 
  Palette,
  Key,
  Database,
  Users,
  UserPlus
} from "lucide-react";

// Persoonlijke instellingen
const personalMenuItems = [
  {
    title: "Persoonlijke Gegevens",
    icon: User,
    href: "/settings/personal",
    description: "Beheer je profiel en contactgegevens"
  },
  {
    title: "Email Instellingen",
    icon: Mail,
    href: "/settings/email",
    description: "Koppel en beheer email accounts"
  },
  {
    title: "Notificaties",
    icon: Bell,
    href: "/settings/notifications",
    description: "Beheer je notificatie voorkeuren"
  },
  {
    title: "Beveiliging",
    icon: Shield,
    href: "/settings/security",
    description: "Wachtwoord en beveiligingsinstellingen"
  }
];

// Systeem instellingen
const systemMenuItems = [
  {
    title: "Taal & Regio",
    icon: Globe,
    href: "/settings/language",
    description: "Taal en tijdzone instellingen"
  },
  {
    title: "Thema",
    icon: Palette,
    href: "/settings/theme",
    description: "Pas het uiterlijk aan"
  },
  {
    title: "API Sleutels",
    icon: Key,
    href: "/settings/api",
    description: "Beheer API toegang"
  },
  {
    title: "Data & Privacy",
    icon: Database,
    href: "/settings/privacy",
    description: "Data export en privacy instellingen"
  }
];

// Admin menu items (alleen voor hoofdgebruiker)
const adminMenuItems = [
  {
    title: "Gebruikersbeheer",
    icon: Users,
    href: "/settings/users",
    description: "Beheer gebruikerstoegang en rechten"
  },
  {
    title: "Nieuwe Gebruiker",
    icon: UserPlus,
    href: "/settings/users/new",
    description: "Voeg nieuwe gebruikers toe aan het systeem"
  }
];

export const SettingsSidebar = () => {
  const location = useLocation();
  
  // Simuleer admin check - in productie zou dit uit een auth context komen
  const isAdmin = true; // TODO: Vervang door echte admin check

  const MenuSection = ({ title, items }: { title: string, items: typeof personalMenuItems }) => (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-3">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === "/settings/personal" && location.pathname === "/settings");
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-colors group",
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 mt-0.5 flex-shrink-0",
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
              )} />
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium text-sm",
                  isActive 
                    ? "text-blue-700 dark:text-blue-300" 
                    : "text-gray-900 dark:text-white"
                )}>
                  {item.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Instellingen
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Beheer je account en voorkeuren
        </p>
      </div>
      
      <nav className="p-4">
        <MenuSection title="Persoonlijk" items={personalMenuItems} />
        <MenuSection title="Systeem" items={systemMenuItems} />
        {isAdmin && <MenuSection title="Beheer" items={adminMenuItems} />}
      </nav>
    </div>
  );
};
