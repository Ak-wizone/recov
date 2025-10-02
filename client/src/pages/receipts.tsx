import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Receipt } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { ReceiptTable } from "@/components/receipt-table";
import ReceiptFormDialog from "@/components/receipt-form-dialog";
import { ImportModal } from "@/components/import-modal";
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
import { Plus, FileDown, FileUp, Receipt as ReceiptIcon, DollarSign, Calendar, Clock, CalendarDays, CalendarRange, TrendingUp } from "lucide-react";
import { isToday, isYesterday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, addWeeks, getYear, getMonth, setYear, setMonth as setMonthFn } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CardFilter = "today" | "yesterday" | "week1" | "week2" | "week3" | "week4" | "week5" | "total" | null;

export default function Receipts() {
  const { toast } = useToast();
  const now = new Date();
  
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  
  // Year/Month selection and card filter state
  const [selectedYear, setSelectedYear] = useState(getYear(now));
  const [selectedMonth, setSelectedMonth] = useState(getMonth(now)); // 0-11
  const [activeFilter, setActiveFilter] = useState<CardFilter>(null);

  const { data: receipts = [], isLoading } = useQuery<Receipt[]>({
    queryKey: ["/api/receipts"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/receipts/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "receipts.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Receipts exported successfully",
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
      const response = await fetch("/api/receipts/template");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "receipts_template.xlsx";
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
      const response = await fetch(`/api/receipts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete receipt");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      toast({
        title: "Success",
        description: "Receipt deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedReceipt(null);
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
      const response = await fetch("/api/receipts/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to delete receipts");
      }
      return await response.json();
    },
    onSuccess: (data: { deleted: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      toast({
        title: "Success",
        description: `${data.deleted} receipt(s) deleted successfully`,
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

  // Calculate receipt statistics based on selected year/month
  const selectedDate = setMonthFn(setYear(new Date(), selectedYear), selectedMonth);
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  // Filter receipts for selected month/year
  const monthReceipts = receipts.filter(r => {
    const receiptDate = new Date(r.date);
    return isWithinInterval(receiptDate, { start: monthStart, end: monthEnd });
  });

  // Today's receipts (only if in selected month)
  const todayReceipts = monthReceipts.filter(r => {
    const receiptDate = new Date(r.date);
    return isToday(receiptDate) && 
           getYear(receiptDate) === selectedYear && 
           getMonth(receiptDate) === selectedMonth;
  });
  const todayCount = todayReceipts.length;
  const todayAmount = todayReceipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  // Yesterday's receipts (only if in selected month)
  const yesterdayReceipts = monthReceipts.filter(r => {
    const receiptDate = new Date(r.date);
    return isYesterday(receiptDate) && 
           getYear(receiptDate) === selectedYear && 
           getMonth(receiptDate) === selectedMonth;
  });
  const yesterdayCount = yesterdayReceipts.length;
  const yesterdayAmount = yesterdayReceipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  // Calculate weeks of selected month
  const getWeekReceipts = (weekNumber: number) => {
    const weekStart = addWeeks(startOfWeek(monthStart, { weekStartsOn: 1 }), weekNumber - 1);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    const weekReceipts = monthReceipts.filter(r => {
      const receiptDate = new Date(r.date);
      return isWithinInterval(receiptDate, { start: weekStart, end: weekEnd });
    });
    
    return {
      count: weekReceipts.length,
      amount: weekReceipts.reduce((sum, r) => sum + parseFloat(r.amount), 0)
    };
  };

  const week1 = getWeekReceipts(1);
  const week2 = getWeekReceipts(2);
  const week3 = getWeekReceipts(3);
  const week4 = getWeekReceipts(4);
  const week5 = getWeekReceipts(5);

  // Total receipts for selected month
  const totalCount = monthReceipts.length;
  const totalAmount = monthReceipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount), 0);

  // Filter receipts for table based on active card filter
  const getFilteredReceipts = () => {
    if (!activeFilter) return monthReceipts;
    
    switch (activeFilter) {
      case "today":
        return todayReceipts;
      case "yesterday":
        return yesterdayReceipts;
      case "week1":
        return monthReceipts.filter(r => {
          const weekStart = addWeeks(startOfWeek(monthStart, { weekStartsOn: 1 }), 0);
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const receiptDate = new Date(r.date);
          return isWithinInterval(receiptDate, { start: weekStart, end: weekEnd });
        });
      case "week2":
        return monthReceipts.filter(r => {
          const weekStart = addWeeks(startOfWeek(monthStart, { weekStartsOn: 1 }), 1);
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const receiptDate = new Date(r.date);
          return isWithinInterval(receiptDate, { start: weekStart, end: weekEnd });
        });
      case "week3":
        return monthReceipts.filter(r => {
          const weekStart = addWeeks(startOfWeek(monthStart, { weekStartsOn: 1 }), 2);
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const receiptDate = new Date(r.date);
          return isWithinInterval(receiptDate, { start: weekStart, end: weekEnd });
        });
      case "week4":
        return monthReceipts.filter(r => {
          const weekStart = addWeeks(startOfWeek(monthStart, { weekStartsOn: 1 }), 3);
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const receiptDate = new Date(r.date);
          return isWithinInterval(receiptDate, { start: weekStart, end: weekEnd });
        });
      case "week5":
        return monthReceipts.filter(r => {
          const weekStart = addWeeks(startOfWeek(monthStart, { weekStartsOn: 1 }), 4);
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const receiptDate = new Date(r.date);
          return isWithinInterval(receiptDate, { start: weekStart, end: weekEnd });
        });
      case "total":
        return monthReceipts;
      default:
        return monthReceipts;
    }
  };

  const filteredReceipts = getFilteredReceipts();

  const handleEdit = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = (ids: string[]) => {
    setBulkDeleteIds(ids);
    setIsBulkDeleteDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedReceipt(null);
    setIsAddDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Receipts</h1>
          <p className="text-muted-foreground mt-1">Manage and track all receipts</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2" data-testid="button-add-receipt">
          <Plus className="h-4 w-4" />
          Add Receipt
        </Button>
      </div>

      {/* Year/Month Selector */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by:</span>
        </div>
        <Select 
          value={selectedYear.toString()} 
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-32" data-testid="select-year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => getYear(now) - 2 + i).map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select 
          value={selectedMonth.toString()} 
          onValueChange={(value) => setSelectedMonth(parseInt(value))}
        >
          <SelectTrigger className="w-40" data-testid="select-month">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
              <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeFilter && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setActiveFilter(null)}
            className="gap-2"
            data-testid="button-clear-filter"
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today Card */}
        <Card 
          className={`bg-pastel-blue border-0 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-in fade-in slide-in-from-bottom-3 ${activeFilter === 'today' ? 'ring-4 ring-pastel-blue-icon ring-opacity-50 scale-105' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'today' ? null : 'today')}
          data-testid="card-today"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-pastel-blue-icon p-3 rounded-xl text-white shadow-md flex-shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Today</p>
                <p className="text-2xl font-bold text-pastel-blue-icon" data-testid="text-today-amount">
                  ₹{todayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-1" data-testid="text-today-count">
                  {todayCount} receipt{todayCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Yesterday Card */}
        <Card 
          className={`bg-pastel-green border-0 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-in fade-in slide-in-from-bottom-3 ${activeFilter === 'yesterday' ? 'ring-4 ring-pastel-green-icon ring-opacity-50 scale-105' : ''}`}
          style={{ animationDelay: '100ms' }}
          onClick={() => setActiveFilter(activeFilter === 'yesterday' ? null : 'yesterday')}
          data-testid="card-yesterday"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-pastel-green-icon p-3 rounded-xl text-white shadow-md flex-shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Yesterday</p>
                <p className="text-2xl font-bold text-pastel-green-icon" data-testid="text-yesterday-amount">
                  ₹{yesterdayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-1" data-testid="text-yesterday-count">
                  {yesterdayCount} receipt{yesterdayCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week 1 Card */}
        <Card 
          className={`bg-pastel-orange border-0 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-in fade-in slide-in-from-bottom-3 ${activeFilter === 'week1' ? 'ring-4 ring-pastel-orange-icon ring-opacity-50 scale-105' : ''}`}
          style={{ animationDelay: '200ms' }}
          onClick={() => setActiveFilter(activeFilter === 'week1' ? null : 'week1')}
          data-testid="card-week1"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-pastel-orange-icon p-3 rounded-xl text-white shadow-md flex-shrink-0">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Week 1</p>
                <p className="text-2xl font-bold text-pastel-orange-icon" data-testid="text-week1-amount">
                  ₹{week1.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-1" data-testid="text-week1-count">
                  {week1.count} receipt{week1.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week 2 Card */}
        <Card 
          className={`bg-pastel-teal border-0 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-in fade-in slide-in-from-bottom-3 ${activeFilter === 'week2' ? 'ring-4 ring-pastel-teal-icon ring-opacity-50 scale-105' : ''}`}
          style={{ animationDelay: '300ms' }}
          onClick={() => setActiveFilter(activeFilter === 'week2' ? null : 'week2')}
          data-testid="card-week2"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-pastel-teal-icon p-3 rounded-xl text-white shadow-md flex-shrink-0">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Week 2</p>
                <p className="text-2xl font-bold text-pastel-teal-icon" data-testid="text-week2-amount">
                  ₹{week2.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-1" data-testid="text-week2-count">
                  {week2.count} receipt{week2.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week 3 Card */}
        <Card 
          className={`bg-pastel-purple border-0 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-in fade-in slide-in-from-bottom-3 ${activeFilter === 'week3' ? 'ring-4 ring-pastel-purple-icon ring-opacity-50 scale-105' : ''}`}
          style={{ animationDelay: '400ms' }}
          onClick={() => setActiveFilter(activeFilter === 'week3' ? null : 'week3')}
          data-testid="card-week3"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-pastel-purple-icon p-3 rounded-xl text-white shadow-md flex-shrink-0">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Week 3</p>
                <p className="text-2xl font-bold text-pastel-purple-icon" data-testid="text-week3-amount">
                  ₹{week3.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-1" data-testid="text-week3-count">
                  {week3.count} receipt{week3.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week 4 Card */}
        <Card 
          className={`bg-pastel-blue border-0 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-in fade-in slide-in-from-bottom-3 ${activeFilter === 'week4' ? 'ring-4 ring-pastel-blue-icon ring-opacity-50 scale-105' : ''}`}
          style={{ animationDelay: '500ms' }}
          onClick={() => setActiveFilter(activeFilter === 'week4' ? null : 'week4')}
          data-testid="card-week4"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-pastel-blue-icon p-3 rounded-xl text-white shadow-md flex-shrink-0">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Week 4</p>
                <p className="text-2xl font-bold text-pastel-blue-icon" data-testid="text-week4-amount">
                  ₹{week4.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-1" data-testid="text-week4-count">
                  {week4.count} receipt{week4.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week 5 Card */}
        <Card 
          className={`bg-pastel-green border-0 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-in fade-in slide-in-from-bottom-3 ${activeFilter === 'week5' ? 'ring-4 ring-pastel-green-icon ring-opacity-50 scale-105' : ''}`}
          style={{ animationDelay: '600ms' }}
          onClick={() => setActiveFilter(activeFilter === 'week5' ? null : 'week5')}
          data-testid="card-week5"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-pastel-green-icon p-3 rounded-xl text-white shadow-md flex-shrink-0">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Week 5</p>
                <p className="text-2xl font-bold text-pastel-green-icon" data-testid="text-week5-amount">
                  ₹{week5.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-1" data-testid="text-week5-count">
                  {week5.count} receipt{week5.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Card */}
        <Card 
          className={`bg-pastel-indigo border-0 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-in fade-in slide-in-from-bottom-3 ${activeFilter === 'total' ? 'ring-4 ring-pastel-indigo-icon ring-opacity-50 scale-105' : ''}`}
          style={{ animationDelay: '700ms' }}
          onClick={() => setActiveFilter(activeFilter === 'total' ? null : 'total')}
          data-testid="card-total"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-pastel-indigo-icon p-3 rounded-xl text-white shadow-md flex-shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Total</p>
                <p className="text-2xl font-bold text-pastel-indigo-icon" data-testid="text-total-amount">
                  ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-600 mt-1" data-testid="text-total-count">
                  {totalCount} receipt{totalCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="gap-2"
          data-testid="button-export"
        >
          <FileDown className="h-4 w-4" />
          Export
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsImportDialogOpen(true)}
          className="gap-2"
          data-testid="button-import"
        >
          <FileUp className="h-4 w-4" />
          Import
        </Button>
        <Button
          variant="outline"
          onClick={() => downloadTemplateMutation.mutate()}
          disabled={downloadTemplateMutation.isPending}
          className="gap-2"
          data-testid="button-template"
        >
          <FileDown className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <ReceiptTable
          receipts={filteredReceipts}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
        />
      </div>

      {/* Add Dialog */}
      <ReceiptFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {/* Edit Dialog */}
      <ReceiptFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        receipt={selectedReceipt || undefined}
      />

      {/* Import Dialog */}
      <ImportModal
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        module="receipts"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the receipt "{selectedReceipt?.voucherNumber}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedReceipt && deleteMutation.mutate(selectedReceipt.id)}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Receipts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {bulkDeleteIds.length} receipt(s). This action cannot be undone.
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
    </div>
  );
}
