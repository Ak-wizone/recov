import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMasterItemSchema, type InsertMasterItem, type MasterItem } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface MasterItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: MasterItem;
}

const UNITS = [
  "PCS", "KG", "BOX", "Hour", "Visit", "Job", "Month", "Year",
  "Gram", "Liter", "Meter", "Sq Meter", "Sq Feet", "Feet",
  "Day", "Week", "Quarter", "Ton", "Quintal", "Bundle", "Roll"
];

const GST_RATES = ["0%", "5%", "12%", "18%", "28%"];

export default function MasterItemFormDialog({ open, onOpenChange, item }: MasterItemFormDialogProps) {
  const { toast } = useToast();
  const [itemType, setItemType] = useState<"product" | "service">(item?.itemType || "product");

  const form = useForm<InsertMasterItem>({
    resolver: zodResolver(insertMasterItemSchema),
    defaultValues: {
      itemType: item?.itemType || "product",
      name: item?.name || "",
      description: item?.description || "",
      unit: item?.unit || "",
      tax: item?.tax || "",
      sku: item?.sku || "",
      saleUnitPrice: item?.saleUnitPrice || "",
      buyUnitPrice: item?.buyUnitPrice || "",
      openingQuantity: item?.openingQuantity || "",
      hsn: item?.hsn || "",
      sac: item?.sac || "",
      isActive: item?.isActive || "Active",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertMasterItem) => 
      apiRequest("/api/masters/items", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/items"] });
      toast({
        title: "Success",
        description: "Item created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create item",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertMasterItem) =>
      apiRequest(`/api/masters/items/${item?.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masters/items"] });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (open && item) {
      setItemType(item.itemType as "product" | "service");
      form.reset({
        itemType: item.itemType,
        name: item.name,
        description: item.description || "",
        unit: item.unit,
        tax: item.tax,
        sku: item.sku,
        saleUnitPrice: item.saleUnitPrice,
        buyUnitPrice: item.buyUnitPrice || "",
        openingQuantity: item.openingQuantity || "",
        hsn: item.hsn || "",
        sac: item.sac || "",
        isActive: item.isActive,
      });
    } else if (open && !item) {
      setItemType("product");
      form.reset({
        itemType: "product",
        name: "",
        description: "",
        unit: "",
        tax: "",
        sku: "",
        saleUnitPrice: "",
        buyUnitPrice: "",
        openingQuantity: "",
        hsn: "",
        sac: "",
        isActive: "Active",
      });
    }
  }, [open, item, form]);

  const onSubmit = (data: InsertMasterItem) => {
    if (item) {
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
          <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Item Type Toggle */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <FormField
                control={form.control}
                name="itemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Item Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setItemType(value as "product" | "service");
                        }}
                        className="flex gap-6"
                        data-testid="radio-item-type"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="product" id="product" data-testid="radio-product" />
                          <Label htmlFor="product" className="cursor-pointer font-medium">Product</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="service" id="service" data-testid="radio-service" />
                          <Label htmlFor="service" className="cursor-pointer font-medium">Service</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Basic Information */}
            <div className="p-4 bg-mint-50 dark:bg-mint-950/20 rounded-lg border border-mint-200 dark:border-mint-800 space-y-4">
              <h3 className="text-base font-semibold text-mint-900 dark:text-mint-100">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter item name" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Stock Keeping Unit" data-testid="input-sku" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Item description (max 1000 characters)" rows={3} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Rate *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tax">
                            <SelectValue placeholder="Select GST rate" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GST_RATES.map((rate) => (
                            <SelectItem key={rate} value={rate}>{rate}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pricing Information */}
            <div className="p-4 bg-peach-50 dark:bg-peach-950/20 rounded-lg border border-peach-200 dark:border-peach-800 space-y-4">
              <h3 className="text-base font-semibold text-peach-900 dark:text-peach-100">Pricing Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="saleUnitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Unit Price (₹) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-sale-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buyUnitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buy Unit Price (₹)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-buy-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Product-specific fields */}
            {itemType === "product" && (
              <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg border border-cyan-200 dark:border-cyan-800 space-y-4">
                <h3 className="text-base font-semibold text-cyan-900 dark:text-cyan-100">Product Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="openingQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Quantity</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-opening-quantity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hsn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HSN Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter HSN code" data-testid="input-hsn" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Service-specific fields */}
            {itemType === "service" && (
              <div className="p-4 bg-lavender-50 dark:bg-lavender-950/20 rounded-lg border border-lavender-200 dark:border-lavender-800 space-y-4">
                <h3 className="text-base font-semibold text-lavender-900 dark:text-lavender-100">Service Details</h3>
                
                <FormField
                  control={form.control}
                  name="sac"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SAC Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter SAC code" data-testid="input-sac" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Status */}
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
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
                {item ? "Update Item" : "Create Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
