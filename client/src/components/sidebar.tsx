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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
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
    name: "Debtors",
    path: "/",
    icon: <UserX className="h-5 w-5" />,
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
    name: "Company Settings",
    path: "#",
    icon: <Settings className="h-5 w-5" />,
    subItems: [
      {
        name: "Profile",
        path: "/settings/profile",
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
    <div className="w-72 bg-sidebar h-screen flex flex-col shadow-2xl border-r border-sidebar-border" data-testid="sidebar">
      <div className="p-8 border-b border-sidebar-border">
        <h1 className="text-3xl font-bold text-sidebar-primary animate-pulse" data-testid="text-app-title">
          Business Manager
        </h1>
        <p className="text-muted-foreground text-sm mt-2">Complete Business Solution</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navItems.map((item) => (
          <div key={item.name} className="group">
            {item.subItems ? (
              <div>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold",
                    "transition-all duration-300 transform hover:scale-105",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "text-sidebar-foreground",
                    expandedItems.has(item.name) && "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                  )}
                  data-testid={`button-toggle-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="transition-transform duration-300 group-hover:rotate-12">
                      {item.icon}
                    </div>
                    <span className="tracking-wide">{item.name}</span>
                  </div>
                  <div className={cn(
                    "transition-transform duration-300",
                    expandedItems.has(item.name) && "rotate-180"
                  )}>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>
                <div className={cn(
                  "overflow-hidden transition-all duration-500 ease-in-out",
                  expandedItems.has(item.name) ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"
                )}>
                  <div className="ml-6 space-y-1.5 border-l-2 border-sidebar-primary/30 pl-4">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.path}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium",
                          "transition-all duration-300 transform hover:translate-x-1",
                          isActive(subItem.path)
                            ? "bg-accent text-accent-foreground shadow-lg scale-105"
                            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                        data-testid={`link-${subItem.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div className="transition-transform duration-300 hover:scale-110">
                          {subItem.icon}
                        </div>
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
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold",
                  "transition-all duration-300 transform hover:scale-105",
                  isActive(item.path)
                    ? "bg-accent text-accent-foreground shadow-xl"
                    : "text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent"
                )}
                data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="transition-transform duration-300 group-hover:rotate-12">
                  {item.icon}
                </div>
                <span className="tracking-wide">{item.name}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="bg-sidebar-accent/30 rounded-xl p-4 border border-sidebar-primary/30">
          <p className="text-xs text-sidebar-foreground font-medium">Version 2.0</p>
          <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
        </div>
      </div>
    </div>
  );
}
