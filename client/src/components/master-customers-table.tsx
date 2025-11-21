import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MasterCustomer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

interface MasterCustomersTableProps {
  customers: MasterCustomer[];
  isLoading?: boolean;
  onEdit: (customer: MasterCustomer) => void;
  onDelete: (customer: MasterCustomer) => void;
}

export function MasterCustomersTable({
  customers,
  isLoading = false,
  onEdit,
  onDelete,
}: MasterCustomersTableProps) {
  const categoryColors = {
    Alpha: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300",
    Beta: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-300",
    Gamma: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300",
    Delta: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300",
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

  const defaultColumnVisibility: Record<string, boolean> = {
    clientName: true,
    category: true,
    city: true,
    state: true,
    primaryContact: true,
    primaryMobile: true,
    primaryEmail: true,
    paymentTerms: true,
    creditLimit: true,
    openingBalance: true,
    salesPerson: true,
    status: true,
    actions: true,
  };

  const columns: ColumnDef<MasterCustomer>[] = useMemo(
    () => [
      {
        accessorKey: "clientName",
        header: "Client Name",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-gray-900" data-testid={`text-clientName-${row.original.id}`}>
              {row.getValue("clientName")}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">ID: #{row.original.id.slice(0, 8)}</div>
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => {
          const category = row.getValue("category") as string;
          return (
            <Badge
              className={categoryColors[category as keyof typeof categoryColors]}
              data-testid={`badge-category-${row.original.id}`}
            >
              {category}
            </Badge>
          );
        },
        enableColumnFilter: true,
      },
      {
        accessorKey: "city",
        header: "City",
        cell: ({ row }) => (
          <div className="text-gray-700" data-testid={`text-city-${row.original.id}`}>
            {row.getValue("city") || "—"}
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "state",
        header: "State",
        cell: ({ row }) => (
          <div className="text-gray-700" data-testid={`text-state-${row.original.id}`}>
            {row.getValue("state") || "—"}
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "primaryContactName",
        id: "primaryContact",
        header: "Primary Contact",
        cell: ({ row }) => (
          <div className="text-gray-700" data-testid={`text-primaryContact-${row.original.id}`}>
            {row.original.primaryContactName || "—"}
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "primaryMobile",
        header: "Primary Mobile",
        cell: ({ row }) => (
          <div className="text-gray-700" data-testid={`text-primaryMobile-${row.original.id}`}>
            {row.getValue("primaryMobile") || "—"}
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "primaryEmail",
        header: "Primary Email",
        cell: ({ row }) => (
          <div className="text-gray-700" data-testid={`text-primaryEmail-${row.original.id}`}>
            {row.getValue("primaryEmail") || "—"}
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "paymentTermsDays",
        id: "paymentTerms",
        header: "Payment Terms (Days)",
        cell: ({ row }) => (
          <div className="text-gray-700" data-testid={`text-paymentTerms-${row.original.id}`}>
            {row.original.paymentTermsDays}
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "creditLimit",
        header: "Credit Limit (₹)",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900" data-testid={`text-creditLimit-${row.original.id}`}>
            {formatCurrency(row.original.creditLimit)}
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "openingBalance",
        header: "Opening Balance (₹)",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900" data-testid={`text-openingBalance-${row.original.id}`}>
            {formatCurrency(row.original.openingBalance)}
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "salesPerson",
        header: "Sales Person",
        cell: ({ row }) => (
          <div className="text-gray-700" data-testid={`text-salesPerson-${row.original.id}`}>
            {row.getValue("salesPerson") || "—"}
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: "isActive",
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.isActive;
          return (
            <Badge
              className={statusColors[status as keyof typeof statusColors]}
              data-testid={`badge-status-${row.original.id}`}
            >
              {status}
            </Badge>
          );
        },
        enableColumnFilter: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(row.original)}
              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
              data-testid={`button-edit-${row.original.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row.original)}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
              data-testid={`button-delete-${row.original.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableHiding: false,
      },
    ],
    [onEdit, onDelete]
  );

  return (
    <div className="space-y-5 p-6">
      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        tableKey="master-customers"
        enableRowSelection={false}
        enableBulkActions={false}
        enableGlobalFilter={true}
        enableColumnVisibility={true}
        enablePagination={true}
        defaultColumnVisibility={defaultColumnVisibility}
        emptyMessage="No customers found. Add a customer to get started."
      />
    </div>
  );
}
