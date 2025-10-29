import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  name: string;
  path: string;
}

// Map paths to readable names
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
};

// Map parent paths
const pathParents: Record<string, string> = {
  "/masters/customers": "/masters",
  "/masters/items": "/masters",
  "/risk/client-thermometer": "/risk",
  "/risk/payment-forecaster": "/risk",
  "/risk/recovery-health": "/risk",
  "/credit-control/category-rules": "/credit-control",
  "/credit-control/category-calculation": "/credit-control",
  "/credit-control/urgent-actions": "/credit-control",
  "/credit-control/followup-automation": "/credit-control",
  "/action-center/dashboard": "/action-center",
  "/action-center/tasks": "/action-center",
  "/action-center/call-queue": "/action-center",
  "/action-center/activity-log": "/action-center",
  "/team/leaderboard": "/team",
  "/team/targets": "/team",
  "/settings/users": "/settings",
  "/settings/roles": "/settings",
};

const parentNames: Record<string, string> = {
  "/masters": "Masters",
  "/risk": "Risk Management",
  "/credit-control": "Credit Control",
  "/action-center": "Action Center",
  "/team": "Team Performance",
  "/settings": "Settings",
};

export function Breadcrumb() {
  const [location] = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
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

  const breadcrumbs: Array<{ name: string; path?: string; isCategory?: boolean }> = [];

  // Always add home
  if (location !== "/") {
    breadcrumbs.push({ name: "Home", path: "/" });

    // Check if current path has a parent
    const parent = pathParents[location];
    if (parent) {
      // Add parent as category (non-clickable)
      breadcrumbs.push({ name: parentNames[parent] || parent, isCategory: true });
    }

    // Add current page
    breadcrumbs.push({ 
      name: pathToName[location] || location.split("/").pop() || "Page", 
      path: location 
    });
  }

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex-1">
        <ol className="flex items-center gap-2 text-sm">
          {breadcrumbs.length > 0 ? (
            breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const isClickable = crumb.path && !isLast;
              
              return (
                <motion.li
                  key={`${crumb.name}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2"
                >
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                  )}
                  
                  {isLast ? (
                    <span className="font-medium text-gray-900 dark:text-white">
                      {crumb.name}
                    </span>
                  ) : crumb.isCategory ? (
                    <span className="text-gray-500 dark:text-gray-500">
                      {crumb.name}
                    </span>
                  ) : isClickable && crumb.path ? (
                    <Link href={crumb.path}>
                      <span className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                        {crumb.name}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">
                      {crumb.name}
                    </span>
                  )}
                </motion.li>
              );
            })
          ) : (
            <motion.li
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-medium text-gray-900 dark:text-white"
            >
              {pathToName[location] || "Dashboard"}
            </motion.li>
          )}
        </ol>
      </nav>

      {/* Theme Toggle Button - Top Right */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        className="ml-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        data-testid="button-theme-toggle"
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5 text-yellow-500" />
        ) : (
          <Moon className="h-5 w-5 text-gray-700" />
        )}
      </Button>
    </div>
  );
}
