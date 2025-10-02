import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MasterCustomer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MasterCustomerFormDialog } from "@/components/master-customer-form-dialog";
import { MasterCustomersTable } from "@/components/master-customers-table";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function MasterCustomers() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<MasterCustomer | undefined>(undefined);

  const { data: customers = [], isLoading } = useQuery<MasterCustomer[]>({
    queryKey: ["/api/masters/customers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/masters/customers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete customer");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/customers"] });
      toast({
        title: "Success",
        description: "Customer deleted successfully",
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

  // Calculate counts for each category
  const alphaCount = customers.filter(c => c.category === "Alpha").length;
  const betaCount = customers.filter(c => c.category === "Beta").length;
  const gammaCount = customers.filter(c => c.category === "Gamma").length;
  const deltaCount = customers.filter(c => c.category === "Delta").length;

  // Calculate counts for active/inactive
  const activeCount = customers.filter(c => c.isActive === "Active").length;
  const inactiveCount = customers.filter(c => c.isActive === "Inactive").length;

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    let matchesCategory = true;
    let matchesStatus = true;

    if (categoryFilter) {
      matchesCategory = customer.category === categoryFilter;
    }

    if (statusFilter) {
      matchesStatus = customer.isActive === statusFilter;
    }

    return matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-[#E2E8F0]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-[#2563EB]" data-testid="text-page-title">
              Master Customers
            </h1>
            <Button
              onClick={() => {
                setSelectedCustomer(undefined);
                setIsFormOpen(true);
              }}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              data-testid="button-add-customer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Filter by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card
              className={`cursor-pointer transition-all border-2 ${
                categoryFilter === "Alpha" ? "border-red-500 bg-red-50" : "border-[#E2E8F0] hover:border-red-300"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Alpha" ? null : "Alpha")}
              data-testid="card-category-alpha"
            >
              <CardContent className="p-5">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-bold text-gray-800 mb-2">Alpha</p>
                  <p className="text-3xl font-bold text-red-600">{alphaCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-2 ${
                categoryFilter === "Beta" ? "border-orange-500 bg-orange-50" : "border-[#E2E8F0] hover:border-orange-300"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Beta" ? null : "Beta")}
              data-testid="card-category-beta"
            >
              <CardContent className="p-5">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-bold text-gray-800 mb-2">Beta</p>
                  <p className="text-3xl font-bold text-orange-600">{betaCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-2 ${
                categoryFilter === "Gamma" ? "border-blue-500 bg-blue-50" : "border-[#E2E8F0] hover:border-blue-300"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Gamma" ? null : "Gamma")}
              data-testid="card-category-gamma"
            >
              <CardContent className="p-5">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-bold text-gray-800 mb-2">Gamma</p>
                  <p className="text-3xl font-bold text-blue-600">{gammaCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-2 ${
                categoryFilter === "Delta" ? "border-green-500 bg-green-50" : "border-[#E2E8F0] hover:border-green-300"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Delta" ? null : "Delta")}
              data-testid="card-category-delta"
            >
              <CardContent className="p-5">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-bold text-gray-800 mb-2">Delta</p>
                  <p className="text-3xl font-bold text-green-600">{deltaCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Cards */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Filter by Status</h2>
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <Card
              className={`cursor-pointer transition-all border-2 ${
                statusFilter === "Active" ? "border-green-500 bg-green-50" : "border-[#E2E8F0] hover:border-green-300"
              }`}
              onClick={() => setStatusFilter(statusFilter === "Active" ? null : "Active")}
              data-testid="card-status-active"
            >
              <CardContent className="p-5">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-bold text-gray-800 mb-2">Active Clients</p>
                  <p className="text-3xl font-bold text-green-600">{activeCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-2 ${
                statusFilter === "Inactive" ? "border-gray-500 bg-gray-50" : "border-[#E2E8F0] hover:border-gray-300"
              }`}
              onClick={() => setStatusFilter(statusFilter === "Inactive" ? null : "Inactive")}
              data-testid="card-status-inactive"
            >
              <CardContent className="p-5">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-bold text-gray-800 mb-2">Inactive Clients</p>
                  <p className="text-3xl font-bold text-gray-600">{inactiveCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow">
          <MasterCustomersTable
            customers={filteredCustomers}
            isLoading={isLoading}
            onEdit={(customer) => {
              setSelectedCustomer(customer);
              setIsFormOpen(true);
            }}
            onDelete={(customer) => {
              if (window.confirm(`Are you sure you want to delete ${customer.clientName}?`)) {
                deleteMutation.mutate(customer.id);
              }
            }}
          />
        </div>
      </div>

      {/* Customer Form Dialog */}
      <MasterCustomerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        customer={selectedCustomer}
      />
    </div>
  );
}
