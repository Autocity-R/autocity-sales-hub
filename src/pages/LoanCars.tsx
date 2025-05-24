
import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoanCarManagement } from "@/components/settings/LoanCarManagement";

const LoanCars = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Leen auto beheer
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Beheer alle leenauto's en hun beschikbaarheid
          </p>
        </div>
        <LoanCarManagement />
      </div>
    </DashboardLayout>
  );
};

export default LoanCars;
