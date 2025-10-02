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
import { Plus, FileDown, FileUp, X, AlertCircle, Clock, Calendar as CalendarIcon, CheckCircle2, CalendarDays, CalendarRange, Users } from "lucide-react";
import { isToday, isTomorrow, isBefore, isAfter, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FollowUpFilter = "overdue" | "today" | "tomorrow" | "thisWeek" | "thisMonth" | "none" | null;

export default function Home() {
  const { toast } = useToast();
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>(null);
  const [assignedUserFilter, setAssignedUserFilter] = useState<string | null>(null);
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

  // Calculate follow-up filter counts and amounts
  const now = new Date();
  
  // First apply assigned user filter to base customers list
  const customersByAssignedUser = assignedUserFilter 
    ? customers.filter(c => c.assignedUser === assignedUserFilter)
    : customers;
  
  const overdueCustomers = customersByAssignedUser.filter(c => 
    c.nextFollowUpDate && isBefore(new Date(c.nextFollowUpDate), startOfDay(now))
  );
  const overdueCount = overdueCustomers.length;
  const overdueAmount = overdueCustomers.reduce((sum, c) => sum + parseFloat(c.amountOwed), 0);
  
  const dueTodayCustomers = customersByAssignedUser.filter(c => 
    c.nextFollowUpDate && isToday(new Date(c.nextFollowUpDate))
  );
  const dueTodayCount = dueTodayCustomers.length;
  const dueTodayAmount = dueTodayCustomers.reduce((sum, c) => sum + parseFloat(c.amountOwed), 0);
  
  const tomorrowCustomers = customersByAssignedUser.filter(c => 
    c.nextFollowUpDate && isTomorrow(new Date(c.nextFollowUpDate))
  );
  const tomorrowCount = tomorrowCustomers.length;
  const tomorrowAmount = tomorrowCustomers.reduce((sum, c) => sum + parseFloat(c.amountOwed), 0);
  
  const thisWeekCustomers = customersByAssignedUser.filter(c => {
    if (!c.nextFollowUpDate) return false;
    const date = new Date(c.nextFollowUpDate);
    return isWithinInterval(date, {
      start: startOfDay(now),
      end: endOfWeek(now)
    }) && !isToday(date) && !isTomorrow(date);
  });
  const thisWeekCount = thisWeekCustomers.length;
  const thisWeekAmount = thisWeekCustomers.reduce((sum, c) => sum + parseFloat(c.amountOwed), 0);
  
  const thisMonthCustomers = customersByAssignedUser.filter(c => {
    if (!c.nextFollowUpDate) return false;
    const date = new Date(c.nextFollowUpDate);
    return isWithinInterval(date, {
      start: startOfDay(now),
      end: endOfMonth(now)
    }) && !isWithinInterval(date, {
      start: startOfDay(now),
      end: endOfWeek(now)
    });
  });
  const thisMonthCount = thisMonthCustomers.length;
  const thisMonthAmount = thisMonthCustomers.reduce((sum, c) => sum + parseFloat(c.amountOwed), 0);
  
  const noFollowUpCustomers = customersByAssignedUser.filter(c => !c.nextFollowUpDate);
  const noFollowUpCount = noFollowUpCustomers.length;
  const noFollowUpAmount = noFollowUpCustomers.reduce((sum, c) => sum + parseFloat(c.amountOwed), 0);

  const filteredCustomers = customers.filter((customer) => {
    let matchesFollowUpFilter = true;
    if (followUpFilter) {
      const followUpDate = customer.nextFollowUpDate ? new Date(customer.nextFollowUpDate) : null;
      
      switch (followUpFilter) {
        case "overdue":
          matchesFollowUpFilter = followUpDate ? isBefore(followUpDate, startOfDay(now)) : false;
          break;
        case "today":
          matchesFollowUpFilter = followUpDate ? isToday(followUpDate) : false;
          break;
        case "tomorrow":
          matchesFollowUpFilter = followUpDate ? isTomorrow(followUpDate) : false;
          break;
        case "thisWeek":
          matchesFollowUpFilter = followUpDate ? isWithinInterval(followUpDate, {
            start: startOfDay(now),
            end: endOfWeek(now)
          }) && !isToday(followUpDate) && !isTomorrow(followUpDate) : false;
          break;
        case "thisMonth":
          matchesFollowUpFilter = followUpDate ? isWithinInterval(followUpDate, {
            start: startOfDay(now),
            end: endOfMonth(now)
          }) && !isWithinInterval(followUpDate, {
            start: startOfDay(now),
            end: endOfWeek(now)
          }) : false;
          break;
        case "none":
          matchesFollowUpFilter = !followUpDate;
          break;
      }
    }
    
    let matchesAssignedUserFilter = true;
    if (assignedUserFilter) {
      matchesAssignedUserFilter = customer.assignedUser === assignedUserFilter;
    }
    
    return matchesFollowUpFilter && matchesAssignedUserFilter;
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
    const message = encodeURIComponent(`Hello ${customer.name}, this is regarding your outstanding balance of ₹${customer.amountOwed}.`);
    const phoneNumber = customer.mobile.replace(/\D/g, '');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleEmail = (customer: Customer) => {
    const subject = encodeURIComponent('Outstanding Balance Notice');
    const body = encodeURIComponent(`Dear ${customer.name},\n\nThis is regarding your outstanding balance of ₹${customer.amountOwed}.\n\nBest regards`);
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10 shadow-sm animate-in slide-in-from-top duration-500">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Debtors Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Track and manage customer debts</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-5"
                data-testid="button-add-customer"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Customer
              </Button>
              <Button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = "/api/customers/sample-template";
                  a.download = "customer_import_template.xlsx";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  toast({
                    title: "Success",
                    description: "Sample template downloaded successfully",
                  });
                }}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-5"
                data-testid="button-download-template"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Template
              </Button>
              <Button
                onClick={() => setIsImportDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-5 py-5"
                data-testid="button-import-excel"
              >
                <FileUp className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button
                onClick={() => exportMutation.mutate()}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-5"
                data-testid="button-export-excel"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-6 lg:px-8 py-8">
        {/* Dashboard Cards */}
        <DashboardCards customers={customersByAssignedUser} />

        {/* Follow-Up Filter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card
            className={`cursor-pointer transition-all border-2 ${
              followUpFilter === "overdue" ? "border-red-500 bg-red-50" : "border-[#E2E8F0] hover:border-red-300"
            }`}
            onClick={() => setFollowUpFilter(followUpFilter === "overdue" ? null : "overdue")}
            data-testid="card-filter-overdue"
          >
            <CardContent className="p-5">
              <div className="flex flex-col items-center justify-center text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
                <p className="text-sm font-bold text-gray-800 mb-2">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{overdueCount}</p>
                <p className="text-sm font-semibold text-gray-700 mt-2">₹{overdueAmount.toFixed(2)}</p>
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
            <CardContent className="p-5">
              <div className="flex flex-col items-center justify-center text-center">
                <Clock className="h-10 w-10 text-orange-500 mb-2" />
                <p className="text-sm font-bold text-gray-800 mb-2">Due Today</p>
                <p className="text-3xl font-bold text-orange-600">{dueTodayCount}</p>
                <p className="text-sm font-semibold text-gray-700 mt-2">₹{dueTodayAmount.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${
              followUpFilter === "tomorrow" ? "border-yellow-500 bg-yellow-50" : "border-[#E2E8F0] hover:border-yellow-300"
            }`}
            onClick={() => setFollowUpFilter(followUpFilter === "tomorrow" ? null : "tomorrow")}
            data-testid="card-filter-tomorrow"
          >
            <CardContent className="p-5">
              <div className="flex flex-col items-center justify-center text-center">
                <CalendarDays className="h-10 w-10 text-yellow-500 mb-2" />
                <p className="text-sm font-bold text-gray-800 mb-2">Tomorrow</p>
                <p className="text-3xl font-bold text-yellow-600">{tomorrowCount}</p>
                <p className="text-sm font-semibold text-gray-700 mt-2">₹{tomorrowAmount.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${
              followUpFilter === "thisWeek" ? "border-blue-500 bg-blue-50" : "border-[#E2E8F0] hover:border-blue-300"
            }`}
            onClick={() => setFollowUpFilter(followUpFilter === "thisWeek" ? null : "thisWeek")}
            data-testid="card-filter-thisweek"
          >
            <CardContent className="p-5">
              <div className="flex flex-col items-center justify-center text-center">
                <CalendarRange className="h-10 w-10 text-blue-500 mb-2" />
                <p className="text-sm font-bold text-gray-800 mb-2">This Week</p>
                <p className="text-3xl font-bold text-blue-600">{thisWeekCount}</p>
                <p className="text-sm font-semibold text-gray-700 mt-2">₹{thisWeekAmount.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all border-2 ${
              followUpFilter === "thisMonth" ? "border-purple-500 bg-purple-50" : "border-[#E2E8F0] hover:border-purple-300"
            }`}
            onClick={() => setFollowUpFilter(followUpFilter === "thisMonth" ? null : "thisMonth")}
            data-testid="card-filter-thismonth"
          >
            <CardContent className="p-5">
              <div className="flex flex-col items-center justify-center text-center">
                <CalendarIcon className="h-10 w-10 text-purple-500 mb-2" />
                <p className="text-sm font-bold text-gray-800 mb-2">This Month</p>
                <p className="text-3xl font-bold text-purple-600">{thisMonthCount}</p>
                <p className="text-sm font-semibold text-gray-700 mt-2">₹{thisMonthAmount.toFixed(2)}</p>
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
            <CardContent className="p-5">
              <div className="flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-10 w-10 text-gray-500 mb-2" />
                <p className="text-sm font-bold text-gray-800 mb-2">No Follow-Up</p>
                <p className="text-3xl font-bold text-gray-600">{noFollowUpCount}</p>
                <p className="text-sm font-semibold text-gray-700 mt-2">₹{noFollowUpAmount.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned User Filter */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-3 bg-white p-4 rounded-lg border-2 border-[#E2E8F0] shadow-sm">
            <Users className="h-5 w-5 text-[#2563EB]" />
            <span className="text-sm font-semibold text-gray-700">Filter by Assigned User:</span>
            <Select value={assignedUserFilter || "all"} onValueChange={(value) => setAssignedUserFilter(value === "all" ? null : value)}>
              <SelectTrigger className="w-[200px]" data-testid="select-filter-assigned-user">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="Manpreet Bedi">Manpreet Bedi</SelectItem>
                <SelectItem value="Bilal Ahamad">Bilal Ahamad</SelectItem>
                <SelectItem value="Anjali Dhiman">Anjali Dhiman</SelectItem>
                <SelectItem value="Princi Soni">Princi Soni</SelectItem>
              </SelectContent>
            </Select>
            {assignedUserFilter && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAssignedUserFilter(null)}
                className="h-8 w-8 p-0"
                data-testid="button-clear-user-filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Indicator */}
        {(followUpFilter || assignedUserFilter) && (
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            {followUpFilter && (
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center gap-2">
                <span className="text-sm font-medium">
                  Follow-Up: {followUpFilter === "overdue" ? "Overdue" : 
                           followUpFilter === "today" ? "Due Today" : 
                           followUpFilter === "tomorrow" ? "Tomorrow" :
                           followUpFilter === "thisWeek" ? "This Week" :
                           followUpFilter === "thisMonth" ? "This Month" : "No Follow-Up"}
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
            )}
            {assignedUserFilter && (
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center gap-2">
                <span className="text-sm font-medium">
                  Assigned: {assignedUserFilter}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAssignedUserFilter(null)}
                  className="h-6 w-6 p-0 hover:bg-green-200"
                  data-testid="button-clear-assigned-filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

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
