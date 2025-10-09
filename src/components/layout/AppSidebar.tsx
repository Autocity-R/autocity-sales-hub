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
} from "@/components/ui/sidebar";

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

  const vehicleItems = [
    {
      title: "Voorraad",
      url: "/inventory",
      icon: CarIcon,
      isActive: isActive("/inventory") && !getSubActive(["/inventory/b2b", "/inventory/online", "/inventory/consumer", "/inventory/delivered"])
    },
    {
      title: "Online",
      url: "/inventory/online",
      icon: ShoppingBagIcon,
      isActive: isActive("/inventory/online"),
      isSubItem: true
    },
    {
      title: "Verkocht B2B",
      url: "/inventory/b2b",
      icon: BoxIcon,
      isActive: isActive("/inventory/b2b"),
      isSubItem: true
    },
    {
      title: "Verkocht B2C",
      url: "/inventory/consumer",
      icon: UsersIcon,
      isActive: isActive("/inventory/consumer"),
      isSubItem: true
    },
    {
      title: "Afgeleverd",
      url: "/inventory/delivered",
      icon: Flag,
      isActive: isActive("/inventory/delivered"),
      isSubItem: true
    },
    {
      title: "Transport",
      url: "/transport",
      icon: TruckIcon,
      isActive: isActive("/transport")
    },
    {
      title: "Taken Schema",
      url: "/tasks",
      icon: ClipboardList,
      isActive: isActive("/tasks")
    }
  ];

  const customerItems = [
    {
      title: "Alle Klanten",
      url: "/customers",
      icon: UsersIcon,
      isActive: isActive("/customers") && !getSubActive(["/customers/b2b", "/customers/b2c", "/suppliers"])
    },
    {
      title: "Zakelijk",
      url: "/customers/b2b",
      icon: BoxIcon,
      isActive: isActive("/customers/b2b"),
      isSubItem: true
    },
    {
      title: "Particulier",
      url: "/customers/b2c",
      icon: UsersIcon,
      isActive: isActive("/customers/b2c"),
      isSubItem: true
    },
    {
      title: "Leveranciers",
      url: "/suppliers",
      icon: TruckIcon,
      isActive: isActive("/suppliers")
    },
    {
      title: "Leads",
      url: "/leads",
      icon: BookIcon,
      isActive: isActive("/leads")
    }
  ];

  const adminItems = [
    {
      title: "Rapportages",
      url: "/reports",
      icon: BarChart3,
      isActive: isActive("/reports")
    },
    {
      title: "AI Agents",
      url: "/ai-agents",
      icon: Bot,
      isActive: isActive("/ai-agents")
    },
    {
      title: "Garantie",
      url: "/warranty",
      icon: ShieldIcon,
      isActive: isActive("/warranty")
    },
    {
      title: "Leen auto beheer",
      url: "/loan-cars",
      icon: CarIcon,
      isActive: isActive("/loan-cars")
    },
    {
      title: "Agenda",
      url: "/calendar",
      icon: CalendarIcon,
      isActive: isActive("/calendar")
    }
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/")}>
                <Link to="/">
                  <HomeIcon />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>VOERTUIGEN</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {vehicleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive} className={item.isSubItem ? "pl-8" : ""}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>KLANTEN</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {customerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive} className={item.isSubItem ? "pl-8" : ""}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>ADMINISTRATIE</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")}>
                  <Link to="/settings">
                    <SettingsIcon />
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
