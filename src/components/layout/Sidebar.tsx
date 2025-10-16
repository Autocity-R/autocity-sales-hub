
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
    <div className={cn("flex h-full w-full flex-col bg-black text-white border-r border-gray-800", className)}>
      <ScrollArea className="flex-1 px-3 py-4 lg:px-4 lg:py-6">
        <div className="space-y-2">
          <Link to="/">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl"
              size="default"
            >
              <HomeIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 px-3 text-sm font-semibold text-gray-400 lg:text-base xl:text-lg">
            VOERTUIGEN
          </h2>
          <div className="space-y-2">
            <Link to="/inventory">
              <Button
                variant={isActive("/inventory") && !getSubActive(["/inventory/b2b", "/inventory/online", "/inventory/consumer", "/inventory/delivered"]) ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <CarIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Voorraad
              </Button>
            </Link>
            <Link to="/inventory/online">
              <Button
                variant={isActive("/inventory/online") ? "default" : "ghost"}
                className="w-full justify-start pl-3 text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <ShoppingBagIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Online
              </Button>
            </Link>
            <Link to="/inventory/b2b">
              <Button
                variant={isActive("/inventory/b2b") ? "default" : "ghost"}
                className="w-full justify-start pl-3 text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <BoxIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Verkocht B2B
              </Button>
            </Link>
            <Link to="/inventory/consumer">
              <Button
                variant={isActive("/inventory/consumer") ? "default" : "ghost"}
                className="w-full justify-start pl-3 text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <UsersIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Verkocht B2C
              </Button>
            </Link>
            <Link to="/inventory/delivered">
              <Button
                variant={isActive("/inventory/delivered") ? "default" : "ghost"}
                className="w-full justify-start pl-3 text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <Flag className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Afgeleverd
              </Button>
            </Link>
            <Link to="/transport">
              <Button
                variant={isActive("/transport") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <TruckIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Transport
              </Button>
            </Link>
            <Link to="/tasks">
              <Button
                variant={isActive("/tasks") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <ClipboardList className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Taken Schema
              </Button>
            </Link>
            <Link to="/warranty">
              <Button
                variant={isActive("/warranty") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <ShieldIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Garantie
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 px-3 text-sm font-semibold text-gray-400 lg:text-base xl:text-lg">
            KLANTEN
          </h2>
          <div className="space-y-2">
            <Link to="/customers">
              <Button
                variant={isActive("/customers") && !getSubActive(["/customers/b2b", "/customers/b2c", "/suppliers"]) ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <UsersIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Alle Klanten
              </Button>
            </Link>
            <Link to="/customers/b2b">
              <Button
                variant={isActive("/customers/b2b") ? "default" : "ghost"}
                className="w-full justify-start pl-3 text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <BoxIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Zakelijk
              </Button>
            </Link>
            <Link to="/customers/b2c">
              <Button
                variant={isActive("/customers/b2c") ? "default" : "ghost"}
                className="w-full justify-start pl-3 text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <UsersIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Particulier
              </Button>
            </Link>
            <Link to="/suppliers">
              <Button
                variant={isActive("/suppliers") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <TruckIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Leveranciers
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 px-3 text-sm font-semibold text-gray-400 lg:text-base xl:text-lg">
            ADMINISTRATIE
          </h2>
          <div className="space-y-2">
            <Link to="/reports">
              <Button
                variant={isActive("/reports") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <BarChart3 className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Rapportages
              </Button>
            </Link>
            <Link to="/ai-agents">
              <Button
                variant={isActive("/ai-agents") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <Bot className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                AI Agents
              </Button>
            </Link>
            <Link to="/loan-cars">
              <Button
                variant={isActive("/loan-cars") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <CarIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Leen auto beheer
              </Button>
            </Link>
            <Link to="/calendar">
              <Button
                variant={isActive("/calendar") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <CalendarIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Agenda
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 pb-4">
          <div className="space-y-2">
            <Link to="/settings">
              <Button
                variant={isActive("/settings") ? "default" : "ghost"}
                className="w-full justify-start text-white hover:text-white hover:bg-gray-800 text-base lg:text-lg xl:text-xl py-3 lg:py-4"
                size="default"
              >
                <SettingsIcon className="mr-3 h-5 w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7" />
                Instellingen
              </Button>
            </Link>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
