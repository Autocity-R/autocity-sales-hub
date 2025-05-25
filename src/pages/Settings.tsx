
import React from "react";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { UserManagement } from "@/components/settings/UserManagement";
import { EmailTemplateManagement } from "@/components/settings/EmailTemplateManagement";
import { ContractManagement } from "@/components/contracts/ContractManagement";
import { UserSettings } from "@/components/settings/UserSettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { APISettings } from "@/components/settings/APISettings";
import { LoanCarManagement } from "@/components/settings/LoanCarManagement";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { AIAgentManagement } from "@/components/settings/AIAgentManagement";
import { useSearchParams } from "react-router-dom";

const Settings = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "general";

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return <UserSettings />;
      case "users":
        return <UserManagement />;
      case "ai-agents":
        return <AIAgentManagement />;
      case "email-templates":
        return <EmailTemplateManagement />;
      case "contracts":
        return <ContractManagement />;
      case "email":
        return <EmailSettings />;
      case "notifications":
        return <NotificationSettings />;
      case "api":
        return <APISettings />;
      case "loan-cars":
        return <LoanCarManagement />;
      case "security":
        return <SecuritySettings />;
      default:
        return <UserSettings />;
    }
  };

  return (
    <SettingsLayout>
      {renderContent()}
    </SettingsLayout>
  );
};

export default Settings;
