import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertActivityLogSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Phone, AlertCircle, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { z } from "zod";

const activityLogFormSchema = insertActivityLogSchema.extend({
  outcome: z.string().min(1, "Outcome is required"),
});

type ActivityLogFormData = z.infer<typeof activityLogFormSchema>;

export default function CallQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);

  const { data: callQueue = [], isLoading } = useQuery({
    queryKey: ["/api/call-queue"],
  });

  const form = useForm<ActivityLogFormData>({
    resolver: zodResolver(activityLogFormSchema),
    defaultValues: {
      customerId: "",
      customerName: "",
      interactionType: "call",
      outcome: "",
      notes: "",
      loggedByUserId: user?.id || "",
      loggedByUserName: user?.name || "",
    },
  });

  const logActivityMutation = useMutation({
    mutationFn: async (data: ActivityLogFormData) => {
      return await apiRequest("/api/activity-logs", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      toast({ title: "Call logged successfully" });
      setIsLogDialogOpen(false);
      setSelectedCustomer(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCallClick = (customer: any) => {
    setSelectedCustomer(customer);
    form.setValue("customerId", customer.customerId);
    form.setValue("customerName", customer.customerName);
    setIsLogDialogOpen(true);
  };

  const onSubmit = (data: ActivityLogFormData) => {
    logActivityMutation.mutate(data);
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { variant: any; icon: any }> = {
      urgent: { variant: "destructive", icon: AlertCircle },
      high: { variant: "default", icon: TrendingUp },
      medium: { variant: "secondary", icon: Clock },
    };
    const { variant, icon: Icon } = config[priority] || config.medium;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {priority}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" data-testid="page-call-queue">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Call Queue</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Auto-prioritized list of customers to call today
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Calls</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{callQueue.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0" data-testid="card-urgent-calls">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Urgent Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {callQueue.filter((c: any) => c.priority === 'urgent').length}
            </div>
            <p className="text-red-100 text-sm mt-1">Overdue &gt; 60 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0" data-testid="card-high-priority">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {callQueue.filter((c: any) => c.priority === 'high').length}
            </div>
            <p className="text-orange-100 text-sm mt-1">Overdue &gt; 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0" data-testid="card-medium-priority">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Medium Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {callQueue.filter((c: any) => c.priority === 'medium').length}
            </div>
            <p className="text-blue-100 text-sm mt-1">Regular follow-ups</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-call-queue-table">
        <CardHeader>
          <CardTitle>Today's Call List</CardTitle>
          <CardDescription>Sorted by priority and overdue days</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Overdue Amount</TableHead>
                <TableHead>Overdue Days</TableHead>
                <TableHead>Last Call</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callQueue.map((customer: any, index: number) => (
                <TableRow key={customer.customerId} data-testid={`row-customer-${customer.customerId}`}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{customer.customerName}</TableCell>
                  <TableCell>{customer.mobile || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.category || "N/A"}</Badge>
                  </TableCell>
                  <TableCell className="text-red-600 dark:text-red-400 font-semibold">
                    {formatCurrency(customer.overdueAmount)}
                  </TableCell>
                  <TableCell>{customer.overdueDays} days</TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                    {customer.lastCallDate 
                      ? `${customer.daysSinceLastCall} days ago`
                      : "Never called"}
                  </TableCell>
                  <TableCell>{getPriorityBadge(customer.priority)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleCallClick(customer)}
                      data-testid={`button-call-${customer.customerId}`}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call Now
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {callQueue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>All caught up! No calls pending.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent data-testid="dialog-log-call">
          <DialogHeader>
            <DialogTitle>Log Call Activity</DialogTitle>
            <DialogDescription>
              Record the outcome of your call with {selectedCustomer?.customerName}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call Outcome</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-outcome">
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="answered">Answered</SelectItem>
                        <SelectItem value="not_answered">Not Answered</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="switched_off">Switched Off</SelectItem>
                        <SelectItem value="payment_promised">Payment Promised</SelectItem>
                        <SelectItem value="partial_payment">Partial Payment</SelectItem>
                        <SelectItem value="dispute">Dispute</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Add details about the call" rows={4} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLogDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={logActivityMutation.isPending} data-testid="button-submit">
                  {logActivityMutation.isPending ? "Saving..." : "Save & Next"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
