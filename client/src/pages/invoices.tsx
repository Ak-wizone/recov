import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Invoice } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { InvoiceTable } from "@/components/invoice-table";
import InvoiceFormDialog from "@/components/invoice-form-dialog";
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
import { Plus, FileDown, FileUp, X, CheckCircle2, AlertCircle, Clock, Users } from "lucide-react";
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
  
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
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

  // Filter invoices by selected month and year
  const monthFilteredInvoices = invoices.filter((invoice) => {
    const invoiceDate = new Date(invoice.invoiceDate);
    return (
      invoiceDate.getFullYear() === selectedYear &&
      invoiceDate.getMonth() === selectedMonth
    );
  });

  // Calculate statistics for cards based on month-filtered data
  const paidInvoices = monthFilteredInvoices.filter(inv => inv.status === "Paid");
  const paidCount = paidInvoices.length;
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0);
  const paidProfit = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.netProfit), 0);

  const unpaidInvoices = monthFilteredInvoices.filter(inv => inv.status === "Unpaid");
  const unpaidCount = unpaidInvoices.length;
  const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0);
  const unpaidProfit = unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.netProfit), 0);

  const partialInvoices = monthFilteredInvoices.filter(inv => inv.status === "Partial");
  const partialCount = partialInvoices.length;
  const partialAmount = partialInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0);
  const partialProfit = partialInvoices.reduce((sum, inv) => sum + parseFloat(inv.netProfit), 0);

  const totalCount = monthFilteredInvoices.length;
  const totalAmount = monthFilteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0);
  const totalProfit = monthFilteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.netProfit), 0);

  // Filter table data by month/year, status filter, assigned user, and active card
  const filteredInvoices = invoices.filter((invoice) => {
    const invoiceDate = new Date(invoice.invoiceDate);
    const matchesMonth = invoiceDate.getFullYear() === selectedYear && invoiceDate.getMonth() === selectedMonth;
    
    let matchesStatusFilter = true;
    if (statusFilter) {
      matchesStatusFilter = invoice.status === statusFilter;
    }

    let matchesAssignedUserFilter = true;
    if (assignedUserFilter) {
      matchesAssignedUserFilter = invoice.assignedUser === assignedUserFilter;
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

      {/* Month and Year Selection */}
      <div className="flex gap-3 items-center">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all border-2 ${
            activeCardFilter === null
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
          }`}
          onClick={() => setActiveCardFilter(null)}
          data-testid="card-all-invoices"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalCount}</p>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  ₹{totalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Profit: ₹{totalProfit.toFixed(2)}
                </p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-2 ${
            activeCardFilter === "Paid"
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : "border-gray-200 dark:border-gray-700 hover:border-green-300"
          }`}
          onClick={() => setActiveCardFilter(activeCardFilter === "Paid" ? null : "Paid")}
          data-testid="card-paid"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{paidCount}</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  ₹{paidAmount.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Profit: ₹{paidProfit.toFixed(2)}
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-2 ${
            activeCardFilter === "Unpaid"
              ? "border-red-500 bg-red-50 dark:bg-red-950/30"
              : "border-gray-200 dark:border-gray-700 hover:border-red-300"
          }`}
          onClick={() => setActiveCardFilter(activeCardFilter === "Unpaid" ? null : "Unpaid")}
          data-testid="card-unpaid"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unpaid</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{unpaidCount}</p>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  ₹{unpaidAmount.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Profit: ₹{unpaidProfit.toFixed(2)}
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all border-2 ${
            activeCardFilter === "Partial"
              ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
              : "border-gray-200 dark:border-gray-700 hover:border-yellow-300"
          }`}
          onClick={() => setActiveCardFilter(activeCardFilter === "Partial" ? null : "Partial")}
          data-testid="card-partial"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Partial</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{partialCount}</p>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  ₹{partialAmount.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Profit: ₹{partialProfit.toFixed(2)}
                </p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500" />
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
          onBulkDelete={handleBulkDelete}
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
    </div>
  );
}
