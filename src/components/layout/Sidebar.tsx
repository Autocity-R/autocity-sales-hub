
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  BarChart2, 
  Database, 
  Package, 
  Settings, 
  Truck, 
  User, 
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: BarChart2,
  },
  {
    title: "Voorraad",
    href: "/inventory",
    icon: Database,
  },
  {
    title: "Leads",
    href: "/leads",
    icon: User,
  },
  {
    title: "Transport",
    href: "/transport",
    icon: Truck,
  },
  {
    title: "Rapportages",
    href: "/reports",
    icon: BarChart2,
  },
  {
    title: "Instellingen",
    href: "/settings",
    icon: Settings,
  },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "bg-autocity h-screen flex flex-col border-r transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4 flex justify-center items-center border-b border-autocity-blue-gray-800">
        {collapsed ? (
          <div className="w-8 h-8 flex items-center justify-center">
            <span className="text-xl font-bold text-white">A</span>
          </div>
        ) : (
          <div className="flex items-center">
            <img 
              src="/lovable-uploads/8185527b-da48-494a-b7fa-309b4702b4c3.png" 
              alt="AutoCity Logo"
              className="h-8" 
            />
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 py-4 overflow-y-auto">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-3 text-sm font-medium rounded-md text-white hover:bg-autocity-blue-gray-800 transition-colors",
                window.location.pathname === item.href
                  ? "bg-autocity-blue-gray-800"
                  : ""
              )}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-autocity-blue-gray-800">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center text-white border-autocity-blue-gray-600 hover:bg-autocity-blue-gray-800 hover:text-white"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
