import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  UserX,
  Settings,
  FolderOpen,
  ChevronDown,
  Package,
  Building2,
  UserCog,
  Shield,
  FileCheck,
  LogOut,
  User,
  Wallet,
  BookOpen,
  BarChart3,
  Activity,
  Gauge,
  TrendingDown,
  Heart,
  AlertTriangle,
  Calculator,
  CheckSquare,
  Phone,
  ClipboardList,
  Target,
  Trophy,
  Zap,
  Menu,
  X,
  Sparkles,
  Loader2,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { Tenant, SubscriptionPlan } from "@shared/schema";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  subItems?: NavItem[];
  badge?: number;
  module?: string;
}

type TenantWithPlan = Tenant & {
  subscriptionPlan: SubscriptionPlan | null;
};

// Module mapping configuration
const MODULE_MAPPING: Record<string, string> = {
  "Business Overview": "Business Overview",
  "Customer Analytics": "Customer Analytics",
  "Leads": "Leads",
  "Quotations": "Quotations",
  "Proforma Invoices": "Proforma Invoices",
  "Invoices": "Invoices",
  "Receipts": "Receipts",
  "Payment Tracking": "Payment Tracking",
  "Payment Analytics": "Payment Analytics",
  "Action Center": "Action Center",
  "Team Performance": "Team Performance",
  "Risk & Recovery": "Risk & Recovery",
  "Credit Control": "Credit Control",
  "Masters": "Masters",
  "Settings": "Settings",
  "Email/WhatsApp/Call Integrations": "Email/WhatsApp/Call Integrations",
  "Backup & Restore": "Backup & Restore",
  "Audit Trial Logs": "Settings",
};

// Platform Admin navigation items
const platformAdminNavItems: NavItem[] = [
  {
    name: "Tenant Registrations",
    path: "/tenant-registrations",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    name: "Subscription Plans",
    path: "/subscription-plans",
    icon: <Package className="h-5 w-5" />,
  },
];

// Tenant User navigation items
const navItems: NavItem[] = [
  {
    name: "Business Overview",
    path: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    module: "Business Overview",
  },
  {
    name: "Customer Analytics",
    path: "/customer-analytics",
    icon: <BarChart3 className="h-5 w-5" />,
    module: "Customer Analytics",
  },
  {
    name: "Leads",
    path: "/leads",
    icon: <Users className="h-5 w-5" />,
    module: "Leads",
  },
  {
    name: "Quotations",
    path: "/quotations",
    icon: <FileText className="h-5 w-5" />,
    module: "Quotations",
  },
  {
    name: "Proforma Invoices",
    path: "/proforma-invoices",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    module: "Proforma Invoices",
  },
  {
    name: "Invoices",
    path: "/invoices",
    icon: <Receipt className="h-5 w-5" />,
    module: "Invoices",
  },
  {
    name: "Receipts",
    path: "/receipts",
    icon: <CreditCard className="h-5 w-5" />,
    module: "Receipts",
  },
  {
    name: "Payment Tracking",
    path: "#",
    icon: <Wallet className="h-5 w-5" />,
    module: "Payment Tracking",
    subItems: [
      {
        name: "Debtors",
        path: "/debtors",
        icon: <UserX className="h-4 w-4" />,
        module: "Debtors",
      },
      {
        name: "Credit Management",
        path: "/credit-management",
        icon: <CreditCard className="h-4 w-4" />,
        module: "Credit Management",
      },
      {
        name: "Ledger",
        path: "/ledger",
        icon: <BookOpen className="h-4 w-4" />,
        module: "Ledger",
      },
      {
        name: "Payment Analytics",
        path: "/payment-analytics",
        icon: <Activity className="h-4 w-4" />,
        module: "Payment Analytics",
      },
    ],
  },
  {
    name: "Action Center",
    path: "#",
    icon: <Zap className="h-5 w-5" />,
    module: "Action Center",
    subItems: [
      {
        name: "Daily Dashboard",
        path: "/action-center/dashboard",
        icon: <Activity className="h-4 w-4" />,
        module: "Daily Dashboard",
      },
      {
        name: "Tasks",
        path: "/action-center/tasks",
        icon: <CheckSquare className="h-4 w-4" />,
        module: "Task Manager",
      },
      {
        name: "Call Queue",
        path: "/action-center/call-queue",
        icon: <Phone className="h-4 w-4" />,
        module: "Call Queue",
      },
      {
        name: "Activity Log",
        path: "/action-center/activity-log",
        icon: <ClipboardList className="h-4 w-4" />,
        module: "Activity Logs",
      },
    ],
  },
  {
    name: "Team Performance",
    path: "#",
    icon: <Trophy className="h-5 w-5" />,
    module: "Team Performance",
    subItems: [
      {
        name: "Leaderboard",
        path: "/team/leaderboard",
        icon: <Trophy className="h-4 w-4" />,
        module: "Leaderboard",
      },
      {
        name: "Daily Targets",
        path: "/team/targets",
        icon: <Target className="h-4 w-4" />,
        module: "Daily Targets",
      },
    ],
  },
  {
    name: "Risk & Recovery",
    path: "#",
    icon: <AlertTriangle className="h-5 w-5" />,
    module: "Risk & Recovery",
    subItems: [
      {
        name: "Client Risk Thermometer",
        path: "/risk/client-thermometer",
        icon: <Gauge className="h-4 w-4" />,
        module: "Client Risk Thermometer",
      },
      {
        name: "Payment Risk Forecaster",
        path: "/risk/payment-forecaster",
        icon: <TrendingDown className="h-4 w-4" />,
        module: "Payment Risk Forecaster",
      },
      {
        name: "Recovery Health Test",
        path: "/risk/recovery-health",
        icon: <Heart className="h-4 w-4" />,
        module: "Recovery Health Test",
      },
    ],
  },
  {
    name: "Credit Control",
    path: "#",
    icon: <Calculator className="h-5 w-5" />,
    module: "Credit Control",
    subItems: [
      {
        name: "Category Rules",
        path: "/credit-control/category-rules",
        icon: <Settings className="h-4 w-4" />,
        module: "Category Management",
      },
      {
        name: "Category Calculation",
        path: "/credit-control/category-calculation",
        icon: <Calculator className="h-4 w-4" />,
        module: "Category Calculation",
      },
      {
        name: "Urgent Actions",
        path: "/credit-control/urgent-actions",
        icon: <AlertTriangle className="h-4 w-4" />,
        module: "Urgent Actions",
      },
      {
        name: "Follow-up Automation",
        path: "/credit-control/followup-automation",
        icon: <Settings className="h-4 w-4" />,
        module: "Follow-up Automation",
      },
    ],
  },
  {
    name: "Masters",
    path: "#",
    icon: <FolderOpen className="h-5 w-5" />,
    module: "Masters",
    subItems: [
      {
        name: "Customers",
        path: "/masters/customers",
        icon: <Building2 className="h-4 w-4" />,
        module: "Customers",
      },
      {
        name: "Items",
        path: "/masters/items",
        icon: <Package className="h-4 w-4" />,
        module: "Items",
      },
      {
        name: "Company Settings",
        path: "/company-settings",
        icon: <Settings className="h-4 w-4" />,
        module: "Company Profile",
      },
    ],
  },
  {
    name: "Settings",
    path: "#",
    icon: <Settings className="h-5 w-5" />,
    module: "Settings",
    subItems: [
      {
        name: "User Management",
        path: "/settings/users",
        icon: <UserCog className="h-4 w-4" />,
        module: "User Management",
      },
      {
        name: "Roles Management",
        path: "/settings/roles",
        icon: <Shield className="h-4 w-4" />,
        module: "Roles Management",
      },
      {
        name: "Backup & Restore",
        path: "/settings/backup-restore",
        icon: <Database className="h-4 w-4" />,
        module: "Backup & Restore",
      },
      {
        name: "Communication Schedules",
        path: "/communication-schedules",
        icon: <Settings className="h-4 w-4" />,
        module: "Communication Schedules",
      },
    ],
  },
  {
    name: "Audit Logs",
    path: "/audit-logs",
    icon: <FileCheck className="h-5 w-5" />,
    module: "Audit Logs",
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  
  // Determine which navigation to show based on user type
  const isPlatformAdmin = user && !user.tenantId;

  // Fetch current tenant with subscription plan for tenant users
  const { data: tenant, isLoading: isLoadingTenant } = useQuery<TenantWithPlan | null>({
    queryKey: ["/api/tenants/current"],
    enabled: !isPlatformAdmin && !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Helper function to check if a module is accessible
  const isModuleAccessible = (moduleName: string): boolean => {
    if (isPlatformAdmin) {
      return true;
    }

    if (!tenant) {
      return false;
    }

    const allowedModules = tenant.customModules || tenant.subscriptionPlan?.allowedModules || [];
    
    return allowedModules.includes(moduleName);
  };

  // Filter navigation items based on allowed modules
  const filteredNavItems = useMemo(() => {
    if (isPlatformAdmin) {
      return platformAdminNavItems;
    }

    if (!tenant) {
      return [];
    }

    return navItems.filter((item) => {
      if (!item.module) {
        return true;
      }
      return isModuleAccessible(item.module);
    }).map((item) => {
      // Also filter sub-items based on module access
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter((subItem) =>
            !subItem.module || isModuleAccessible(subItem.module)
          )
        };
      }
      return item;
    });
  }, [isPlatformAdmin, tenant]);

  const currentNavItems = filteredNavItems;

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set<string>();
      // If the clicked item was already expanded, collapse it (empty set)
      // Otherwise, expand only this item (accordion behavior)
      if (!prev.has(name)) {
        newSet.add(name);
      }
      return newSet;
    });
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  // Animation variants
  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: -320 },
  };

  const subItemVariants = {
    closed: { height: 0, opacity: 0 },
    open: { 
      height: "auto", 
      opacity: 1,
      transition: {
        height: {
          duration: 0.3,
        },
        opacity: {
          duration: 0.2,
          delay: 0.1,
        },
      },
    },
  };

  const subItemChildVariants = {
    closed: { x: -10, opacity: 0 },
    open: (i: number) => ({
      x: 0,
      opacity: 1,
      transition: {
        delay: i * 0.05,
        duration: 0.2,
      },
    }),
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Header */}
      <div className="relative overflow-hidden border-b border-gray-200 dark:border-gray-800 p-6">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-10" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur opacity-50" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                RECOV.
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                GET PAYMENTS FASTER
              </p>
            </div>
          </div>

          {/* Close button for mobile */}
          {isMobile && (
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 overflow-y-auto p-3 space-y-1",
        "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
      )}>
        {isLoadingTenant && !isPlatformAdmin ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading navigation...
              </p>
            </div>
          </div>
        ) : currentNavItems.length === 0 && !isPlatformAdmin ? (
          <div className="flex items-center justify-center py-8 px-4">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No modules available. Please contact your administrator.
              </p>
            </div>
          </div>
        ) : (
          <>
            {currentNavItems.map((item) => (
          <div key={item.name}>
            {item.subItems ? (
              <div>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
                    "text-sm font-medium transition-all duration-200",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    "group relative overflow-hidden",
                    expandedItems.has(item.name) && "bg-gray-100 dark:bg-gray-800"
                  )}
                  data-testid={`button-toggle-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative flex items-center gap-3 flex-1">
                    <div className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.icon}
                    </div>
                    <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                      {item.name}
                    </span>
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 text-gray-400 transition-transform duration-200",
                        expandedItems.has(item.name) && "rotate-180"
                      )}
                    />
                  </div>
                </button>

                {/* Sub Items with Animation */}
                <motion.div
                  initial="closed"
                  animate={expandedItems.has(item.name) ? "open" : "closed"}
                  variants={subItemVariants}
                  className="overflow-hidden"
                >
                  <div className="ml-8 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                    {item.subItems.filter((subItem) => !subItem.module || isModuleAccessible(subItem.module)).map((subItem, index) => (
                      <motion.div
                        key={subItem.name}
                        custom={index}
                        variants={subItemChildVariants}
                      >
                        <Link
                          href={subItem.path}
                          onClick={isMobile ? closeMobileMenu : undefined}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg",
                            "text-sm font-medium transition-all duration-200",
                            "group relative overflow-hidden",
                            isActive(subItem.path)
                              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          )}
                          data-testid={`link-${subItem.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {isActive(subItem.path) && (
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-20" />
                          )}
                          <div className="relative z-10 flex items-center gap-3">
                            {subItem.icon}
                            <span>{subItem.name}</span>
                          </div>
                          {subItem.badge !== undefined && subItem.badge > 0 && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                              {subItem.badge}
                            </span>
                          )}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <Link
                href={item.path}
                onClick={isMobile ? closeMobileMenu : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                  "text-sm font-medium transition-all duration-200",
                  "group relative overflow-hidden",
                  isActive(item.path)
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {isActive(item.path) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex items-center gap-3 flex-1">
                  <div className={cn(
                    "transition-colors",
                    isActive(item.path)
                      ? "text-white"
                      : "text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  )}>
                    {item.icon}
                  </div>
                  <span className="flex-1">{item.name}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            )}
          </div>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
        data-testid="button-mobile-menu"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6 text-gray-700 dark:text-gray-200" />
      </button>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileMenu}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Always visible */}
      <div
        className={cn(
          "hidden lg:flex h-screen flex-col",
          "bg-white dark:bg-gray-900",
          "border-r border-gray-200 dark:border-gray-800",
          "w-80"
        )}
        data-testid="sidebar-desktop"
      >
        <SidebarContent isMobile={false} />
      </div>

      {/* Mobile Sidebar - Slide-in drawer */}
      <motion.div
        initial={false}
        animate={isMobileOpen ? "open" : "closed"}
        variants={sidebarVariants}
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 h-screen flex flex-col",
          "bg-white dark:bg-gray-900",
          "border-r border-gray-200 dark:border-gray-800",
          "shadow-xl",
          "w-80"
        )}
        data-testid="sidebar-mobile"
      >
        <SidebarContent isMobile={true} />
      </motion.div>
    </>
  );
}
