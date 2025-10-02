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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
                Master Customers
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage your customer database</p>
            </div>
            <Button
              onClick={() => {
                setSelectedCustomer(undefined);
                setIsFormOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-5 rounded-lg"
              data-testid="button-add-customer"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Customer
            </Button>
          </div>
        </div>
      </header>

      <div className="w-full px-6 lg:px-8 py-8">
        {/* Category Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Filter by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <Card
              className={`cursor-pointer transition-all duration-200 ${
                categoryFilter === "Alpha" 
                  ? "border-2 border-red-500 bg-red-50 shadow-lg scale-105" 
                  : "border border-gray-200 bg-white hover:border-red-400 hover:shadow-md hover:-translate-y-0.5"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Alpha" ? null : "Alpha")}
              data-testid="card-category-alpha"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Alpha</p>
                  <p className="text-4xl font-bold text-red-600">{alphaCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-200 ${
                categoryFilter === "Beta" 
                  ? "border-2 border-orange-500 bg-orange-50 shadow-lg scale-105" 
                  : "border border-gray-200 bg-white hover:border-orange-400 hover:shadow-md hover:-translate-y-0.5"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Beta" ? null : "Beta")}
              data-testid="card-category-beta"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Beta</p>
                  <p className="text-4xl font-bold text-orange-600">{betaCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-200 ${
                categoryFilter === "Gamma" 
                  ? "border-2 border-blue-500 bg-blue-50 shadow-lg scale-105" 
                  : "border border-gray-200 bg-white hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Gamma" ? null : "Gamma")}
              data-testid="card-category-gamma"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Gamma</p>
                  <p className="text-4xl font-bold text-blue-600">{gammaCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-200 ${
                categoryFilter === "Delta" 
                  ? "border-2 border-green-500 bg-green-50 shadow-lg scale-105" 
                  : "border border-gray-200 bg-white hover:border-green-400 hover:shadow-md hover:-translate-y-0.5"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Delta" ? null : "Delta")}
              data-testid="card-category-delta"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Delta</p>
                  <p className="text-4xl font-bold text-green-600">{deltaCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Filter by Status</h2>
          <div className="grid grid-cols-2 gap-5 max-w-2xl">
            <Card
              className={`cursor-pointer transition-all duration-200 ${
                statusFilter === "Active" 
                  ? "border-2 border-green-500 bg-green-50 shadow-lg scale-105" 
                  : "border border-gray-200 bg-white hover:border-green-400 hover:shadow-md hover:-translate-y-0.5"
              }`}
              onClick={() => setStatusFilter(statusFilter === "Active" ? null : "Active")}
              data-testid="card-status-active"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Active Clients</p>
                  <p className="text-4xl font-bold text-green-600">{activeCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-200 ${
                statusFilter === "Inactive" 
                  ? "border-2 border-gray-500 bg-gray-50 shadow-lg scale-105" 
                  : "border border-gray-200 bg-white hover:border-gray-400 hover:shadow-md hover:-translate-y-0.5"
              }`}
              onClick={() => setStatusFilter(statusFilter === "Inactive" ? null : "Inactive")}
              data-testid="card-status-inactive"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Inactive Clients</p>
                  <p className="text-4xl font-bold text-gray-600">{inactiveCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
