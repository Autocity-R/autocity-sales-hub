
import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { UserSettings } from "@/components/settings/UserSettings";

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Instellingen</h1>
          <p className="text-gray-600 mt-2">
            Beheer je accountgegevens en voorkeuren
          </p>
        </div>
        <UserSettings />
      </div>
    </DashboardLayout>
  );
};

export default Settings;
