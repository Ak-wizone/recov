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
import { isToday, isYesterday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, addWeeks } from "date-fns";

export default function Receipts() {
  const { toast } = useToast();
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

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

  // Calculate receipt statistics
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Today's receipts
  const todayReceipts = receipts.filter(r => isToday(new Date(r.date)));
  const todayCount = todayReceipts.length;
  const todayAmount = todayReceipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  // Yesterday's receipts
  const yesterdayReceipts = receipts.filter(r => isYesterday(new Date(r.date)));
  const yesterdayCount = yesterdayReceipts.length;
  const yesterdayAmount = yesterdayReceipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  // Calculate weeks of current month
  const getWeekReceipts = (weekNumber: number) => {
    const weekStart = addWeeks(startOfWeek(monthStart, { weekStartsOn: 1 }), weekNumber - 1);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    const weekReceipts = receipts.filter(r => {
      const receiptDate = new Date(r.date);
      return isWithinInterval(receiptDate, { start: weekStart, end: weekEnd }) &&
             isWithinInterval(receiptDate, { start: monthStart, end: monthEnd });
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

  // Total receipts
  const totalCount = receipts.length;
  const totalAmount = receipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount), 0);

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

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-300">Total Receipts</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2" data-testid="text-total-count">
                  {totalCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                <ReceiptIcon className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-300">Total Amount</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2" data-testid="text-total-amount">
                  ₹{totalAmount.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-300" />
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
          receipts={receipts}
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
