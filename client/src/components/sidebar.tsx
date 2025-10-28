import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
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
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  subItems?: NavItem[];
  badge?: number;
}

// Platform Admin navigation items
const platformAdminNavItems: NavItem[] = [
  {
    name: "Tenant Registrations",
    path: "/tenant-registrations",
    icon: <Building2 className="h-5 w-5" />,
  },
];

// Tenant User navigation items
const navItems: NavItem[] = [
  {
    name: "Business Overview",
    path: "/",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    name: "Customer Analytics",
    path: "/customer-analytics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    name: "Leads",
    path: "/leads",
    icon: <Users className="h-5 w-5" />,
  },
  {
    name: "Quotations",
    path: "/quotations",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    name: "Proforma Invoices",
    path: "/proforma-invoices",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    name: "Invoices",
    path: "/invoices",
    icon: <Receipt className="h-5 w-5" />,
  },
  {
    name: "Receipts",
    path: "/receipts",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    name: "Payment Tracking",
    path: "#",
    icon: <Wallet className="h-5 w-5" />,
    subItems: [
      {
        name: "Debtors",
        path: "/debtors",
        icon: <UserX className="h-4 w-4" />,
      },
      {
        name: "Credit Management",
        path: "/credit-management",
        icon: <CreditCard className="h-4 w-4" />,
      },
      {
        name: "Ledger",
        path: "/ledger",
        icon: <BookOpen className="h-4 w-4" />,
      },
    ],
  },
  {
    name: "Action Center",
    path: "#",
    icon: <Zap className="h-5 w-5" />,
    subItems: [
      {
        name: "Daily Dashboard",
        path: "/action-center/dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        name: "Tasks",
        path: "/action-center/tasks",
        icon: <CheckSquare className="h-4 w-4" />,
      },
      {
        name: "Call Queue",
        path: "/action-center/call-queue",
        icon: <Phone className="h-4 w-4" />,
      },
      {
        name: "Activity Log",
        path: "/action-center/activity-log",
        icon: <ClipboardList className="h-4 w-4" />,
      },
    ],
  },
  {
    name: "Team Performance",
    path: "#",
    icon: <Trophy className="h-5 w-5" />,
    subItems: [
      {
        name: "Leaderboard",
        path: "/team/leaderboard",
        icon: <Trophy className="h-4 w-4" />,
      },
      {
        name: "Daily Targets",
        path: "/team/targets",
        icon: <Target className="h-4 w-4" />,
      },
    ],
  },
  {
    name: "Masters",
    path: "#",
    icon: <FolderOpen className="h-5 w-5" />,
    subItems: [
      {
        name: "Customers",
        path: "/masters/customers",
        icon: <Users className="h-4 w-4" />,
      },
      {
        name: "Items",
        path: "/masters/items",
        icon: <Package className="h-4 w-4" />,
      },
    ],
  },
  {
    name: "Risk Management",
    path: "#",
    icon: <Activity className="h-5 w-5" />,
    subItems: [
      {
        name: "Client Risk Thermometer",
        path: "/risk/client-thermometer",
        icon: <Gauge className="h-4 w-4" />,
      },
      {
        name: "Payment Risk Forecaster",
        path: "/risk/payment-forecaster",
        icon: <TrendingDown className="h-4 w-4" />,
      },
      {
        name: "Recovery Health Test",
        path: "/risk/recovery-health",
        icon: <Heart className="h-4 w-4" />,
      },
    ],
  },
  {
    name: "Credit Control",
    path: "#",
    icon: <AlertTriangle className="h-5 w-5" />,
    subItems: [
      {
        name: "Category Rules",
        path: "/credit-control/category-rules",
        icon: <Settings className="h-4 w-4" />,
      },
      {
        name: "Category Calculation",
        path: "/credit-control/category-calculation",
        icon: <Calculator className="h-4 w-4" />,
      },
      {
        name: "Urgent Actions",
        path: "/credit-control/urgent-actions",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        name: "Follow-up Automation",
        path: "/credit-control/followup-automation",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
  {
    name: "Company Settings",
    path: "#",
    icon: <Settings className="h-5 w-5" />,
    subItems: [
      {
        name: "Profile",
        path: "/company-settings",
        icon: <Building2 className="h-4 w-4" />,
      },
      {
        name: "User Management",
        path: "/settings/users",
        icon: <UserCog className="h-4 w-4" />,
      },
      {
        name: "Roles Management",
        path: "/settings/roles",
        icon: <Shield className="h-4 w-4" />,
      },
      {
        name: "Communication Schedules",
        path: "/communication-schedules",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
  {
    name: "Audit Trial Logs",
    path: "/audit-logs",
    icon: <FileCheck className="h-5 w-5" />,
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { user, logout } = useAuth();
  
  // Determine which navigation to show based on user type
  const isPlatformAdmin = user && !user.tenantId;
  const currentNavItems = isPlatformAdmin ? platformAdminNavItems : navItems;

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

  // Initialize collapsed state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed === 'true') {
      setIsCollapsed(true);
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

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
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

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={isMobileOpen ? "open" : "closed"}
        variants={sidebarVariants}
        className={cn(
          "fixed lg:static top-0 left-0 z-50 h-screen flex flex-col",
          "bg-white dark:bg-gray-900",
          "border-r border-gray-200 dark:border-gray-800",
          "shadow-xl lg:shadow-none",
          "transition-all duration-300",
          isCollapsed ? "w-20" : "w-80",
          "lg:translate-x-0"
        )}
        data-testid="sidebar"
      >
        {/* Header */}
        <div className={cn(
          "relative overflow-hidden",
          "border-b border-gray-200 dark:border-gray-800",
          isCollapsed ? "p-4" : "p-6"
        )}>
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-10" />
          
          <div className="relative flex items-center justify-between">
            <div className={cn("flex items-center gap-3", isCollapsed && "justify-center w-full")}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur opacity-50" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              
              {!isCollapsed && (
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    RECOV.
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    GET PAYMENTS FASTER
                  </p>
                </div>
              )}
            </div>

            {/* Close button for mobile */}
            <button
              onClick={closeMobileMenu}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 overflow-y-auto p-3 space-y-1",
          "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
        )}>
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
                    title={isCollapsed ? item.name : undefined}
                  >
                    {/* Hover gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className={cn(
                      "relative flex items-center gap-3 flex-1",
                      isCollapsed && "justify-center"
                    )}>
                      <div className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.icon}
                      </div>
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                            {item.name}
                          </span>
                          <ChevronDown 
                            className={cn(
                              "h-4 w-4 text-gray-400 transition-transform duration-200",
                              expandedItems.has(item.name) && "rotate-180"
                            )}
                          />
                        </>
                      )}
                    </div>
                  </button>

                  {/* Sub Items with Animation */}
                  {!isCollapsed && (
                    <motion.div
                      initial="closed"
                      animate={expandedItems.has(item.name) ? "open" : "closed"}
                      variants={subItemVariants}
                      className="overflow-hidden"
                    >
                      <div className="ml-8 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                        {item.subItems.map((subItem, index) => (
                          <motion.div
                            key={subItem.name}
                            custom={index}
                            variants={subItemChildVariants}
                          >
                            <Link
                              href={subItem.path}
                              onClick={closeMobileMenu}
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
                              {!isActive(subItem.path) && (
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                              
                              <div className="relative flex items-center gap-3">
                                {subItem.icon}
                                <span>{subItem.name}</span>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.path}
                  onClick={closeMobileMenu}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                    "text-sm font-medium transition-all duration-200",
                    "group relative overflow-hidden",
                    isActive(item.path)
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  {!isActive(item.path) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  
                  <div className={cn(
                    "relative flex items-center gap-3",
                    isCollapsed && "justify-center w-full"
                  )}>
                    {item.icon}
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn(
          "border-t border-gray-200 dark:border-gray-800 p-3 space-y-2",
          isCollapsed && "flex flex-col items-center"
        )}>
          {/* Theme Toggle & Collapse Button */}
          <div className={cn(
            "flex gap-2",
            isCollapsed && "flex-col"
          )}>
            <button
              onClick={toggleDarkMode}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              data-testid="button-theme-toggle"
              title="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4 text-yellow-500" />
              ) : (
                <Moon className="h-4 w-4 text-gray-600" />
              )}
              {!isCollapsed && (
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {isDarkMode ? 'Light' : 'Dark'}
                </span>
              )}
            </button>

            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              data-testid="button-collapse-toggle"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              {!isCollapsed && (
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Collapse
                </span>
              )}
            </button>
          </div>

          {/* User Profile */}
          {!isCollapsed && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur opacity-50" />
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" data-testid="text-user-name">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate" data-testid="text-user-role">
                    {isPlatformAdmin ? "Platform Admin" : (user?.roleName || "No Role")}
                  </p>
                </div>
              </div>
              
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}

          {isCollapsed && (
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              data-testid="button-logout"
              title="Logout"
            >
              <LogOut className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
