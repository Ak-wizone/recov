import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  Receipt as ReceiptIcon,
  AlertCircle,
  BarChart3,
  Wallet,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SkeletonDashboard } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { getFirstAccessibleRoute, hasBusinessOverviewAccess } from "@/lib/navigation-utils";

interface BusinessOverviewData {
  financialSnapshot: {
    totalRevenue: string;
    totalCollections: string;
    totalOutstanding: string;
    totalInterest: string;
    totalOpeningBalance: string;
  };
  moduleStats: {
    invoices: { count: number; totalAmount: string };
    receipts: { count: number; totalAmount: string; tdsAmount: string; cnAmount: string };
    customers: { total: number; active: number };
    debtors: { count: number; totalOutstanding: string };
  };
  topCustomers: {
    byRevenue: Array<{
      id: string;
      name: string;
      category: string;
      revenue: string;
      outstanding: string;
      transactionCount: number;
    }>;
    byOutstanding: Array<{
      id: string;
      name: string;
      category: string;
      revenue: string;
      outstanding: string;
      transactionCount: number;
    }>;
  };
  recentActivity: {
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      customerName: string;
      amount: string;
      date: Date;
      status: string;
    }>;
    receipts: Array<{
      id: string;
      voucherNumber: string;
      customerName: string;
      amount: string;
      date: Date;
      voucherType: string;
    }>;
    overdueInvoices: Array<{
      id: string;
      invoiceNumber: string;
      customerName: string;
      amount: string;
      date: Date;
      daysOverdue: number;
    }>;
  };
  charts: {
    categoryOutstanding: Array<{
      category: string;
      amount: number;
    }>;
  };
}

interface PlatformStatistics {
  customers: {
    total: number;
  };
  invoices: {
    count: number;
    totalAmount: string;
  };
  receipts: {
    count: number;
    totalAmount: string;
  };
}

interface ActiveUsersData {
  activeToday: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Smart formatter for displaying amounts in Lakhs or Crores
const formatAmount = (value: number): string => {
  if (value >= 10000000) {
    // >= 1 Crore: Show in Crores
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    // >= 1 Lakh: Show in Lakhs
    return `₹${(value / 100000).toFixed(2)} L`;
  } else {
    // < 1 Lakh: Show in thousands
    return `₹${(value / 1000).toFixed(2)}K`;
  }
};

// Helper to check if a dashboard card should be visible
const shouldShowCard = (cardName: string, allowedCards: string[] | undefined, isPlatformAdmin: boolean): boolean => {
  // Platform admins see everything
  if (isPlatformAdmin) return true;
  
  // If no restrictions defined (empty array or undefined), show all cards
  if (!allowedCards || allowedCards.length === 0) return true;
  
  // Otherwise, only show if card is in the allowed list
  return allowedCards.includes(cardName);
};

export default function Home() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  const isPlatformAdmin = !!(user && !user.tenantId);
  
  // Auto-redirect if user doesn't have Business Overview permission
  useEffect(() => {
    // Only redirect if we're on the dashboard route
    if (location !== "/" && location !== "/dashboard") {
      return;
    }
    
    if (user && !isPlatformAdmin && user.permissions) {
      if (!hasBusinessOverviewAccess(user.permissions)) {
        const firstRoute = getFirstAccessibleRoute(user.permissions);
        if (firstRoute !== "/dashboard") {
          setLocation(firstRoute);
        }
      }
    }
  }, [user, isPlatformAdmin, location, setLocation]);
  
  const { data: dashboardData, isLoading } = useQuery<BusinessOverviewData>({
    queryKey: ['/api/dashboard/business-overview'],
    enabled: !isPlatformAdmin,
  });

  const { data: invoiceStatusCards } = useQuery<any>({
    queryKey: ['/api/dashboard/invoice-status-cards'],
    enabled: !isPlatformAdmin,
  });
  
  const { data: platformStats, isLoading: isPlatformStatsLoading } = useQuery<PlatformStatistics>({
    queryKey: ['/api/platform/statistics'],
    enabled: isPlatformAdmin,
  });
  
  const { data: activeUsersData, isLoading: isActiveUsersLoading } = useQuery<ActiveUsersData>({
    queryKey: ['/api/platform/active-users'],
    enabled: isPlatformAdmin,
  });

  if (isLoading || isPlatformStatsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isPlatformAdmin ? "Platform Overview" : "Business Overview"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isPlatformAdmin ? "Aggregated statistics across all tenants" : "Complete view of your business operations"}
          </p>
        </div>
        <SkeletonDashboard />
      </div>
    );
  }

  if (isPlatformAdmin && !platformStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No platform data available</p>
      </div>
    );
  }

  if (!isPlatformAdmin && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }
  
  if (isPlatformAdmin && platformStats) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platform Overview</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Aggregated statistics across all tenants</p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200" 
            data-testid="card-total-customers"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Customers</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {platformStats.customers.total.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Across all tenants</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-200" 
            data-testid="card-total-invoices"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Invoices</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {platformStats.invoices.count.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ₹{parseFloat(platformStats.invoices.totalAmount).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-200" 
            data-testid="card-total-receipts"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Receipts</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <ReceiptIcon className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {platformStats.receipts.count.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ₹{parseFloat(platformStats.receipts.totalAmount).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all duration-200" 
            data-testid="card-active-users"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Users Today</CardTitle>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Activity className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {activeUsersData?.activeToday || 0}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Users logged in today</p>
            </CardContent>
          </Card>
        </div>
        
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Platform Administration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Manage tenants, subscription plans, and monitor platform-wide activity from the navigation menu.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/platform/tenants')}>
                <CardContent className="pt-6">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Tenant Management</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">View and manage all tenants</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/platform/subscription-plans')}>
                <CardContent className="pt-6">
                  <Wallet className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Subscription Plans</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure pricing and features</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/platform/pending-requests')}>
                <CardContent className="pt-6">
                  <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400 mb-2" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Pending Requests</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Review tenant registration requests</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Financial Snapshot Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {shouldShowCard("Total Revenue", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card 
            className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-200 cursor-pointer" 
            data-testid="card-total-revenue"
            onClick={() => setLocation('/invoices')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Revenue</CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                ₹{parseFloat(dashboardData.financialSnapshot.totalRevenue).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From {dashboardData.moduleStats.invoices.count} invoices</p>
            </CardContent>
          </Card>
        )}

        {shouldShowCard("Total Collections", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card 
            className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer" 
            data-testid="card-total-collections"
            onClick={() => setLocation('/receipts')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Collections</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                ₹{parseFloat(dashboardData.financialSnapshot.totalCollections).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From {dashboardData.moduleStats.receipts.count} receipts</p>
            </CardContent>
          </Card>
        )}

        {shouldShowCard("Total Outstanding", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card 
            className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all duration-200 cursor-pointer" 
            data-testid="card-total-outstanding"
            onClick={() => setLocation('/debtors')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Outstanding</CardTitle>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <TrendingDown className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                ₹{parseFloat(dashboardData.financialSnapshot.totalOutstanding).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{dashboardData.moduleStats.debtors.count} debtors</p>
            </CardContent>
          </Card>
        )}

        {shouldShowCard("Total Opening Balance", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card 
            className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-200" 
            data-testid="card-opening-balance"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Opening Balance</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Wallet className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                ₹{parseFloat(dashboardData.financialSnapshot.totalOpeningBalance).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Interest: ₹{parseFloat(dashboardData.financialSnapshot.totalInterest).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invoice Status Cards - 6 categories based on grace period logic */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shouldShowCard("Upcoming Invoices", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card 
            className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-blue-50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/10" 
            data-testid="card-upcoming-invoices"
            onClick={() => setLocation('/invoices?status=Unpaid&category=upcoming')}
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Upcoming Invoices</CardTitle>
              <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
                ₹{(invoiceStatusCards?.upcomingInvoices?.totalAmount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">From {invoiceStatusCards?.upcomingInvoices?.count || 0} invoices</p>
            </CardContent>
          </Card>
        )}

        {shouldShowCard("Due Today", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card 
            className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-yellow-50 via-white to-yellow-50/30 dark:from-yellow-950/20 dark:via-gray-900 dark:to-yellow-950/10" 
            data-testid="card-due-today"
            onClick={() => setLocation('/invoices?status=Unpaid&category=dueToday')}
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-yellow-400 to-yellow-600"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Due Today</CardTitle>
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-4xl font-extrabold bg-gradient-to-r from-yellow-600 to-yellow-500 dark:from-yellow-400 dark:to-yellow-300 bg-clip-text text-transparent">
                ₹{(invoiceStatusCards?.dueToday?.totalAmount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">From {invoiceStatusCards?.dueToday?.count || 0} invoices</p>
            </CardContent>
          </Card>
        )}

        {shouldShowCard("In Grace", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card 
            className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-amber-50 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-gray-900 dark:to-amber-950/10" 
            data-testid="card-in-grace"
            onClick={() => setLocation('/invoices')}
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-400 to-amber-600"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">In Grace</CardTitle>
              <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-4xl font-extrabold bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300 bg-clip-text text-transparent">
                ₹{(invoiceStatusCards?.inGrace?.totalAmount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">From {invoiceStatusCards?.inGrace?.count || 0} invoices</p>
            </CardContent>
          </Card>
        )}

        {shouldShowCard("Overdue", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card 
            className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-red-50 via-white to-red-50/30 dark:from-red-950/20 dark:via-gray-900 dark:to-red-950/10" 
            data-testid="card-overdue"
            onClick={() => setLocation('/invoices?status=Unpaid&category=overdue')}
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-red-400 to-red-600"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overdue</CardTitle>
              <div className="p-3 bg-gradient-to-br from-red-400 to-red-600 rounded-xl shadow-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-4xl font-extrabold bg-gradient-to-r from-red-600 to-red-500 dark:from-red-400 dark:to-red-300 bg-clip-text text-transparent">
                ₹{(invoiceStatusCards?.overdue?.totalAmount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">From {invoiceStatusCards?.overdue?.count || 0} invoices</p>
            </CardContent>
          </Card>
        )}

        {shouldShowCard("Paid On Time", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card 
            className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-green-50 via-white to-green-50/30 dark:from-green-950/20 dark:via-gray-900 dark:to-green-950/10" 
            data-testid="card-paid-on-time"
            onClick={() => setLocation('/invoices?status=Paid&category=paidOnTime')}
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-green-400 to-green-600"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Paid On Time</CardTitle>
              <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-4xl font-extrabold bg-gradient-to-r from-green-600 to-green-500 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent">
                ₹{(invoiceStatusCards?.paidOnTime?.totalAmount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">From {invoiceStatusCards?.paidOnTime?.count || 0} invoices</p>
            </CardContent>
          </Card>
        )}

        {shouldShowCard("Paid Late", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card 
            className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-orange-50 via-white to-orange-50/30 dark:from-orange-950/20 dark:via-gray-900 dark:to-orange-950/10" 
            data-testid="card-paid-late"
            onClick={() => setLocation('/invoices?status=Paid&category=paidLate')}
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-400 to-orange-600"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Paid Late</CardTitle>
              <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg">
                <XCircle className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-orange-500 dark:from-orange-400 dark:to-orange-300 bg-clip-text text-transparent">
                ₹{(invoiceStatusCards?.paidLate?.totalAmount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">From {invoiceStatusCards?.paidLate?.count || 0} invoices</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Category Outstanding Chart */}
        {shouldShowCard("Outstanding by Category", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card data-testid="card-category-chart">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Outstanding by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.charts.categoryOutstanding.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.charts.categoryOutstanding}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis tickFormatter={formatAmount} />
                    <Tooltip formatter={(value: number) => formatAmount(value)} />
                    <Legend />
                    <Bar dataKey="amount" fill="#8884d8" name="Outstanding Amount">
                      {dashboardData.charts.categoryOutstanding.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No outstanding amounts</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Top 5 Customers by Revenue */}
        {shouldShowCard("Top 5 Customers by Revenue", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card data-testid="card-top-customers-revenue">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top 5 Customers by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.topCustomers.byRevenue.length > 0 ? (
                  dashboardData.topCustomers.byRevenue.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" data-testid={`top-customer-revenue-${customer.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.category} • {customer.transactionCount} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₹{parseFloat(customer.revenue).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-gray-500">Outstanding: ₹{parseFloat(customer.outstanding).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No revenue data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top 5 by Outstanding and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top 5 Customers by Outstanding */}
        {shouldShowCard("Top 5 Customers by Outstanding", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card data-testid="card-top-customers-outstanding">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Top 5 Customers by Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.topCustomers.byOutstanding.length > 0 ? (
                  dashboardData.topCustomers.byOutstanding.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" data-testid={`top-customer-outstanding-${customer.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">₹{parseFloat(customer.outstanding).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-gray-500">Revenue: ₹{parseFloat(customer.revenue).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No outstanding amounts</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue Invoices Alert */}
        {shouldShowCard("Overdue Invoices", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card data-testid="card-overdue-invoices" className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Overdue Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.recentActivity.overdueInvoices.length > 0 ? (
                  dashboardData.recentActivity.overdueInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded" data-testid={`overdue-invoice-${invoice.id}`}>
                      <div>
                        <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{invoice.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">₹{parseFloat(invoice.amount).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-red-500">{invoice.daysOverdue} days overdue</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No overdue invoices</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Invoices */}
        {shouldShowCard("Recent Invoices", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card data-testid="card-recent-invoices">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.recentActivity.invoices.length > 0 ? (
                  dashboardData.recentActivity.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex justify-between items-center p-2 border-b last:border-0" data-testid={`recent-invoice-${invoice.id}`}>
                      <div>
                        <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">{invoice.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{parseFloat(invoice.amount).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-gray-500">{new Date(invoice.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent invoices</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Receipts */}
        {shouldShowCard("Recent Receipts", user?.allowedDashboardCards, isPlatformAdmin) && (
          <Card data-testid="card-recent-receipts">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptIcon className="h-5 w-5" />
                Recent Receipts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.recentActivity.receipts.length > 0 ? (
                  dashboardData.recentActivity.receipts.map((receipt) => (
                    <div key={receipt.id} className="flex justify-between items-center p-2 border-b last:border-0" data-testid={`recent-receipt-${receipt.id}`}>
                      <div>
                        <p className="font-medium text-sm">{receipt.voucherNumber}</p>
                        <p className="text-xs text-gray-500">{receipt.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">₹{parseFloat(receipt.amount).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-gray-500">{receipt.voucherType} • {new Date(receipt.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent receipts</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Link to Customer Analytics */}
      {shouldShowCard("Customer Analytics", user?.allowedDashboardCards, isPlatformAdmin) && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Need Customer-Specific Analytics?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">View detailed analytics for individual customers</p>
              </div>
              <Link 
                href="/customer-analytics"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                data-testid="link-customer-analytics"
              >
                View Customer Analytics
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
