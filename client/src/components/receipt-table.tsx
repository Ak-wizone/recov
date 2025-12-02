import { useMemo } from "react";
import { type Receipt } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MessageSquare, Mail } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReceiptTableProps {
  receipts: Receipt[];
  isLoading: boolean;
  onEdit: (receipt: Receipt) => void;
  onDelete: (receipt: Receipt) => void;
  onWhatsApp?: (receipt: Receipt) => void;
  onEmail?: (receipt: Receipt) => void;
  onCall?: (receipt: Receipt) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export function ReceiptTable({
  receipts,
  isLoading,
  onEdit,
  onDelete,
  onWhatsApp,
  onEmail,
  onCall,
  onBulkDelete,
}: ReceiptTableProps) {
  const { canPerformAction } = useAuth();
  
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
        accessorKey: "voucherType",
        header: "Voucher Type",
        cell: ({ row }) => (
          <div data-testid={`text-voucher-type-${row.original.id}`}>
            {row.original.voucherType}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "entryType",
        header: "Entry Type",
        cell: ({ row }) => (
          <div data-testid={`text-entry-type-${row.original.id}`}>
            {row.original.entryType || "—"}
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
    ],
    [canPerformAction]
  );

  const handleBulkDelete = async (rows: Receipt[]) => {
    if (onBulkDelete) {
      const ids = rows.map(row => row.id);
      onBulkDelete(ids);
    }
  };

  const handleEditSelected = (receipt: Receipt) => {
    onEdit(receipt);
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
      onEditSelected={handleEditSelected}
      customBulkActions={(selectedReceipts: Receipt[]) => (
        <div className="flex items-center gap-2">
          {canPerformAction("canWhatsApp") && onWhatsApp && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedReceipts.forEach(r => onWhatsApp(r))}
              className="bg-green-100 hover:bg-green-200 border-green-300 text-green-800 hover:text-green-800 dark:bg-green-900 dark:hover:bg-green-800 dark:border-green-700 dark:text-green-200 dark:hover:text-green-200 transition-transform duration-200 hover:scale-105"
              data-testid="button-bulk-whatsapp"
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              WhatsApp
            </Button>
          )}
          {canPerformAction("canEmail") && onEmail && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedReceipts.forEach(r => onEmail(r))}
              className="bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800 hover:text-blue-800 dark:bg-blue-900 dark:hover:bg-blue-800 dark:border-blue-700 dark:text-blue-200 dark:hover:text-blue-200 transition-transform duration-200 hover:scale-105"
              data-testid="button-bulk-email"
            >
              <Mail className="h-4 w-4 mr-1.5" />
              Email
            </Button>
          )}
        </div>
      )}
    />
  );
}
