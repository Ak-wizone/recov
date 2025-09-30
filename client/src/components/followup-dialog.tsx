import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertFollowUpSchema, type InsertFollowUp, type Customer, type FollowUp } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock } from "lucide-react";
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

  const { data: followUps = [], isLoading: isLoadingFollowUps } = useQuery<FollowUp[]>({
    queryKey: ["/api/customers", customer?.id, "followups"],
    enabled: !!customer && open,
  });

  // Sort follow-ups by date (newest first)
  const sortedFollowUps = [...followUps].sort((a, b) => 
    new Date(b.followUpDateTime).getTime() - new Date(a.followUpDateTime).getTime()
  );

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

  const followUpTypeColors = {
    Meeting: "bg-purple-100 text-purple-800",
    Call: "bg-blue-100 text-blue-800",
    WhatsApp: "bg-green-100 text-green-800",
    Email: "bg-orange-100 text-orange-800",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
              ₹{parseFloat(customer.amountOwed).toFixed(2)}
            </span>
          </p>
        </div>

        {/* Follow-Up History Section */}
        {sortedFollowUps.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Follow-Up History ({sortedFollowUps.length})
            </h3>
            <ScrollArea className="h-48 w-full rounded-md border border-gray-200 p-4">
              <div className="space-y-3">
                {sortedFollowUps.map((followUp) => {
                  const followUpDate = new Date(followUp.followUpDateTime);
                  const isPast = followUpDate < new Date();
                  
                  return (
                    <div 
                      key={followUp.id} 
                      className={`p-3 rounded-lg border ${isPast ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                      data-testid={`followup-history-${followUp.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={followUpTypeColors[followUp.type as keyof typeof followUpTypeColors]}>
                            {followUp.type}
                          </Badge>
                          {!isPast && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Upcoming
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-1 whitespace-nowrap">
                          <Calendar className="h-3 w-3" />
                          {format(followUpDate, "MMM dd, yyyy HH:mm")}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">
                        {followUp.remarks}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

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
