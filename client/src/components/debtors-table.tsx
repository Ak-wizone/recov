import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Search, MessageSquare, Mail, Phone, BookOpen, Activity, Edit, Calendar } from "lucide-react";
import { ColumnChooser } from "@/components/ui/column-chooser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { openWhatsApp, getWhatsAppMessageTemplate } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

interface DebtorData {
  customerId: string;
  name: string;
  category: string;
  salesPerson: string | null;
  mobile: string;
  email: string;
  creditLimit: number;
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
  const { canPerformAction } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);
  const [defaultColumnVisibility] = useState<Record<string, boolean>>({});
  const [selectedDebtorForActions, setSelectedDebtorForActions] = useState<DebtorData | null>(null);
  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  
  // Page size with localStorage persistence
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('debtors-table-page-size');
    return saved ? parseInt(saved, 10) : 10;
  });
  
  // Save page size to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('debtors-table-page-size', pageSize.toString());
  }, [pageSize]);

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
        <button
          onClick={() => {
            setSelectedDebtorForActions(row.original);
            setIsActionsDialogOpen(true);
          }}
          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-left"
          data-testid={`link-name-${row.original.customerId}`}
        >
          {row.getValue("name")}
        </button>
      ),
      enableColumnFilter: true,
      meta: {
        sticky: true,
      },
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
      enableColumnFilter: true,
    },
    {
      accessorKey: "salesPerson",
      header: "Assigned Sales Person",
      cell: ({ row }) => (
        <div data-testid={`text-salesperson-${row.original.customerId}`}>
          {row.getValue("salesPerson") || "-"}
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "mobile",
      header: "Mobile",
      cell: ({ row }) => (
        <div data-testid={`text-mobile-${row.original.customerId}`}>
          {row.getValue("mobile")}
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="text-sm" data-testid={`text-email-${row.original.customerId}`}>
          {row.getValue("email")}
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "creditLimit",
      header: "Credit Limit",
      cell: ({ row }) => (
        <div className="text-right font-medium" data-testid={`text-credit-limit-${row.original.customerId}`}>
          {formatCurrency(row.getValue("creditLimit"))}
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "openingBalance",
      header: "Opening Balance",
      cell: ({ row }) => {
        const openingBalance = row.getValue("openingBalance") as number;
        const balance = row.original.balance;
        const isHighlighted = openingBalance < balance;
        
        return (
          <div 
            className={`text-right font-medium ${isHighlighted ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}`} 
            data-testid={`text-opening-balance-${row.original.customerId}`}
          >
            {formatCurrency(openingBalance)}
          </div>
        );
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "totalInvoices",
      header: "Total Invoices",
      cell: ({ row }) => (
        <div className="text-right font-medium" data-testid={`text-total-invoices-${row.original.customerId}`}>
          {formatCurrency(row.getValue("totalInvoices"))}
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "totalReceipts",
      header: "Total Receipts",
      cell: ({ row }) => (
        <div className="text-right font-medium" data-testid={`text-total-receipts-${row.original.customerId}`}>
          {formatCurrency(row.getValue("totalReceipts"))}
        </div>
      ),
      enableColumnFilter: true,
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
      enableColumnFilter: true,
    },
    {
      accessorKey: "invoiceCount",
      header: "Invoice Count",
      cell: ({ row }) => (
        <div className="text-center" data-testid={`text-invoice-count-${row.original.customerId}`}>
          {row.getValue("invoiceCount")}
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "receiptCount",
      header: "Receipt Count",
      cell: ({ row }) => (
        <div className="text-center" data-testid={`text-receipt-count-${row.original.customerId}`}>
          {row.getValue("receiptCount")}
        </div>
      ),
      enableColumnFilter: true,
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
      enableColumnFilter: true,
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
      enableColumnFilter: true,
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
            onClick={() => setLocation(`/payment-analytics/scorecard?customerId=${row.original.customerId}`)}
            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950"
            data-testid={`button-payment-score-${row.original.customerId}`}
          >
            <Activity className="h-4 w-4" />
          </Button>
          {canPerformAction("canWhatsApp") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleWhatsAppClick(row.original)}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
              data-testid={`button-whatsapp-${row.original.customerId}`}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
          {canPerformAction("canEmail") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEmailClick(row.original)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
              data-testid={`button-email-${row.original.customerId}`}
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}
          {canPerformAction("canCall") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenCall(row.original)}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950"
              data-testid={`button-call-${row.original.customerId}`}
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
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
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize,
      },
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

      {/* Table with Scrolling */}
      <div 
        className="rounded-md border overflow-x-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(203 213 225) transparent'
        }}
      >
        <div 
          className="overflow-y-auto" 
          style={{ 
            maxHeight: "calc(100vh - 450px)",
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(203 213 225) transparent'
          }}
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSticky = header.column.columnDef.meta?.sticky;
                    return (
                      <TableHead 
                        key={header.id} 
                        className="py-2 bg-background"
                        style={isSticky ? { position: 'sticky', left: 0, zIndex: 20 } : undefined}
                      >
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
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={`filter-${headerGroup.id}`} className="sticky top-11 z-10 bg-background">
                  {headerGroup.headers.map((header) => {
                    const canFilter = header.column.getCanFilter();
                    const columnFilterValue = header.column.getFilterValue();
                    const isSticky = header.column.columnDef.meta?.sticky;

                    return (
                      <TableHead 
                        key={`filter-${header.id}`} 
                        className="py-2 bg-background"
                        style={isSticky ? { position: 'sticky', left: 0, zIndex: 20 } : undefined}
                      >
                        {canFilter ? (
                          <Input
                            type="text"
                            placeholder={`Search ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header.toLowerCase() : ''}...`}
                            value={(columnFilterValue ?? "") as string}
                            onChange={(e) => header.column.setFilterValue(e.target.value)}
                            className="h-8"
                            data-testid={`input-filter-${header.id}`}
                          />
                        ) : null}
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
                    {row.getVisibleCells().map((cell) => {
                      const isSticky = cell.column.columnDef.meta?.sticky;
                      return (
                        <TableCell 
                          key={cell.id}
                          className={isSticky ? "bg-background" : undefined}
                          style={isSticky ? { position: 'sticky', left: 0, zIndex: 10 } : undefined}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
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
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {data.length} debtor(s)
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              const newSize = Number(value);
              setPageSize(newSize);
              table.setPageSize(newSize);
            }}
          >
            <SelectTrigger className="h-8 w-[100px]" data-testid="select-page-size">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={`${size}`} data-testid={`option-page-size-${size}`}>
                  {size} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Customer Actions Dialog */}
      <Dialog open={isActionsDialogOpen} onOpenChange={setIsActionsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Actions</DialogTitle>
            <DialogDescription>
              {selectedDebtorForActions?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {selectedDebtorForActions && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    handleWhatsAppClick(selectedDebtorForActions);
                    setIsActionsDialogOpen(false);
                  }}
                  data-testid="button-action-whatsapp"
                >
                  <MessageSquare className="h-4 w-4 mr-2 text-[#25D366]" />
                  Send WhatsApp
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    handleEmailClick(selectedDebtorForActions);
                    setIsActionsDialogOpen(false);
                  }}
                  data-testid="button-action-email"
                >
                  <Mail className="h-4 w-4 mr-2 text-blue-500" />
                  Send Email
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    onOpenCall(selectedDebtorForActions);
                    setIsActionsDialogOpen(false);
                  }}
                  data-testid="button-action-call"
                >
                  <Phone className="h-4 w-4 mr-2 text-purple-500" />
                  Make Call
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    onOpenFollowUp(selectedDebtorForActions);
                    setIsActionsDialogOpen(false);
                  }}
                  data-testid="button-action-followup"
                >
                  <Calendar className="h-4 w-4 mr-2 text-orange-500" />
                  Schedule Follow Up
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setLocation(`/ledger?customerId=${selectedDebtorForActions.customerId}`);
                    setIsActionsDialogOpen(false);
                  }}
                  data-testid="button-action-ledger"
                >
                  <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
                  View Ledger
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setLocation(`/masters/customers?edit=${selectedDebtorForActions.customerId}`);
                    setIsActionsDialogOpen(false);
                  }}
                  data-testid="button-action-edit"
                >
                  <Edit className="h-4 w-4 mr-2 text-gray-500" />
                  Edit Customer
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
