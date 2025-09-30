import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Customer, type Payment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditPaymentDialog } from "@/components/edit-payment-dialog";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
}

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  customer,
}: PaymentHistoryDialogProps) {
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/customers", customer?.id, "payments"],
    enabled: !!customer && open,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      if (customer) {
        queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "payments"] });
      }
      toast({
        title: "Success",
        description: "Payment deleted successfully. Amount restored to customer debt.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedPayment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPayment) {
      deleteMutation.mutate(selectedPayment.id);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const outstanding = customer ? parseFloat(customer.amountOwed) : 0;

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment History</DialogTitle>
        </DialogHeader>

        <div className="bg-[#F1F5F9] rounded-lg p-4 mb-4">
          <h4 className="font-medium text-[#1E293B]" data-testid="text-history-customer-name">
            {customer.name}
          </h4>
          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
            <div>
              <span className="text-gray-600">Total Paid:</span>
              <span className="text-[#059669] font-semibold ml-2" data-testid="text-total-paid">
                ${totalPaid.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Outstanding:</span>
              <span className="text-[#DC2626] font-semibold ml-2" data-testid="text-outstanding">
                ${outstanding.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payment history available
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#F1F5F9] sticky top-0">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                    <TableCell className="text-sm text-[#1E293B]">
                      {format(new Date(payment.paymentDate), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm text-[#059669] font-semibold">
                      +${parseFloat(payment.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-[#1E293B]">
                      {payment.paymentMethod}
                    </TableCell>
                    <TableCell className="text-sm text-[#1E293B]">
                      {payment.receiptNumber || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {payment.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(payment)}
                          title="Edit Payment"
                          data-testid={`button-edit-payment-${payment.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                          onClick={() => handleDelete(payment)}
                          title="Delete Payment"
                          data-testid={`button-delete-payment-${payment.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-history"
          >
            Close
          </Button>
        </div>
      </DialogContent>

      <EditPaymentDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        payment={selectedPayment || undefined}
        customerId={customer.id}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? The payment amount will be restored to the customer's debt. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-payment">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#DC2626] hover:bg-[#B91C1C]"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-payment"
            >
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
