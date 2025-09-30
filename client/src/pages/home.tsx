import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { DashboardCards } from "@/components/dashboard-cards";
import { CustomersTable } from "@/components/customers-table";
import { CustomerFormDialog } from "@/components/customer-form-dialog";
import { PaymentDialog } from "@/components/payment-dialog";
import { PaymentHistoryDialog } from "@/components/payment-history-dialog";
import { FollowUpDialog } from "@/components/followup-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { ExcelImportDialog } from "@/components/excel-import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, FileDown, FileUp, Search, X, AlertCircle, Clock, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { isToday, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";

type FollowUpFilter = "overdue" | "today" | "upcoming" | "none" | null;

export default function Home() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [isFollowUpDialogOpen, setIsFollowUpDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/customers/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customers exported successfully",
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch("/api/customers/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to delete customers");
      }
      return await response.json();
    },
    onSuccess: (data: { deleted: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: `${data.deleted} customer(s) deleted successfully`,
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

  // Calculate follow-up filter counts
  const now = new Date();
  const overdueCount = customers.filter(c => 
    c.nextFollowUpDate && isBefore(new Date(c.nextFollowUpDate), now)
  ).length;
  const dueTodayCount = customers.filter(c => 
    c.nextFollowUpDate && isToday(new Date(c.nextFollowUpDate))
  ).length;
  const upcomingCount = customers.filter(c => 
    c.nextFollowUpDate && isAfter(new Date(c.nextFollowUpDate), endOfDay(now))
  ).length;
  const noFollowUpCount = customers.filter(c => !c.nextFollowUpDate).length;

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.mobile.includes(searchQuery);
    const matchesCategory = categoryFilter === "all" || !categoryFilter || customer.category === categoryFilter;
    
    let matchesFollowUpFilter = true;
    if (followUpFilter) {
      const followUpDate = customer.nextFollowUpDate ? new Date(customer.nextFollowUpDate) : null;
      
      switch (followUpFilter) {
        case "overdue":
          matchesFollowUpFilter = followUpDate ? isBefore(followUpDate, now) : false;
          break;
        case "today":
          matchesFollowUpFilter = followUpDate ? isToday(followUpDate) : false;
          break;
        case "upcoming":
          matchesFollowUpFilter = followUpDate ? isAfter(followUpDate, endOfDay(now)) : false;
          break;
        case "none":
          matchesFollowUpFilter = !followUpDate;
          break;
      }
    }
    
    return matchesSearch && matchesCategory && matchesFollowUpFilter;
  });

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditDialogOpen(true);
  };

  const handlePayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsPaymentHistoryOpen(true);
  };

  const handleFollowUp = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFollowUpDialogOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleWhatsApp = (customer: Customer) => {
    const message = encodeURIComponent(`Hello ${customer.name}, this is regarding your outstanding balance of $${customer.amountOwed}.`);
    const phoneNumber = customer.mobile.replace(/\D/g, '');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleEmail = (customer: Customer) => {
    const subject = encodeURIComponent('Outstanding Balance Notice');
    const body = encodeURIComponent(`Dear ${customer.name},\n\nThis is regarding your outstanding balance of $${customer.amountOwed}.\n\nBest regards`);
    window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
  };

  const handleBulkDelete = (ids: string[]) => {
    setBulkDeleteIds(ids);
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(bulkDeleteIds);
  };

  const clearFollowUpFilter = () => {
    setFollowUpFilter(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-[#2563EB]">
                DebtTracker Pro
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                data-testid="button-add-customer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
              <Button
                onClick={() => setIsImportDialogOpen(true)}
                className="bg-[#059669] hover:bg-[#047857] text-white"
                data-testid="button-import-excel"
              >
                <FileUp className="mr-2 h-4 w-4" />
                Import Excel
              </Button>
              <Button
                onClick={() => exportMutation.mutate()}
                variant="secondary"
                className="bg-[#1E293B] hover:bg-[#0F172A] text-white"
                data-testid="button-export-excel"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Cards */}
        <DashboardCards customers={customers} />

        {/* Follow-Up Filter Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card
            className={`cursor-pointer transition-all border-2 ${
              followUpFilter === "overdue" ? "border-red-500 bg-red-50" : "border-[#E2E8F0] hover:border-red-300"
            }`}
            onClick={() => setFollowUpFilter(followUpFilter === "overdue" ? null : "overdue")}
            data-testid="card-filter-overdue"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue Follow-Ups</p>
                  <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${
              followUpFilter === "today" ? "border-orange-500 bg-orange-50" : "border-[#E2E8F0] hover:border-orange-300"
            }`}
            onClick={() => setFollowUpFilter(followUpFilter === "today" ? null : "today")}
            data-testid="card-filter-today"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Due Today</p>
                  <p className="text-2xl font-bold text-orange-600">{dueTodayCount}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${
              followUpFilter === "upcoming" ? "border-blue-500 bg-blue-50" : "border-[#E2E8F0] hover:border-blue-300"
            }`}
            onClick={() => setFollowUpFilter(followUpFilter === "upcoming" ? null : "upcoming")}
            data-testid="card-filter-upcoming"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-600">{upcomingCount}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${
              followUpFilter === "none" ? "border-gray-500 bg-gray-50" : "border-[#E2E8F0] hover:border-gray-300"
            }`}
            onClick={() => setFollowUpFilter(followUpFilter === "none" ? null : "none")}
            data-testid="card-filter-no-followup"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">No Follow-Up</p>
                  <p className="text-2xl font-bold text-gray-600">{noFollowUpCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Filter Indicator */}
        {followUpFilter && (
          <div className="mb-6 flex items-center gap-2">
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="text-sm font-medium">
                Filter: {followUpFilter === "overdue" ? "Overdue Follow-Ups" : 
                         followUpFilter === "today" ? "Due Today" : 
                         followUpFilter === "upcoming" ? "Upcoming" : "No Follow-Up"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFollowUpFilter}
                className="h-6 w-6 p-0 hover:bg-blue-200"
                data-testid="button-clear-filter"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-[#E2E8F0]">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#E2E8F0]"
                  data-testid="input-search"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={categoryFilter || "all"} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] border-[#E2E8F0]" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Alpha">Alpha</SelectItem>
                  <SelectItem value="Beta">Beta</SelectItem>
                  <SelectItem value="Gamma">Gamma</SelectItem>
                  <SelectItem value="Delta">Delta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <CustomersTable
          customers={filteredCustomers}
          isLoading={isLoading}
          onEdit={handleEdit}
          onPayment={handlePayment}
          onPaymentHistory={handlePaymentHistory}
          onFollowUp={handleFollowUp}
          onDelete={handleDelete}
          onWhatsApp={handleWhatsApp}
          onEmail={handleEmail}
          onBulkDelete={handleBulkDelete}
        />
      </div>

      {/* Dialogs */}
      <CustomerFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        mode="add"
      />

      <CustomerFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        customer={selectedCustomer || undefined}
      />

      <PaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        customer={selectedCustomer || undefined}
      />

      <PaymentHistoryDialog
        open={isPaymentHistoryOpen}
        onOpenChange={setIsPaymentHistoryOpen}
        customer={selectedCustomer || undefined}
      />

      <FollowUpDialog
        open={isFollowUpDialogOpen}
        onOpenChange={setIsFollowUpDialogOpen}
        customer={selectedCustomer || undefined}
      />

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        customer={selectedCustomer || undefined}
      />

      <ExcelImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-bulk-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {bulkDeleteIds.length} customer(s)? This action cannot be undone.
              All associated payments and follow-ups will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-bulk-delete"
            >
              Delete {bulkDeleteIds.length} Customer{bulkDeleteIds.length > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
