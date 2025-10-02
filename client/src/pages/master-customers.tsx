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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10 shadow-sm animate-in slide-in-from-top duration-500">
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
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Filter by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <Card
              className={`cursor-pointer transition-all duration-300 transform ${
                categoryFilter === "Alpha" 
                  ? "border-2 border-red-500 bg-gradient-to-br from-red-50 to-rose-100 shadow-2xl scale-105 -translate-y-1" 
                  : "border border-gray-200 bg-white hover:border-red-400 hover:shadow-xl hover:-translate-y-2 hover:scale-105"
              } animate-in zoom-in duration-500`}
              style={{ animationDelay: '200ms' }}
              onClick={() => setCategoryFilter(categoryFilter === "Alpha" ? null : "Alpha")}
              data-testid="card-category-alpha"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Alpha</p>
                  <p className="text-5xl font-extrabold text-red-600 animate-pulse">{alphaCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-300 transform ${
                categoryFilter === "Beta" 
                  ? "border-2 border-orange-500 bg-gradient-to-br from-orange-50 to-amber-100 shadow-2xl scale-105 -translate-y-1" 
                  : "border border-gray-200 bg-white hover:border-orange-400 hover:shadow-xl hover:-translate-y-2 hover:scale-105"
              } animate-in zoom-in duration-500`}
              style={{ animationDelay: '300ms' }}
              onClick={() => setCategoryFilter(categoryFilter === "Beta" ? null : "Beta")}
              data-testid="card-category-beta"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Beta</p>
                  <p className="text-5xl font-extrabold text-orange-600 animate-pulse">{betaCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-300 transform ${
                categoryFilter === "Gamma" 
                  ? "border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-2xl scale-105 -translate-y-1" 
                  : "border border-gray-200 bg-white hover:border-blue-400 hover:shadow-xl hover:-translate-y-2 hover:scale-105"
              } animate-in zoom-in duration-500`}
              style={{ animationDelay: '400ms' }}
              onClick={() => setCategoryFilter(categoryFilter === "Gamma" ? null : "Gamma")}
              data-testid="card-category-gamma"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Gamma</p>
                  <p className="text-5xl font-extrabold text-blue-600 animate-pulse">{gammaCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-300 transform ${
                categoryFilter === "Delta" 
                  ? "border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 shadow-2xl scale-105 -translate-y-1" 
                  : "border border-gray-200 bg-white hover:border-green-400 hover:shadow-xl hover:-translate-y-2 hover:scale-105"
              } animate-in zoom-in duration-500`}
              style={{ animationDelay: '500ms' }}
              onClick={() => setCategoryFilter(categoryFilter === "Delta" ? null : "Delta")}
              data-testid="card-category-delta"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Delta</p>
                  <p className="text-5xl font-extrabold text-green-600 animate-pulse">{deltaCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Cards */}
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Filter by Status</h2>
          <div className="grid grid-cols-2 gap-5 max-w-2xl">
            <Card
              className={`cursor-pointer transition-all duration-300 transform ${
                statusFilter === "Active" 
                  ? "border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-100 shadow-2xl scale-105 -translate-y-1" 
                  : "border border-gray-200 bg-white hover:border-emerald-400 hover:shadow-xl hover:-translate-y-2 hover:scale-105"
              } animate-in zoom-in duration-500`}
              style={{ animationDelay: '600ms' }}
              onClick={() => setStatusFilter(statusFilter === "Active" ? null : "Active")}
              data-testid="card-status-active"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Active Clients</p>
                  <p className="text-5xl font-extrabold text-emerald-600 animate-pulse">{activeCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-300 transform ${
                statusFilter === "Inactive" 
                  ? "border-2 border-gray-500 bg-gradient-to-br from-gray-50 to-slate-100 shadow-2xl scale-105 -translate-y-1" 
                  : "border border-gray-200 bg-white hover:border-gray-400 hover:shadow-xl hover:-translate-y-2 hover:scale-105"
              } animate-in zoom-in duration-500`}
              style={{ animationDelay: '700ms' }}
              onClick={() => setStatusFilter(statusFilter === "Inactive" ? null : "Inactive")}
              data-testid="card-status-inactive"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Inactive Clients</p>
                  <p className="text-5xl font-extrabold text-gray-600 animate-pulse">{inactiveCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
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
