
import React from "react";
import { NavLink } from "react-router-dom";
import { 
  User, 
  Users, 
  Mail, 
  Bell, 
  Shield, 
  Settings, 
  Car,
  FileText,
  PenTool,
  Bot,
  Calendar
} from "lucide-react";

const settingsItems = [
  {
    name: "Gebruiker Instellingen",
    href: "/settings?tab=general",
    icon: User,
  },
  {
    name: "Gebruikersbeheer",
    href: "/settings?tab=users",
    icon: Users,
  },
  {
    name: "AI Agent Beheer",
    href: "/settings?tab=ai-agents",
    icon: Bot,
  },
  {
    name: "Agenda Instellingen",
    href: "/settings?tab=calendar",
    icon: Calendar,
  },
  {
    name: "Email Templates",
    href: "/settings?tab=email-templates",
    icon: Mail,
  },
  {
    name: "Contract Beheer",
    href: "/settings?tab=contracts",
    icon: PenTool,
  },
  {
    name: "Email Instellingen",
    href: "/settings?tab=email",
    icon: Mail,
  },
  {
    name: "Notificaties",
    href: "/settings?tab=notifications",
    icon: Bell,
  },
  {
    name: "API Instellingen",
    href: "/settings?tab=api",
    icon: Settings,
  },
  {
    name: "Leenauto's",
    href: "/settings?tab=loan-cars",
    icon: Car,
  },
  {
    name: "Beveiliging",
    href: "/settings?tab=security",
    icon: Shield,
  },
];

export const SettingsSidebar: React.FC = () => {
  return (
    <div className="w-64 bg-white shadow-sm border-r">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Instellingen</h2>
        <p className="text-sm text-gray-600 mt-1">Beheer uw account en voorkeuren</p>
      </div>
      <nav className="px-3 pb-6">
        <ul className="space-y-1">
          {settingsItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-red-50 text-red-700 border-r-2 border-red-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
