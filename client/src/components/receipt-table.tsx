import { useMemo } from "react";
import { type Receipt } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ReceiptTableProps {
  receipts: Receipt[];
  isLoading: boolean;
  onEdit: (receipt: Receipt) => void;
  onDelete: (receipt: Receipt) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export function ReceiptTable({
  receipts,
  isLoading,
  onEdit,
  onDelete,
  onBulkDelete,
}: ReceiptTableProps) {
  
  const columns: ColumnDef<Receipt>[] = useMemo(
    () => [
      {
        accessorKey: "voucherNumber",
        header: "Voucher Number",
        cell: ({ row }) => (
          <div className="font-medium" data-testid={`text-voucher-number-${row.original.id}`}>
            {row.original.voucherNumber}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "invoiceNumber",
        header: "Invoice Number",
        cell: ({ row }) => (
          <div data-testid={`text-invoice-number-${row.original.id}`}>
            {row.original.invoiceNumber}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "customerName",
        header: "Customer Name",
        cell: ({ row }) => (
          <div data-testid={`text-customer-${row.original.id}`}>
            {row.original.customerName}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <div data-testid={`text-date-${row.original.id}`}>
            {format(new Date(row.original.date), "MMM dd, yyyy")}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: (row, _columnId, filterValue) => {
          const dateStr = format(new Date(row.original.date), "MMM dd, yyyy");
          return dateStr.toLowerCase().includes(filterValue.toLowerCase());
        },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="text-lg font-semibold text-green-600 dark:text-green-400" data-testid={`text-amount-${row.original.id}`}>
            ₹{parseFloat(row.original.amount).toFixed(2)}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "remarks",
        header: "Remarks",
        cell: ({ row }) => {
          const remarks = row.original.remarks || "";
          const truncated = remarks.length > 30 ? remarks.substring(0, 30) + "..." : remarks;
          return (
            <div title={remarks} data-testid={`text-remarks-${row.original.id}`}>
              {truncated || "—"}
            </div>
          );
        },
        enableSorting: false,
        enableColumnFilter: true,
      },
      {
        accessorKey: "createdAt",
        header: "Date Created",
        cell: ({ row }) => (
          <div data-testid={`text-created-${row.original.id}`}>
            {format(new Date(row.original.createdAt), "MMM dd, yyyy HH:mm")}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: (row, _columnId, filterValue) => {
          const dateStr = format(new Date(row.original.createdAt), "MMM dd, yyyy HH:mm");
          return dateStr.toLowerCase().includes(filterValue.toLowerCase());
        },
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
              data-testid={`button-edit-${row.original.id}`}
            >
              <Pencil className="h-4 w-4 text-blue-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row.original)}
              data-testid={`button-delete-${row.original.id}`}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
        enableHiding: false,
      },
    ],
    [onEdit, onDelete]
  );

  const handleBulkDelete = async (rows: Receipt[]) => {
    if (onBulkDelete) {
      const ids = rows.map(row => row.id);
      onBulkDelete(ids);
    }
  };

  return (
    <DataTable
      columns={columns}
      data={receipts}
      isLoading={isLoading}
      tableKey="receipts"
      enableRowSelection={true}
      enableBulkActions={true}
      enableGlobalFilter={true}
      enableColumnVisibility={true}
      enablePagination={true}
      onDeleteSelected={handleBulkDelete}
    />
  );
}
