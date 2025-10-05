import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvoiceSchema, type InsertInvoice, type Invoice, type MasterCustomer } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { format } from "date-fns";

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice;
}

export default function InvoiceFormDialog({ open, onOpenChange, invoice }: InvoiceFormDialogProps) {
  const { toast } = useToast();

  // Fetch master customers for dropdown
  const { data: customers = [], isLoading: customersLoading } = useQuery<MasterCustomer[]>({
    queryKey: ["/api/masters/customers"],
  });

  const form = useForm<InsertInvoice>({
    resolver: zodResolver(insertInvoiceSchema),
    defaultValues: {
      invoiceNumber: invoice?.invoiceNumber || "",
      customerName: invoice?.customerName || "",
      invoiceDate: invoice?.invoiceDate ? format(new Date(invoice.invoiceDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      invoiceAmount: invoice?.invoiceAmount || "",
      netProfit: invoice?.netProfit || "",
      assignedUser: invoice?.assignedUser as "Manpreet Bedi" | "Bilal Ahamad" | "Anjali Dhiman" | "Princi Soni" | undefined,
      remarks: invoice?.remarks || "",
      category: invoice?.category || "",
      primaryMobile: invoice?.primaryMobile || "",
      city: invoice?.city || "",
      pincode: invoice?.pincode || "",
      paymentTerms: invoice?.paymentTerms || undefined,
      creditLimit: invoice?.creditLimit || "",
      interestApplicableFrom: invoice?.interestApplicableFrom || "",
      interestRate: invoice?.interestRate || "",
      salesPerson: invoice?.salesPerson || "",
    },
  });

  // Auto-populate customer fields when customer is selected
  const handleCustomerSelect = async (clientName: string) => {
    try {
      const response = await fetch(`/api/masters/customers/by-name/${encodeURIComponent(clientName)}`);
      if (response.ok) {
        const customer = await response.json();
        // Set customer details
        form.setValue("category", customer.category || "");
        form.setValue("primaryMobile", customer.primaryMobile || "");
        form.setValue("city", customer.city || "");
        form.setValue("pincode", customer.pincode || "");
        form.setValue("paymentTerms", customer.paymentTermsDays ? parseInt(customer.paymentTermsDays) : undefined);
        form.setValue("creditLimit", customer.creditLimit || "");
        form.setValue("interestApplicableFrom", customer.interestApplicableFrom || "");
        form.setValue("interestRate", customer.interestRate || "");
        form.setValue("salesPerson", customer.salesPerson || "");
      }
    } catch (error) {
      console.error("Failed to fetch customer details:", error);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: InsertInvoice) => 
      apiRequest("POST", "/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debtors"] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertInvoice) =>
      apiRequest("PUT", `/api/invoices/${invoice?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debtors"] });
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (open && invoice) {
      form.reset({
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        invoiceDate: format(new Date(invoice.invoiceDate), "yyyy-MM-dd"),
        invoiceAmount: invoice.invoiceAmount || "",
        netProfit: invoice.netProfit || "",
        assignedUser: invoice.assignedUser as "Manpreet Bedi" | "Bilal Ahamad" | "Anjali Dhiman" | "Princi Soni" | undefined,
        remarks: invoice.remarks || "",
        category: invoice.category || "",
        primaryMobile: invoice.primaryMobile || "",
        city: invoice.city || "",
        pincode: invoice.pincode || "",
        paymentTerms: invoice.paymentTerms || undefined,
        creditLimit: invoice.creditLimit || "",
        interestApplicableFrom: invoice.interestApplicableFrom || "",
        interestRate: invoice.interestRate || "",
        salesPerson: invoice.salesPerson || "",
      });
    } else if (open && !invoice) {
      form.reset({
        invoiceNumber: "",
        customerName: "",
        invoiceDate: format(new Date(), "yyyy-MM-dd"),
        invoiceAmount: "",
        netProfit: "",
        assignedUser: undefined,
        remarks: "",
        category: "",
        primaryMobile: "",
        city: "",
        pincode: "",
        paymentTerms: undefined,
        creditLimit: "",
        interestApplicableFrom: "",
        interestRate: "",
        salesPerson: "",
      });
    }
  }, [open, invoice, form]);

  const onSubmit = (data: InsertInvoice) => {
    if (invoice) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? "Edit Invoice" : "Add New Invoice"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Invoice Details */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-4">
              <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Invoice Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., INV-2025-001" data-testid="input-invoice-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleCustomerSelect(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-customer-name">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customersLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading customers...
                            </SelectItem>
                          ) : customers.length === 0 ? (
                            <SelectItem value="no-customers" disabled>
                              No customers found
                            </SelectItem>
                          ) : (
                            customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.clientName}>
                                {customer.clientName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-invoice-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Financial Details */}
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 space-y-4">
              <h3 className="text-base font-semibold text-green-900 dark:text-green-100">Financial Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Amount (₹) *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          data-testid="input-invoice-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="netProfit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Net Profit (₹) *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          data-testid="input-net-profit" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Assignment & Notes */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 space-y-4">
              <h3 className="text-base font-semibold text-purple-900 dark:text-purple-100">Assignment & Notes</h3>
              
              <FormField
                control={form.control}
                name="assignedUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned User</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assigned-user">
                          <SelectValue placeholder="Select assigned user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Manpreet Bedi" data-testid="option-manpreet">Manpreet Bedi</SelectItem>
                        <SelectItem value="Bilal Ahamad" data-testid="option-bilal">Bilal Ahamad</SelectItem>
                        <SelectItem value="Anjali Dhiman" data-testid="option-anjali">Anjali Dhiman</SelectItem>
                        <SelectItem value="Princi Soni" data-testid="option-princi">Princi Soni</SelectItem>
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
                      <Textarea {...field} placeholder="Any additional notes or comments" rows={3} data-testid="input-remarks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {invoice ? "Update Invoice" : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
