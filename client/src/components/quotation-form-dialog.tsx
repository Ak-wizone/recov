import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Quotation, Lead, MasterItem, insertQuotationSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface QuotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Quotation | null;
}

interface LineItem {
  itemId?: string;
  itemName: string;
  quantity: string;
  unit: string;
  rate: string;
  discountPercent: string;
  taxPercent: string;
  amount: string;
}

const formSchema = insertQuotationSchema.extend({
  leadId: z.string().min(1, "Please select a lead"),
});

export function QuotationFormDialog({ open, onOpenChange, quotation }: QuotationFormDialogProps) {
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: items = [] } = useQuery<MasterItem[]>({
    queryKey: ["/api/masters/items"],
  });

  const { data: settings } = useQuery<{ termsAndConditions: string }>({
    queryKey: ["/api/quotation-settings"],
  });

  const { data: nextNumber } = useQuery<{ quotationNumber: string }>({
    queryKey: ["/api/quotations/next-number"],
    enabled: !quotation,
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leadId: "",
      leadName: "",
      leadEmail: "",
      leadMobile: "",
      quotationNumber: "",
      quotationDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      termsAndConditions: settings?.termsAndConditions || "",
      subtotal: "0",
      totalDiscount: "0",
      totalTax: "0",
      grandTotal: "0",
    },
  });

  useEffect(() => {
    if (nextNumber?.quotationNumber) {
      form.setValue("quotationNumber", nextNumber.quotationNumber);
    }
  }, [nextNumber, form]);

  useEffect(() => {
    if (settings?.termsAndConditions) {
      form.setValue("termsAndConditions", settings.termsAndConditions);
    }
  }, [settings, form]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (quotation) {
        // Edit mode - load quotation data
        form.reset({
          leadId: quotation.leadId,
          leadName: quotation.leadName,
          leadEmail: quotation.leadEmail,
          leadMobile: quotation.leadMobile,
          quotationNumber: quotation.quotationNumber,
          quotationDate: new Date(quotation.quotationDate).toISOString().split('T')[0],
          validUntil: new Date(quotation.validUntil).toISOString().split('T')[0],
          termsAndConditions: quotation.termsAndConditions || "",
          subtotal: quotation.subtotal,
          totalDiscount: quotation.totalDiscount,
          totalTax: quotation.totalTax,
          grandTotal: quotation.grandTotal,
        });
        
        // Load the lead for this quotation
        const lead = leads.find(l => l.id === quotation.leadId);
        setSelectedLead(lead || null);
        
        // Load quotation items
        fetch(`/api/quotations/${quotation.id}/items`)
          .then(res => res.json())
          .then(items => {
            setLineItems(items.map((item: any) => ({
              itemId: item.itemId,
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              discountPercent: item.discountPercent,
              taxPercent: item.taxPercent,
              amount: item.amount,
            })));
          });
      } else {
        // Add mode - reset to defaults
        form.reset({
          leadId: "",
          leadName: "",
          leadEmail: "",
          leadMobile: "",
          quotationNumber: nextNumber?.quotationNumber || "",
          quotationDate: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          termsAndConditions: settings?.termsAndConditions || "",
          subtotal: "0",
          totalDiscount: "0",
          totalTax: "0",
          grandTotal: "0",
        });
        setSelectedLead(null);
        setLineItems([]);
      }
    }
  }, [open, quotation, form, nextNumber, settings, leads]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/quotations", data);
      const quotationData = await response.json();

      for (let index = 0; index < lineItems.length; index++) {
        await apiRequest("POST", `/api/quotations/${quotationData.id}/items`, {
          ...lineItems[index],
          displayOrder: index.toString(),
        });
      }

      return quotationData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Success",
        description: "Quotation created successfully",
      });
      onOpenChange(false);
      form.reset();
      setLineItems([]);
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
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (!quotation) return;
      
      const response = await apiRequest("PUT", `/api/quotations/${quotation.id}`, data);
      const quotationData = await response.json();

      await apiRequest("DELETE", `/api/quotations/${quotation.id}/items`, {});

      for (let index = 0; index < lineItems.length; index++) {
        await apiRequest("POST", `/api/quotations/${quotation.id}/items`, {
          ...lineItems[index],
          displayOrder: index.toString(),
        });
      }

      return quotationData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Success",
        description: "Quotation updated successfully",
      });
      onOpenChange(false);
      form.reset();
      setLineItems([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLeadChange = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setSelectedLead(lead);
      form.setValue("leadId", lead.id);
      form.setValue("leadName", lead.companyName);
      form.setValue("leadEmail", lead.email);
      form.setValue("leadMobile", lead.mobile);
    }
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      const newItems = [...lineItems];
      newItems[index] = {
        ...newItems[index],
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        rate: item.saleUnitPrice,
        taxPercent: item.tax.replace('%', ''),
      };
      setLineItems(newItems);
      calculateLineAmount(index, newItems);
    }
  };

  const calculateLineAmount = (index: number, items = lineItems) => {
    const item = items[index];
    const qty = parseFloat(item.quantity || "0");
    const rate = parseFloat(item.rate || "0");
    const discount = parseFloat(item.discountPercent || "0");
    const tax = parseFloat(item.taxPercent || "0");

    const subtotal = qty * rate;
    const discountAmount = (subtotal * discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * tax) / 100;
    const total = taxableAmount + taxAmount;

    const newItems = [...items];
    newItems[index] = { ...item, amount: total.toFixed(2) };
    setLineItems(newItems);
    calculateTotals(newItems);
  };

  const calculateTotals = (items: LineItem[]) => {
    const subtotal = items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity || "0");
      const rate = parseFloat(item.rate || "0");
      return sum + (qty * rate);
    }, 0);

    const totalDiscount = items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity || "0");
      const rate = parseFloat(item.rate || "0");
      const discount = parseFloat(item.discountPercent || "0");
      return sum + ((qty * rate * discount) / 100);
    }, 0);

    const totalTax = items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity || "0");
      const rate = parseFloat(item.rate || "0");
      const discount = parseFloat(item.discountPercent || "0");
      const tax = parseFloat(item.taxPercent || "0");
      const taxableAmount = (qty * rate) - ((qty * rate * discount) / 100);
      return sum + ((taxableAmount * tax) / 100);
    }, 0);

    const grandTotal = subtotal - totalDiscount + totalTax;

    form.setValue("subtotal", subtotal.toFixed(2));
    form.setValue("totalDiscount", totalDiscount.toFixed(2));
    form.setValue("totalTax", totalTax.toFixed(2));
    form.setValue("grandTotal", grandTotal.toFixed(2));
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      itemName: "",
      quantity: "1",
      unit: "Numbers",
      rate: "0",
      discountPercent: "0",
      taxPercent: "0",
      amount: "0",
    }]);
  };

  const removeLineItem = (index: number) => {
    const newItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newItems);
    calculateTotals(newItems);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (lineItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one line item",
        variant: "destructive",
      });
      return;
    }
    
    if (quotation) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-quotation-form">
        <DialogHeader>
          <DialogTitle>{quotation ? "Edit Quotation" : "Create New Quotation"}</DialogTitle>
          <DialogDescription>
            {quotation ? "Update quotation details" : "Fill in the details to create a new quotation"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Lead *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      handleLeadChange(value);
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lead">
                          <SelectValue placeholder="Choose a lead" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.companyName} - {lead.contactPerson}
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
                name="quotationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quotation Number</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-50" data-testid="input-quotation-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quotationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quotation Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" readOnly className="bg-gray-50" data-testid="input-quotation-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" readOnly className="bg-gray-50" data-testid="input-valid-until" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Line Items</h3>
                  <Button type="button" onClick={addLineItem} size="sm" className="gap-2" data-testid="button-add-item">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-7 gap-3">
                        <div className="col-span-2">
                          <label className="text-sm font-medium mb-1 block">Item</label>
                          <Select
                            value={item.itemId}
                            onValueChange={(value) => handleItemSelect(index, value)}
                          >
                            <SelectTrigger data-testid={`select-item-${index}`}>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((masterItem) => (
                                <SelectItem key={masterItem.id} value={masterItem.id}>
                                  {masterItem.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">Quantity</label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...lineItems];
                              newItems[index].quantity = e.target.value;
                              setLineItems(newItems);
                              calculateLineAmount(index, newItems);
                            }}
                            data-testid={`input-quantity-${index}`}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">Unit</label>
                          <Input value={item.unit} readOnly className="bg-gray-50" />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">Rate</label>
                          <Input
                            type="number"
                            value={item.rate}
                            onChange={(e) => {
                              const newItems = [...lineItems];
                              newItems[index].rate = e.target.value;
                              setLineItems(newItems);
                              calculateLineAmount(index, newItems);
                            }}
                            data-testid={`input-rate-${index}`}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">Discount %</label>
                          <Input
                            type="number"
                            value={item.discountPercent}
                            onChange={(e) => {
                              const newItems = [...lineItems];
                              newItems[index].discountPercent = e.target.value;
                              setLineItems(newItems);
                              calculateLineAmount(index, newItems);
                            }}
                            data-testid={`input-discount-${index}`}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">Tax %</label>
                          <Input
                            type="number"
                            value={item.taxPercent}
                            onChange={(e) => {
                              const newItems = [...lineItems];
                              newItems[index].taxPercent = e.target.value;
                              setLineItems(newItems);
                              calculateLineAmount(index, newItems);
                            }}
                            data-testid={`input-tax-${index}`}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Amount: ₹{parseFloat(item.amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          className="text-red-600"
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{parseFloat(form.watch("subtotal") || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Discount:</span>
                    <span className="font-semibold text-red-600">-₹{parseFloat(form.watch("totalDiscount") || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Tax:</span>
                    <span className="font-semibold">₹{parseFloat(form.watch("totalTax") || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Grand Total:</span>
                    <span className="text-indigo-600">₹{parseFloat(form.watch("grandTotal") || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="termsAndConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} data-testid="input-terms" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending} 
                data-testid="button-submit"
              >
                {quotation 
                  ? (updateMutation.isPending ? "Updating..." : "Update Quotation")
                  : (createMutation.isPending ? "Creating..." : "Create Quotation")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
