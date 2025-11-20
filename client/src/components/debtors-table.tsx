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
import { ChevronDown, Search, MessageSquare, Mail, Phone, BookOpen, Activity, Edit, Calendar, X, ArrowUpDown, ArrowUp, ArrowDown, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnChooser } from "@/components/ui/column-chooser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format, differenceInDays } from "date-fns";
import { openWhatsApp, getWhatsAppMessageTemplate } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { TelecmiCallButton } from "@/components/telecmi-call-button";

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
  onFilteredDataChange?: (rows: DebtorData[]) => void;
}

export function DebtorsTable({ data, onOpenFollowUp, onOpenEmail, onOpenCall, onFilteredDataChange }: DebtorsTableProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { canPerformAction } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);
  const [selectedDebtorForActions, setSelectedDebtorForActions] = useState<DebtorData | null>(null);
  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState({});
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>("");
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [reassignSalesPerson, setReassignSalesPerson] = useState<string>("");
  
  // Define default column visibility - only show these columns by default
  const [defaultColumnVisibility] = useState<Record<string, boolean>>({
    // Visible by default (10 data columns as per spec)
    name: true,
    category: true,
    salesPerson: true,
    creditLimit: true,
    openingBalance: true,
    totalInvoices: true,
    totalReceipts: true,
    balance: true,
    lastFollowUp: true,
    nextFollowUp: true,
    
    // Hidden by default (optional columns available in column chooser)
    mobile: false,
    email: false,
    invoiceCount: false,
    receiptCount: false,
    lastInvoiceDate: false,
    lastPaymentDate: false,
    actions: true,  // Action buttons visible by default (includes email, WhatsApp, call, follow-up)
  });
  
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility);
  
  // Page size with localStorage persistence
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('debtors-table-page-size');
    return saved ? parseInt(saved, 10) : 10;
  });
  
  // Save page size to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('debtors-table-page-size', pageSize.toString());
  }, [pageSize]);

  // Fetch users for sales person assignment
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Bulk assign sales person mutation
  const assignSalesPersonMutation = useMutation({
    mutationFn: async (data: { customerIds: string[]; salesPerson: string }) => {
      const response = await fetch("/api/customers/bulk-assign-salesperson", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign sales person");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debtors"] });
      toast({
        title: "Success",
        description: `Assigned ${selectedDebtors.length} debtor(s) to sales person`,
      });
      setIsAssignDialogOpen(false);
      setSelectedSalesPerson("");
      table.resetRowSelection();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign sales person",
        variant: "destructive",
      });
    },
  });

  // Single customer reassignment mutation
  const reassignSalesPersonMutation = useMutation({
    mutationFn: async (data: { customerIds: string[]; salesPerson: string }) => {
      const response = await fetch("/api/customers/bulk-assign-salesperson", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reassign sales person");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debtors"] });
      toast({
        title: "Success",
        description: "Debtor reassigned successfully",
      });
      setIsReassignDialogOpen(false);
      setReassignSalesPerson("");
      setIsActionsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reassign sales person",
        variant: "destructive",
      });
    },
  });

  const handleWhatsAppClick = (debtor: DebtorData) => {
    try {
      if (!debtor || !debtor.mobile) {
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
    } catch (error) {
      console.error('Error in handleWhatsAppClick:', error);
      toast({
        title: "Error",
        description: "Failed to open WhatsApp",
        variant: "destructive",
      });
    }
  };

  const handleEmailClick = (debtor: DebtorData) => {
    try {
      if (!debtor || !debtor.email) {
        toast({
          title: "Email not available",
          description: "This customer doesn't have an email address on file.",
          variant: "destructive",
        });
        return;
      }

      onOpenEmail(debtor);
    } catch (error) {
      console.error('Error in handleEmailClick:', error);
      toast({
        title: "Error",
        description: "Failed to open email dialog",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const columns: ColumnDef<DebtorData>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          data-testid="checkbox-select-all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          data-testid={`checkbox-select-${row.original.customerId}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Customer Name",
      cell: ({ row }) => (
        <button
          onClick={() => {
            console.log('[Debtors] Customer name clicked:', row.original);
            setSelectedDebtorForActions(row.original);
            setIsActionsDialogOpen(true);
            console.log('[Debtors] Dialog should now be open');
          }}
          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-left"
          data-testid={`link-name-${row.original.customerId}`}
        >
          {row.getValue("name")}
        </button>
      ),
      enableColumnFilter: true,
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
          {/* @ts-ignore - Type issue with optional actionPermissions */}
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
          {/* @ts-ignore - Type issue with optional actionPermissions */}
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
          {/* @ts-ignore - Type issue with optional actionPermissions */}
          {canPerformAction("canCall") && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenCall(row.original)}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950"
                data-testid={`button-call-${row.original.customerId}`}
                title="Call via Ringg.ai"
              >
                <Phone className="h-4 w-4" />
              </Button>
              {row.original.mobile && (
                <TelecmiCallButton
                  customerPhone={row.original.mobile}
                  customerName={row.original.name}
                  module="debtors"
                  amount={row.original.balance}
                  daysOverdue={
                    row.original.lastInvoiceDate
                      ? differenceInDays(new Date(), new Date(row.original.lastInvoiceDate))
                      : 0
                  }
                  buttonText=""
                  buttonVariant="outline"
                  icon={<Phone className="h-4 w-4" />}
                />
              )}
            </>
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
    onRowSelectionChange: setRowSelection,
    globalFilterFn: "includesString",
    enableRowSelection: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      rowSelection,
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
    getRowId: (row) => row.customerId,
  });

  // Notify parent when filtered data changes
  useEffect(() => {
    if (onFilteredDataChange) {
      const filteredRows = table.getFilteredRowModel().rows.map(r => r.original);
      onFilteredDataChange(filteredRows);
    }
  }, [globalFilter, columnFilters, data, onFilteredDataChange, table]);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedDebtors = selectedRows.map(row => row.original);
  const hasSelection = selectedRows.length > 0;

  const handleBulkWhatsApp = () => {
    const debtorsWithMobile = selectedDebtors.filter(d => d.mobile);
    if (debtorsWithMobile.length === 0) {
      toast({
        title: "No mobile numbers",
        description: "None of the selected customers have mobile numbers on file.",
        variant: "destructive",
      });
      return;
    }
    // Open WhatsApp for each debtor
    debtorsWithMobile.forEach(debtor => handleWhatsAppClick(debtor));
    toast({
      title: "WhatsApp messages initiated",
      description: `Opened WhatsApp for ${debtorsWithMobile.length} customer(s)`,
    });
  };

  const handleBulkEmail = () => {
    const debtorsWithEmail = selectedDebtors.filter(d => d.email);
    if (debtorsWithEmail.length === 0) {
      toast({
        title: "No email addresses",
        description: "None of the selected customers have email addresses on file.",
        variant: "destructive",
      });
      return;
    }
    
    // Open email dialog for each selected debtor
    debtorsWithEmail.forEach((debtor, index) => {
      setTimeout(() => {
        onOpenEmail(debtor);
      }, index * 500); // Stagger dialogs by 500ms to avoid overwhelming
    });
    
    toast({
      title: "Email dialogs opening",
      description: `Opening email composer for ${debtorsWithEmail.length} customer(s)`,
    });
  };

  const handleBulkCall = () => {
    if (selectedDebtors.length === 0) return;
    
    // Open call dialog for each selected debtor
    selectedDebtors.forEach((debtor, index) => {
      setTimeout(() => {
        onOpenCall(debtor);
      }, index * 500); // Stagger dialogs by 500ms
    });
    
    toast({
      title: "Call dialogs opening",
      description: `Opening call dialog for ${selectedDebtors.length} customer(s)`,
    });
  };

  const handleBulkFollowUp = () => {
    if (selectedDebtors.length === 0) return;
    
    // Open follow-up dialog for each selected debtor
    selectedDebtors.forEach((debtor, index) => {
      setTimeout(() => {
        onOpenFollowUp(debtor);
      }, index * 500); // Stagger dialogs by 500ms
    });
    
    toast({
      title: "Follow-up dialogs opening",
      description: `Opening follow-up scheduler for ${selectedDebtors.length} customer(s)`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      {hasSelection && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedRows.length} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetRowSelection()}
              className="h-7 px-2 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
              data-testid="button-clear-selection"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {/* @ts-ignore - Type issue with optional actionPermissions */}
            {canPerformAction("canWhatsApp") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkWhatsApp}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                data-testid="button-bulk-whatsapp"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}
            {/* @ts-ignore - Type issue with optional actionPermissions */}
            {canPerformAction("canEmail") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkEmail}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                data-testid="button-bulk-email"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            )}
            {/* @ts-ignore - Type issue with optional actionPermissions */}
            {canPerformAction("canCall") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkCall}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950"
                data-testid="button-bulk-call"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkFollowUp}
              data-testid="button-bulk-followup"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Follow-up
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssignDialogOpen(true)}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950"
              data-testid="button-bulk-assign"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign to
            </Button>
          </div>
        </div>
      )}

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
            minHeight: "500px",
            maxHeight: "calc(100vh - 350px)",
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(203 213 225) transparent'
          }}
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    
                    return (
                      <TableHead key={header.id} className="py-2 bg-background">
                        {header.isPlaceholder ? null : (
                          <div
                            className={`flex items-center gap-2 ${
                              isSortable ? "cursor-pointer select-none hover:text-primary" : ""
                            }`}
                            onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                            data-testid={`header-${header.id}`}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {isSortable && (
                              <span className="ml-1">
                                {sortDirection === "asc" ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : sortDirection === "desc" ? (
                                  <ArrowDown className="h-4 w-4" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                                )}
                              </span>
                            )}
                          </div>
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

                    return (
                      <TableHead key={`filter-${header.id}`} className="py-2 bg-background">
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
                    setReassignSalesPerson(selectedDebtorForActions.salesPerson || "");
                    setIsReassignDialogOpen(true);
                  }}
                  data-testid="button-action-reassign"
                >
                  <UserPlus className="h-4 w-4 mr-2 text-orange-500" />
                  Reassign Sales Person
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Sales Person Dialog */}
      <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Sales Person</DialogTitle>
            <DialogDescription>
              Reassign {selectedDebtorForActions?.name} to a different sales person
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={reassignSalesPerson} onValueChange={setReassignSalesPerson}>
              <SelectTrigger data-testid="select-reassign-sales-person">
                <SelectValue placeholder="Select sales person..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.name} data-testid={`option-reassign-user-${user.id}`}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReassignDialogOpen(false);
                setReassignSalesPerson("");
              }}
              data-testid="button-cancel-reassign"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!reassignSalesPerson) {
                  toast({
                    title: "No selection",
                    description: "Please select a sales person",
                    variant: "destructive",
                  });
                  return;
                }
                if (selectedDebtorForActions) {
                  reassignSalesPersonMutation.mutate({
                    customerIds: [selectedDebtorForActions.customerId],
                    salesPerson: reassignSalesPerson,
                  });
                }
              }}
              disabled={!reassignSalesPerson || reassignSalesPersonMutation.isPending}
              data-testid="button-confirm-reassign"
            >
              {reassignSalesPersonMutation.isPending ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Sales Person Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to Sales Person</DialogTitle>
            <DialogDescription>
              Select a sales person to assign {selectedDebtors.length} debtor(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedSalesPerson} onValueChange={setSelectedSalesPerson}>
              <SelectTrigger data-testid="select-sales-person">
                <SelectValue placeholder="Select sales person..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.userName} data-testid={`option-user-${user.id}`}>
                    {user.userName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedSalesPerson("");
              }}
              data-testid="button-cancel-assign"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedSalesPerson) {
                  toast({
                    title: "No selection",
                    description: "Please select a sales person",
                    variant: "destructive",
                  });
                  return;
                }
                assignSalesPersonMutation.mutate({
                  customerIds: selectedDebtors.map(d => d.customerId),
                  salesPerson: selectedSalesPerson,
                });
              }}
              disabled={!selectedSalesPerson || assignSalesPersonMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {assignSalesPersonMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
