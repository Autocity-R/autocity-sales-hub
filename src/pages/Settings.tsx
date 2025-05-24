
import React from "react";
import { useLocation } from "react-router-dom";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { UserSettings } from "@/components/settings/UserSettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { NewUserForm } from "@/components/settings/NewUserForm";

const Settings = () => {
  const location = useLocation();

  const renderContent = () => {
    switch (location.pathname) {
      case "/settings/users":
        return <UserManagement />;
      case "/settings/users/new":
        return <NewUserForm />;
      case "/settings":
      case "/settings/personal":
      case "/settings/email":
      case "/settings/notifications":
      case "/settings/security":
      case "/settings/language":
      case "/settings/theme":
      case "/settings/api":
      case "/settings/privacy":
      default:
        return <UserSettings />;
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/settings/users":
        return "Gebruikersbeheer";
      case "/settings/users/new":
        return "Nieuwe Gebruiker";
      default:
        return "Instellingen";
    }
  };

  const getPageDescription = () => {
    switch (location.pathname) {
      case "/settings/users":
        return "Beheer alle gebruikers en hun toegangsrechten";
      case "/settings/users/new":
        return "Voeg een nieuwe gebruiker toe aan het systeem";
      default:
        return "Beheer je accountgegevens en voorkeuren";
    }
  };

  return (
    <SettingsLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {getPageTitle()}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {getPageDescription()}
          </p>
        </div>
        {renderContent()}
      </div>
    </SettingsLayout>
  );
};

export default Settings;
