import { useState, useMemo } from "react";
import {
  ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail, Phone, BookOpen, Activity, Calendar, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  customToolbarActions?: React.ReactNode;
}

export function DebtorsTable({ data, onOpenFollowUp, onOpenEmail, onOpenCall, onFilteredDataChange, customToolbarActions }: DebtorsTableProps) {
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
  ], []);

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
        customToolbarActions={customToolbarActions}
        customBulkActions={(selectedDebtors: DebtorData[]) => (
          <div className="flex items-center gap-2">
            {selectedDebtors.length === 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/ledger?customerId=${selectedDebtors[0].customerId}`)}
                  className="bg-indigo-100 hover:bg-indigo-200 border-indigo-300 text-indigo-800 hover:text-indigo-800 dark:bg-indigo-900 dark:hover:bg-indigo-800 dark:border-indigo-700 dark:text-indigo-200 dark:hover:text-indigo-200 transition-transform duration-200 hover:scale-105"
                  data-testid="button-bulk-ledger"
                >
                  <BookOpen className="h-4 w-4 mr-1.5" />
                  Ledger
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/payment-analytics/scorecard?customerId=${selectedDebtors[0].customerId}`)}
                  className="bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-800 hover:text-yellow-800 dark:bg-yellow-900 dark:hover:bg-yellow-800 dark:border-yellow-700 dark:text-yellow-200 dark:hover:text-yellow-200 transition-transform duration-200 hover:scale-105"
                  data-testid="button-bulk-scorecard"
                >
                  <Activity className="h-4 w-4 mr-1.5" />
                  Scorecard
                </Button>
              </>
            )}
            {canPerformAction("canWhatsApp") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedDebtors.forEach(d => handleWhatsAppClick(d))}
                className="bg-green-100 hover:bg-green-200 border-green-300 text-green-800 hover:text-green-800 dark:bg-green-900 dark:hover:bg-green-800 dark:border-green-700 dark:text-green-200 dark:hover:text-green-200 transition-transform duration-200 hover:scale-105"
                data-testid="button-bulk-whatsapp"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                WhatsApp
              </Button>
            )}
            {canPerformAction("canEmail") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedDebtors.forEach(d => onOpenEmail(d))}
                className="bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800 hover:text-blue-800 dark:bg-blue-900 dark:hover:bg-blue-800 dark:border-blue-700 dark:text-blue-200 dark:hover:text-blue-200 transition-transform duration-200 hover:scale-105"
                data-testid="button-bulk-email"
              >
                <Mail className="h-4 w-4 mr-1.5" />
                Email
              </Button>
            )}
            {canPerformAction("canCall") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedDebtors.forEach(d => onOpenCall(d))}
                className="bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-800 hover:text-purple-800 dark:bg-purple-900 dark:hover:bg-purple-800 dark:border-purple-700 dark:text-purple-200 dark:hover:text-purple-200 transition-transform duration-200 hover:scale-105"
                data-testid="button-bulk-call"
              >
                <Phone className="h-4 w-4 mr-1.5" />
                AI Call
              </Button>
            )}
            {canPerformAction("canCall") && selectedDebtors.length === 1 && (
              <TelecmiCallButton
                customerPhone={selectedDebtors[0].mobile || ""}
                customerName={selectedDebtors[0].name || ""}
                module="debtors"
                amount={Number(selectedDebtors[0].balance) || 0}
                buttonText="IVR Call"
                buttonVariant="outline"
                className="bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-800 hover:text-orange-800 dark:bg-orange-900 dark:hover:bg-orange-800 dark:border-orange-700 dark:text-orange-200 dark:hover:text-orange-200 transition-transform duration-200 hover:scale-105"
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedDebtors.forEach(d => onOpenFollowUp(d))}
              className="bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-800 hover:text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:text-gray-200 transition-transform duration-200 hover:scale-105"
              data-testid="button-bulk-followup"
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Follow-up
            </Button>
            {selectedDebtors.length === 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDebtorForActions(selectedDebtors[0]);
                  setReassignSalesPerson(selectedDebtors[0].salesPerson || "");
                  setIsReassignDialogOpen(true);
                }}
                className="bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-800 hover:text-orange-800 dark:bg-orange-900 dark:hover:bg-orange-800 dark:border-orange-700 dark:text-orange-200 dark:hover:text-orange-200 transition-transform duration-200 hover:scale-105"
                data-testid="button-bulk-reassign"
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                Reassign
              </Button>
            )}
          </div>
        )}
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
