
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookIcon,
  BoxIcon,
  CalendarIcon,
  CarIcon,
  HomeIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TruckIcon,
  UsersIcon,
  BarChart3,
  ShieldIcon,
  Flag,
  Bot,
  ClipboardList
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function AppSidebar() {
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

  const vehicleMenuItems = [
    { title: "Online", url: "/inventory/online", icon: ShoppingBagIcon },
    { title: "Verkocht B2B", url: "/inventory/b2b", icon: BoxIcon },
    { title: "Verkocht B2C", url: "/inventory/consumer", icon: UsersIcon },
    { title: "Afgeleverd", url: "/inventory/delivered", icon: Flag },
  ];

  const customerMenuItems = [
    { title: "Zakelijk", url: "/customers/b2b", icon: BoxIcon },
    { title: "Particulier", url: "/customers/b2c", icon: UsersIcon },
  ];

  return (
    <Sidebar className="border-r border-gray-800">
      <SidebarContent className="bg-black text-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")}>
                  <Link to="/" className="text-white hover:text-white hover:bg-gray-800">
                    <HomeIcon className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-xs font-semibold">
            VOERTUIGEN
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/inventory") && !getSubActive(["/inventory/b2b", "/inventory/online", "/inventory/consumer", "/inventory/delivered"])}>
                  <Link to="/inventory" className="text-white hover:text-white hover:bg-gray-800">
                    <CarIcon className="mr-2 h-4 w-4" />
                    <span>Voorraad</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {vehicleMenuItems.map((item) => (
                    <SidebarMenuSubItem key={item.title}>
                      <SidebarMenuSubButton asChild isActive={isActive(item.url)}>
                        <Link to={item.url} className="text-white hover:text-white hover:bg-gray-800">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/transport")}>
                  <Link to="/transport" className="text-white hover:text-white hover:bg-gray-800">
                    <TruckIcon className="mr-2 h-4 w-4" />
                    <span>Transport</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/tasks")}>
                  <Link to="/tasks" className="text-white hover:text-white hover:bg-gray-800">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    <span>Taken Schema</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-xs font-semibold">
            KLANTEN
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/customers") && !getSubActive(["/customers/b2b", "/customers/b2c", "/suppliers"])}>
                  <Link to="/customers" className="text-white hover:text-white hover:bg-gray-800">
                    <UsersIcon className="mr-2 h-4 w-4" />
                    <span>Alle Klanten</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {customerMenuItems.map((item) => (
                    <SidebarMenuSubItem key={item.title}>
                      <SidebarMenuSubButton asChild isActive={isActive(item.url)}>
                        <Link to={item.url} className="text-white hover:text-white hover:bg-gray-800">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/suppliers")}>
                  <Link to="/suppliers" className="text-white hover:text-white hover:bg-gray-800">
                    <TruckIcon className="mr-2 h-4 w-4" />
                    <span>Leveranciers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/leads")}>
                  <Link to="/leads" className="text-white hover:text-white hover:bg-gray-800">
                    <BookIcon className="mr-2 h-4 w-4" />
                    <span>Leads</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400 text-xs font-semibold">
            ADMINISTRATIE
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/reports")}>
                  <Link to="/reports" className="text-white hover:text-white hover:bg-gray-800">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Rapportages</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/ai-agents")}>
                  <Link to="/ai-agents" className="text-white hover:text-white hover:bg-gray-800">
                    <Bot className="mr-2 h-4 w-4" />
                    <span>AI Agents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/warranty")}>
                  <Link to="/warranty" className="text-white hover:text-white hover:bg-gray-800">
                    <ShieldIcon className="mr-2 h-4 w-4" />
                    <span>Garantie</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/loan-cars")}>
                  <Link to="/loan-cars" className="text-white hover:text-white hover:bg-gray-800">
                    <CarIcon className="mr-2 h-4 w-4" />
                    <span>Leen auto beheer</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/calendar")}>
                  <Link to="/calendar" className="text-white hover:text-white hover:bg-gray-800">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>Agenda</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")}>
                  <Link to="/settings" className="text-white hover:text-white hover:bg-gray-800">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Instellingen</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
