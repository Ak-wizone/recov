import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  FileText,
  TrendingUp,
  CreditCard,
  Users,
  Mail,
  MessageCircle,
  Phone,
  DollarSign,
  TrendingDown,
  Building2,
  User,
  Calendar,
  Activity,
} from "lucide-react";
import { format } from "date-fns";

interface MasterCustomer {
  id: string;
  clientName: string;
  category: string;
  isActive: string;
  primaryMobile: string;
  primaryEmail: string;
  createdAt: Date;
}

interface CustomerAnalytics {
  customer: {
    id: string;
    clientName: string;
    category: string;
    status: string;
    primaryMobile: string;
    primaryEmail: string;
    createdAt: Date;
  };
  invoiceSummary: {
    count: number;
    totalAmount: string;
    avgAmount: string;
  };
  receiptSummary: {
    count: number;
    totalAmount: string;
    lastPaymentDate: Date | null;
  };
  categoryInfo: {
    category: string;
    totalDebtorAmount: string;
  };
  interestAmount: string;
  creditInfo: {
    creditLimit: string;
    utilizedCredit: string;
    availableCredit: string;
    utilizationPercentage: string;
  };
  status: {
    isActive: boolean;
    customerSince: Date;
    totalTransactions: number;
  };
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Alpha":
      return "bg-purple-500 text-white";
    case "Beta":
      return "bg-blue-500 text-white";
    case "Gamma":
      return "bg-green-500 text-white";
    case "Delta":
      return "bg-orange-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

export default function Home() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all customers for dropdown
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<MasterCustomer[]>({
    queryKey: ["/api/masters/customers"],
  });

  // Fetch customer analytics when a customer is selected
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<CustomerAnalytics>({
    queryKey: [`/api/customers/${selectedCustomerId}/dashboard-analytics`],
    enabled: !!selectedCustomerId,
  });

  // Filter customers based on search
  const filteredCustomers = customers.filter((customer) =>
    customer.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                View complete customer analytics and insights
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-6 lg:px-8 py-8">
        {/* Customer Search Section */}
        <div className="mb-8">
          <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Select Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Search Customer
                  </label>
                  <Input
                    placeholder="Type customer name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                    data-testid="input-customer-search"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Select from dropdown
                  </label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="w-full" data-testid="select-customer">
                      <SelectValue placeholder="Choose a customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCustomers.map((customer) => (
                        <SelectItem
                          key={customer.id}
                          value={customer.id}
                          data-testid={`customer-option-${customer.id}`}
                        >
                          {customer.clientName} ({customer.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Analytics Cards */}
        {selectedCustomerId && !isLoadingAnalytics && analytics && (
          <>
            {/* Customer Info Header */}
            <div className="mb-6">
              <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 p-4 rounded-full">
                        <User className="h-8 w-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{analytics.customer.clientName}</h2>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge className={getCategoryColor(analytics.customer.category)}>
                            {analytics.customer.category}
                          </Badge>
                          <Badge variant={analytics.status.isActive ? "default" : "destructive"}>
                            {analytics.customer.status}
                          </Badge>
                          <span className="text-sm text-white/80">
                            Customer since {format(new Date(analytics.status.customerSince), "MMM yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" data-testid="button-email-customer">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                      <Button variant="secondary" size="sm" data-testid="button-whatsapp-customer">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button variant="secondary" size="sm" data-testid="button-call-customer">
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Invoice Summary Card */}
              <Card className="border-l-4 border-l-blue-500" data-testid="card-invoice-summary">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Invoice Summary
                  </CardTitle>
                  <Receipt className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {analytics.invoiceSummary.count}
                      </span>
                      <span className="text-sm text-gray-500">invoices</span>
                    </div>
                    <div className="text-lg font-semibold text-blue-600">
                      ₹{parseFloat(analytics.invoiceSummary.totalAmount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-gray-500">
                      Avg: ₹{parseFloat(analytics.invoiceSummary.avgAmount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Receipt Summary Card */}
              <Card className="border-l-4 border-l-green-500" data-testid="card-receipt-summary">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Receipt Summary
                  </CardTitle>
                  <DollarSign className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {analytics.receiptSummary.count}
                      </span>
                      <span className="text-sm text-gray-500">receipts</span>
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      ₹{parseFloat(analytics.receiptSummary.totalAmount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    {analytics.receiptSummary.lastPaymentDate && (
                      <p className="text-xs text-gray-500">
                        Last payment: {format(new Date(analytics.receiptSummary.lastPaymentDate), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Category Debtor Card */}
              <Card className="border-l-4 border-l-purple-500" data-testid="card-category-debtor">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Category Debtor Amount
                  </CardTitle>
                  <Users className="h-5 w-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge className={getCategoryColor(analytics.categoryInfo.category)}>
                      {analytics.categoryInfo.category} Category
                    </Badge>
                    <div className="text-3xl font-bold text-purple-600">
                      ₹{parseFloat(analytics.categoryInfo.totalDebtorAmount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-gray-500">Total outstanding in this category</p>
                  </div>
                </CardContent>
              </Card>

              {/* Interest Amount Card */}
              <Card className="border-l-4 border-l-orange-500" data-testid="card-interest-amount">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Interest Amount
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-orange-600">
                      ₹{parseFloat(analytics.interestAmount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-gray-500">Sum of net profit from invoices</p>
                  </div>
                </CardContent>
              </Card>

              {/* Credit Limit Card */}
              <Card className="border-l-4 border-l-red-500" data-testid="card-credit-limit">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Credit Management
                  </CardTitle>
                  <CreditCard className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Credit Limit:</span>
                      <span className="text-lg font-semibold">
                        ₹{parseFloat(analytics.creditInfo.creditLimit).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Utilized:</span>
                      <span className="text-lg font-semibold text-red-600">
                        ₹{parseFloat(analytics.creditInfo.utilizedCredit).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Available:</span>
                      <span className="text-lg font-semibold text-green-600">
                        ₹{parseFloat(analytics.creditInfo.availableCredit).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Utilization:</span>
                        <span className="font-semibold">{parseFloat(analytics.creditInfo.utilizationPercentage).toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={parseFloat(analytics.creditInfo.utilizationPercentage)} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Status Card */}
              <Card className="border-l-4 border-l-indigo-500" data-testid="card-customer-status">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Customer Status
                  </CardTitle>
                  <Activity className="h-5 w-5 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={analytics.status.isActive ? "default" : "destructive"}>
                        {analytics.status.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">
                          Since: {format(new Date(analytics.status.customerSince), "dd MMM yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">
                          Total Transactions: {analytics.status.totalTransactions}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">{analytics.customer.primaryMobile || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600 truncate">{analytics.customer.primaryEmail || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Empty State */}
        {!selectedCustomerId && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Select a Customer
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a customer from the dropdown above to view their complete analytics
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {selectedCustomerId && isLoadingAnalytics && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading customer analytics...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
