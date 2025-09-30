import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertFollowUpSchema, type InsertFollowUp, type Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
}

export function FollowUpDialog({
  open,
  onOpenChange,
  customer,
}: FollowUpDialogProps) {
  const { toast } = useToast();

  const form = useForm<InsertFollowUp>({
    resolver: zodResolver(insertFollowUpSchema),
    defaultValues: {
      customerId: "",
      type: "Call",
      remarks: "",
      followUpDateTime: "",
    },
  });

  useEffect(() => {
    if (customer && open) {
      form.reset({
        customerId: customer.id,
        type: "Call",
        remarks: "",
        followUpDateTime: "",
      });
    }
  }, [customer, open, form]);

  const followUpMutation = useMutation({
    mutationFn: (data: InsertFollowUp) => apiRequest("POST", "/api/followups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      if (customer) {
        queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id, "followups"] });
      }
      toast({
        title: "Success",
        description: "Follow-up scheduled successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertFollowUp) => {
    if (customer) {
      followUpMutation.mutate({ ...data, customerId: customer.id });
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Follow Up</DialogTitle>
        </DialogHeader>

        <div className="bg-[#F1F5F9] rounded-lg p-4 mb-4">
          <h4 className="font-medium text-[#1E293B]" data-testid="text-followup-customer-name">
            {customer.name}
          </h4>
          <p className="text-sm text-gray-600">
            Current Amount Owed:{" "}
            <span className="text-[#DC2626] font-semibold" data-testid="text-followup-amount-owed">
              ${parseFloat(customer.amountOwed).toFixed(2)}
            </span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow Up Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-followup-type">
                        <SelectValue placeholder="Select follow-up type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Call">Call</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="followUpDateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow Up Date & Time *</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      data-testid="input-followup-datetime"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter follow-up remarks"
                      rows={4}
                      {...field}
                      data-testid="textarea-followup-remarks"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-followup"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={followUpMutation.isPending}
                data-testid="button-submit-followup"
              >
                {followUpMutation.isPending ? "Scheduling..." : "Schedule Follow Up"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
