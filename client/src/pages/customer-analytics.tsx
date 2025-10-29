import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
    tdsAmount: string;
    cnAmount: string;
  };
  categoryInfo: {
    category: string;
    totalDebtorAmount: string;
    categoryOpeningBalance: string;
    customerOpeningBalance: string;
  };
  debtorAmount: string;
  interestAmount: string;
  interestBreakdown: {
    invoiceInterest: string;
    openingBalanceInterest: string;
    totalInterest: string;
  };
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
  const [open, setOpen] = useState(false);

  // Fetch all customers for dropdown
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<MasterCustomer[]>({
    queryKey: ["/api/masters/customers"],
  });

  // Fetch customer analytics when a customer is selected
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<CustomerAnalytics>({
    queryKey: [`/api/customers/${selectedCustomerId}/dashboard-analytics`],
    enabled: !!selectedCustomerId,
  });

  // Find selected customer name
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Customer Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                View complete customer analytics and insights
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout: Dashboard + Sidebar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Customer Selector Sidebar - Top on mobile, Right on desktop */}
          <div className="w-full lg:w-80 order-first lg:order-last flex-shrink-0">
            <Card className="sticky top-24 bg-white dark:bg-gray-800 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Select Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between"
                      data-testid="select-customer"
                    >
                      {selectedCustomerId && selectedCustomer
                        ? selectedCustomer.clientName
                        : "Search and select customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search customer..."
                        className="h-9"
                        data-testid="input-customer-search"
                      />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.clientName}-${customer.id}`}
                              onSelect={() => {
                                setSelectedCustomerId(customer.id);
                                setOpen(false);
                              }}
                              data-testid={`customer-option-${customer.id}`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex flex-col">
                                  <span className="font-medium">{customer.clientName}</span>
                                  <span className="text-xs text-gray-500">{customer.category}</span>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-2 h-4 w-4",
                                    selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Content */}
          <div className="flex-1 min-w-0">

            {/* Customer Analytics Cards */}
            {selectedCustomerId && !isLoadingAnalytics && analytics && (
              <>
                {/* Customer Info Header */}
                <div className="mb-4 sm:mb-6">
                  <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="bg-white/20 p-3 sm:p-4 rounded-full flex-shrink-0">
                            <User className="h-6 w-6 sm:h-8 sm:w-8" />
                          </div>
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold">{analytics.customer.clientName}</h2>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                              <Badge className={getCategoryColor(analytics.customer.category)}>
                                {analytics.customer.category}
                              </Badge>
                              <Badge variant={analytics.status.isActive ? "default" : "destructive"}>
                                {analytics.customer.status}
                              </Badge>
                              <span className="text-xs sm:text-sm text-white/80">
                                Since {format(new Date(analytics.status.customerSince), "MMM yyyy")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" data-testid="button-email-customer">
                            <Mail className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Email</span>
                          </Button>
                          <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" data-testid="button-whatsapp-customer">
                            <MessageCircle className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </Button>
                          <Button variant="secondary" size="sm" className="flex-1 sm:flex-none" data-testid="button-call-customer">
                            <Phone className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Call</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Customer Debtor Amount - Prominent Card */}
                <div className="mb-4 sm:mb-6">
                  <Card className="bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-xl" data-testid="card-customer-debtor">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-white/80 mb-2">Customer Outstanding Amount</p>
                          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                            ₹{parseFloat(analytics.debtorAmount).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </h3>
                          <p className="text-xs sm:text-sm text-white/70 mt-2">Total amount to collect</p>
                        </div>
                        <div className="bg-white/20 p-3 sm:p-5 rounded-full flex-shrink-0">
                          <TrendingDown className="h-8 w-8 sm:h-12 sm:w-12" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Analytics Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  {/* Invoice Summary Card */}
                  <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow" data-testid="card-invoice-summary">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                        Invoice Summary
                      </CardTitle>
                      <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                            {analytics.invoiceSummary.count}
                          </span>
                          <span className="text-sm sm:text-base text-gray-500 font-medium">invoices</span>
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-blue-600">
                          ₹{parseFloat(analytics.invoiceSummary.totalAmount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">
                          Avg: ₹{parseFloat(analytics.invoiceSummary.avgAmount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Receipt Summary Card */}
                  <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow" data-testid="card-receipt-summary">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                        Receipt Summary
                      </CardTitle>
                      <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                            {analytics.receiptSummary.count}
                          </span>
                          <span className="text-sm sm:text-base text-gray-500 font-medium">receipts</span>
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-green-600">
                          ₹{parseFloat(analytics.receiptSummary.totalAmount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">TDS:</p>
                            <p className="text-sm font-bold text-blue-600">
                              ₹{parseFloat(analytics.receiptSummary.tdsAmount).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Credit Note:</p>
                            <p className="text-sm font-bold text-purple-600">
                              ₹{parseFloat(analytics.receiptSummary.cnAmount).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        </div>
                        {analytics.receiptSummary.lastPaymentDate && (
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                            Last payment: {format(new Date(analytics.receiptSummary.lastPaymentDate), "dd MMM yyyy")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Card */}
                  <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow" data-testid="card-category">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                        {analytics.categoryInfo.category} Category
                      </CardTitle>
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Opening Balance</p>
                        <div className="text-3xl sm:text-4xl font-bold text-purple-600">
                          ₹{parseFloat(analytics.categoryInfo.customerOpeningBalance).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Customer's opening balance</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Interest Amount Card */}
                  <Card className="border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow" data-testid="card-interest-amount">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                        Total Interest
                      </CardTitle>
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-3xl sm:text-4xl font-bold text-orange-600">
                          ₹{parseFloat(analytics.interestBreakdown.totalInterest).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Invoice Interest:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              ₹{parseFloat(analytics.interestBreakdown.invoiceInterest).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Opening Balance Interest:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              ₹{parseFloat(analytics.interestBreakdown.openingBalanceInterest).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Credit Limit Card */}
                  <Card className="border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-shadow" data-testid="card-credit-limit">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                        Credit Management
                      </CardTitle>
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Credit Limit:</span>
                          <span className="text-lg sm:text-xl font-bold">
                            ₹{parseFloat(analytics.creditInfo.creditLimit).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Utilized:</span>
                          <span className="text-lg sm:text-xl font-bold text-red-600">
                            ₹{parseFloat(analytics.creditInfo.utilizedCredit).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Available:</span>
                          <span className="text-lg sm:text-xl font-bold text-green-600">
                            ₹{parseFloat(analytics.creditInfo.availableCredit).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-sm sm:text-base">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Utilization:</span>
                            <span className="font-bold">{parseFloat(analytics.creditInfo.utilizationPercentage).toFixed(1)}%</span>
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
                  <Card className="border-l-4 border-l-indigo-500 shadow-md hover:shadow-lg transition-shadow" data-testid="card-customer-status">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                        Customer Status
                      </CardTitle>
                      <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={analytics.status.isActive ? "default" : "destructive"} className="text-xs sm:text-sm font-semibold">
                            {analytics.status.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              Since: {format(new Date(analytics.status.customerSince), "dd MMM yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              Total Transactions: {analytics.status.totalTransactions}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400 font-medium">{analytics.customer.primaryMobile || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400 truncate font-medium">{analytics.customer.primaryEmail || "N/A"}</span>
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
              <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
                <div className="text-center px-4">
                  <Building2 className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Select a Customer
                  </h3>
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                    Choose a customer from the selector to view their complete analytics
                  </p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {selectedCustomerId && isLoadingAnalytics && (
              <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading customer analytics...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
