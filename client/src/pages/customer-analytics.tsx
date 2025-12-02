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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      {/* Select Customer Dropdown */}
      <div className="mb-6">
        <label className="text-base font-medium text-gray-600 dark:text-gray-400 mb-2 block">Select Customer</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full md:w-96 justify-between h-12 text-lg"
              data-testid="select-customer"
            >
              {selectedCustomerId && selectedCustomer
                ? selectedCustomer.clientName
                : "Choose..."}
              <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search customer..."
                className="h-12"
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
                          <span className="font-medium text-base">{customer.clientName}</span>
                          <span className="text-sm text-gray-500">{customer.category}</span>
                        </div>
                        <Check
                          className={cn(
                            "ml-2 h-5 w-5",
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
      </div>

      {/* Title Bar: Customer Name and Outstanding Balance */}
      {selectedCustomerId && analytics && (
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-lg p-6 mb-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Customer Name */}
            <div className="flex items-center gap-3">
              <User className="h-8 w-8" />
              <div>
                <p className="text-sm opacity-90">Customer Name</p>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">
                    {analytics.customer.clientName}
                  </h1>
                  <Badge className={cn("text-base px-3 py-1", getCategoryColor(analytics.customer.category))}>
                    {analytics.customer.category}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Outstanding Balance */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 md:min-w-[300px]">
              <p className="text-sm opacity-90 mb-1">Outstanding Balance</p>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold">
                  ₹{parseFloat(analytics.debtorAmount).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <TrendingDown className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Cards Grid */}
      {selectedCustomerId && !isLoadingAnalytics && analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Invoice Summary Card */}
          <Card className="border-l-4 border-l-blue-500" data-testid="card-invoice-summary">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
              <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Invoice Summary
              </CardTitle>
              <Receipt className="h-6 w-6 text-blue-500" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {analytics.invoiceSummary.count}
                  </span>
                  <span className="text-base text-gray-500">invoices</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{parseFloat(analytics.invoiceSummary.totalAmount).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-base text-gray-500">
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
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
              <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Receipt Summary
              </CardTitle>
              <DollarSign className="h-6 w-6 text-green-500" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {analytics.receiptSummary.count}
                  </span>
                  <span className="text-base text-gray-500">receipts</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ₹{parseFloat(analytics.receiptSummary.totalAmount).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-base text-gray-600 dark:text-gray-400">TDS:</p>
                    <p className="text-xl font-bold text-blue-600">
                      ₹{parseFloat(analytics.receiptSummary.tdsAmount).toLocaleString("en-IN", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-base text-gray-600 dark:text-gray-400">CN:</p>
                    <p className="text-xl font-bold text-purple-600">
                      ₹{parseFloat(analytics.receiptSummary.cnAmount).toLocaleString("en-IN", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
                {analytics.receiptSummary.lastPaymentDate && (
                  <p className="text-base text-gray-500 dark:text-gray-400">
                    Last: {format(new Date(analytics.receiptSummary.lastPaymentDate), "dd MMM yy")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Card */}
          <Card className="border-l-4 border-l-purple-500" data-testid="card-category">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
              <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">
                {analytics.categoryInfo.category} Category
              </CardTitle>
              <Users className="h-6 w-6 text-purple-500" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-2">
                <p className="text-base text-gray-600 dark:text-gray-400">Opening Balance</p>
                <div className="text-4xl font-bold text-purple-600">
                  ₹{parseFloat(analytics.categoryInfo.customerOpeningBalance).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interest Amount Card */}
          <Card className="border-l-4 border-l-orange-500" data-testid="card-interest-amount">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
              <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Total Interest
              </CardTitle>
              <TrendingUp className="h-6 w-6 text-orange-500" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-2">
                <div className="text-4xl font-bold text-orange-600">
                  ₹{parseFloat(analytics.interestBreakdown.totalInterest).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600 dark:text-gray-400">Invoice:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₹{parseFloat(analytics.interestBreakdown.invoiceInterest).toLocaleString("en-IN", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600 dark:text-gray-400">Opening:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₹{parseFloat(analytics.interestBreakdown.openingBalanceInterest).toLocaleString("en-IN", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Limit Card */}
          <Card className="border-l-4 border-l-red-500" data-testid="card-credit-limit">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
              <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Credit Management
              </CardTitle>
              <CreditCard className="h-6 w-6 text-red-500" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base text-gray-600 dark:text-gray-400">Limit:</span>
                  <span className="text-2xl font-bold">
                    ₹{parseFloat(analytics.creditInfo.creditLimit).toLocaleString("en-IN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base text-gray-600 dark:text-gray-400">Used:</span>
                  <span className="text-2xl font-bold text-red-600">
                    ₹{parseFloat(analytics.creditInfo.utilizedCredit).toLocaleString("en-IN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base text-gray-600 dark:text-gray-400">Available:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{parseFloat(analytics.creditInfo.availableCredit).toLocaleString("en-IN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-600 dark:text-gray-400">Utilization:</span>
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
          <Card className="border-l-4 border-l-indigo-500" data-testid="card-customer-status">
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5">
              <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Customer Status
              </CardTitle>
              <Activity className="h-6 w-6 text-indigo-500" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-3">
                <Badge variant={analytics.status.isActive ? "default" : "destructive"} className="text-base px-3 py-1">
                  {analytics.status.isActive ? "Active" : "Inactive"}
                </Badge>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-base">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Since: {format(new Date(analytics.status.customerSince), "dd MMM yy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Txns: {analytics.status.totalTransactions}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-base">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400 truncate">{analytics.customer.primaryMobile || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-base">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400 truncate">{analytics.customer.primaryEmail || "N/A"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State for Analytics */}
      {!selectedCustomerId && (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center px-6">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Select a Customer
            </h3>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              Choose a customer to view their analytics
            </p>
          </div>
        </div>
      )}

      {/* Loading State for Analytics */}
      {selectedCustomerId && isLoadingAnalytics && (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
