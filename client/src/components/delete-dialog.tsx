import { useMutation } from "@tanstack/react-query";
import { type Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { AlertTriangle } from "lucide-react";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
}

export function DeleteDialog({
  open,
  onOpenChange,
  customer,
}: DeleteDialogProps) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (customer) {
      deleteMutation.mutate(customer.id);
    }
  };

  if (!customer) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center mb-4">
            <div className="bg-red-100 p-3 rounded-full mr-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <p className="text-[#1E293B]">
          Are you sure you want to delete{" "}
          <strong data-testid="text-delete-customer-name">{customer.name}</strong>? All
          payment history and associated data will be permanently removed.
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-[#DC2626] hover:bg-[#B91C1C]"
            disabled={deleteMutation.isPending}
            data-testid="button-confirm-delete"
          >
            Delete Customer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
