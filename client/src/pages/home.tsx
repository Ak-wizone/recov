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
  Percent
} from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface BusinessOverviewData {
  financialSnapshot: {
    totalRevenue: string;
    totalCollections: string;
    totalOutstanding: string;
    totalInterest: string;
    collectionEfficiency: string;
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

export default function Home() {
  const { data: dashboardData, isLoading } = useQuery<BusinessOverviewData>({
    queryKey: ['/api/dashboard/business-overview'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <Card className="border-l-4 border-l-green-500" data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Revenue</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ₹{parseFloat(dashboardData.financialSnapshot.totalRevenue).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">From {dashboardData.moduleStats.invoices.count} invoices</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500" data-testid="card-total-collections">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Collections</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              ₹{parseFloat(dashboardData.financialSnapshot.totalCollections).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">From {dashboardData.moduleStats.receipts.count} receipts</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500" data-testid="card-total-outstanding">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Outstanding</CardTitle>
            <TrendingDown className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              ₹{parseFloat(dashboardData.financialSnapshot.totalOutstanding).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">{dashboardData.moduleStats.debtors.count} debtors</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500" data-testid="card-collection-efficiency">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Collection Efficiency</CardTitle>
            <Percent className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {parseFloat(dashboardData.financialSnapshot.collectionEfficiency).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Interest: ₹{parseFloat(dashboardData.financialSnapshot.totalInterest).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-invoices-stat">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <FileText className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.moduleStats.invoices.count}</div>
            <p className="text-xs text-gray-500">₹{parseFloat(dashboardData.moduleStats.invoices.totalAmount).toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-receipts-stat">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receipts</CardTitle>
            <ReceiptIcon className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.moduleStats.receipts.count}</div>
            <p className="text-xs text-gray-500">₹{parseFloat(dashboardData.moduleStats.receipts.totalAmount).toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-customers-stat">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.moduleStats.customers.active}</div>
            <p className="text-xs text-gray-500">Active of {dashboardData.moduleStats.customers.total} total</p>
          </CardContent>
        </Card>

        <Card data-testid="card-debtors-stat">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Debtors</CardTitle>
            <AlertCircle className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.moduleStats.debtors.count}</div>
            <p className="text-xs text-gray-500">₹{parseFloat(dashboardData.moduleStats.debtors.totalOutstanding).toLocaleString("en-IN")}</p>
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
                  <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
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
