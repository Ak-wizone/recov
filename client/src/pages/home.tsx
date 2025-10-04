import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Users,
  FileText,
  Receipt,
  DollarSign,
  UserPlus,
  Package,
  TrendingUp,
  Activity,
  ArrowRight,
  Building2,
  ClipboardList,
  Briefcase,
  ShoppingCart,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DashboardStats {
  totals: {
    leads: number;
    quotations: number;
    proformaInvoices: number;
    invoices: number;
    receipts: number;
    customers: number;
    items: number;
    users: number;
    roles: number;
  };
  amounts: {
    totalInvoices: number;
    totalReceipts: number;
    totalDebtors: number;
    totalQuotations: number;
    outstandingBalance: number;
  };
  today: {
    leads: number;
    quotations: number;
    invoices: number;
    receipts: number;
  };
  recent: {
    leads: any[];
    quotations: any[];
    invoices: any[];
  };
}

export default function Home() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const moduleData = [
    { name: "Leads", value: stats.totals.leads },
    { name: "Quotations", value: stats.totals.quotations },
    { name: "Proforma", value: stats.totals.proformaInvoices },
    { name: "Invoices", value: stats.totals.invoices },
    { name: "Receipts", value: stats.totals.receipts },
  ];

  const amountData = [
    { name: "Invoices", amount: stats.amounts.totalInvoices },
    { name: "Receipts", amount: stats.amounts.totalReceipts },
    { name: "Debtors", amount: stats.amounts.totalDebtors },
    { name: "Quotations", amount: stats.amounts.totalQuotations },
  ];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome to your business overview</p>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-6 lg:px-8 py-8">
        {/* Today's Activity Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Today's Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-blue-500" data-testid="card-today-leads">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  New Leads
                </CardTitle>
                <UserPlus className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.today.leads}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Added today</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500" data-testid="card-today-quotations">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  New Quotations
                </CardTitle>
                <FileText className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.today.quotations}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Created today</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500" data-testid="card-today-invoices">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  New Invoices
                </CardTitle>
                <Receipt className="h-5 w-5 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.today.invoices}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Generated today</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500" data-testid="card-today-receipts">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Receipts
                </CardTitle>
                <DollarSign className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.today.receipts}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Collected today</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white" data-testid="card-total-invoices">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{stats.amounts.totalInvoices.toFixed(2)}</div>
                <p className="text-xs text-blue-100 mt-1">All time</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white" data-testid="card-total-receipts">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-100">Total Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{stats.amounts.totalReceipts.toFixed(2)}</div>
                <p className="text-xs text-green-100 mt-1">All time</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white" data-testid="card-outstanding">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-100">Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{stats.amounts.outstandingBalance.toFixed(2)}</div>
                <p className="text-xs text-red-100 mt-1">To collect</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white" data-testid="card-total-debtors">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">Debtors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{stats.amounts.totalDebtors.toFixed(2)}</div>
                <p className="text-xs text-purple-100 mt-1">Outstanding debt</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white" data-testid="card-total-quotations">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-100">Quotations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{stats.amounts.totalQuotations.toFixed(2)}</div>
                <p className="text-xs text-yellow-100 mt-1">Total quoted</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Module Statistics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Module Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <Link href="/leads">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-module-leads">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Leads</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totals.leads}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/quotations">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-module-quotations">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Quotations</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totals.quotations}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/proforma-invoices">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-module-proforma">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Proforma</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totals.proformaInvoices}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/invoices">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-module-invoices">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Invoices</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totals.invoices}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/receipts">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-module-receipts">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Receipts</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totals.receipts}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/masters/customers">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-module-customers">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Customers</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totals.customers}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/masters/items">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-module-items">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Items</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totals.items}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/debtors">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-module-debtors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Debtors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totals.customers}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/settings/users">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-module-users">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totals.users}</div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/settings/roles">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-module-roles">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Roles</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totals.roles}</div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Module Distribution */}
          <Card data-testid="card-chart-modules">
            <CardHeader>
              <CardTitle>Module Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={moduleData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {moduleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Financial Overview Chart */}
          <Card data-testid="card-chart-financial">
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={amountData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${Number(value).toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Leads */}
          <Card data-testid="card-recent-leads">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Leads</CardTitle>
              <Link href="/leads">
                <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View all <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recent.leads.length > 0 ? (
                <div className="space-y-4">
                  {stats.recent.leads.map((lead, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {lead.companyName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{lead.contactPerson}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent leads</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Quotations */}
          <Card data-testid="card-recent-quotations">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Quotations</CardTitle>
              <Link href="/quotations">
                <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View all <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recent.quotations.length > 0 ? (
                <div className="space-y-4">
                  {stats.recent.quotations.map((quotation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {quotation.quotationNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          ₹{parseFloat(quotation.grandTotal).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent quotations</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card data-testid="card-recent-invoices">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Invoices</CardTitle>
              <Link href="/invoices">
                <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View all <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recent.invoices.length > 0 ? (
                <div className="space-y-4">
                  {stats.recent.invoices.map((invoice, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          ₹{parseFloat(invoice.invoiceAmount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent invoices</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
