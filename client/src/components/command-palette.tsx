import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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
  Package,
  Building2,
  UserCog,
  Shield,
  FileCheck,
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
  Search,
  Clock,
  TrendingUp,
} from "lucide-react";

interface NavigationItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  keywords?: string[];
  category: string;
}

const navigationItems: NavigationItem[] = [
  // Core
  {
    name: "Business Overview",
    path: "/",
    icon: <LayoutDashboard className="h-4 w-4" />,
    keywords: ["dashboard", "home", "overview", "main"],
    category: "Core",
  },
  {
    name: "Customer Analytics",
    path: "/customer-analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    keywords: ["analytics", "stats", "metrics", "customer"],
    category: "Core",
  },
  
  // Sales
  {
    name: "Leads",
    path: "/leads",
    icon: <Users className="h-4 w-4" />,
    keywords: ["leads", "prospects", "contacts"],
    category: "Sales",
  },
  {
    name: "Quotations",
    path: "/quotations",
    icon: <FileText className="h-4 w-4" />,
    keywords: ["quotes", "quotations", "proposals"],
    category: "Sales",
  },
  {
    name: "Proforma Invoices",
    path: "/proforma-invoices",
    icon: <FileSpreadsheet className="h-4 w-4" />,
    keywords: ["proforma", "pi", "invoice"],
    category: "Sales",
  },
  {
    name: "Invoices",
    path: "/invoices",
    icon: <Receipt className="h-4 w-4" />,
    keywords: ["invoice", "billing", "sales"],
    category: "Sales",
  },
  {
    name: "Receipts",
    path: "/receipts",
    icon: <CreditCard className="h-4 w-4" />,
    keywords: ["receipt", "payment", "collection"],
    category: "Sales",
  },
  
  // Payment Tracking
  {
    name: "Debtors",
    path: "/debtors",
    icon: <UserX className="h-4 w-4" />,
    keywords: ["debtors", "outstanding", "due", "receivables"],
    category: "Payment Tracking",
  },
  {
    name: "Credit Management",
    path: "/credit-management",
    icon: <CreditCard className="h-4 w-4" />,
    keywords: ["credit", "management", "control"],
    category: "Payment Tracking",
  },
  {
    name: "Ledger",
    path: "/ledger",
    icon: <BookOpen className="h-4 w-4" />,
    keywords: ["ledger", "account", "statement"],
    category: "Payment Tracking",
  },
  
  // Action Center
  {
    name: "Daily Dashboard",
    path: "/action-center/dashboard",
    icon: <Zap className="h-4 w-4" />,
    keywords: ["daily", "action", "center", "dashboard"],
    category: "Action Center",
  },
  {
    name: "Tasks",
    path: "/action-center/tasks",
    icon: <CheckSquare className="h-4 w-4" />,
    keywords: ["tasks", "todo", "assignments"],
    category: "Action Center",
  },
  {
    name: "Call Queue",
    path: "/action-center/call-queue",
    icon: <Phone className="h-4 w-4" />,
    keywords: ["calls", "queue", "phone", "contact"],
    category: "Action Center",
  },
  {
    name: "Activity Log",
    path: "/action-center/activity-log",
    icon: <ClipboardList className="h-4 w-4" />,
    keywords: ["activity", "log", "history"],
    category: "Action Center",
  },
  
  // Team Performance
  {
    name: "Leaderboard",
    path: "/team/leaderboard",
    icon: <Trophy className="h-4 w-4" />,
    keywords: ["leaderboard", "rankings", "performance"],
    category: "Team",
  },
  {
    name: "Daily Targets",
    path: "/team/targets",
    icon: <Target className="h-4 w-4" />,
    keywords: ["targets", "goals", "objectives"],
    category: "Team",
  },
  
  // Masters
  {
    name: "Customers",
    path: "/masters/customers",
    icon: <Users className="h-4 w-4" />,
    keywords: ["customers", "master", "clients"],
    category: "Masters",
  },
  {
    name: "Items",
    path: "/masters/items",
    icon: <Package className="h-4 w-4" />,
    keywords: ["items", "products", "master"],
    category: "Masters",
  },
  
  // Risk Management
  {
    name: "Client Risk Thermometer",
    path: "/risk/client-thermometer",
    icon: <Gauge className="h-4 w-4" />,
    keywords: ["risk", "thermometer", "client"],
    category: "Risk",
  },
  {
    name: "Payment Risk Forecaster",
    path: "/risk/payment-forecaster",
    icon: <TrendingDown className="h-4 w-4" />,
    keywords: ["risk", "forecaster", "payment", "prediction"],
    category: "Risk",
  },
  {
    name: "Recovery Health Test",
    path: "/risk/recovery-health",
    icon: <Heart className="h-4 w-4" />,
    keywords: ["recovery", "health", "test"],
    category: "Risk",
  },
  
  // Credit Control
  {
    name: "Category Rules",
    path: "/credit-control/category-rules",
    icon: <Settings className="h-4 w-4" />,
    keywords: ["category", "rules", "credit"],
    category: "Credit Control",
  },
  {
    name: "Category Calculation",
    path: "/credit-control/category-calculation",
    icon: <Calculator className="h-4 w-4" />,
    keywords: ["category", "calculation", "credit"],
    category: "Credit Control",
  },
  {
    name: "Urgent Actions",
    path: "/credit-control/urgent-actions",
    icon: <AlertTriangle className="h-4 w-4" />,
    keywords: ["urgent", "actions", "priority"],
    category: "Credit Control",
  },
  {
    name: "Follow-up Automation",
    path: "/credit-control/followup-automation",
    icon: <Settings className="h-4 w-4" />,
    keywords: ["followup", "automation", "reminders"],
    category: "Credit Control",
  },
  
  // Settings
  {
    name: "Company Profile",
    path: "/company-settings",
    icon: <Building2 className="h-4 w-4" />,
    keywords: ["company", "profile", "settings"],
    category: "Settings",
  },
  {
    name: "User Management",
    path: "/settings/users",
    icon: <UserCog className="h-4 w-4" />,
    keywords: ["users", "management", "team"],
    category: "Settings",
  },
  {
    name: "Roles Management",
    path: "/settings/roles",
    icon: <Shield className="h-4 w-4" />,
    keywords: ["roles", "permissions", "access"],
    category: "Settings",
  },
  {
    name: "Communication Schedules",
    path: "/communication-schedules",
    icon: <Settings className="h-4 w-4" />,
    keywords: ["communication", "schedules", "notifications"],
    category: "Settings",
  },
  {
    name: "Audit Logs",
    path: "/audit-logs",
    icon: <FileCheck className="h-4 w-4" />,
    keywords: ["audit", "logs", "history", "trail"],
    category: "Settings",
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const [recentPages, setRecentPages] = useState<string[]>([]);

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(navigationItems, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'category', weight: 1.5 },
        { name: 'keywords', weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }, []);

  // Load recent pages from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recent-pages");
    if (stored) {
      try {
        setRecentPages(JSON.parse(stored));
      } catch (e) {
        setRecentPages([]);
      }
    }
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fuzzy search filter
  const filteredItems = useMemo(() => {
    if (!search) return navigationItems;

    const results = fuse.search(search);
    return results.map(result => result.item);
  }, [search, fuse]);

  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, NavigationItem[]> = {};
    
    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    
    return groups;
  }, [filteredItems]);

  const handleSelect = (path: string) => {
    setLocation(path);
    setOpen(false);
    
    // Add to recent pages
    const newRecent = [path, ...recentPages.filter((p) => p !== path)].slice(0, 5);
    setRecentPages(newRecent);
    localStorage.setItem("recent-pages", JSON.stringify(newRecent));
  };

  const recentItems = useMemo(() => {
    return navigationItems.filter((item) => recentPages.includes(item.path));
  }, [recentPages]);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none" />
          
          <CommandInput 
            placeholder="Search pages, features, or actions..." 
            value={search}
            onValueChange={setSearch}
            className="relative z-10"
          />
          
          <CommandList className="max-h-[400px]">
            <CommandEmpty>
              <div className="py-8 text-center">
                <Search className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No results found for "{search}"
                </p>
              </div>
            </CommandEmpty>

            {!search && recentItems.length > 0 && (
              <>
                <CommandGroup heading={
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Recent</span>
                  </div>
                }>
                  {recentItems.map((item) => (
                    <CommandItem
                      key={item.path}
                      value={item.name}
                      onSelect={() => handleSelect(item.path)}
                      className="group"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.category}
                          </div>
                        </div>
                        <TrendingUp className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {Object.entries(groupedItems).map(([category, items]) => (
              <CommandGroup key={category} heading={category}>
                {items.map((item) => (
                  <CommandItem
                    key={item.path}
                    value={`${item.name} ${item.keywords?.join(" ")}`}
                    onSelect={() => handleSelect(item.path)}
                    className="group"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium flex-1">{item.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </div>
      </CommandDialog>
    </>
  );
}
