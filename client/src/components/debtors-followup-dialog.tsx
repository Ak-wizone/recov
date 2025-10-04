import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertDebtorsFollowUpSchema, type InsertDebtorsFollowUp } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { MessageSquare, Phone, Mail, Video, User, Building2, TrendingUp } from "lucide-react";

interface DebtorsFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any | null;
}

export function DebtorsFollowUpDialog({
  open,
  onOpenChange,
  customer,
}: DebtorsFollowUpDialogProps) {
  const { toast } = useToast();

  const form = useForm<InsertDebtorsFollowUp>({
    resolver: zodResolver(insertDebtorsFollowUpSchema),
    defaultValues: {
      customerId: "",
      type: "Call",
      remarks: "",
      followUpDateTime: "",
      priority: "Medium",
      status: "Pending",
      nextFollowUpDate: "",
    },
  });

  useEffect(() => {
    if (customer && open) {
      form.reset({
        customerId: customer.customerId,
        type: "Call",
        remarks: "",
        followUpDateTime: new Date().toISOString().slice(0, 16),
        priority: "Medium",
        status: "Pending",
        nextFollowUpDate: "",
      });
    }
  }, [customer, open, form]);

  const { data: followUps = [] } = useQuery({
    queryKey: ["/api/debtors/followups", customer?.customerId],
    queryFn: async () => {
      if (!customer?.customerId) return [];
      const response = await fetch(`/api/debtors/followups/${customer.customerId}`);
      return response.json();
    },
    enabled: !!customer?.customerId && open,
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertDebtorsFollowUp) => {
      const response = await fetch("/api/debtors/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create follow-up");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debtors/followups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debtors"] });
      toast({
        title: "Success",
        description: "Follow-up added successfully",
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

  const onSubmit = (data: InsertDebtorsFollowUp) => {
    mutation.mutate(data);
  };

  if (!customer) return null;

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Follow-up for {customer.name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Customer & Outstanding Info */}
          <div className="space-y-4">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold" data-testid="text-customer-name">{customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-semibold" data-testid="text-customer-category">{customer.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-semibold" data-testid="text-customer-mobile">{customer.mobile}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold text-sm" data-testid="text-customer-email">{customer.email}</p>
                </div>
                {customer.salesPerson && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sales Person</p>
                    <p className="font-semibold" data-testid="text-customer-salesperson">{customer.salesPerson}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Outstanding Summary */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-800 dark:text-red-200">
                  <TrendingUp className="h-5 w-5" />
                  Outstanding Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Invoices</span>
                  <span className="font-bold text-lg" data-testid="text-summary-invoices">
                    {formatCurrency(customer.totalInvoices)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Receipts</span>
                  <span className="font-bold text-lg" data-testid="text-summary-receipts">
                    {formatCurrency(customer.totalReceipts)}
                  </span>
                </div>
                <div className="border-t pt-3 mt-3 flex justify-between items-center">
                  <span className="font-semibold">Balance Outstanding</span>
                  <span className="font-bold text-2xl text-red-600 dark:text-red-400" data-testid="text-summary-balance">
                    {formatCurrency(customer.balance)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice Count</p>
                    <p className="font-semibold" data-testid="text-summary-invoice-count">{customer.invoiceCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Receipt Count</p>
                    <p className="font-semibold" data-testid="text-summary-receipt-count">{customer.receiptCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Previous Follow-ups */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Previous Follow-ups</CardTitle>
              </CardHeader>
              <CardContent>
                {followUps.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {followUps.map((followUp: any) => (
                      <div
                        key={followUp.id}
                        className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {followUp.type === "Call" && <Phone className="h-3 w-3" />}
                          {followUp.type === "Email" && <Mail className="h-3 w-3" />}
                          {followUp.type === "WhatsApp" && <MessageSquare className="h-3 w-3" />}
                          {followUp.type === "Meeting" && <Video className="h-3 w-3" />}
                          <span>{followUp.type}</span>
                          <span>•</span>
                          <span>{format(new Date(followUp.followUpDateTime), "dd MMM yyyy, hh:mm a")}</span>
                        </div>
                        <p className="text-sm mt-1">{followUp.remarks}</p>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            followUp.priority === "High"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : followUp.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}>
                            {followUp.priority}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            followUp.status === "Completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}>
                            {followUp.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No previous follow-ups
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Follow-up Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Follow-up</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow-up Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-followup-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Call">Call</SelectItem>
                              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                              <SelectItem value="Email">Email</SelectItem>
                              <SelectItem value="Meeting">Meeting</SelectItem>
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
                          <FormLabel>Follow-up Date & Time</FormLabel>
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
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add notes about this follow-up"
                              className="min-h-[100px]"
                              {...field}
                              data-testid="textarea-remarks"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nextFollowUpDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Next Follow-up Date (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              {...field}
                              data-testid="input-next-followup"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={mutation.isPending}
                        data-testid="button-submit-followup"
                      >
                        {mutation.isPending ? "Saving..." : "Save Follow-up"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        data-testid="button-cancel-followup"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
