
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookIcon,
  BoxIcon,
  CalendarIcon,
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
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const getSubActive = (paths: string[]) => {
    return paths.some((path) => location.pathname === path);
  };

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
          </div>
        </div>

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
            <div className="space-y-1">
              <Link to="/reports">
                <Button
                  variant={isActive("/reports") && !isActive("/reports/tasks") ? "default" : "ghost"}
                  className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                  size="sm"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Verkoop Analytics
                </Button>
              </Link>
              <Link to="/reports/tasks">
                <Button
                  variant={isActive("/reports/tasks") ? "default" : "ghost"}
                  className="w-full justify-start text-white hover:text-white hover:bg-gray-800 pl-8"
                  size="sm"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Taken Analytics
                </Button>
              </Link>
            </div>
            <Link to="/ai-agents">
              <Button
                variant={isActive("/ai-agents") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800"
                size="sm"
              >
                <Bot className="mr-2 h-4 w-4" />
                AI Agents
              </Button>
            </Link>
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
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
