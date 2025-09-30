import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Customer, Payment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { DashboardCards } from "@/components/dashboard-cards";
import { CustomersTable } from "@/components/customers-table";
import { CustomerFormDialog } from "@/components/customer-form-dialog";
import { PaymentDialog } from "@/components/payment-dialog";
import { PaymentHistoryDialog } from "@/components/payment-history-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { ExcelImportDialog } from "@/components/excel-import-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileDown, FileUp, Search } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

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

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.mobile.includes(searchQuery);
    const matchesCategory = categoryFilter === "all" || !categoryFilter || customer.category === categoryFilter;
    return matchesSearch && matchesCategory;
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
          onDelete={handleDelete}
          onWhatsApp={handleWhatsApp}
          onEmail={handleEmail}
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

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        customer={selectedCustomer || undefined}
      />

      <ExcelImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
    </div>
  );
}
