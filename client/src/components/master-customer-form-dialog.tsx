import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertMasterCustomerSchema, type InsertMasterCustomer, type MasterCustomer } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getSalesPersons } from "@/lib/salesPersonStorage";

interface MasterCustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: MasterCustomer;
}

export function MasterCustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: MasterCustomerFormDialogProps) {
  const { toast } = useToast();
  const isEditMode = !!customer;

  const form = useForm<InsertMasterCustomer>({
    resolver: zodResolver(insertMasterCustomerSchema),
    defaultValues: {
      clientName: "",
      category: "Alpha",
      billingAddress: "",
      city: "",
      pincode: "",
      state: "",
      gstNumber: "",
      primaryContactName: "",
      primaryMobile: "",
      primaryEmail: "",
      secondaryContactName: "",
      secondaryMobile: "",
      secondaryEmail: "",
      paymentTermsDays: "",
      creditLimit: "",
      openingBalance: "",
      interestApplicableFrom: "",
      interestRate: "",
      salesPerson: "",
      isActive: "Active",
    },
  });

  useEffect(() => {
    if (customer && isEditMode) {
      form.reset({
        clientName: customer.clientName,
        category: customer.category as "Alpha" | "Beta" | "Gamma" | "Delta",
        billingAddress: customer.billingAddress || "",
        city: customer.city || "",
        pincode: customer.pincode || "",
        state: customer.state || "",
        gstNumber: customer.gstNumber || "",
        primaryContactName: customer.primaryContactName || "",
        primaryMobile: customer.primaryMobile || "",
        primaryEmail: customer.primaryEmail || "",
        secondaryContactName: customer.secondaryContactName || "",
        secondaryMobile: customer.secondaryMobile || "",
        secondaryEmail: customer.secondaryEmail || "",
        paymentTermsDays: customer.paymentTermsDays,
        creditLimit: customer.creditLimit || "",
        openingBalance: customer.openingBalance || "",
        interestApplicableFrom: customer.interestApplicableFrom || "",
        interestRate: customer.interestRate || "",
        salesPerson: customer.salesPerson || "",
        isActive: customer.isActive as "Active" | "Inactive",
      });
    } else if (!isEditMode) {
      form.reset({
        clientName: "",
        category: "Alpha",
        billingAddress: "",
        city: "",
        pincode: "",
        state: "",
        gstNumber: "",
        primaryContactName: "",
        primaryMobile: "",
        primaryEmail: "",
        secondaryContactName: "",
        secondaryMobile: "",
        secondaryEmail: "",
        paymentTermsDays: "",
        creditLimit: "",
        openingBalance: "",
        interestApplicableFrom: "",
        interestRate: "",
        salesPerson: "",
        isActive: "Active",
      });
    }
  }, [customer, isEditMode, form, open]);

  const createMutation = useMutation({
    mutationFn: (data: InsertMasterCustomer) => apiRequest("POST", "/api/masters/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/customers"] });
      toast({
        title: "Success",
        description: "Master customer added successfully",
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

  const updateMutation = useMutation({
    mutationFn: (data: InsertMasterCustomer) =>
      apiRequest("PUT", `/api/masters/customers/${customer?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/customers"] });
      toast({
        title: "Success",
        description: "Master customer updated successfully",
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

  const onSubmit = (data: InsertMasterCustomer) => {
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">
            {isEditMode ? "Edit Master Customer" : "Add Master Customer"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Accordion type="multiple" defaultValue={["company", "primary", "payment"]} className="w-full">
              {/* Company & Compliance Section */}
              <AccordionItem value="company" data-testid="accordion-company">
                <AccordionTrigger className="text-base font-semibold">
                  Company & Compliance
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 bg-pastel-mint p-4 rounded-lg">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Client Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter client name"
                              {...field}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-clientName"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Alpha">Alpha</SelectItem>
                              <SelectItem value="Beta">Beta</SelectItem>
                              <SelectItem value="Gamma">Gamma</SelectItem>
                              <SelectItem value="Delta">Delta</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billingAddress"
                      render={({ field, fieldState }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Billing Address *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter billing address"
                              {...field}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-billingAddress"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter city"
                              {...field}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pincode"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Pin Code *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter pincode"
                              {...field}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-pincode"
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
                              data-testid="input-state"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gstNumber"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>GSTIN *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter GST number"
                              {...field}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-gstNumber"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Primary Contact Details Section */}
              <AccordionItem value="primary" data-testid="accordion-primary">
                <AccordionTrigger className="text-base font-semibold">
                  Primary Contact Details
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 bg-pastel-cyan p-4 rounded-lg">
                    <FormField
                      control={form.control}
                      name="primaryContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter primary contact name"
                              {...field}
                              data-testid="input-primaryContactName"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="primaryMobile"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Mobile Number * (10 digits only)</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="Enter 10 digit mobile"
                              {...field}
                              maxLength={10}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-primaryMobile"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="primaryEmail"
                      render={({ field, fieldState }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter primary email"
                              {...field}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-primaryEmail"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Secondary Contact Details Section */}
              <AccordionItem value="secondary" data-testid="accordion-secondary">
                <AccordionTrigger className="text-base font-semibold">
                  Secondary Contact Details
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 bg-pastel-lavender p-4 rounded-lg">
                    <FormField
                      control={form.control}
                      name="secondaryContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter secondary contact name"
                              {...field}
                              data-testid="input-secondaryContactName"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="secondaryMobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number (10 digits only)</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="Enter 10 digit mobile"
                              {...field}
                              maxLength={10}
                              data-testid="input-secondaryMobile"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="secondaryEmail"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter secondary email"
                              {...field}
                              data-testid="input-secondaryEmail"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Payment & Credit Terms Section */}
              <AccordionItem value="payment" data-testid="accordion-payment">
                <AccordionTrigger className="text-base font-semibold">
                  Payment & Credit Terms
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 bg-pastel-purple p-4 rounded-lg">
                    <FormField
                      control={form.control}
                      name="paymentTermsDays"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Payment Terms (Days) *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter payment terms in days"
                              {...field}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-paymentTermsDays"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="creditLimit"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Credit Limit *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Enter credit limit"
                              {...field}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-creditLimit"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="openingBalance"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Opening Balance</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Enter opening balance"
                              {...field}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-openingBalance"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Interest Configuration Section */}
              <AccordionItem value="interest" data-testid="accordion-interest">
                <AccordionTrigger className="text-base font-semibold">
                  Interest Configuration
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 bg-pastel-orange p-4 rounded-lg">
                    <FormField
                      control={form.control}
                      name="interestApplicableFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interest Applicable From</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-interestApplicableFrom">
                                <SelectValue placeholder="Select interest start" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Invoice Date">Invoice Date</SelectItem>
                              <SelectItem value="Due Date">Due Date</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="interestRate"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Interest Rate (%) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Enter interest rate"
                              {...field}
                              className={cn(fieldState.error && "border-red-500 focus-visible:ring-red-500")}
                              data-testid="input-interestRate"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Sales Person Section */}
              <AccordionItem value="sales" data-testid="accordion-sales">
                <AccordionTrigger className="text-base font-semibold">
                  Sales Person
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 bg-pastel-teal p-4 rounded-lg">
                    <FormField
                      control={form.control}
                      name="salesPerson"
                      render={({ field }) => {
                        const salesPersons = getSalesPersons();
                        return (
                          <FormItem>
                            <FormLabel>Assigned Sales Person</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-salesPerson">
                                  <SelectValue placeholder="Select sales person" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {salesPersons.map((person) => (
                                  <SelectItem key={person} value={person}>
                                    {person}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Status</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              {field.value === "Active" ? "Active" : "Inactive"}
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value === "Active"}
                              onCheckedChange={(checked) => field.onChange(checked ? "Active" : "Inactive")}
                              data-testid="switch-isActive"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
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
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : isEditMode
                  ? "Update Customer"
                  : "Add Customer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
