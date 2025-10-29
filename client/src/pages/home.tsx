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
  XCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SkeletonDashboard } from "@/components/ui/skeleton";

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

export default function Home() {
  const [, setLocation] = useLocation();
  
  const { data: dashboardData, isLoading } = useQuery<BusinessOverviewData>({
    queryKey: ['/api/dashboard/business-overview'],
  });

  const { data: invoiceStatusCards } = useQuery<any>({
    queryKey: ['/api/dashboard/invoice-status-cards'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Complete view of your business operations</p>
        </div>
        <SkeletonDashboard />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Complete view of your business operations</p>
        </div>
      </div>

      {/* Financial Snapshot Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Invoice Status Cards - 6 categories based on grace period logic */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card 
          className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer" 
          data-testid="card-upcoming-invoices"
          onClick={() => setLocation('/invoices?status=Unpaid&category=upcoming')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Upcoming Invoices</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              ₹{(invoiceStatusCards?.upcomingInvoices?.totalAmount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From {invoiceStatusCards?.upcomingInvoices?.count || 0} invoices</p>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-all duration-200 cursor-pointer" 
          data-testid="card-due-today"
          onClick={() => setLocation('/invoices?status=Unpaid&category=dueToday')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Today</CardTitle>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              ₹{(invoiceStatusCards?.dueToday?.totalAmount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From {invoiceStatusCards?.dueToday?.count || 0} invoices</p>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-amber-500 hover:shadow-lg transition-all duration-200 cursor-pointer" 
          data-testid="card-in-grace"
          onClick={() => setLocation('/invoices')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">In Grace</CardTitle>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              ₹{(invoiceStatusCards?.inGrace?.totalAmount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From {invoiceStatusCards?.inGrace?.count || 0} invoices</p>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-200 cursor-pointer" 
          data-testid="card-overdue"
          onClick={() => setLocation('/invoices?status=Unpaid&category=overdue')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Overdue</CardTitle>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              ₹{(invoiceStatusCards?.overdue?.totalAmount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From {invoiceStatusCards?.overdue?.count || 0} invoices</p>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-200 cursor-pointer" 
          data-testid="card-paid-on-time"
          onClick={() => setLocation('/invoices?status=Paid&category=paidOnTime')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Paid On Time</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              ₹{(invoiceStatusCards?.paidOnTime?.totalAmount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From {invoiceStatusCards?.paidOnTime?.count || 0} invoices</p>
          </CardContent>
        </Card>

        <Card 
          className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all duration-200 cursor-pointer" 
          data-testid="card-paid-late"
          onClick={() => setLocation('/invoices?status=Paid&category=paidLate')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Paid Late</CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <XCircle className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              ₹{(invoiceStatusCards?.paidLate?.totalAmount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From {invoiceStatusCards?.paidLate?.count || 0} invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Category Outstanding Chart */}
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

        {/* Top 5 Customers by Revenue */}
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
      </div>

      {/* Top 5 by Outstanding and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top 5 Customers by Outstanding */}
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

        {/* Overdue Invoices Alert */}
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
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Invoices */}
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

        {/* Recent Receipts */}
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
      </div>

      {/* Quick Link to Customer Analytics */}
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
    </div>
  );
}
