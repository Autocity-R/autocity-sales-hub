
import React from "react";
import { useLocation } from "react-router-dom";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { UserSettings } from "@/components/settings/UserSettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { NewUserForm } from "@/components/settings/NewUserForm";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { EmailTemplateManagement } from "@/components/settings/EmailTemplateManagement";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { APISettings } from "@/components/settings/APISettings";
import { AccountPreferences } from "@/components/settings/AccountPreferences";
import { LoanCarManagement } from "@/components/settings/LoanCarManagement";

const Settings = () => {
  const location = useLocation();

  const renderContent = () => {
    switch (location.pathname) {
      case "/settings/users":
        return <UserManagement />;
      case "/settings/users/new":
        return <NewUserForm />;
      case "/settings/email":
        return <EmailSettings />;
      case "/settings/email-templates":
        return <EmailTemplateManagement />;
      case "/settings/notifications":
        return <NotificationSettings />;
      case "/settings/security":
        return <SecuritySettings />;
      case "/settings/api":
        return <APISettings />;
      case "/settings/privacy":
        return <AccountPreferences />;
      case "/settings/loan-cars":
        return <LoanCarManagement />;
      case "/settings":
      case "/settings/personal":
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
      case "/settings/email":
        return "Email Instellingen";
      case "/settings/email-templates":
        return "Email Templates";
      case "/settings/notifications":
        return "Notificatie Instellingen";
      case "/settings/security":
        return "Beveiliging";
      case "/settings/api":
        return "API Sleutels";
      case "/settings/privacy":
        return "Data & Privacy";
      case "/settings/loan-cars":
        return "Leenauto Beheer";
      default:
        return "Persoonlijke Instellingen";
    }
  };

  const getPageDescription = () => {
    switch (location.pathname) {
      case "/settings/users":
        return "Beheer alle gebruikers en hun toegangsrechten";
      case "/settings/users/new":
        return "Voeg een nieuwe gebruiker toe aan het systeem";
      case "/settings/email":
        return "Koppel Gmail accounts voor CRM communicatie";
      case "/settings/email-templates":
        return "Beheer email templates voor transport, klanten en leveranciers";
      case "/settings/notifications":
        return "Beheer herinneringen voor leads en email vermeldingen";
      case "/settings/security":
        return "Wijzig je wachtwoord en beveiligingsinstellingen";
      case "/settings/api":
        return "Beheer API sleutels voor externe systeemkoppelingen";
      case "/settings/privacy":
        return "Data export en privacy instellingen";
      case "/settings/loan-cars":
        return "Beheer leenauto's en hun beschikbaarheid";
      default:
        return "Beheer je persoonlijke accountgegevens";
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
