import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertReceiptSchema, type InsertReceipt, type Receipt, type MasterCustomer } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

const DEFAULT_VOUCHER_TYPES = ["Receipt", "CN", "TDS"];

interface ReceiptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt?: Receipt;
}

export default function ReceiptFormDialog({ open, onOpenChange, receipt }: ReceiptFormDialogProps) {
  const { toast } = useToast();
  const [customVoucherTypes, setCustomVoucherTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('customVoucherTypes');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAddVoucherTypeOpen, setIsAddVoucherTypeOpen] = useState(false);
  const [newVoucherType, setNewVoucherType] = useState("");

  const allVoucherTypes = [...DEFAULT_VOUCHER_TYPES, ...customVoucherTypes].sort();

  // Fetch master customers
  const { data: masterCustomers = [], isLoading: isLoadingCustomers } = useQuery<MasterCustomer[]>({
    queryKey: ["/api/masters/customers"],
  });

  const form = useForm<InsertReceipt>({
    resolver: zodResolver(insertReceiptSchema),
    defaultValues: {
      voucherNumber: receipt?.voucherNumber || "",
      voucherType: receipt?.voucherType || "",
      customerName: receipt?.customerName || "",
      date: receipt?.date ? format(new Date(receipt.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      amount: receipt?.amount || "",
      remarks: receipt?.remarks || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertReceipt) => 
      apiRequest("POST", "/api/receipts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debtors"] });
      toast({
        title: "Success",
        description: "Receipt created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create receipt",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertReceipt) =>
      apiRequest("PUT", `/api/receipts/${receipt?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debtors"] });
      toast({
        title: "Success",
        description: "Receipt updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update receipt",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (open && receipt) {
      form.reset({
        voucherNumber: receipt.voucherNumber,
        voucherType: receipt.voucherType,
        customerName: receipt.customerName,
        date: format(new Date(receipt.date), "yyyy-MM-dd"),
        amount: receipt.amount || "",
        remarks: receipt.remarks || "",
      });
    } else if (open && !receipt) {
      form.reset({
        voucherNumber: "",
        voucherType: "",
        customerName: "",
        date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        remarks: "",
      });
    }
  }, [open, receipt, form]);

  const handleAddCustomVoucherType = () => {
    if (newVoucherType.trim() && !allVoucherTypes.includes(newVoucherType.trim())) {
      const typeToAdd = newVoucherType.trim();
      const updatedCustomTypes = [...customVoucherTypes, typeToAdd];
      setCustomVoucherTypes(updatedCustomTypes);
      localStorage.setItem('customVoucherTypes', JSON.stringify(updatedCustomTypes));
      form.setValue('voucherType', typeToAdd);
      setNewVoucherType("");
      setIsAddVoucherTypeOpen(false);
      toast({
        title: "Success",
        description: `Custom voucher type "${typeToAdd}" added successfully`,
      });
    } else if (allVoucherTypes.includes(newVoucherType.trim())) {
      toast({
        title: "Error",
        description: "This voucher type already exists",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: InsertReceipt) => {
    if (receipt) {
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
          <DialogTitle>{receipt ? "Edit Receipt" : "Add New Receipt"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="p-4 rounded-lg border space-y-4" style={{ backgroundColor: '#E6E6FA' }}>
              <h3 className="text-base font-semibold" style={{ color: '#4B0082' }}>Receipt Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="voucherNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voucher Number *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., VCH-2025-001" data-testid="input-voucher-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="voucherType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voucher Type *</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-voucher-type">
                              <SelectValue placeholder="Select voucher type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allVoucherTypes.map((type) => (
                              <SelectItem key={type} value={type} data-testid={`option-voucher-type-${type}`}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setIsAddVoucherTypeOpen(true)}
                          data-testid="button-add-voucher-type"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isLoadingCustomers}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder={isLoadingCustomers ? "Loading customers..." : "Select customer"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {masterCustomers
                            .filter(c => c.isActive === "Active")
                            .map((customer) => (
                              <SelectItem 
                                key={customer.id} 
                                value={customer.clientName}
                                data-testid={`option-customer-${customer.id}`}
                              >
                                {customer.clientName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹) *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          data-testid="input-amount" 
                        />
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
                {receipt ? "Update Receipt" : "Create Receipt"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Add Custom Voucher Type Dialog */}
      <Dialog open={isAddVoucherTypeOpen} onOpenChange={setIsAddVoucherTypeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Voucher Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Enter voucher type name"
                value={newVoucherType}
                onChange={(e) => setNewVoucherType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomVoucherType();
                  }
                }}
                data-testid="input-new-voucher-type"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddVoucherTypeOpen(false);
                  setNewVoucherType("");
                }}
                data-testid="button-cancel-voucher-type"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddCustomVoucherType}
                data-testid="button-save-voucher-type"
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
