import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  insertLeadSchema,
  type InsertLead,
  type Lead,
  type MasterCustomer,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getSalesPersonNames } from "@/lib/salesPersonStorage";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
}

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
}: LeadFormDialogProps) {
  const { toast } = useToast();
  const [entryMode, setEntryMode] = useState<"new" | "existing">("new");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  const { data: masterCustomers, isLoading: isLoadingCustomers } = useQuery<
    MasterCustomer[]
  >({
    queryKey: ["/api/masters/customers"],
  });

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      mobile: "",
      email: "",
      leadSource: "Website",
      leadStatus: "New Lead",
      address: "",
      city: "",
      state: "",
      pincode: "",
      remarks: "",
      industry: "",
      priority: undefined,
      assignedUser: undefined,
      estimatedDealAmount: "",
      customerId: undefined,
      dateCreated: new Date().toISOString().split("T")[0],
      lastFollowUp: undefined,
      nextFollowUp: undefined,
    },
  });

  useEffect(() => {
    if (lead) {
      form.reset({
        companyName: lead.companyName,
        contactPerson: lead.contactPerson,
        mobile: lead.mobile,
        email: lead.email,
        leadSource: lead.leadSource as any,
        leadStatus: lead.leadStatus as any,
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        pincode: lead.pincode || "",
        remarks: lead.remarks || "",
        industry: lead.industry || "",
        priority: lead.priority as any,
        assignedUser: lead.assignedUser as any,
        estimatedDealAmount: lead.estimatedDealAmount ? lead.estimatedDealAmount.toString() : "",
        customerId: lead.customerId || undefined,
        dateCreated: lead.dateCreated
          ? new Date(lead.dateCreated).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        lastFollowUp: lead.lastFollowUp
          ? new Date(lead.lastFollowUp).toISOString().split("T")[0]
          : undefined,
        nextFollowUp: lead.nextFollowUp
          ? new Date(lead.nextFollowUp).toISOString().split("T")[0]
          : undefined,
      });
    } else {
      form.reset({
        companyName: "",
        contactPerson: "",
        mobile: "",
        email: "",
        leadSource: "Website",
        leadStatus: "New Lead",
        address: "",
        city: "",
        state: "",
        pincode: "",
        remarks: "",
        industry: "",
        priority: undefined,
        assignedUser: undefined,
        estimatedDealAmount: "",
        customerId: undefined,
        dateCreated: new Date().toISOString().split("T")[0],
        lastFollowUp: undefined,
        nextFollowUp: undefined,
      });
      setEntryMode("new");
      setSelectedCustomerId(null);
    }
  }, [lead, form, open]);

  useEffect(() => {
    if (entryMode === "new") {
      form.setValue("customerId", undefined);
      setSelectedCustomerId(null);
    }
  }, [entryMode, form]);

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = masterCustomers?.find((c) => c.id === customerId);
    if (customer) {
      form.setValue("companyName", customer.clientName || "");
      form.setValue("contactPerson", customer.primaryContactName || "");
      form.setValue("mobile", customer.primaryMobile || "");
      form.setValue("email", customer.primaryEmail || "");
      form.setValue("address", customer.billingAddress || "");
      form.setValue("city", customer.city || "");
      form.setValue("state", customer.state || "");
      form.setValue("pincode", customer.pincode || "");
      form.setValue("customerId", customerId);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: InsertLead) => apiRequest("POST", "/api/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead added successfully",
      });
      onOpenChange(false);
      form.reset();
      setEntryMode("new");
      setSelectedCustomerId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertLead) =>
      apiRequest("PUT", `/api/leads/${lead?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead updated successfully",
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

  const onSubmit = (data: InsertLead) => {
    if (lead) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isExistingMode = entryMode === "existing" && !lead;
  const isFieldDisabled = isExistingMode && selectedCustomerId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[600px] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!lead && (
                <div className="border rounded-lg p-4 mb-4">
                  <Label className="text-base font-semibold mb-3 block">
                    Entry Mode
                  </Label>
                  <RadioGroup
                    value={entryMode}
                    onValueChange={(value: "new" | "existing") =>
                      setEntryMode(value)
                    }
                    className="grid gap-4"
                    data-testid="radio-entry-mode"
                  >
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem
                        value="new"
                        id="mode-new"
                        data-testid="radio-mode-new"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="mode-new"
                          className="text-sm font-medium cursor-pointer"
                        >
                          New Lead
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Enter all details manually
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem
                        value="existing"
                        id="mode-existing"
                        data-testid="radio-mode-existing"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="mode-existing"
                          className="text-sm font-medium cursor-pointer"
                        >
                          Existing Customer
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Select from Master Customers
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {entryMode === "existing" && !lead && (
                <div className="mb-4">
                  <Label className="text-sm font-medium mb-2 block">
                    Select Customer *
                  </Label>
                  <Select
                    value={selectedCustomerId || ""}
                    onValueChange={handleCustomerSelect}
                    disabled={isLoadingCustomers}
                  >
                    <SelectTrigger data-testid="select-master-customer">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterCustomers?.map((customer) => (
                        <SelectItem
                          key={customer.id}
                          value={customer.id}
                        >
                          {customer.clientName} ({customer.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter company name"
                          {...field}
                          disabled={isFieldDisabled}
                          data-testid="input-company-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter contact person"
                          {...field}
                          disabled={isFieldDisabled}
                          data-testid="input-contact-person"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number *</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          {...field}
                          disabled={isFieldDisabled}
                          data-testid="input-mobile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@company.com"
                          {...field}
                          disabled={isFieldDisabled}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-source">
                            <SelectValue placeholder="Select lead source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Existing Client">
                            Existing Client
                          </SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="Facebook">Facebook</SelectItem>
                          <SelectItem value="Website">Website</SelectItem>
                          <SelectItem value="Indiamart">Indiamart</SelectItem>
                          <SelectItem value="Justdial">Justdial</SelectItem>
                          <SelectItem value="Reference">Reference</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-status">
                            <SelectValue placeholder="Select lead status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="New Lead">New Lead</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Pending From Client">
                            Pending From Client
                          </SelectItem>
                          <SelectItem value="Pending From Wizone">
                            Pending From Wizone
                          </SelectItem>
                          <SelectItem value="Quotation Sent">
                            Quotation Sent
                          </SelectItem>
                          <SelectItem value="Converted">Converted</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
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
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority (optional)" />
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
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Technology, Healthcare"
                          {...field}
                          data-testid="input-industry"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter full address"
                        {...field}
                        disabled={isFieldDisabled}
                        data-testid="textarea-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter city"
                          {...field}
                          disabled={isFieldDisabled}
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter state"
                          {...field}
                          disabled={isFieldDisabled}
                          data-testid="input-state"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter pincode"
                          {...field}
                          disabled={isFieldDisabled}
                          data-testid="input-pincode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned User</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-assigned-user">
                            <SelectValue placeholder="Select user (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getSalesPersonNames().map((person) => (
                            <SelectItem key={person} value={person}>{person}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedDealAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Deal Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            {...field}
                            className="pl-8"
                            step="0.01"
                            data-testid="input-estimated-deal-amount"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional remarks or notes"
                        {...field}
                        data-testid="textarea-remarks"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8]"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {lead ? "Update Lead" : "Add Lead"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
