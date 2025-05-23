
import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { BarChart3, Settings, Download, RefreshCw } from "lucide-react";

interface ReportsLayoutProps {
  children: React.ReactNode;
}

const ReportsLayout: React.FC<ReportsLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="flex w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          {/* Unique Reports Header */}
          <header className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 text-white shadow-2xl">
            <div className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Analytics Center</h1>
                    <p className="text-indigo-200 mt-1">Advanced Sales Performance & Business Intelligence</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                  <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                    <Download className="w-4 h-4 mr-2" />
                    Export All
                  </Button>
                  <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-8 bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-slate-800 text-white p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
              <p>© 2024 AutoCity Analytics - Real-time Business Intelligence</p>
              <p>Last updated: {new Date().toLocaleString('nl-NL')}</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ReportsLayout;
