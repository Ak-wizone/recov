import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Award,
  AlertCircle,
  Check,
  ChevronsUpDown,
  ArrowLeft,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MasterCustomer {
  id: string;
  clientName: string;
  category: string;
  isActive: string;
}

interface PaymentScorecard {
  customer: {
    id: string;
    clientName: string;
    category: string;
    primaryMobile: string;
    primaryEmail: string;
  };
  metrics: {
    totalInvoices: number;
    onTimeCount: number;
    lateCount: number;
    onTimeRate: number;
    avgDelayDays: number;
    paymentScore: number;
    classification: string;
  };
  outstanding: {
    totalAmount: string;
    overdueAmount: string;
  };
  categoryHistory: Array<{
    category: string;
    startDate: string;
    endDate: string | null;
    daysInCategory: number;
  }>;
}

const getClassificationConfig = (classification: string) => {
  switch (classification) {
    case "Star":
      return {
        color: "bg-yellow-500 text-white",
        description: "Excellent payment behavior",
      };
    case "Regular":
      return {
        color: "bg-green-500 text-white",
        description: "Good payment behavior",
      };
    case "Risky":
      return {
        color: "bg-orange-500 text-white",
        description: "Inconsistent payment behavior",
      };
    case "Critical":
      return {
        color: "bg-red-500 text-white",
        description: "Poor payment behavior",
      };
    default:
      return {
        color: "bg-gray-500 text-white",
        description: "Unknown",
      };
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Alpha":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "Beta":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "Gamma":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "Delta":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

export default function PaymentScorecard() {
  const [, navigate] = useLocation();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [open, setOpen] = useState(false);

  // Set customer ID from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCustomerId = params.get("customerId");
    if (urlCustomerId && !selectedCustomerId) {
      setSelectedCustomerId(urlCustomerId);
    }
  }, []);

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<MasterCustomer[]>({
    queryKey: ["/api/masters/customers"],
  });

  const { data: scorecard, isLoading: isLoadingScorecard } = useQuery<PaymentScorecard>({
    queryKey: ["/api/payment-analytics/customer", selectedCustomerId],
    enabled: !!selectedCustomerId,
  });

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const config = scorecard?.metrics?.classification ? getClassificationConfig(scorecard.metrics.classification) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/payment-analytics" data-testid="link-back">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Customer Payment Scorecard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed payment behavior analysis and history
          </p>
        </div>

        {/* Select Customer Dropdown */}
        <div className="mb-6">
          <label className="text-base font-medium text-gray-600 dark:text-gray-400 mb-2 block">
            Select Customer
          </label>
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
                  : "Choose a customer..."}
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

        {/* Loading State */}
        {isLoadingScorecard && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        )}

        {/* Content */}
        {!selectedCustomerId && !isLoadingScorecard && (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Select a customer to view their payment scorecard
              </p>
            </CardContent>
          </Card>
        )}

        {/* Scorecard Data */}
        {scorecard && config && (
          <div className="space-y-6">
            {/* Customer Info & Classification */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl mb-2">{scorecard.customer.clientName}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getCategoryColor(scorecard.customer.category)} data-testid="badge-category">
                        {scorecard.customer.category}
                      </Badge>
                      <Badge className={config.color} data-testid="badge-classification">
                        {scorecard.metrics.classification}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-payment-score">
                      {scorecard.metrics.paymentScore}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Payment Score</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">{config.description}</p>
              </CardContent>
            </Card>

            {/* Payment Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-total-invoices">
                    {scorecard.metrics.totalInvoices}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    On-Time Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-ontime-rate">
                    {scorecard.metrics.onTimeRate.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {scorecard.metrics.onTimeCount} of {scorecard.metrics.totalInvoices} invoices
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Late Payments
                  </CardTitle>
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-late-count">
                    {scorecard.metrics.lateCount}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Delayed invoices
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg Delay
                  </CardTitle>
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-avg-delay">
                    {scorecard.metrics.avgDelayDays}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Days (when late)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Outstanding Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Outstanding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 dark:text-white" data-testid="text-total-outstanding">
                    ₹{parseFloat(scorecard.outstanding.totalAmount).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Overdue Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-600 dark:text-red-400" data-testid="text-overdue-amount">
                    ₹{parseFloat(scorecard.outstanding.overdueAmount).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category History */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Category Movement History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scorecard.categoryHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No category history available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scorecard.categoryHistory.map((history, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        data-testid={`history-item-${index}`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={getCategoryColor(history.category)}>
                            {history.category}
                          </Badge>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {format(new Date(history.startDate), "dd MMM yyyy")} -{" "}
                              {history.endDate ? format(new Date(history.endDate), "dd MMM yyyy") : "Present"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {history.daysInCategory} days
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
