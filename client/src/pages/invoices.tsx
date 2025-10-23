import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Invoice } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { InvoiceTable } from "@/components/invoice-table";
import InvoiceFormDialog from "@/components/invoice-form-dialog";
import { ImportModal } from "@/components/import-modal";
import { EmailDialog } from "@/components/email-dialog";
import { CallDialog } from "@/components/call-dialog";
import { InterestCalculatorDialog } from "@/components/interest-calculator-dialog";
import { openWhatsApp, getWhatsAppMessageTemplate } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, FileDown, FileUp, X, CheckCircle2, AlertCircle, Clock, Users, DollarSign, TrendingUp, Wallet, MessageSquare, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Invoices() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [assignedUserFilter, setAssignedUserFilter] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedInvoiceForCall, setSelectedInvoiceForCall] = useState<Invoice | null>(null);
  const [selectedInvoiceIdForCalculator, setSelectedInvoiceIdForCalculator] = useState<string | null>(null);
  
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null);
  
  // Date filter mode state
  const [dateFilterMode, setDateFilterMode] = useState<"month" | "allTime" | "dateRange">("allTime");
  const [dateRangeFrom, setDateRangeFrom] = useState("");
  const [dateRangeTo, setDateRangeTo] = useState("");

  // Table filters state
  const [tableFilters, setTableFilters] = useState<{ globalFilter: string; columnFilters: any[] }>({ 
    globalFilter: "", 
    columnFilters: [] 
  });

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: dashboardStats } = useQuery<{
    totalInvoicesAmount: number;
    paidInvoicesAmount: number;
    partialPaidAmount: number;
    partialBalanceAmount: number;
    unpaidInvoicesAmount: number;
    totalPaidAmount: number;
    totalInterestAmount: number;
    interestApplicableInvoicesCount: number;
    debtorsBalance: number;
    totalInvoicesCount: number;
    paidInvoicesCount: number;
    partialInvoicesCount: number;
    unpaidInvoicesCount: number;
    debtorsCount: number;
  }>({
    queryKey: ["/api/invoices/dashboard-stats", dateFilterMode, selectedYear, selectedMonth, dateRangeFrom, dateRangeTo, tableFilters.globalFilter, JSON.stringify(tableFilters.columnFilters)],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("dateFilterMode", dateFilterMode);
      
      if (dateFilterMode === "month") {
        params.append("selectedYear", selectedYear.toString());
        params.append("selectedMonth", selectedMonth.toString());
      } else if (dateFilterMode === "dateRange") {
        if (dateRangeFrom) params.append("dateRangeFrom", dateRangeFrom);
        if (dateRangeTo) params.append("dateRangeTo", dateRangeTo);
      }

      // Add table filters
      params.append("globalFilter", tableFilters.globalFilter);
      if (tableFilters.columnFilters.length > 0) {
        params.append("columnFilters", JSON.stringify(tableFilters.columnFilters));
      }
      
      const response = await fetch(`/api/invoices/dashboard-stats?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }
      return response.json();
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/invoices/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "invoices.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoices exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/invoices/template");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "invoices_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template downloaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete invoice");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debtors"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedInvoice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch("/api/invoices/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to delete invoices");
      }
      return await response.json();
    },
    onSuccess: (data: { deleted: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debtors"] });
      toast({
        title: "Success",
        description: `${data.deleted} invoice(s) deleted successfully`,
      });
      setIsBulkDeleteDialogOpen(false);
      setBulkDeleteIds([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter table data by date filter mode, status filter, assigned user, and active card
  const filteredInvoices = invoices.filter((invoice) => {
    const invoiceDate = new Date(invoice.invoiceDate);
    
    let matchesMonth = true;
    if (dateFilterMode === "allTime") {
      matchesMonth = true;
    } else if (dateFilterMode === "dateRange") {
      if (!dateRangeFrom && !dateRangeTo) {
        matchesMonth = true;
      } else {
        const fromDate = dateRangeFrom ? new Date(dateRangeFrom) : new Date(0);
        const toDate = dateRangeTo ? new Date(dateRangeTo) : new Date();
        toDate.setHours(23, 59, 59, 999);
        matchesMonth = invoiceDate >= fromDate && invoiceDate <= toDate;
      }
    } else {
      matchesMonth = invoiceDate.getFullYear() === selectedYear && invoiceDate.getMonth() === selectedMonth;
    }
    
    let matchesStatusFilter = true;
    if (statusFilter) {
      matchesStatusFilter = invoice.status === statusFilter;
    }

    let matchesAssignedUserFilter = true;
    if (assignedUserFilter) {
      matchesAssignedUserFilter = invoice.salesPerson === assignedUserFilter;
    }

    let matchesCardFilter = true;
    if (activeCardFilter) {
      matchesCardFilter = invoice.status === activeCardFilter;
    }

    return matchesMonth && matchesStatusFilter && matchesAssignedUserFilter && matchesCardFilter;
  });

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = (ids: string[]) => {
    setBulkDeleteIds(ids);
    setIsBulkDeleteDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedInvoice(null);
    setIsAddDialogOpen(true);
  };

  const handleWhatsApp = (invoice: Invoice) => {
    if (!invoice.primaryMobile) {
      toast({
        title: "Error",
        description: "Customer mobile number is not available",
        variant: "destructive",
      });
      return;
    }

    const message = getWhatsAppMessageTemplate("invoices", {
      customerName: invoice.customerName,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.invoiceAmount,
    });

    openWhatsApp(invoice.primaryMobile, message);
  };

  const handleEmail = (invoice: Invoice) => {
    const dueDate = invoice.paymentTerms 
      ? new Date(new Date(invoice.invoiceDate).getTime() + invoice.paymentTerms * 24 * 60 * 60 * 1000)
      : new Date(invoice.invoiceDate);

    setSelectedInvoiceForEmail(invoice);
    setIsEmailDialogOpen(true);
  };

  const handleCall = (invoice: Invoice) => {
    if (!invoice.primaryMobile) {
      toast({
        title: "Error",
        description: "Customer mobile number is not available",
        variant: "destructive",
      });
      return;
    }
    setSelectedInvoiceForCall(invoice);
    setIsCallDialogOpen(true);
  };

  const handleCalculator = (invoice: Invoice) => {
    setSelectedInvoiceIdForCalculator(invoice.id);
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage and track all invoices</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2" data-testid="button-add-invoice">
          <Plus className="h-4 w-4" />
          Add Invoice
        </Button>
      </div>

      {/* Date Filter Mode Selector */}
      <div className="flex gap-3 items-center">
        <Select 
          value={dateFilterMode} 
          onValueChange={(value: "month" | "allTime" | "dateRange") => {
            setDateFilterMode(value);
            setActiveCardFilter(null);
          }}
        >
          <SelectTrigger className="w-[160px]" data-testid="select-date-filter-mode">
            <SelectValue placeholder="Select filter mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month/Year</SelectItem>
            <SelectItem value="allTime">All Time</SelectItem>
            <SelectItem value="dateRange">Date Range</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Month/Year Selectors - Show only when dateFilterMode is "month" */}
        {dateFilterMode === "month" && (
          <>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-year">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-[160px]" data-testid="select-month">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">January</SelectItem>
                <SelectItem value="1">February</SelectItem>
                <SelectItem value="2">March</SelectItem>
                    <SelectItem value="3">April</SelectItem>
                <SelectItem value="4">May</SelectItem>
                <SelectItem value="5">June</SelectItem>
                <SelectItem value="6">July</SelectItem>
                <SelectItem value="7">August</SelectItem>
                <SelectItem value="8">September</SelectItem>
                <SelectItem value="9">October</SelectItem>
                <SelectItem value="10">November</SelectItem>
                <SelectItem value="11">December</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
        
        {/* Date Range Inputs - Show only when dateFilterMode is "dateRange" */}
        {dateFilterMode === "dateRange" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">From:</span>
              <Input
                type="date"
                value={dateRangeFrom}
                onChange={(e) => setDateRangeFrom(e.target.value)}
                className="w-40"
                data-testid="input-date-from"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">To:</span>
              <Input
                type="date"
                value={dateRangeTo}
                onChange={(e) => setDateRangeTo(e.target.value)}
                className="w-40"
                data-testid="input-date-to"
              />
            </div>
          </>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-3">
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={assignedUserFilter || "all"}
            onValueChange={(value) => setAssignedUserFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-assigned-user-filter">
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="Manpreet Bedi">Manpreet Bedi</SelectItem>
              <SelectItem value="Bilal Ahamad">Bilal Ahamad</SelectItem>
              <SelectItem value="Anjali Dhiman">Anjali Dhiman</SelectItem>
              <SelectItem value="Princi Soni">Princi Soni</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter || assignedUserFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter(null);
                setAssignedUserFilter(null);
              }}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => downloadTemplateMutation.mutate()}
            disabled={downloadTemplateMutation.isPending}
            data-testid="button-download-template"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
            data-testid="button-import"
          >
            <FileUp className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            data-testid="button-export"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all border-0 ${
            activeCardFilter === null
              ? "bg-blue-100 dark:bg-blue-900/40 shadow-md"
              : "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          }`}
          onClick={() => setActiveCardFilter(null)}
          data-testid="card-total-invoices"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 p-3 rounded-xl flex-shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Total Invoices</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 break-all">
                  ₹{(dashboardStats?.totalInvoicesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dashboardStats?.totalInvoicesCount || 0} invoice{(dashboardStats?.totalInvoicesCount || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-0 ${
            activeCardFilter === "Paid"
              ? "bg-green-100 dark:bg-green-900/40 shadow-md"
              : "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40"
          }`}
          onClick={() => setActiveCardFilter(activeCardFilter === "Paid" ? null : "Paid")}
          data-testid="card-paid-invoices"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-green-500 p-3 rounded-xl flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Paid Invoices</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400 break-all">
                  ₹{(dashboardStats?.paidInvoicesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dashboardStats?.paidInvoicesCount || 0} invoice{(dashboardStats?.paidInvoicesCount || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-0 ${
            activeCardFilter === "Partial"
              ? "bg-yellow-100 dark:bg-yellow-900/40 shadow-md"
              : "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
          }`}
          onClick={() => setActiveCardFilter(activeCardFilter === "Partial" ? null : "Partial")}
          data-testid="card-partial-paid"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500 p-3 rounded-xl flex-shrink-0">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Partial Paid</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 break-all">
                  ₹{(dashboardStats?.partialPaidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dashboardStats?.partialInvoicesCount || 0} invoice{(dashboardStats?.partialInvoicesCount || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all border-0 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40"
          data-testid="card-partial-balance"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-orange-500 p-3 rounded-xl flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Partial Balance</p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400 break-all">
                  ₹{(dashboardStats?.partialBalanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Outstanding on partial invoices
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-0 ${
            activeCardFilter === "Unpaid"
              ? "bg-red-100 dark:bg-red-900/40 shadow-md"
              : "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40"
          }`}
          onClick={() => setActiveCardFilter(activeCardFilter === "Unpaid" ? null : "Unpaid")}
          data-testid="card-unpaid-invoices"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-red-500 p-3 rounded-xl flex-shrink-0">
                <X className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Unpaid Invoices</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 break-all">
                  ₹{(dashboardStats?.unpaidInvoicesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dashboardStats?.unpaidInvoicesCount || 0} invoice{(dashboardStats?.unpaidInvoicesCount || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all border-0 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40"
          data-testid="card-total-paid"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-teal-500 p-3 rounded-xl flex-shrink-0">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Total Paid Amount</p>
                <p className="text-xl font-bold text-teal-600 dark:text-teal-400 break-all">
                  ₹{(dashboardStats?.totalPaidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all border-0 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40"
          data-testid="card-total-interest"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-purple-500 p-3 rounded-xl flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Total Interest</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400 break-all">
                  ₹{(dashboardStats?.totalInterestAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dashboardStats?.interestApplicableInvoicesCount || 0} invoice{(dashboardStats?.interestApplicableInvoicesCount || 0) !== 1 ? 's' : ''} with interest
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all border-0 bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/40"
          data-testid="card-debtors-balance"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-pink-500 p-3 rounded-xl flex-shrink-0">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Unpaid + Opening Balance</p>
                <p className="text-xl font-bold text-pink-600 dark:text-pink-400 break-all">
                  ₹{(dashboardStats?.debtorsBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dashboardStats?.debtorsCount || 0} debtor{(dashboardStats?.debtorsCount || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Table */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <InvoiceTable
          invoices={filteredInvoices}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCalculator={handleCalculator}
          onWhatsApp={handleWhatsApp}
          onEmail={handleEmail}
          onCall={handleCall}
          onBulkDelete={handleBulkDelete}
          onFiltersChange={setTableFilters}
        />
      </div>

      {/* Add Dialog */}
      <InvoiceFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {/* Edit Dialog */}
      <InvoiceFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        invoice={selectedInvoice || undefined}
      />

      {/* Import Dialog */}
      <ImportModal
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        module="invoices"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedInvoice && deleteMutation.mutate(selectedInvoice.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-bulk-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Invoices</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {bulkDeleteIds.length} invoice(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(bulkDeleteIds)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-bulk-delete"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Dialog */}
      {selectedInvoiceForEmail && (
        <EmailDialog
          isOpen={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          moduleType="invoices"
          recordData={{
            customerName: selectedInvoiceForEmail.customerName,
            customerEmail: "",
            invoiceNumber: selectedInvoiceForEmail.invoiceNumber,
            invoiceId: selectedInvoiceForEmail.id,
            amount: selectedInvoiceForEmail.invoiceAmount,
            dueDate: selectedInvoiceForEmail.paymentTerms 
              ? new Date(new Date(selectedInvoiceForEmail.invoiceDate).getTime() + selectedInvoiceForEmail.paymentTerms * 24 * 60 * 60 * 1000).toISOString()
              : new Date(selectedInvoiceForEmail.invoiceDate).toISOString(),
          }}
        />
      )}

      <CallDialog
        isOpen={isCallDialogOpen}
        onOpenChange={setIsCallDialogOpen}
        moduleType="invoices"
        recordData={{
          customerName: selectedInvoiceForCall?.customerName || "",
          phoneNumber: selectedInvoiceForCall?.primaryMobile || "",
          invoiceNumber: selectedInvoiceForCall?.invoiceNumber || "",
          amount: selectedInvoiceForCall?.invoiceAmount || "",
          dueDate: selectedInvoiceForCall?.paymentTerms 
            ? new Date(new Date(selectedInvoiceForCall.invoiceDate).getTime() + selectedInvoiceForCall.paymentTerms * 24 * 60 * 60 * 1000).toISOString()
            : new Date(selectedInvoiceForCall?.invoiceDate || new Date()).toISOString(),
        }}
      />

      {/* Interest Calculator Dialog */}
      <InterestCalculatorDialog
        invoiceId={selectedInvoiceIdForCalculator}
        onClose={() => setSelectedInvoiceIdForCalculator(null)}
      />
    </div>
  );
}
