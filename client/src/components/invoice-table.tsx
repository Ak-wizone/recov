import { useMemo } from "react";
import { type Invoice } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MessageSquare, Mail, Phone, Calculator } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TelecmiCallButton } from "@/components/telecmi-call-button";
import { format, differenceInDays } from "date-fns";
import { useAuth } from "@/lib/auth";

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onCalculator?: (invoice: Invoice) => void;
  onWhatsApp?: (invoice: Invoice) => void;
  onEmail?: (invoice: Invoice) => void;
  onCall?: (invoice: Invoice) => void;
  onBulkDelete?: (ids: string[]) => void;
  onFiltersChange?: (filters: { globalFilter: string; columnFilters: any[] }) => void;
}

export function InvoiceTable({
  invoices,
  isLoading,
  onEdit,
  onDelete,
  onCalculator,
  onWhatsApp,
  onEmail,
  onCall,
  onBulkDelete,
  onFiltersChange,
}: InvoiceTableProps) {
  const { user, canPerformAction } = useAuth();
  
  const statusColors = {
    Paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Unpaid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    Partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  };

  const canViewGP = user?.canViewGP !== undefined ? user.canViewGP : true;

  const columns: ColumnDef<Invoice>[] = useMemo(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "Invoice Number",
        cell: ({ row }) => (
          <div className="font-medium" data-testid={`text-invoice-number-${row.original.id}`}>
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
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => {
          const categoryColors = {
            Alpha: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
            Beta: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
            Gamma: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
            Delta: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
          };
          const category = row.original.category;
          return category ? (
            <Badge className={categoryColors[category as keyof typeof categoryColors]}>
              {category}
            </Badge>
          ) : (
            <div>—</div>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "primaryMobile",
        header: "Primary Mobile",
        cell: ({ row }) => (
          <div data-testid={`text-primary-mobile-${row.original.id}`}>
            {row.original.primaryMobile || "—"}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "city",
        header: "City",
        cell: ({ row }) => (
          <div data-testid={`text-city-${row.original.id}`}>
            {row.original.city || "—"}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "pincode",
        header: "Pincode",
        cell: ({ row }) => (
          <div data-testid={`text-pincode-${row.original.id}`}>
            {row.original.pincode || "—"}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "paymentTerms",
        header: "Payment Terms",
        cell: ({ row }) => {
          // Show override if exists, otherwise show original
          const effectivePT = (row.original as any).paymentTermsOverride ?? row.original.paymentTerms;
          const hasOverride = (row.original as any).paymentTermsOverride !== null && (row.original as any).paymentTermsOverride !== undefined;
          return (
            <div data-testid={`text-payment-terms-${row.original.id}`} className={hasOverride ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
              {effectivePT ? `${effectivePT} days` : "—"}
              {hasOverride && <span className="text-[10px] ml-1">(M)</span>}
            </div>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "creditLimit",
        header: "Credit Limit",
        cell: ({ row }) => (
          <div data-testid={`text-credit-limit-${row.original.id}`}>
            {row.original.creditLimit ? `₹${parseFloat(row.original.creditLimit).toFixed(2)}` : "—"}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "interestApplicableFrom",
        header: "Interest Applicable From",
        cell: ({ row }) => (
          <div data-testid={`text-interest-applicable-${row.original.id}`}>
            {row.original.interestApplicableFrom || "—"}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "interestRate",
        header: "Interest Rate",
        cell: ({ row }) => (
          <div data-testid={`text-interest-rate-${row.original.id}`}>
            {row.original.interestRate ? `${row.original.interestRate}%` : "—"}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "salesPerson",
        header: "Sales Person",
        cell: ({ row }) => (
          <div data-testid={`text-sales-person-${row.original.id}`}>
            {row.original.salesPerson || "—"}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "interestAmount",
        header: "Interest Amount",
        cell: ({ row }) => {
          const invoice = row.original;
          
          // Use the interest amount calculated by backend (from Interest Calculator report logic)
          if (!invoice.interestAmount || parseFloat(invoice.interestAmount) <= 0) {
            return <div className="text-right" data-testid={`text-interest-amount-${invoice.id}`}>—</div>;
          }
          
          const interestAmount = parseFloat(invoice.interestAmount);
          
          return (
            <div className="text-right font-semibold text-orange-600 dark:text-orange-400" data-testid={`text-interest-amount-${invoice.id}`}>
              ₹{interestAmount.toFixed(2)}
            </div>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "invoiceDate",
        header: "Invoice Date",
        cell: ({ row }) => (
          <div data-testid={`text-invoice-date-${row.original.id}`}>
            {format(new Date(row.original.invoiceDate), "MMM dd, yyyy")}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: (row, _columnId, filterValue) => {
          const dateStr = format(new Date(row.original.invoiceDate), "MMM dd, yyyy");
          return dateStr.toLowerCase().includes(filterValue.toLowerCase());
        },
      },
      {
        accessorKey: "invoiceAmount",
        header: "Invoice Amount",
        cell: ({ row }) => (
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-amount-${row.original.id}`}>
            ₹{parseFloat(row.original.invoiceAmount).toFixed(2)}
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "gp",
        header: "G.P.",
        cell: ({ row }) => {
          const profit = parseFloat(row.original.gp);
          const isPositive = profit >= 0;
          return (
            <div 
              className={`text-lg font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} 
              data-testid={`text-gp-${row.original.id}`}
            >
              ₹{profit.toFixed(2)}
            </div>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "finalGp",
        header: "FINAL G.P.",
        cell: ({ row }) => {
          const finalGp = row.original.finalGp ? parseFloat(row.original.finalGp) : null;
          if (finalGp === null) return <div className="text-gray-400">-</div>;
          const isPositive = finalGp >= 0;
          return (
            <div 
              className={`text-lg font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} 
              data-testid={`text-final-gp-${row.original.id}`}
            >
              ₹{finalGp.toFixed(2)}
            </div>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "finalGpPercentage",
        header: "FINAL G.P. %",
        cell: ({ row }) => {
          const finalGpPct = row.original.finalGpPercentage ? parseFloat(row.original.finalGpPercentage) : null;
          if (finalGpPct === null) return <div className="text-gray-400">-</div>;
          const isPositive = finalGpPct >= 0;
          return (
            <div 
              className={`text-lg font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} 
              data-testid={`text-final-gp-percentage-${row.original.id}`}
            >
              {finalGpPct.toFixed(2)}%
            </div>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge 
            className={statusColors[row.original.status as keyof typeof statusColors]}
            data-testid={`badge-status-${row.original.id}`}
          >
            {row.original.status}
          </Badge>
        ),
        enableSorting: true,
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
    ].filter(column => {
      // Hide G.P. columns if user doesn't have permission
      if (!canViewGP && column.accessorKey) {
        const gpColumns = ['gp', 'finalGp', 'finalGpPercentage'];
        return !gpColumns.includes(column.accessorKey as string);
      }
      return true;
    }),
    [canViewGP]
  );

  const handleBulkDelete = async (rows: Invoice[]) => {
    if (onBulkDelete) {
      const ids = rows.map(row => row.id);
      onBulkDelete(ids);
    }
  };

  const handleEditSelected = (invoice: Invoice) => {
    onEdit(invoice);
  };

  return (
    <DataTable
      columns={columns}
      data={invoices}
      isLoading={isLoading}
      tableKey="invoices"
      enableRowSelection={true}
      enableBulkActions={true}
      enableGlobalFilter={true}
      enableColumnVisibility={true}
      enablePagination={true}
      onDeleteSelected={handleBulkDelete}
      onEditSelected={handleEditSelected}
      onFiltersChange={onFiltersChange}
      getRowClassName={(invoice) => {
        // Highlight row with pastel amber/peach if it has a manual payment terms override
        const hasOverride = (invoice as any).paymentTermsOverride !== null && (invoice as any).paymentTermsOverride !== undefined;
        return hasOverride ? "bg-amber-50 dark:bg-amber-900/20" : "";
      }}
      customBulkActions={(selectedInvoices: Invoice[]) => (
        <div className="flex items-center gap-2">
          {selectedInvoices.length === 1 && onCalculator && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCalculator(selectedInvoices[0])}
              className="bg-indigo-100 hover:bg-indigo-200 border-indigo-300 text-indigo-800 dark:bg-indigo-900 dark:hover:bg-indigo-800 dark:border-indigo-700 dark:text-indigo-200"
              data-testid="button-bulk-calculator"
            >
              <Calculator className="h-4 w-4 mr-1.5" />
              Calculator
            </Button>
          )}
          {canPerformAction("canWhatsApp") && onWhatsApp && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedInvoices.forEach(inv => onWhatsApp(inv))}
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
              onClick={() => selectedInvoices.forEach(inv => onEmail(inv))}
              className="bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800 hover:text-blue-800 dark:bg-blue-900 dark:hover:bg-blue-800 dark:border-blue-700 dark:text-blue-200 dark:hover:text-blue-200 transition-transform duration-200 hover:scale-105"
              data-testid="button-bulk-email"
            >
              <Mail className="h-4 w-4 mr-1.5" />
              Email
            </Button>
          )}
          {canPerformAction("canCall") && onCall && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedInvoices.forEach(inv => onCall(inv))}
              className="bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-800 hover:text-purple-800 dark:bg-purple-900 dark:hover:bg-purple-800 dark:border-purple-700 dark:text-purple-200 dark:hover:text-purple-200 transition-transform duration-200 hover:scale-105"
              data-testid="button-bulk-call"
            >
              <Phone className="h-4 w-4 mr-1.5" />
              AI Call
            </Button>
          )}
          {canPerformAction("canCall") && selectedInvoices.length === 1 && (
            <TelecmiCallButton
              customerPhone={selectedInvoices[0].primaryMobile || ""}
              customerName={selectedInvoices[0].customerName || ""}
              module="invoices"
              invoiceNumber={selectedInvoices[0].invoiceNumber}
              amount={Number(selectedInvoices[0].balance) || 0}
              daysOverdue={selectedInvoices[0].invoiceDueDate ? 
                Math.floor((new Date().getTime() - new Date(selectedInvoices[0].invoiceDueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0}
              buttonText="IVR Call"
              buttonVariant="outline"
              className="bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-800 hover:text-orange-800 dark:bg-orange-900 dark:hover:bg-orange-800 dark:border-orange-700 dark:text-orange-200 dark:hover:text-orange-200 transition-transform duration-200 hover:scale-105"
            />
          )}
        </div>
      )}
    />
  );
}
