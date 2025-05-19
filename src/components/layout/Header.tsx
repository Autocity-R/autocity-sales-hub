
import React from "react";
import { Bell, Search, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="border-b bg-white dark:bg-gray-950 sticky top-0 z-30">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="hidden md:flex md:flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Zoeken..."
              className="w-full md:w-[300px] pl-8 bg-background"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-4 md:ml-auto md:gap-6">
          <Button variant="outline" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notificaties</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-0"
              >
                <User className="h-5 w-5" />
                <span className="sr-only">Gebruikersmenu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mijn Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profiel</DropdownMenuItem>
              <DropdownMenuItem>Instellingen</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Uitloggen</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
