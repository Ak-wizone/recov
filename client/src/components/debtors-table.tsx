import { useState, useMemo } from "react";
import {
  ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail, Phone, BookOpen, Activity, Calendar, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [selectedDebtorForActions, setSelectedDebtorForActions] = useState<DebtorData | null>(null);
  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string>("");
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [reassignSalesPerson, setReassignSalesPerson] = useState<string>("");
  
  // Define default column visibility
  const defaultColumnVisibility: Record<string, boolean> = {
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
    mobile: false,
    email: false,
    invoiceCount: false,
    receiptCount: false,
    lastInvoiceDate: false,
    lastPaymentDate: false,
    actions: true,
  };

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
        description: `Assigned debtors to sales person`,
      });
      setIsAssignDialogOpen(false);
      setSelectedSalesPerson("");
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
    onOpenEmail(debtor);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Wrap columns in useMemo for DataTable
  const columns: ColumnDef<DebtorData>[] = useMemo(() => [
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/ledger?customerId=${row.original.customerId}`)}
            data-testid={`button-ledger-${row.original.customerId}`}
            title="View Ledger"
          >
            <BookOpen className="h-4 w-4 text-indigo-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/payment-analytics/scorecard?customerId=${row.original.customerId}`)}
            data-testid={`button-payment-score-${row.original.customerId}`}
            title="Payment Scorecard"
          >
            <Activity className="h-4 w-4 text-yellow-500" />
          </Button>
          {canPerformAction("canWhatsApp") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWhatsAppClick(row.original)}
              data-testid={`button-whatsapp-${row.original.customerId}`}
              title={row.original.mobile ? "Send WhatsApp" : "No mobile number"}
              disabled={!row.original.mobile}
            >
              <MessageSquare className="h-4 w-4 text-green-500" />
            </Button>
          )}
          {canPerformAction("canEmail") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenEmail(row.original)}
              data-testid={`button-email-${row.original.customerId}`}
              title={row.original.email ? "Send Email" : "No email address"}
            >
              <Mail className={`h-4 w-4 ${row.original.email ? 'text-blue-500' : 'text-gray-300'}`} />
            </Button>
          )}
          {canPerformAction("canCall") && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenCall(row.original)}
                data-testid={`button-call-${row.original.customerId}`}
                title={row.original.mobile ? "Call via Ringg.ai" : "No mobile number"}
                disabled={!row.original.mobile}
              >
                <Phone className="h-4 w-4 text-purple-500" />
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
                  buttonVariant="ghost"
                  icon={<Phone className="h-4 w-4 text-blue-600" />}
                />
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenFollowUp(row.original)}
            data-testid={`button-followup-${row.original.customerId}`}
            title="Schedule Follow-up"
          >
            <Calendar className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      ),
      enableHiding: false,
    },
  ], [canPerformAction, setLocation, onOpenEmail, onOpenCall, onOpenFollowUp]);

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={false}
        tableKey="debtors"
        enableRowSelection={true}
        enableBulkActions={true}
        enableGlobalFilter={true}
        enableColumnVisibility={true}
        enablePagination={true}
        defaultColumnVisibility={defaultColumnVisibility}
      />

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
              Select a sales person to assign selected debtors
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
                  customerIds: data.map(d => d.customerId),
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
    </>
  );
}
