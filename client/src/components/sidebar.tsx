import { useState } from "react";
import { Link, useLocation } from "wouter";
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
  ChevronRight,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  subItems?: NavItem[];
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
  const { user, logout } = useAuth();
  
  // Determine which navigation to show based on user type
  const isPlatformAdmin = user && !user.tenantId;
  const currentNavItems = isPlatformAdmin ? platformAdminNavItems : navItems;

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

  return (
    <div className="w-72 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 h-screen flex flex-col shadow-xl" data-testid="sidebar">
      <div className="p-8 border-b border-slate-500/30">
        <h1 className="text-2xl font-bold text-white" data-testid="text-app-title">
          RECOV.
        </h1>
        <p className="text-slate-300 text-sm mt-1.5">GET PAYMENTS FASTER</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {currentNavItems.map((item) => (
          <div key={item.name} className="group">
            {item.subItems ? (
              <div>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium",
                    "transition-all duration-200",
                    "text-slate-200 hover:text-white hover:bg-slate-500/40",
                    expandedItems.has(item.name) && "bg-slate-500/50 text-white"
                  )}
                  data-testid={`button-toggle-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.name}</span>
                  </div>
                  <div className={cn(
                    "transition-transform duration-200",
                    expandedItems.has(item.name) && "rotate-180"
                  )}>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>
                <div className={cn(
                  "overflow-hidden transition-all duration-500 ease-in-out",
                  expandedItems.has(item.name) ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"
                )}>
                  <div className="ml-6 space-y-1 border-l-2 border-slate-500/30 pl-4">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.path}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium",
                          "transition-all duration-200",
                          isActive(subItem.path)
                            ? "bg-blue-600 text-white"
                            : "text-slate-300 hover:text-white hover:bg-slate-500/40"
                        )}
                        data-testid={`link-${subItem.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {subItem.icon}
                        <span>{subItem.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium",
                  "transition-all duration-200",
                  isActive(item.path)
                    ? "bg-blue-600 text-white"
                    : "text-slate-200 hover:text-white hover:bg-slate-500/40"
                )}
                data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-500/30 space-y-3">
        <div className="bg-slate-500/30 rounded-lg p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate" data-testid="text-user-name">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-slate-400 truncate" data-testid="text-user-role">
                {isPlatformAdmin ? "Platform Admin" : (user?.roleName || "No Role")}
              </p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-600/50"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
        <div className="bg-slate-500/20 rounded-lg p-2.5">
          <p className="text-xs text-slate-300 font-medium">Version 2.0</p>
          <p className="text-xs text-slate-400 mt-0.5">All systems operational</p>
        </div>
      </div>
    </div>
  );
}
