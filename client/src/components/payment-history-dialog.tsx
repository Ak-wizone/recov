import { useQuery } from "@tanstack/react-query";
import { type Customer, type Payment } from "@shared/schema";
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
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/customers", customer?.id, "payments"],
    enabled: !!customer && open,
  });

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
    </Dialog>
  );
}
