
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "./Header";
import { SettingsSidebar } from "./SettingsSidebar";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const SettingsLayout = ({ children }: SettingsLayoutProps) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <SettingsSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <Link to="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Terug naar Dashboard
            </Button>
          </Link>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;
