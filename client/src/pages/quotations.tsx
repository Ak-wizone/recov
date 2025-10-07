import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Quotation } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { QuotationTable } from "@/components/quotation-table";
import { QuotationFormDialog } from "@/components/quotation-form-dialog";
import { QuotationSettingsDialog } from "@/components/quotation-settings-dialog";
import { QuotationPrintDialog } from "@/components/quotation-print-dialog";
import { EmailDialog } from "@/components/email-dialog";
import { CallDialog } from "@/components/call-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Plus,
  FileDown,
  FileText,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { isToday, isYesterday, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import html2pdf from "html2pdf.js";
import { openWhatsApp, getWhatsAppMessageTemplate } from "@/lib/whatsapp";

export default function Quotations() {
  const { toast } = useToast();
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printQuotation, setPrintQuotation] = useState<Quotation | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedQuotationForEmail, setSelectedQuotationForEmail] = useState<Quotation | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedQuotationForCall, setSelectedQuotationForCall] = useState<Quotation | null>(null);

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null);
  const [dateFilterMode, setDateFilterMode] = useState<"month" | "allTime" | "dateRange">("allTime");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const { data: quotations = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/quotations/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quotations.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quotations exported successfully",
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
      const response = await fetch(`/api/quotations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete quotation");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Success",
        description: "Quotation deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedQuotation(null);
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
      const response = await fetch("/api/quotations/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to delete quotations");
      }
      return await response.json();
    },
    onSuccess: (data: { count: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Success",
        description: `${data.count} quotation(s) deleted successfully`,
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

  const now = new Date();

  const filteredQuotationsByDate = quotations.filter(q => {
    const quotationDate = new Date(q.createdAt);
    
    if (dateFilterMode === "month") {
      return quotationDate.getMonth() === selectedMonth && quotationDate.getFullYear() === selectedYear;
    } else if (dateFilterMode === "dateRange") {
      if (!fromDate || !toDate) return true;
      const from = startOfDay(new Date(fromDate));
      const to = endOfDay(new Date(toDate));
      return isWithinInterval(quotationDate, { start: from, end: to });
    }
    return true;
  });

  const totalQuotations = filteredQuotationsByDate;
  const totalCount = totalQuotations.length;
  const totalAmount = totalQuotations.reduce((sum, q) => sum + parseFloat(q.grandTotal || "0"), 0);

  const thisWeekQuotations = filteredQuotationsByDate.filter(q => 
    isWithinInterval(new Date(q.createdAt), { start: startOfWeek(now), end: endOfWeek(now) })
  );
  const thisWeekCount = thisWeekQuotations.length;
  const thisWeekAmount = thisWeekQuotations.reduce((sum, q) => sum + parseFloat(q.grandTotal || "0"), 0);

  const todayQuotations = filteredQuotationsByDate.filter(q => isToday(new Date(q.createdAt)));
  const todayCount = todayQuotations.length;
  const todayAmount = todayQuotations.reduce((sum, q) => sum + parseFloat(q.grandTotal || "0"), 0);

  const yesterdayQuotations = filteredQuotationsByDate.filter(q => isYesterday(new Date(q.createdAt)));
  const yesterdayCount = yesterdayQuotations.length;
  const yesterdayAmount = yesterdayQuotations.reduce((sum, q) => sum + parseFloat(q.grandTotal || "0"), 0);

  const thisMonthQuotations = filteredQuotationsByDate.filter(q => 
    isWithinInterval(new Date(q.createdAt), { start: startOfMonth(now), end: endOfMonth(now) })
  );
  const thisMonthCount = thisMonthQuotations.length;
  const thisMonthAmount = thisMonthQuotations.reduce((sum, q) => sum + parseFloat(q.grandTotal || "0"), 0);

  let displayedQuotations = filteredQuotationsByDate;

  if (activeCardFilter) {
    switch (activeCardFilter) {
      case "total":
        displayedQuotations = totalQuotations;
        break;
      case "thisWeek":
        displayedQuotations = thisWeekQuotations;
        break;
      case "today":
        displayedQuotations = todayQuotations;
        break;
      case "yesterday":
        displayedQuotations = yesterdayQuotations;
        break;
      case "thisMonth":
        displayedQuotations = thisMonthQuotations;
        break;
    }
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent" data-testid="text-quotations-title">
              Quotations
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and track all quotations</p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setIsSettingsDialogOpen(true)}
              variant="outline"
              className="gap-2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800"
              data-testid="button-settings"
            >
              <FileText className="h-4 w-4" />
              T&C Settings
            </Button>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              data-testid="button-add"
            >
              <Plus className="h-4 w-4" />
              Add Quotation
            </Button>
            <Button
              onClick={() => exportMutation.mutate()}
              variant="outline"
              className="gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400"
              disabled={exportMutation.isPending}
              data-testid="button-export"
            >
              <FileDown className="h-4 w-4" />
              {exportMutation.isPending ? "Exporting..." : "Export"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              variant={dateFilterMode === "month" ? "default" : "outline"}
              onClick={() => setDateFilterMode("month")}
              className="gap-2"
              data-testid="button-filter-month"
            >
              <CalendarIcon className="h-4 w-4" />
              Month/Year
            </Button>
            <Button
              variant={dateFilterMode === "allTime" ? "default" : "outline"}
              onClick={() => setDateFilterMode("allTime")}
              className="gap-2"
              data-testid="button-filter-alltime"
            >
              <CalendarDays className="h-4 w-4" />
              All Time
            </Button>
            <Button
              variant={dateFilterMode === "dateRange" ? "default" : "outline"}
              onClick={() => setDateFilterMode("dateRange")}
              className="gap-2"
              data-testid="button-filter-daterange"
            >
              <CalendarRange className="h-4 w-4" />
              Date Range
            </Button>

            {dateFilterMode === "month" && (
              <>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger className="w-[140px] bg-white dark:bg-gray-800" data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-[120px] bg-white dark:bg-gray-800" data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
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
                  className="w-[160px] bg-white dark:bg-gray-800"
                  placeholder="From"
                  data-testid="input-from-date"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-[160px] bg-white dark:bg-gray-800"
                  placeholder="To"
                  data-testid="input-to-date"
                />
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card
            className={`cursor-pointer transition-all duration-300 border-2 ${
              activeCardFilter === "total"
                ? "border-indigo-500 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 scale-105"
                : "border-transparent hover:border-indigo-300 hover:shadow-md"
            } bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20`}
            onClick={() => setActiveCardFilter(activeCardFilter === "total" ? null : "total")}
            data-testid="card-total"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalCount}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Quotations</h3>
              <p className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">{formatCurrency(totalAmount)}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-300 border-2 ${
              activeCardFilter === "thisWeek"
                ? "border-blue-500 shadow-lg shadow-blue-200 dark:shadow-blue-900/30 scale-105"
                : "border-transparent hover:border-blue-300 hover:shadow-md"
            } bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20`}
            onClick={() => setActiveCardFilter(activeCardFilter === "thisWeek" ? null : "thisWeek")}
            data-testid="card-thisweek"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CalendarDays className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{thisWeekCount}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">This Week</h3>
              <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">{formatCurrency(thisWeekAmount)}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-300 border-2 ${
              activeCardFilter === "today"
                ? "border-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 scale-105"
                : "border-transparent hover:border-emerald-300 hover:shadow-md"
            } bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20`}
            onClick={() => setActiveCardFilter(activeCardFilter === "today" ? null : "today")}
            data-testid="card-today"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CalendarIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{todayCount}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Today</h3>
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(todayAmount)}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-300 border-2 ${
              activeCardFilter === "yesterday"
                ? "border-amber-500 shadow-lg shadow-amber-200 dark:shadow-amber-900/30 scale-105"
                : "border-transparent hover:border-amber-300 hover:shadow-md"
            } bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20`}
            onClick={() => setActiveCardFilter(activeCardFilter === "yesterday" ? null : "yesterday")}
            data-testid="card-yesterday"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CalendarIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{yesterdayCount}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Yesterday</h3>
              <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(yesterdayAmount)}</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all duration-300 border-2 ${
              activeCardFilter === "thisMonth"
                ? "border-purple-500 shadow-lg shadow-purple-200 dark:shadow-purple-900/30 scale-105"
                : "border-transparent hover:border-purple-300 hover:shadow-md"
            } bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20`}
            onClick={() => setActiveCardFilter(activeCardFilter === "thisMonth" ? null : "thisMonth")}
            data-testid="card-thismonth"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CalendarRange className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{thisMonthCount}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">This Month</h3>
              <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">{formatCurrency(thisMonthAmount)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <QuotationTable
              quotations={displayedQuotations}
              isLoading={isLoading}
              onEdit={(quotation) => {
                setSelectedQuotation(quotation);
                setIsAddDialogOpen(true);
              }}
              onDelete={(quotation) => {
                setSelectedQuotation(quotation);
                setIsDeleteDialogOpen(true);
              }}
              onBulkDelete={(ids) => {
                setBulkDeleteIds(ids);
                setIsBulkDeleteDialogOpen(true);
              }}
              onPrint={(quotation) => {
                setPrintQuotation(quotation);
                setIsPrintDialogOpen(true);
              }}
              onDownloadPDF={(quotation) => {
                setPrintQuotation(quotation);
                setIsPrintDialogOpen(true);
                setTimeout(() => {
                  const downloadBtn = document.querySelector('[data-testid="button-download-pdf-modal"]') as HTMLButtonElement;
                  if (downloadBtn) {
                    downloadBtn.click();
                  }
                }, 500);
              }}
              onEmail={(quotation) => {
                if (!quotation.leadEmail) {
                  toast({
                    title: "Error",
                    description: "Email address is not available for this quotation",
                    variant: "destructive",
                  });
                  return;
                }
                setSelectedQuotationForEmail(quotation);
                setIsEmailDialogOpen(true);
              }}
              onWhatsApp={(quotation) => {
                if (!quotation.leadMobile) {
                  toast({
                    title: "Error",
                    description: "Mobile number is not available for this quotation",
                    variant: "destructive",
                  });
                  return;
                }
                const message = getWhatsAppMessageTemplate("quotations", {
                  customerName: quotation.leadName,
                  quotationNumber: quotation.quotationNumber,
                  amount: quotation.grandTotal,
                });
                openWhatsApp(quotation.leadMobile, message);
              }}
              onCall={(quotation) => {
                if (!quotation.mobile) {
                  toast({
                    title: "Error",
                    description: "Mobile number is not available for this quotation",
                    variant: "destructive",
                  });
                  return;
                }
                setSelectedQuotationForCall(quotation);
                setIsCallDialogOpen(true);
              }}
            />
          </CardContent>
        </Card>
      </div>

      <QuotationFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        quotation={selectedQuotation}
      />

      <QuotationSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      />

      <QuotationPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        quotation={printQuotation}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedQuotation && deleteMutation.mutate(selectedQuotation.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-bulk-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Quotations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {bulkDeleteIds.length} quotation(s)? This action cannot be undone.
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

      <EmailDialog
        isOpen={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        moduleType="quotations"
        recordData={{
          customerName: selectedQuotationForEmail?.leadName || "",
          customerEmail: selectedQuotationForEmail?.leadEmail || "",
          quotationNumber: selectedQuotationForEmail?.quotationNumber || "",
          quotationId: selectedQuotationForEmail?.id || "",
          amount: selectedQuotationForEmail?.grandTotal || "",
        }}
      />

      <CallDialog
        isOpen={isCallDialogOpen}
        onOpenChange={setIsCallDialogOpen}
        moduleType="quotations"
        recordData={{
          customerName: selectedQuotationForCall?.leadName || "",
          phoneNumber: selectedQuotationForCall?.mobile || "",
          quotationNumber: selectedQuotationForCall?.quotationNumber || "",
          amount: selectedQuotationForCall?.grandTotal || "",
          customerId: selectedQuotationForCall?.leadId || "",
        }}
      />
    </div>
  );
}
