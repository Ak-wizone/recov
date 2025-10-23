import { useMemo } from "react";
import { type Invoice } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MessageSquare, Mail, Phone, Calculator } from "lucide-react";
import { format } from "date-fns";

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
  
  const statusColors = {
    Paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Unpaid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    Partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  };

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
        cell: ({ row }) => (
          <div data-testid={`text-payment-terms-${row.original.id}`}>
            {row.original.paymentTerms ? `${row.original.paymentTerms} days` : "—"}
          </div>
        ),
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
          
          if (!invoice.interestRate || parseFloat(invoice.interestRate) <= 0) {
            return <div className="text-right" data-testid={`text-interest-amount-${invoice.id}`}>—</div>;
          }
          
          const invoiceDate = new Date(invoice.invoiceDate);
          const paymentTerms = invoice.paymentTerms ? parseInt(invoice.paymentTerms.toString()) : 0;
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + paymentTerms);
          
          let applicableDate: Date;
          if (invoice.interestApplicableFrom === "Due Date") {
            applicableDate = dueDate;
          } else if (invoice.interestApplicableFrom === "Invoice Date") {
            applicableDate = invoiceDate;
          } else {
            return <div className="text-right" data-testid={`text-interest-amount-${invoice.id}`}>—</div>;
          }
          
          const today = new Date();
          const diffTime = today.getTime() - applicableDate.getTime();
          const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (daysOverdue <= 0) {
            return <div className="text-right" data-testid={`text-interest-amount-${invoice.id}`}>—</div>;
          }
          
          const invoiceAmount = parseFloat(invoice.invoiceAmount);
          const interestRate = parseFloat(invoice.interestRate);
          const interestAmount = (invoiceAmount * interestRate * daysOverdue) / (100 * 365);
          
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
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCalculator?.(row.original)}
              data-testid={`button-calculator-${row.original.id}`}
              title="Interest Calculator"
            >
              <Calculator className="h-4 w-4 text-indigo-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onWhatsApp?.(row.original)}
              data-testid={`button-whatsapp-${row.original.id}`}
            >
              <MessageSquare className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEmail?.(row.original)}
              data-testid={`button-email-${row.original.id}`}
            >
              <Mail className="h-4 w-4 text-blue-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCall?.(row.original)}
              data-testid={`button-call-${row.original.id}`}
            >
              <Phone className="h-4 w-4 text-purple-500" />
            </Button>
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
    [onEdit, onDelete, onCalculator, onWhatsApp, onEmail, onCall]
  );

  const handleBulkDelete = async (rows: Invoice[]) => {
    if (onBulkDelete) {
      const ids = rows.map(row => row.id);
      onBulkDelete(ids);
    }
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
      onFiltersChange={onFiltersChange}
    />
  );
}
