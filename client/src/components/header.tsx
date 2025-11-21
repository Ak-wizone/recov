import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Target, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "./notification-center";
import { formatCurrency } from "@/lib/utils";

// Map paths to readable page names
const pathToName: Record<string, string> = {
  "/": "Dashboard",
  "/customer-analytics": "Customer Analytics",
  "/leads": "Leads",
  "/quotations": "Quotations",
  "/proforma-invoices": "Proforma Invoices",
  "/invoices": "Invoices",
  "/receipts": "Receipts",
  "/debtors": "Debtors",
  "/credit-management": "Credit Management",
  "/ledger": "Ledger",
  "/masters/customers": "Customers",
  "/masters/items": "Items",
  "/risk/client-thermometer": "Client Risk Thermometer",
  "/risk/payment-forecaster": "Payment Risk Forecaster",
  "/risk/recovery-health": "Recovery Health Test",
  "/credit-control/category-rules": "Category Rules",
  "/credit-control/category-calculation": "Category Calculation",
  "/credit-control/urgent-actions": "Urgent Actions",
  "/credit-control/followup-automation": "Follow-up Automation",
  "/action-center/dashboard": "Daily Dashboard",
  "/action-center/tasks": "Tasks",
  "/action-center/call-queue": "Call Queue",
  "/action-center/activity-log": "Activity Log",
  "/team/leaderboard": "Leaderboard",
  "/team/targets": "Daily Targets",
  "/company-settings": "Company Settings",
  "/settings/users": "User Management",
  "/settings/roles": "Roles Management",
  "/communication-schedules": "Communication Schedules",
  "/audit-logs": "Audit Logs",
  "/tenant-registrations": "Tenant Registrations",
  "/call-templates": "Call Templates",
  "/telecmi-config": "Telecmi Configuration",
  "/email-config": "Email Configuration",
  "/email-templates": "Email Templates",
  "/whatsapp-config": "WhatsApp Configuration",
  "/whatsapp-templates": "WhatsApp Templates",
  "/ringg-config": "Ringg.ai Configuration",
  "/ringg-script-mappings": "Ringg.ai Script Mappings",
  "/ringg-call-history": "Call History",
  "/whisper-settings": "Whisper Settings",
  "/whisper-credits": "Whisper Credits",
  "/whisper-voice": "Voice Assistant",
  "/backup-restore": "Backup & Restore",
  "/tenant-profile": "Tenant Profile",
};

export default function Header() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { data: todaysTargets = [] } = useQuery({
    queryKey: ["/api/daily-targets/today"],
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["/api/dashboard/daily-actions", user?.id],
    enabled: !!user
  });

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const collectionTarget = todaysTargets.find((t: any) => t.targetType === 'collection');
  const collectionProgress = dashboardData?.summary?.collectionProgress || 0;
  const todaysCollection = dashboardData?.todaysCollection || 0;

  // Get current page name
  const pageName = pathToName[location] || "Dashboard";

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-3 sticky top-0 z-10 pointer-events-none" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white" data-testid="text-header-greeting">
              {pageName}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          {collectionTarget && (
            <div className="hidden lg:flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-700" data-testid="mini-target-bar">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Today's Target</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(todaysCollection)} / {formatCurrency(parseFloat(collectionTarget.targetAmount))}
                  </p>
                </div>
              </div>
              <div className="w-32">
                <Progress value={collectionProgress} className="h-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{Math.round(collectionProgress)}%</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            data-testid="button-theme-toggle"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-gray-700" />
            )}
          </Button>
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
}
