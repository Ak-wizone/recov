import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MasterCustomer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function MasterCustomers() {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: customers = [], isLoading } = useQuery<MasterCustomer[]>({
    queryKey: ["/api/masters/customers"],
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

        {/* Customers Table Placeholder */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No customers found</div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Table with {filteredCustomers.length} customer(s) will be displayed here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
