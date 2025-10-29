import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, MessageSquare, Mail, Phone, BookOpen } from "lucide-react";
import { ColumnChooser } from "@/components/ui/column-chooser";
import { format } from "date-fns";
import { openWhatsApp, getWhatsAppMessageTemplate } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface DebtorData {
  customerId: string;
  name: string;
  category: string;
  salesPerson: string | null;
  mobile: string;
  email: string;
  openingBalance: number;
  totalInvoices: number;
  totalReceipts: number;
  balance: number;
  invoiceCount: number;
  receiptCount: number;
  lastInvoiceDate: Date | null;
  lastPaymentDate: Date | null;
  lastFollowUp: Date | null;
  nextFollowUp: Date | null;
}

interface DebtorsTableProps {
  data: DebtorData[];
  onOpenFollowUp: (debtor: DebtorData) => void;
  onOpenEmail: (debtor: DebtorData) => void;
  onOpenCall: (debtor: DebtorData) => void;
}

export function DebtorsTable({ data, onOpenFollowUp, onOpenEmail, onOpenCall }: DebtorsTableProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);
  const [defaultColumnVisibility] = useState<Record<string, boolean>>({});

  const handleWhatsAppClick = (debtor: DebtorData) => {
    if (!debtor.mobile) {
      toast({
        title: "Mobile number not available",
        description: "This customer doesn't have a mobile number on file.",
        variant: "destructive",
      });
      return;
    }

    const message = getWhatsAppMessageTemplate("debtors", {
      customerName: debtor.name,
      amount: debtor.balance,
    });

    openWhatsApp(debtor.mobile, message);
  };

  const handleEmailClick = (debtor: DebtorData) => {
    if (!debtor.email) {
      toast({
        title: "Email not available",
        description: "This customer doesn't have an email address on file.",
        variant: "destructive",
      });
      return;
    }

    onOpenEmail(debtor);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const columns: ColumnDef<DebtorData>[] = [
    {
      accessorKey: "name",
      header: "Customer Name",
      cell: ({ row }) => (
        <div className="font-medium" data-testid={`text-name-${row.original.customerId}`}>
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        const colors: Record<string, string> = {
          Alpha: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          Beta: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
          Gamma: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
          Delta: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${colors[category] || ""}`}
            data-testid={`text-category-${row.original.customerId}`}
          >
            {category}
          </span>
        );
      },
    },
    {
      accessorKey: "salesPerson",
      header: "Assigned Sales Person",
      cell: ({ row }) => (
        <div data-testid={`text-salesperson-${row.original.customerId}`}>
          {row.getValue("salesPerson") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "mobile",
      header: "Mobile",
      cell: ({ row }) => (
        <div data-testid={`text-mobile-${row.original.customerId}`}>
          {row.getValue("mobile")}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="text-sm" data-testid={`text-email-${row.original.customerId}`}>
          {row.getValue("email")}
        </div>
      ),
    },
    {
      accessorKey: "openingBalance",
      header: "Opening Balance",
      cell: ({ row }) => (
        <div className="text-right font-medium" data-testid={`text-opening-balance-${row.original.customerId}`}>
          {formatCurrency(row.getValue("openingBalance"))}
        </div>
      ),
    },
    {
      accessorKey: "totalInvoices",
      header: "Total Invoices",
      cell: ({ row }) => (
        <div className="text-right font-medium" data-testid={`text-total-invoices-${row.original.customerId}`}>
          {formatCurrency(row.getValue("totalInvoices"))}
        </div>
      ),
    },
    {
      accessorKey: "totalReceipts",
      header: "Total Receipts",
      cell: ({ row }) => (
        <div className="text-right font-medium" data-testid={`text-total-receipts-${row.original.customerId}`}>
          {formatCurrency(row.getValue("totalReceipts"))}
        </div>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance Outstanding",
      cell: ({ row }) => (
        <div
          className="text-right font-bold text-red-600 dark:text-red-400 text-lg"
          data-testid={`text-balance-${row.original.customerId}`}
        >
          {formatCurrency(row.getValue("balance"))}
        </div>
      ),
    },
    {
      accessorKey: "invoiceCount",
      header: "Invoice Count",
      cell: ({ row }) => (
        <div className="text-center" data-testid={`text-invoice-count-${row.original.customerId}`}>
          {row.getValue("invoiceCount")}
        </div>
      ),
    },
    {
      accessorKey: "receiptCount",
      header: "Receipt Count",
      cell: ({ row }) => (
        <div className="text-center" data-testid={`text-receipt-count-${row.original.customerId}`}>
          {row.getValue("receiptCount")}
        </div>
      ),
    },
    {
      accessorKey: "lastInvoiceDate",
      header: "Last Invoice Date",
      cell: ({ row }) => {
        const date = row.getValue("lastInvoiceDate") as Date | null;
        return (
          <div data-testid={`text-last-invoice-${row.original.customerId}`}>
            {date ? format(new Date(date), "dd MMM yyyy") : "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "lastPaymentDate",
      header: "Last Payment Date",
      cell: ({ row }) => {
        const date = row.getValue("lastPaymentDate") as Date | null;
        return (
          <div data-testid={`text-last-payment-${row.original.customerId}`}>
            {date ? format(new Date(date), "dd MMM yyyy") : "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "lastFollowUp",
      header: "Last Follow Up",
      cell: ({ row }) => {
        const date = row.getValue("lastFollowUp") as Date | null;
        return (
          <div data-testid={`text-last-followup-${row.original.customerId}`}>
            {date ? format(new Date(date), "dd MMM yyyy") : "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "nextFollowUp",
      header: "Next Follow Up",
      cell: ({ row }) => {
        const date = row.getValue("nextFollowUp") as Date | null;
        return (
          <div data-testid={`text-next-followup-${row.original.customerId}`}>
            {date ? format(new Date(date), "dd MMM yyyy") : "-"}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/ledger?customerId=${row.original.customerId}`)}
            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
            data-testid={`button-ledger-${row.original.customerId}`}
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleWhatsAppClick(row.original)}
            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
            data-testid={`button-whatsapp-${row.original.customerId}`}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEmailClick(row.original)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
            data-testid={`button-email-${row.original.customerId}`}
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenCall(row.original)}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950"
            data-testid={`button-call-${row.original.customerId}`}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenFollowUp(row.original)}
            data-testid={`button-followup-${row.original.customerId}`}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Follow-up
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters and Column Chooser */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search debtors..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10"
            data-testid="input-search-debtors"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsColumnChooserOpen(true)}
          data-testid="button-column-chooser"
        >
          Columns <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      <ColumnChooser
        open={isColumnChooserOpen}
        onOpenChange={setIsColumnChooserOpen}
        columns={table.getAllColumns()}
        onApply={(visibility) => {
          table.setColumnVisibility(visibility);
        }}
        onReset={() => {
          table.setColumnVisibility(defaultColumnVisibility);
        }}
        defaultColumnVisibility={defaultColumnVisibility}
      />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50 transition-colors"
                  data-testid={`row-debtor-${row.original.customerId}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No debtors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {data.length} debtor(s)
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            data-testid="button-previous-page"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
