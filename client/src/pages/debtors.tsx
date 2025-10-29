import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  Calendar,
  CalendarRange,
  CalendarDays,
  AlertCircle,
  Clock,
  CalendarClock,
  CalendarCheck,
  CalendarX2,
  UserX,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DebtorsTable } from "@/components/debtors-table";
import { DebtorsFollowUpDialog } from "@/components/debtors-followup-dialog";
import { EmailDialog } from "@/components/email-dialog";
import { CallDialog } from "@/components/call-dialog";
import { useToast } from "@/hooks/use-toast";
import { isToday, isThisWeek, isThisMonth, isWithinInterval, parseISO } from "date-fns";

export default function Debtors() {
  const { toast } = useToast();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [dateFilterMode, setDateFilterMode] = useState<"month" | "allTime" | "dateRange">("allTime");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [followUpFilter, setFollowUpFilter] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedEmailCustomer, setSelectedEmailCustomer] = useState<any | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedDebtorForCall, setSelectedDebtorForCall] = useState<any | null>(null);

  const { data: debtorsData, isLoading } = useQuery<any>({
    queryKey: ["/api/debtors"],
  });

  const { data: followUpStats } = useQuery<any>({
    queryKey: ["/api/debtors/followup-stats"],
  });

  const categoryWise = debtorsData?.categoryWise || {
    Alpha: { count: 0, totalBalance: 0, debtors: [] },
    Beta: { count: 0, totalBalance: 0, debtors: [] },
    Gamma: { count: 0, totalBalance: 0, debtors: [] },
    Delta: { count: 0, totalBalance: 0, debtors: [] },
  };

  const allDebtors = debtorsData?.allDebtors || [];

  // Apply category and follow-up filters
  const filteredDebtors = allDebtors.filter((d: any) => {
    if (categoryFilter && d.category !== categoryFilter) return false;
    
    if (followUpFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const nextFollowUp = d.nextFollowUp ? new Date(d.nextFollowUp) : null;
      const nextFollowUpDay = nextFollowUp ? new Date(nextFollowUp.getFullYear(), nextFollowUp.getMonth(), nextFollowUp.getDate()) : null;

      switch (followUpFilter) {
        case "overdue":
          return nextFollowUpDay && nextFollowUpDay < today;
        case "dueToday":
          return nextFollowUpDay && nextFollowUpDay.getTime() === today.getTime();
        case "dueTomorrow":
          return nextFollowUpDay && nextFollowUpDay.getTime() === tomorrow.getTime();
        case "dueThisWeek":
          return nextFollowUpDay && nextFollowUpDay > today && nextFollowUpDay <= endOfWeek;
        case "dueThisMonth":
          return nextFollowUpDay && nextFollowUpDay > endOfWeek && nextFollowUpDay <= endOfMonth;
        case "noFollowUp":
          return !d.nextFollowUp;
        default:
          return true;
      }
    }
    
    return true;
  });

  // Calculate total balance for filtered debtors
  const totalBalanceFiltered = filteredDebtors.reduce((sum: number, d: any) => sum + d.balance, 0);

  const handleOpenFollowUp = (debtor: any) => {
    setSelectedCustomer(debtor);
    setIsFollowUpDialogOpen(true);
  };

  const handleOpenEmail = (debtor: any) => {
    setSelectedEmailCustomer(debtor);
    setIsEmailDialogOpen(true);
  };

  const handleOpenCall = (debtor: any) => {
    const phoneNumber = debtor.mobile || debtor.primaryMobile;
    if (!phoneNumber) {
      toast({
        title: "Mobile number not available",
        description: "This customer doesn't have a mobile number on file.",
        variant: "destructive",
      });
      return;
    }
    setSelectedDebtorForCall(debtor);
    setIsCallDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Debtors Management
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Track and manage customer outstanding balances
            </p>
          </div>
        </div>

        {/* Date Filter */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={dateFilterMode === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterMode("month")}
                  data-testid="button-filter-month"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Month/Year
                </Button>
                <Button
                  variant={dateFilterMode === "allTime" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterMode("allTime")}
                  data-testid="button-filter-all-time"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  All Time
                </Button>
                <Button
                  variant={dateFilterMode === "dateRange" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterMode("dateRange")}
                  data-testid="button-filter-date-range"
                >
                  <CalendarRange className="h-4 w-4 mr-2" />
                  Date Range
                </Button>

                {dateFilterMode === "month" && (
                  <>
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(value) => setSelectedMonth(parseInt(value))}
                    >
                      <SelectTrigger className="w-40" data-testid="select-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => setSelectedYear(parseInt(value))}
                    >
                      <SelectTrigger className="w-32" data-testid="select-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}

                {dateFilterMode === "dateRange" && (
                  <>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      placeholder="From Date"
                      className="w-40"
                      data-testid="input-from-date"
                    />
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      placeholder="To Date"
                      className="w-40"
                      data-testid="input-to-date"
                    />
                  </>
                )}
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Total Outstanding</div>
                <div className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-outstanding">
                  {formatCurrency(totalBalanceFiltered)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Cards */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {/* Alpha Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              categoryFilter === "Alpha" ? "ring-2 ring-green-500" : ""
            }`}
            onClick={() => setCategoryFilter(categoryFilter === "Alpha" ? null : "Alpha")}
            data-testid="card-category-alpha"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-t-lg">
              <CardTitle className="text-xs font-medium">ALPHA</CardTitle>
              <Users className="h-3 w-3" />
            </CardHeader>
            <CardContent className="pt-3 pb-3 px-4">
              <div className="text-xl font-bold" data-testid="text-alpha-count">
                {categoryWise.Alpha.count} Debtors
              </div>
              <div className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1" data-testid="text-alpha-balance">
                {formatCurrency(categoryWise.Alpha.totalBalance)}
              </div>
            </CardContent>
          </Card>

          {/* Beta Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              categoryFilter === "Beta" ? "ring-2 ring-blue-500" : ""
            }`}
            onClick={() => setCategoryFilter(categoryFilter === "Beta" ? null : "Beta")}
            data-testid="card-category-beta"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="text-xs font-medium">BETA</CardTitle>
              <Users className="h-3 w-3" />
            </CardHeader>
            <CardContent className="pt-3 pb-3 px-4">
              <div className="text-xl font-bold" data-testid="text-beta-count">
                {categoryWise.Beta.count} Debtors
              </div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1" data-testid="text-beta-balance">
                {formatCurrency(categoryWise.Beta.totalBalance)}
              </div>
            </CardContent>
          </Card>

          {/* Gamma Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              categoryFilter === "Gamma" ? "ring-2 ring-yellow-500" : ""
            }`}
            onClick={() => setCategoryFilter(categoryFilter === "Gamma" ? null : "Gamma")}
            data-testid="card-category-gamma"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-t-lg">
              <CardTitle className="text-xs font-medium">GAMMA</CardTitle>
              <Users className="h-3 w-3" />
            </CardHeader>
            <CardContent className="pt-3 pb-3 px-4">
              <div className="text-xl font-bold" data-testid="text-gamma-count">
                {categoryWise.Gamma.count} Debtors
              </div>
              <div className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mt-1" data-testid="text-gamma-balance">
                {formatCurrency(categoryWise.Gamma.totalBalance)}
              </div>
            </CardContent>
          </Card>

          {/* Delta Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              categoryFilter === "Delta" ? "ring-2 ring-red-500" : ""
            }`}
            onClick={() => setCategoryFilter(categoryFilter === "Delta" ? null : "Delta")}
            data-testid="card-category-delta"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-t-lg">
              <CardTitle className="text-xs font-medium">DELTA</CardTitle>
              <Users className="h-3 w-3" />
            </CardHeader>
            <CardContent className="pt-3 pb-3 px-4">
              <div className="text-xl font-bold" data-testid="text-delta-count">
                {categoryWise.Delta.count} Debtors
              </div>
              <div className="text-sm font-semibold text-red-600 dark:text-red-400 mt-1" data-testid="text-delta-balance">
                {formatCurrency(categoryWise.Delta.totalBalance)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Follow-up Status Cards */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Follow-up Status</h2>
            {followUpFilter && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Total Outstanding: <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(totalBalanceFiltered)}</span>
              </div>
            )}
          </div>
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
            {/* Overdue Card */}
            <Card 
              className={`cursor-pointer transition-all ${
                followUpFilter === "overdue" 
                  ? "bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700 ring-2 ring-red-500" 
                  : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900"
              }`}
              onClick={() => setFollowUpFilter(followUpFilter === "overdue" ? null : "overdue")}
              data-testid="card-followup-overdue"
            >
              <CardContent className="pt-3 pb-3 px-3">
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="p-2 bg-red-500 rounded-full">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {followUpStats?.overdue?.count || 0}
                  </div>
                  <p className="text-[10px] font-medium text-red-600 dark:text-red-400">Overdue</p>
                </div>
              </CardContent>
            </Card>

            {/* Due Today Card */}
            <Card 
              className={`cursor-pointer transition-all ${
                followUpFilter === "dueToday" 
                  ? "bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700 ring-2 ring-orange-500" 
                  : "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900"
              }`}
              onClick={() => setFollowUpFilter(followUpFilter === "dueToday" ? null : "dueToday")}
              data-testid="card-followup-today"
            >
              <CardContent className="pt-3 pb-3 px-3">
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="p-2 bg-orange-500 rounded-full">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {followUpStats?.dueToday?.count || 0}
                  </div>
                  <p className="text-[10px] font-medium text-orange-600 dark:text-orange-400">Due Today</p>
                </div>
              </CardContent>
            </Card>

            {/* Tomorrow Card */}
            <Card 
              className={`cursor-pointer transition-all ${
                followUpFilter === "dueTomorrow" 
                  ? "bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700 ring-2 ring-yellow-500" 
                  : "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900"
              }`}
              onClick={() => setFollowUpFilter(followUpFilter === "dueTomorrow" ? null : "dueTomorrow")}
              data-testid="card-followup-tomorrow"
            >
              <CardContent className="pt-3 pb-3 px-3">
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="p-2 bg-yellow-500 rounded-full">
                    <CalendarClock className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {followUpStats?.dueTomorrow?.count || 0}
                  </div>
                  <p className="text-[10px] font-medium text-yellow-600 dark:text-yellow-400">Tomorrow</p>
                </div>
              </CardContent>
            </Card>

            {/* This Week Card */}
            <Card 
              className={`cursor-pointer transition-all ${
                followUpFilter === "dueThisWeek" 
                  ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500" 
                  : "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900"
              }`}
              onClick={() => setFollowUpFilter(followUpFilter === "dueThisWeek" ? null : "dueThisWeek")}
              data-testid="card-followup-week"
            >
              <CardContent className="pt-3 pb-3 px-3">
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="p-2 bg-blue-500 rounded-full">
                    <CalendarCheck className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {followUpStats?.dueThisWeek?.count || 0}
                  </div>
                  <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400">This Week</p>
                </div>
              </CardContent>
            </Card>

            {/* This Month Card */}
            <Card 
              className={`cursor-pointer transition-all ${
                followUpFilter === "dueThisMonth" 
                  ? "bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700 ring-2 ring-purple-500" 
                  : "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900"
              }`}
              onClick={() => setFollowUpFilter(followUpFilter === "dueThisMonth" ? null : "dueThisMonth")}
              data-testid="card-followup-month"
            >
              <CardContent className="pt-3 pb-3 px-3">
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="p-2 bg-purple-500 rounded-full">
                    <CalendarX2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {followUpStats?.dueThisMonth?.count || 0}
                  </div>
                  <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400">This Month</p>
                </div>
              </CardContent>
            </Card>

            {/* No Follow-Up Card */}
            <Card 
              className={`cursor-pointer transition-all ${
                followUpFilter === "noFollowUp" 
                  ? "bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 ring-2 ring-gray-500" 
                  : "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900"
              }`}
              onClick={() => setFollowUpFilter(followUpFilter === "noFollowUp" ? null : "noFollowUp")}
              data-testid="card-followup-none"
            >
              <CardContent className="pt-3 pb-3 px-3">
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="p-2 bg-gray-500 rounded-full">
                    <UserX className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {followUpStats?.noFollowUp?.count || 0}
                  </div>
                  <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">No Follow-Up</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Debtors Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {categoryFilter ? `${categoryFilter} Debtors` : "All Debtors"}
                  {followUpFilter && (
                    <span className="text-base font-normal text-gray-600 dark:text-gray-400 ml-2">
                      - {followUpFilter === "overdue" ? "Overdue" : 
                         followUpFilter === "dueToday" ? "Due Today" :
                         followUpFilter === "dueTomorrow" ? "Tomorrow" :
                         followUpFilter === "dueThisWeek" ? "This Week" :
                         followUpFilter === "dueThisMonth" ? "This Month" :
                         "No Follow-Up"}
                    </span>
                  )}
                </CardTitle>
                {followUpFilter && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Total Outstanding: <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(totalBalanceFiltered)}</span>
                  </p>
                )}
              </div>
              {(categoryFilter || followUpFilter) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCategoryFilter(null);
                    setFollowUpFilter(null);
                  }}
                  data-testid="button-clear-filter"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading debtors...</p>
              </div>
            ) : (
              <DebtorsTable
                data={filteredDebtors}
                onOpenFollowUp={handleOpenFollowUp}
                onOpenEmail={handleOpenEmail}
                onOpenCall={handleOpenCall}
              />
            )}
          </CardContent>
        </Card>

        {/* Follow-up Dialog */}
        <DebtorsFollowUpDialog
          open={isFollowUpDialogOpen}
          onOpenChange={setIsFollowUpDialogOpen}
          customer={selectedCustomer}
        />

        {/* Email Dialog */}
        <EmailDialog
          isOpen={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          moduleType="debtors"
          recordData={{
            customerName: selectedEmailCustomer?.name,
            customerEmail: selectedEmailCustomer?.email,
            balance: selectedEmailCustomer?.balance,
            overdueAmount: selectedEmailCustomer?.balance,
          }}
        />

        <CallDialog
          isOpen={isCallDialogOpen}
          onOpenChange={setIsCallDialogOpen}
          moduleType="debtors"
          recordData={{
            customerName: selectedDebtorForCall?.name || selectedDebtorForCall?.clientName || "",
            phoneNumber: selectedDebtorForCall?.mobile || selectedDebtorForCall?.primaryMobile || "",
            balance: selectedDebtorForCall?.balance || "",
            overdueAmount: selectedDebtorForCall?.overdueAmount || selectedDebtorForCall?.balance || "",
            customerId: selectedDebtorForCall?.id || selectedDebtorForCall?.customerId || "",
          }}
        />
      </div>
    </div>
  );
}
