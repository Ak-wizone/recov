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
    <div className="w-64 bg-background border-r border-border h-screen flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-primary" data-testid="text-app-title">
          Business Manager
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => (
          <div key={item.name}>
            {item.subItems ? (
              <div>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "text-muted-foreground"
                  )}
                  data-testid={`button-toggle-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.name}</span>
                  </div>
                  {expandedItems.has(item.name) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expandedItems.has(item.name) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive(subItem.path)
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        data-testid={`link-${subItem.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {subItem.icon}
                        <span>{subItem.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
    </div>
  );
}
