import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { MasterCustomer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  Award,
  CheckCircle,
  XCircle,
  Percent,
  ListChecks,
} from "lucide-react";
import { MasterCustomerFormDialog } from "@/components/master-customer-form-dialog";
import { DataTable } from "@/components/ui/data-table";
import { ImportModal } from "@/components/import-modal";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getSalesPersons } from "@/lib/salesPersonStorage";
import * as XLSX from "xlsx";

export default function MasterCustomers() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBulkInterestOpen, setIsBulkInterestOpen] = useState(false);
  const [bulkInterestRate, setBulkInterestRate] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<
    MasterCustomer | undefined
  >(undefined);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({
    category: "",
    status: "",
    interestRate: "",
    interestApplicableFrom: "",
  });
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  const { data: customers = [], isLoading } = useQuery<MasterCustomer[]>({
    queryKey: ["/api/masters/customers"],
  });

  const { data: recoverySettings } = useQuery<{
    autoUpgradeEnabled: boolean;
  } | null>({
    queryKey: ["/api/recovery/settings"],
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

  const updateFieldMutation = useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: string;
      value: string;
    }) => {
      // If updating category, use the manual category change endpoint
      if (field === "category") {
        const customer = customers.find((c) => c.id === id);
        if (!customer) throw new Error("Customer not found");

        const response = await apiRequest(
          "POST",
          "/api/recovery/manual-category-change",
          {
            customerId: id,
            newCategory: value,
            reason: "Manual category change from Customer Master",
          },
        );
        return response;
      }

      // For other fields, use the standard update endpoint
      const response = await fetch(`/api/masters/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error("Failed to update customer");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/customers"] });
      if (variables.field === "category") {
        queryClient.invalidateQueries({
          queryKey: ["/api/recovery/category-logs"],
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUpdateInterestMutation = useMutation({
    mutationFn: async (interestRate: string) => {
      const response = await fetch(
        "/api/masters/customers/bulk-update-interest",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interestRate }),
        },
      );
      if (!response.ok) throw new Error("Failed to update interest rate");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/customers"] });
      toast({
        title: "Success",
        description: `Interest rate updated for ${data.updated} customers`,
      });
      setIsBulkInterestOpen(false);
      setBulkInterestRate("");
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({
      customerIds,
      updates,
    }: {
      customerIds: string[];
      updates: any;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/masters/customers/bulk-update",
        {
          customerIds,
          updates,
        },
      );
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/customers"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/recovery/category-logs"],
      });
      toast({
        title: "Success",
        description: data.message,
      });
      setIsBulkUpdateOpen(false);
      setBulkUpdateData({
        category: "",
        status: "",
        interestRate: "",
        interestApplicableFrom: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Update Failed",
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
    Alpha:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    Beta: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    Gamma:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
    Delta:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  };

  const statusColors = {
    Active:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    Inactive:
      "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
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
        header: "CLIENT NAME",
        cell: ({ row }) => (
          <div>
            <div
              className="font-semibold text-gray-900 dark:text-gray-100"
              data-testid={`text-clientName-${row.original.id}`}
            >
              {row.original.clientName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              ID: #{row.original.id.slice(0, 8)}
            </div>
          </div>
        ),
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "category",
        header: "CATEGORY",
        cell: ({ row }) => {
          const autoUpgradeEnabled =
            recoverySettings?.autoUpgradeEnabled ?? false;
          return (
            <div 
              onClick={(e) => {
                console.log("Category wrapper clicked!");
                e.stopPropagation();
              }}
              className="relative"
            >
              <Select
                value={row.original.category}
                onValueChange={(value) => {
                  console.log("Category onValueChange triggered:", value);
                  if (autoUpgradeEnabled) {
                    toast({
                      title: "Auto-Upgrade Enabled",
                      description:
                        "Category changes are automatic. Disable auto-upgrade in Category Rules to manually change categories.",
                      variant: "destructive",
                    });
                    return;
                  }
                  updateFieldMutation.mutate({
                    id: row.original.id,
                    field: "category",
                    value: value,
                  });
                }}
                disabled={autoUpgradeEnabled}
              >
                <SelectTrigger
                  className={`h-8 w-32 ${categoryColors[row.original.category as keyof typeof categoryColors]} ${autoUpgradeEnabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  data-testid={`select-category-${row.original.id}`}
                  onClick={() => console.log("SelectTrigger clicked!")}
                >
                  <SelectValue>{row.original.category}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alpha">Alpha</SelectItem>
                  <SelectItem value="Beta">Beta</SelectItem>
                  <SelectItem value="Gamma">Gamma</SelectItem>
                  <SelectItem value="Delta">Delta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: "primaryContactName",
        header: "PRIMARY CONTACT",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-primaryContactName-${row.original.id}`}
          >
            {row.original.primaryContactName || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "primaryMobile",
        header: "PRIMARY MOBILE",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-primaryMobile-${row.original.id}`}
          >
            {row.original.primaryMobile || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "primaryEmail",
        header: "PRIMARY EMAIL",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-primaryEmail-${row.original.id}`}
          >
            {row.original.primaryEmail || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "secondaryContactName",
        header: "SECONDARY CONTACT",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-secondaryContactName-${row.original.id}`}
          >
            {row.original.secondaryContactName || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "secondaryMobile",
        header: "SECONDARY MOBILE",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-secondaryMobile-${row.original.id}`}
          >
            {row.original.secondaryMobile || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "secondaryEmail",
        header: "SECONDARY EMAIL",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-secondaryEmail-${row.original.id}`}
          >
            {row.original.secondaryEmail || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "gstNumber",
        header: "GSTIN",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-gstNumber-${row.original.id}`}
          >
            {row.original.gstNumber || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "billingAddress",
        header: "BILLING ADDRESS",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-billingAddress-${row.original.id}`}
          >
            {row.original.billingAddress || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "city",
        header: "CITY",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-city-${row.original.id}`}
          >
            {row.original.city || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "state",
        header: "STATE",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-state-${row.original.id}`}
          >
            {row.original.state || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "pincode",
        header: "PINCODE",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-pincode-${row.original.id}`}
          >
            {row.original.pincode || "—"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "paymentTermsDays",
        header: "PAYMENT TERMS (DAYS)",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-paymentTerms-${row.original.id}`}
          >
            {row.original.paymentTermsDays}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "creditLimit",
        header: "CREDIT LIMIT",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300"
            data-testid={`text-creditLimit-${row.original.id}`}
          >
            {formatCurrency(row.original.creditLimit)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "interestApplicableFrom",
        header: "INTEREST APPLICABLE FROM",
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={row.original.interestApplicableFrom || ""}
              onValueChange={(value) => {
                updateFieldMutation.mutate({
                  id: row.original.id,
                  field: "interestApplicableFrom",
                  value: value,
                });
              }}
            >
              <SelectTrigger
                className="h-8 w-36"
                data-testid={`select-interestApplicableFrom-${row.original.id}`}
              >
                <SelectValue placeholder="Select">
                  {row.original.interestApplicableFrom || "—"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Invoice Date">Invoice Date</SelectItem>
                <SelectItem value="Due Date">Due Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "interestRate",
        header: "INTEREST RATE",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300 font-medium"
            data-testid={`text-interestrate-${row.original.id}`}
          >
            {row.original.interestRate ? `${row.original.interestRate}%` : "0%"}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "openingBalance",
        header: "OPENING BALANCE",
        cell: ({ row }) => (
          <span
            className="text-gray-700 dark:text-gray-300 font-medium"
            data-testid={`text-openingBalance-${row.original.id}`}
          >
            {formatCurrency(row.original.openingBalance)}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "salesPerson",
        header: "SALES PERSON",
        cell: ({ row }) => {
          const salesPersons = getSalesPersons();
          return (
            <div 
              onClick={(e) => {
                console.log("Sales Person wrapper clicked!");
                e.stopPropagation();
              }}
              className="relative"
            >
              <Select
                value={row.original.salesPerson || ""}
                onValueChange={(value) => {
                  console.log("Sales Person onValueChange triggered:", value);
                  updateFieldMutation.mutate({
                    id: row.original.id,
                    field: "salesPerson",
                    value: value,
                  });
                }}
              >
                <SelectTrigger
                  className="h-8 w-40 bg-gray-800 dark:bg-gray-700 text-white border-gray-600"
                  data-testid={`select-salesPerson-${row.original.id}`}
                  onClick={() => console.log("SelectTrigger (Sales Person) clicked!")}
                >
                  <SelectValue placeholder="Select person">
                    {row.original.salesPerson || "Select person"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  {salesPersons.map((person) => (
                    <SelectItem key={person} value={person}>
                      {person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "isActive",
        header: "STATUS",
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={row.original.isActive}
              onValueChange={(value) => {
                updateFieldMutation.mutate({
                  id: row.original.id,
                  field: "isActive",
                  value: value,
                });
              }}
            >
              <SelectTrigger
                className={`h-8 w-32 ${statusColors[row.original.isActive as keyof typeof statusColors]}`}
                data-testid={`select-status-${row.original.id}`}
              >
                <SelectValue>{row.original.isActive}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ),
        enableSorting: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
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
              onClick={(e) => {
                e.stopPropagation();
                if (
                  window.confirm(
                    `Are you sure you want to delete ${row.original.clientName}?`,
                  )
                ) {
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
    [
      deleteMutation,
      updateFieldMutation,
      categoryColors,
      statusColors,
      recoverySettings,
      toast,
    ],
  );

  const handleDeleteSelected = async (rows: MasterCustomer[]) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${rows.length} customer(s)?`,
      )
    ) {
      try {
        await Promise.all(
          rows.map((row) =>
            fetch(`/api/masters/customers/${row.id}`, {
              method: "DELETE",
            }),
          ),
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
    XLSX.writeFile(
      workbook,
      `master_customers_selected_${new Date().getTime()}.xlsx`,
    );

    toast({
      title: "Export Successful",
      description: `${rows.length} customer(s) exported successfully`,
    });
  };

  const alphaCount = customers.filter((c) => c.category === "Alpha").length;
  const betaCount = customers.filter((c) => c.category === "Beta").length;
  const gammaCount = customers.filter((c) => c.category === "Gamma").length;
  const deltaCount = customers.filter((c) => c.category === "Delta").length;

  const activeCount = customers.filter((c) => c.isActive === "Active").length;
  const inactiveCount = customers.filter(
    (c) => c.isActive === "Inactive",
  ).length;

  const filteredCustomers = customers.filter((customer) => {
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
      <div className="w-full px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card
              className={`cursor-pointer transition-all border-0 ${
                categoryFilter === "Alpha"
                  ? "bg-green-100"
                  : "bg-green-50 hover:bg-green-100"
              }`}
              onClick={() =>
                setCategoryFilter(categoryFilter === "Alpha" ? null : "Alpha")
              }
              data-testid="card-category-alpha"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-green-500 p-3 rounded-xl flex-shrink-0">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                      Alpha
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {alphaCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-0 ${
                categoryFilter === "Beta"
                  ? "bg-blue-100"
                  : "bg-blue-50 hover:bg-blue-100"
              }`}
              onClick={() =>
                setCategoryFilter(categoryFilter === "Beta" ? null : "Beta")
              }
              data-testid="card-category-beta"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 p-3 rounded-xl flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                      Beta
                    </p>
                    <p className="text-3xl font-bold text-blue-600">
                      {betaCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-0 ${
                categoryFilter === "Gamma"
                  ? "bg-yellow-100"
                  : "bg-yellow-50 hover:bg-yellow-100"
              }`}
              onClick={() =>
                setCategoryFilter(categoryFilter === "Gamma" ? null : "Gamma")
              }
              data-testid="card-category-gamma"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-500 p-3 rounded-xl flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1">
                      Gamma
                    </p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {gammaCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all border-0 ${
                categoryFilter === "Delta"
                  ? "bg-red-100"
                  : "bg-red-50 hover:bg-red-100"
              }`}
              onClick={() =>
                setCategoryFilter(categoryFilter === "Delta" ? null : "Delta")
              }
              data-testid="card-category-delta"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-red-500 p-3 rounded-xl flex-shrink-0">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
                      Delta
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      {deltaCount}
                    </p>
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
              onClick={() =>
                setStatusFilter(statusFilter === "Active" ? null : "Active")
              }
              data-testid="card-status-active"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500 p-3 rounded-xl flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                      Active
                    </p>
                    <p className="text-3xl font-bold text-purple-600">
                      {activeCount}
                    </p>
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
              onClick={() =>
                setStatusFilter(statusFilter === "Inactive" ? null : "Inactive")
              }
              data-testid="card-status-inactive"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="bg-gray-500 p-3 rounded-xl flex-shrink-0">
                    <XCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                      Inactive
                    </p>
                    <p className="text-3xl font-bold text-gray-600">
                      {inactiveCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "300ms" }}
        >
          <DataTable
            columns={columns}
            data={filteredCustomers}
            tableKey="master-customers"
            isLoading={isLoading}
            onDeleteSelected={handleDeleteSelected}
            onExportSelected={handleExportSelected}
            onRowSelectionChange={setSelectedRowIds}
            enableRowSelection={true}
            enableBulkActions={true}
            enableGlobalFilter={true}
            enableColumnVisibility={true}
            enableSorting={true}
            enablePagination={true}
            defaultPageSize={10}
            emptyMessage="No customers found. Add a customer to get started."
            customToolbarActions={
              <>
                <Button
                  onClick={() => {
                    setSelectedCustomer(undefined);
                    setIsFormOpen(true);
                  }}
                  variant="outline"
                  className="shadow-md hover:shadow-lg transition-all duration-200"
                  data-testid="button-add-customer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
                <Button
                  onClick={() => {
                    if (selectedRowIds.length === 0) {
                      toast({
                        title: "No Customers Selected",
                        description:
                          "Please select at least one customer to update",
                        variant: "destructive",
                      });
                      return;
                    }
                    setIsBulkUpdateOpen(true);
                  }}
                  variant="outline"
                  className="shadow-md hover:shadow-lg transition-all duration-200"
                  data-testid="button-bulk-update"
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  Bulk Update
                </Button>
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
              </>
            }
          />
        </div>
      </div>

      <MasterCustomerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        customer={selectedCustomer}
      />

      <ImportModal open={isImportOpen} onOpenChange={setIsImportOpen} />

      <Dialog open={isBulkInterestOpen} onOpenChange={setIsBulkInterestOpen}>
        <DialogContent data-testid="dialog-bulk-interest">
          <DialogHeader>
            <DialogTitle>Set Interest Rate for All Customers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-interest-rate">Interest Rate (%)</Label>
              <Input
                id="bulk-interest-rate"
                type="number"
                step="0.01"
                placeholder="Enter interest rate"
                value={bulkInterestRate}
                onChange={(e) => setBulkInterestRate(e.target.value)}
                data-testid="input-bulk-interest-rate"
              />
              <p className="text-sm text-gray-500">
                This will update the interest rate for all customers in the
                database.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkInterestOpen(false);
                setBulkInterestRate("");
              }}
              data-testid="button-cancel-bulk-interest"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                bulkUpdateInterestMutation.mutate(bulkInterestRate)
              }
              disabled={
                !bulkInterestRate || bulkUpdateInterestMutation.isPending
              }
              data-testid="button-confirm-bulk-interest"
            >
              {bulkUpdateInterestMutation.isPending
                ? "Updating..."
                : "Update All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkUpdateOpen} onOpenChange={setIsBulkUpdateOpen}>
        <DialogContent
          className="sm:max-w-[500px]"
          data-testid="dialog-bulk-update"
        >
          <DialogHeader>
            <DialogTitle>Bulk Update Selected Customers</DialogTitle>
            <p className="text-sm text-gray-500 mt-2">
              Update {selectedRowIds.length} selected customer
              {selectedRowIds.length > 1 ? "s" : ""}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-category">Client Category</Label>
              <Select
                value={bulkUpdateData.category}
                onValueChange={(value) =>
                  setBulkUpdateData({ ...bulkUpdateData, category: value })
                }
              >
                <SelectTrigger
                  id="bulk-category"
                  data-testid="select-bulk-category"
                >
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alpha">Alpha</SelectItem>
                  <SelectItem value="Beta">Beta</SelectItem>
                  <SelectItem value="Gamma">Gamma</SelectItem>
                  <SelectItem value="Delta">Delta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-status">Status</Label>
              <Select
                value={bulkUpdateData.status}
                onValueChange={(value) =>
                  setBulkUpdateData({ ...bulkUpdateData, status: value })
                }
              >
                <SelectTrigger
                  id="bulk-status"
                  data-testid="select-bulk-status"
                >
                  <SelectValue placeholder="Select status (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-interest-rate-field">
                Interest Rate (%)
              </Label>
              <Input
                id="bulk-interest-rate-field"
                type="number"
                step="0.01"
                placeholder="Enter interest rate (optional)"
                value={bulkUpdateData.interestRate}
                onChange={(e) =>
                  setBulkUpdateData({
                    ...bulkUpdateData,
                    interestRate: e.target.value,
                  })
                }
                data-testid="input-bulk-interest-rate-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-interest-applicable">
                Interest Applicable From
              </Label>
              <Select
                value={bulkUpdateData.interestApplicableFrom}
                onValueChange={(value) =>
                  setBulkUpdateData({
                    ...bulkUpdateData,
                    interestApplicableFrom: value,
                  })
                }
              >
                <SelectTrigger
                  id="bulk-interest-applicable"
                  data-testid="select-bulk-interest-applicable"
                >
                  <SelectValue placeholder="Select applicable from (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invoice Date">Invoice Date</SelectItem>
                  <SelectItem value="Due Date">Due Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
              Note: Only filled fields will be updated. Empty fields will be
              skipped.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkUpdateOpen(false);
                setBulkUpdateData({
                  category: "",
                  status: "",
                  interestRate: "",
                  interestApplicableFrom: "",
                });
              }}
              data-testid="button-cancel-bulk-update"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                bulkUpdateMutation.mutate({
                  customerIds: selectedRowIds,
                  updates: bulkUpdateData,
                });
              }}
              disabled={bulkUpdateMutation.isPending}
              data-testid="button-confirm-bulk-update"
            >
              {bulkUpdateMutation.isPending
                ? "Updating..."
                : `Update ${selectedRowIds.length} Customer${selectedRowIds.length > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
