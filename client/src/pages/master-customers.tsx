import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MasterCustomer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Download, Pencil, Trash2, Users, CheckCircle2, AlertCircle, Award, CheckCircle, XCircle } from "lucide-react";
import { MasterCustomerFormDialog } from "@/components/master-customer-form-dialog";
import { DataTable } from "@/components/ui/data-table";
import { ImportModal } from "@/components/import-modal";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import * as XLSX from "xlsx";

export default function MasterCustomers() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
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

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/masters/customers/export");
      if (!response.ok) throw new Error("Failed to export customers");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "master_customers_export.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Customer data has been exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const categoryColors = {
    Alpha: "bg-red-100 text-red-800 border-red-300",
    Beta: "bg-orange-100 text-orange-800 border-orange-300",
    Gamma: "bg-blue-100 text-blue-800 border-blue-300",
    Delta: "bg-green-100 text-green-800 border-green-300",
  };

  const statusColors = {
    Active: "bg-green-100 text-green-800 border-green-300",
    Inactive: "bg-gray-100 text-gray-800 border-gray-300",
  };

  const formatCurrency = (amount: string | null | undefined) => {
    if (!amount) return "—";
    const num = parseFloat(amount);
    if (isNaN(num)) return "—";
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns = useMemo<ColumnDef<MasterCustomer>[]>(
    () => [
      {
        accessorKey: "clientName",
        header: "Client Name",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-gray-900" data-testid={`text-clientName-${row.original.id}`}>
              {row.original.clientName}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">ID: #{row.original.id.slice(0, 8)}</div>
          </div>
        ),
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <Badge
            className={categoryColors[row.original.category as keyof typeof categoryColors]}
            data-testid={`badge-category-${row.original.id}`}
          >
            {row.original.category}
          </Badge>
        ),
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "city",
        header: "City",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-city-${row.original.id}`}>
            {row.original.city || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "state",
        header: "State",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-state-${row.original.id}`}>
            {row.original.state || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "gstNumber",
        header: "GST Number",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-gstNumber-${row.original.id}`}>
            {row.original.gstNumber || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "panNumber",
        header: "PAN Number",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-panNumber-${row.original.id}`}>
            {row.original.panNumber || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "primaryMobile",
        header: "Primary Mobile",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-primaryMobile-${row.original.id}`}>
            {row.original.primaryMobile || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "primaryEmail",
        header: "Primary Email",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-primaryEmail-${row.original.id}`}>
            {row.original.primaryEmail || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "paymentTermsDays",
        header: "Payment Terms (Days)",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-paymentTerms-${row.original.id}`}>
            {row.original.paymentTermsDays}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "creditLimit",
        header: "Credit Limit",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-creditLimit-${row.original.id}`}>
            {formatCurrency(row.original.creditLimit)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "billingAddress",
        header: "Billing Address",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-billingAddress-${row.original.id}`}>
            {row.original.billingAddress || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "pincode",
        header: "Pincode",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-pincode-${row.original.id}`}>
            {row.original.pincode || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "country",
        header: "Country",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-country-${row.original.id}`}>
            {row.original.country || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "msmeNumber",
        header: "MSME Number",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-msmeNumber-${row.original.id}`}>
            {row.original.msmeNumber || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "incorporationCertNumber",
        header: "Incorporation Certificate Number",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-incorporationCertNumber-${row.original.id}`}>
            {row.original.incorporationCertNumber || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "incorporationDate",
        header: "Incorporation Date",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-incorporationDate-${row.original.id}`}>
            {row.original.incorporationDate ? new Date(row.original.incorporationDate).toLocaleDateString('en-IN') : "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "companyType",
        header: "Company Type",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-companyType-${row.original.id}`}>
            {row.original.companyType || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "primaryContactName",
        header: "Primary Contact Name",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-primaryContactName-${row.original.id}`}>
            {row.original.primaryContactName || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "secondaryContactName",
        header: "Secondary Contact Name",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-secondaryContactName-${row.original.id}`}>
            {row.original.secondaryContactName || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "secondaryMobile",
        header: "Secondary Mobile",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-secondaryMobile-${row.original.id}`}>
            {row.original.secondaryMobile || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "secondaryEmail",
        header: "Secondary Email",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-secondaryEmail-${row.original.id}`}>
            {row.original.secondaryEmail || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "interestApplicableFrom",
        header: "Interest Applicable From",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-interestApplicableFrom-${row.original.id}`}>
            {row.original.interestApplicableFrom || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "interestRate",
        header: "Interest Rate (%)",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-interestRate-${row.original.id}`}>
            {row.original.interestRate ? `${row.original.interestRate}%` : "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "salesPerson",
        header: "Sales Person",
        cell: ({ row }) => (
          <span className="text-gray-700" data-testid={`text-salesPerson-${row.original.id}`}>
            {row.original.salesPerson || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            className={statusColors[row.original.isActive as keyof typeof statusColors]}
            data-testid={`badge-status-${row.original.id}`}
          >
            {row.original.isActive}
          </Badge>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCustomer(row.original);
                setIsFormOpen(true);
              }}
              className="hover:bg-blue-50"
              data-testid={`button-edit-${row.original.id}`}
              aria-label={`Edit ${row.original.clientName}`}
            >
              <Pencil className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${row.original.clientName}?`)) {
                  deleteMutation.mutate(row.original.id);
                }
              }}
              className="hover:bg-red-50"
              data-testid={`button-delete-${row.original.id}`}
              aria-label={`Delete ${row.original.clientName}`}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [deleteMutation, categoryColors, statusColors]
  );

  const handleDeleteSelected = async (rows: MasterCustomer[]) => {
    if (window.confirm(`Are you sure you want to delete ${rows.length} customer(s)?`)) {
      try {
        await Promise.all(
          rows.map((row) =>
            fetch(`/api/masters/customers/${row.id}`, {
              method: "DELETE",
            })
          )
        );
        queryClient.invalidateQueries({ queryKey: ["/api/masters/customers"] });
        toast({
          title: "Success",
          description: `${rows.length} customer(s) deleted successfully`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete customers",
          variant: "destructive",
        });
      }
    }
  };

  const handleExportSelected = (rows: MasterCustomer[]) => {
    const exportData = rows.map((customer) => ({
      "Client Name": customer.clientName,
      Category: customer.category,
      City: customer.city || "",
      State: customer.state || "",
      "GST Number": customer.gstNumber || "",
      "PAN Number": customer.panNumber || "",
      "Primary Contact": customer.primaryContactName || "",
      "Primary Mobile": customer.primaryMobile || "",
      "Primary Email": customer.primaryEmail || "",
      "Payment Terms (Days)": customer.paymentTermsDays,
      "Credit Limit": customer.creditLimit || "",
      Status: customer.isActive,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Master Customers");
    XLSX.writeFile(workbook, `master_customers_selected_${new Date().getTime()}.xlsx`);

    toast({
      title: "Export Successful",
      description: `${rows.length} customer(s) exported successfully`,
    });
  };

  const alphaCount = customers.filter(c => c.category === "Alpha").length;
  const betaCount = customers.filter(c => c.category === "Beta").length;
  const gammaCount = customers.filter(c => c.category === "Gamma").length;
  const deltaCount = customers.filter(c => c.category === "Delta").length;

  const activeCount = customers.filter(c => c.isActive === "Active").length;
  const inactiveCount = customers.filter(c => c.isActive === "Inactive").length;

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
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10 shadow-sm animate-in slide-in-from-top duration-500">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
                Master Customers
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage your customer database</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setIsImportOpen(true)}
                variant="outline"
                className="shadow-md hover:shadow-lg transition-all duration-200"
                data-testid="button-import"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button
                onClick={() => exportMutation.mutate()}
                variant="outline"
                className="shadow-md hover:shadow-lg transition-all duration-200"
                disabled={exportMutation.isPending}
                data-testid="button-export"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportMutation.isPending ? "Exporting..." : "Export"}
              </Button>
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
        </div>
      </header>

      <div className="w-full px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card
              className={`cursor-pointer transition-all border-0 ${
                categoryFilter === "Alpha" 
                  ? "bg-blue-100" 
                  : "bg-blue-50 hover:bg-blue-100"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Alpha" ? null : "Alpha")}
              data-testid="card-category-alpha"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 p-3 rounded-xl flex-shrink-0">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Alpha</p>
                    <p className="text-3xl font-bold text-blue-600">{alphaCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-0 ${
                categoryFilter === "Beta" 
                  ? "bg-green-100" 
                  : "bg-green-50 hover:bg-green-100"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Beta" ? null : "Beta")}
              data-testid="card-category-beta"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-green-500 p-3 rounded-xl flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Beta</p>
                    <p className="text-3xl font-bold text-green-600">{betaCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-0 ${
                categoryFilter === "Gamma" 
                  ? "bg-orange-100" 
                  : "bg-orange-50 hover:bg-orange-100"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Gamma" ? null : "Gamma")}
              data-testid="card-category-gamma"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-500 p-3 rounded-xl flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Gamma</p>
                    <p className="text-3xl font-bold text-orange-600">{gammaCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-0 ${
                categoryFilter === "Delta" 
                  ? "bg-cyan-100" 
                  : "bg-cyan-50 hover:bg-cyan-100"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === "Delta" ? null : "Delta")}
              data-testid="card-category-delta"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-cyan-500 p-3 rounded-xl flex-shrink-0">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide mb-1">Delta</p>
                    <p className="text-3xl font-bold text-cyan-600">{deltaCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-0 ${
                statusFilter === "Active" 
                  ? "bg-purple-100" 
                  : "bg-purple-50 hover:bg-purple-100"
              }`}
              onClick={() => setStatusFilter(statusFilter === "Active" ? null : "Active")}
              data-testid="card-status-active"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500 p-3 rounded-xl flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Active</p>
                    <p className="text-3xl font-bold text-purple-600">{activeCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-0 ${
                statusFilter === "Inactive" 
                  ? "bg-gray-100" 
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => setStatusFilter(statusFilter === "Inactive" ? null : "Inactive")}
              data-testid="card-status-inactive"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-500 p-3 rounded-xl flex-shrink-0">
                    <XCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Inactive</p>
                    <p className="text-3xl font-bold text-gray-600">{inactiveCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
          <DataTable
            columns={columns}
            data={filteredCustomers}
            tableKey="master-customers"
            isLoading={isLoading}
            onDeleteSelected={handleDeleteSelected}
            onExportSelected={handleExportSelected}
            enableRowSelection={true}
            enableBulkActions={true}
            enableGlobalFilter={true}
            enableColumnVisibility={true}
            enableSorting={true}
            enablePagination={true}
            defaultPageSize={10}
            emptyMessage="No customers found. Add a customer to get started."
          />
        </div>
      </div>

      <MasterCustomerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        customer={selectedCustomer}
      />

      <ImportModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </div>
  );
}
